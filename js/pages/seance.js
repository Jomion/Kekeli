// Page publique : affichage du contenu complet d'une séance (champs classiques + blocs enrichis)

const paramsSeance = new URLSearchParams(window.location.search);
const seanceId = paramsSeance.get('id');

const TYPES_RICHTEXT_PUB = ['resume', 'texte', 'definition', 'regle', 'exemple', 'a_retenir', 'astuce', 'attention_bloc'];

const LABELS_BLOCS_PUBLIC = {
  resume: '📄 Résumé',
  definition: '📘 Définition',
  regle: '📏 Règle',
  exemple: '💡 Exemple',
  a_retenir: '⭐ À retenir',
  astuce: '🔑 Astuce',
  attention_bloc: '⚠️ Attention'
};

function extraireIdYoutubePub(url) {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function bloc(titre, contenu) {
  if (!contenu) return '';
  return `<section style="margin-bottom:20px;">
    <h3 style="font-size:15px;color:var(--bleu-fonce);margin-bottom:6px;">${titre}</h3>
    <p style="white-space:pre-wrap;line-height:1.6;">${contenu}</p>
  </section>`;
}

async function rendreBlocEnrichi(b) {
  const c = b.contenu || {};

  if (TYPES_RICHTEXT_PUB.includes(b.type)) {
    const html = c.html || '';
    if (!html || html === '<p><br></p>') return '';

    if (b.type === 'texte' || b.type === 'resume') {
      const label = c.nomPersonnalise ? c.nomPersonnalise : (b.type === 'resume' ? 'Résumé' : null);
      return `<div class="rendu-bloc rendu-bloc-${b.type}">${label ? `<span class="rendu-bloc-label">${label}</span>` : ''}<div class="ql-editor">${html}</div></div>`;
    }
    return `<div class="rendu-bloc rendu-bloc-${b.type}"><span class="rendu-bloc-label">${LABELS_BLOCS_PUBLIC[b.type]}</span><div class="ql-editor">${html}</div></div>`;
  }

  if (b.type === 'image') {
    if (!c.url) return '';
    return `<figure class="rendu-bloc rendu-bloc-image"><img src="${c.url}" loading="lazy">${c.legende ? `<figcaption>${c.legende}</figcaption>` : ''}</figure>`;
  }

  if (b.type === 'video') {
    const idYt = extraireIdYoutubePub(c.url);
    if (!idYt) return '';
    return `<div class="rendu-bloc rendu-bloc-video"><iframe src="https://www.youtube.com/embed/${idYt}" allowfullscreen></iframe></div>`;
  }

  if (b.type === 'audio') {
    if (!c.url) return '';
    return `<div class="rendu-bloc rendu-bloc-audio"><audio controls src="${c.url}"></audio></div>`;
  }

  if (b.type === 'tableau') {
    if (!c.lignes) return '';
    const html = c.lignes.map(ligne => '<tr>' + ligne.filter(cell => cell).map(cell =>
      `<td colspan="${cell.colspan || 1}" style="background:${cell.couleur || ''};text-align:${cell.centre ? 'center' : 'left'};">${cell.texte || ''}</td>`
    ).join('') + '</tr>').join('');
    return `<div class="rendu-bloc rendu-bloc-tableau"><table class="${c.bordures === false ? 'sans-bordures' : ''}">${html}</table></div>`;
  }

  if (b.type === 'exercice') {
    if (!c.exerciceId) return '';
    const { data: ex } = await supabaseClient.from('exercices').select('id, titre, enonce, statut').eq('id', c.exerciceId).single();
    if (!ex || ex.statut !== 'publie') return '';
    const titreEx = ex.titre || ex.enonce.substring(0, 50) + '...';
    return `<div class="rendu-bloc rendu-bloc-exercice"><a href="exercice.html?id=${ex.id}">✏️ ${titreEx}</a></div>`;
  }

  if (b.type === 'ressource') {
    if (!c.url) return '';
    return `<div class="rendu-bloc rendu-bloc-ressource"><a href="${c.url}" target="_blank">📎 ${c.titre || 'Ressource'}</a></div>`;
  }

  return '';
}

async function construireFilAriane(seance) {
  const parties = [];

  let matiereId = seance.matiere_id;
  let sousMatiereId = seance.sous_matiere_id;
  let uniteDossierId = seance.unite_dossier_id;
  let nomSA = null;

  if (seance.sa_id) {
    const { data: sa } = await supabaseClient.from('sa').select('*').eq('id', seance.sa_id).single();
    if (sa) {
      nomSA = sa.nom;
      uniteDossierId = sa.unite_dossier_id;
      sousMatiereId = sa.sous_matiere_id;
      matiereId = sa.matiere_id;
    }
  }

  let nomUD = null, semaineUD = null;
  if (uniteDossierId) {
    const { data: ud } = await supabaseClient.from('unites_dossiers').select('*').eq('id', uniteDossierId).single();
    if (ud) {
      nomUD = ud.nom;
      semaineUD = ud.semaine;
      if (!sousMatiereId) sousMatiereId = ud.sous_matiere_id;
      if (!matiereId) matiereId = ud.matiere_id;
    }
  }

  let nomSM = null;
  if (sousMatiereId) {
    const { data: sm } = await supabaseClient.from('sous_matieres').select('*').eq('id', sousMatiereId).single();
    if (sm) {
      nomSM = sm.nom;
      if (!matiereId) matiereId = sm.matiere_id;
    }
  }

  let nomMatiere = null;
  if (matiereId) {
    const { data: m } = await supabaseClient.from('matieres').select('*').eq('id', matiereId).single();
    if (m) nomMatiere = m.nom_complet || m.nom;
  }

  if (nomMatiere) parties.push(nomMatiere);
  if (nomSM) parties.push(nomSM);
  if (nomUD) parties.push(semaineUD ? `${nomUD} (${semaineUD})` : nomUD);
  if (nomSA) parties.push(nomSA);

  return parties.join(' › ');
}

async function chargerSeance() {
  const container = document.getElementById('contenuSeance');

  if (!seanceId) {
    container.innerHTML = "Séance introuvable.";
    return;
  }

  const { data: seance, error } = await supabaseClient
    .from('seances')
    .select('*')
    .eq('id', seanceId)
    .eq('statut', 'publie')
    .single();

  if (error || !seance) {
    container.innerHTML = "Cette séance n'est pas disponible.";
    return;
  }

  const libelleAffiche = `${seance.libelle === 'seance' ? 'Séance' : 'Séquence'} ${seance.numero || ''}`.trim();
  const filAriane = await construireFilAriane(seance);

  const { data: blocs } = await supabaseClient
    .from('seance_blocs')
    .select('*')
    .eq('seance_id', seanceId)
    .order('ordre', { ascending: true });

  const htmlBlocsArray = await Promise.all((blocs || []).map(rendreBlocEnrichi));
  const htmlBlocs = htmlBlocsArray.join('');

  const htmlAnciensChamps = `
    ${bloc('Objectif', seance.objectif)}
    ${bloc('Compétence', seance.competence)}
    ${bloc('Prérequis', seance.prerequis)}
    ${bloc('Introduction', seance.introduction)}
    ${bloc('Contenu', seance.contenu)}
    ${bloc('Exemples', seance.exemples)}
    ${bloc('Résumé', seance.resume)}
    ${bloc('À retenir', seance.a_retenir)}
    ${bloc('⚠️ Attention', seance.attention)}
    ${bloc('🚫 Avertissement', seance.avertissement)}
  `;

  const { data: exercicesLies } = await supabaseClient
    .from('exercices')
    .select('id, titre')
    .eq('seance_id', seanceId)
    .eq('statut', 'publie')
    .order('ordre', { ascending: true });

  let sectionExercices = '';
  if (exercicesLies && exercicesLies.length > 0) {
    sectionExercices = `
      <section style="margin-top:24px;padding-top:20px;border-top:1px solid var(--bordure);">
        <h3 style="font-size:15px;color:var(--bleu-fonce);margin-bottom:10px;">Exercices associés</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${exercicesLies.map(ex => `<a href="exercice.html?id=${ex.id}" class="admin-ligne" style="text-decoration:none;">${ex.titre || 'Exercice'}</a>`).join('')}
        </div>
      </section>
    `;
  }

      container.innerHTML = `
    <p style="color:var(--texte-gris);font-size:13px;margin-bottom:2px;">${filAriane}</p>
    <p style="color:var(--texte-gris);font-size:13px;margin-bottom:4px;">${libelleAffiche}</p>
    <h1 style="font-size:22px;color:var(--bleu-fonce);margin-bottom:20px;">${seance.titre}</h1>

    ${htmlBlocs}
    ${htmlAnciensChamps}

    ${sectionExercices}
  `;
}
chargerSeance();
