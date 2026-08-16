// Page publique : affichage du contenu complet d'une séance

const paramsSeance = new URLSearchParams(window.location.search);
const seanceId = paramsSeance.get('id');

function bloc(titre, contenu) {
  if (!contenu) return '';
  return `<section style="margin-bottom:20px;">
    <h3 style="font-size:15px;color:var(--bleu-fonce);margin-bottom:6px;">${titre}</h3>
    <p style="white-space:pre-wrap;line-height:1.6;">${contenu}</p>
  </section>`;
}

// Reconstitue le chemin complet (Matière > Sous-matière > Unité > SA) en remontant les relations
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

  const { data: exercices } = await supabaseClient
    .from('exercices')
    .select('id, titre')
    .eq('seance_id', seanceId)
    .eq('statut', 'publie')
    .order('ordre', { ascending: true });

  let sectionExercices = '';
  if (exercices && exercices.length > 0) {
    sectionExercices = `
      <section style="margin-top:24px;padding-top:20px;border-top:1px solid var(--bordure);">
        <h3 style="font-size:15px;color:var(--bleu-fonce);margin-bottom:10px;">Exercices associés</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${exercices.map(ex => `<a href="exercice.html?id=${ex.id}" class="admin-ligne" style="text-decoration:none;">${ex.titre || 'Exercice'}</a>`).join('')}
        </div>
      </section>
    `;
  }

  container.innerHTML = `
    <p style="color:var(--texte-gris);font-size:13px;margin-bottom:2px;">${filAriane}</p>
    <p style="color:var(--texte-gris);font-size:13px;margin-bottom:4px;">${libelleAffiche}</p>
    <h1 style="font-size:22px;color:var(--bleu-fonce);margin-bottom:20px;">${seance.titre}</h1>

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

    ${sectionExercices}
  `;
}

chargerSeance();
