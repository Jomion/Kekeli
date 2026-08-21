// Page publique : navigation dans la structure d'une matière (nouvel ordre : Unité/Dossier → Sous-matière → SA)

const params = new URLSearchParams(window.location.search);
const matiereId = params.get('id');
const udId = params.get('ud');
const smId = params.get('sm');
const saId = params.get('sa');

let nomMatiereActuelle = '';

function construireLien(nouveauxParams) {
  const p = new URLSearchParams();
  p.set('id', matiereId);
  if (nouveauxParams.ud) p.set('ud', nouveauxParams.ud);
  if (nouveauxParams.sm) p.set('sm', nouveauxParams.sm);
  if (nouveauxParams.sa) p.set('sa', nouveauxParams.sa);
  return 'matiere.html?' + p.toString();
}

async function construireFilArianeActuel() {
  const parties = [nomMatiereActuelle];

  if (udId) {
    const { data: ud } = await supabaseClient.from('unites_dossiers').select('*').eq('id', udId).single();
    if (ud) parties.push(ud.semaine ? `${ud.nom} (${ud.semaine})` : ud.nom);
  }
  if (smId) {
    const { data: sm } = await supabaseClient.from('sous_matieres').select('*').eq('id', smId).single();
    if (sm) parties.push(sm.nom);
  }
  if (saId) {
    const { data: sa } = await supabaseClient.from('sa').select('*').eq('id', saId).single();
    if (sa) parties.push(sa.nom);
  }

  return parties.join(' › ');
}

function afficherListeStructure(items, type) {
  const container = document.getElementById('contenuMatiere');
  container.innerHTML = '<div id="grille" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:0 20px 24px;"></div>';
  const grille = document.getElementById('grille');

  items.forEach(item => {
    const carte = document.createElement('a');
    carte.className = 'carte-classe';

    let lienParams = { ud: udId, sm: smId, sa: saId };
    if (type === 'ud') lienParams = { ud: item.id };
    if (type === 'sm') lienParams = { ud: udId, sm: item.id };
    if (type === 'sa') lienParams = { ud: udId, sm: smId, sa: item.id };

    carte.href = construireLien(lienParams);

    let libelle = item.nom;
    if (type === 'ud' && item.semaine) libelle += ` (${item.semaine})`;
    carte.textContent = libelle;
    grille.appendChild(carte);
  });
}

async function afficherSeances(filtre) {
  const container = document.getElementById('contenuMatiere');
  const filAriane = await construireFilArianeActuel();

  let requete = supabaseClient.from('seances').select('*').eq('statut', 'publie').order('ordre', { ascending: true });
  Object.keys(filtre).forEach(cle => {
    requete = requete.eq(cle, filtre[cle]);
  });

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  if (data.length === 0) {
    container.innerHTML = `<p style="padding:0 20px;color:var(--texte-gris);font-size:13px;">${filAriane}</p><p style="padding:0 20px;">Aucune séance publiée pour l'instant à cet endroit.</p>`;
    return;
  }

  container.innerHTML = `
    <p style="padding:0 20px;color:var(--texte-gris);font-size:13px;margin-bottom:12px;">${filAriane}</p>
    <div id="grille" style="display:flex;flex-direction:column;gap:10px;padding:0 20px 24px;"></div>
  `;
  const grille = document.getElementById('grille');

  data.forEach(seance => {
    const carte = document.createElement('a');
    carte.href = `seance.html?id=${seance.id}`;
    carte.className = 'admin-ligne';
    carte.style.textDecoration = 'none';
    const libelleAffiche = `${seance.libelle === 'seance' ? 'Séance' : 'Séquence'} ${seance.numero || ''}`.trim();
    carte.innerHTML = `<span>${seance.titre} <small>(${libelleAffiche})</small></span>`;
    grille.appendChild(carte);
  });
}

async function chargerContenu() {
  const { data: matiere, error: errMatiere } = await supabaseClient
    .from('matieres')
    .select('*')
    .eq('id', matiereId)
    .single();

  if (errMatiere || !matiere) {
    document.getElementById('titreMatiere').textContent = "Matière introuvable";
    return;
  }

  nomMatiereActuelle = matiere.nom_complet || matiere.nom;
  document.getElementById('titreMatiere').textContent = nomMatiereActuelle;

  // Niveau SA choisi -> affiche les séances de cette SA
  if (saId) {
    afficherSeances({ sa_id: saId });
    return;
  }

  // Niveau Sous-matière choisi -> cherche des SA dessous, sinon les séances
  if (smId) {
    const { data: saList } = await supabaseClient.from('sa').select('*').eq('sous_matiere_id', smId).order('ordre', { ascending: true });
    if (saList && saList.length > 0) { afficherListeStructure(saList, 'sa'); return; }
    afficherSeances({ sous_matiere_id: smId });
    return;
  }

  // Niveau Unité/Dossier choisi -> cherche des sous-matières dessous (toujours obligatoires dans la nouvelle hiérarchie)
  if (udId) {
    const { data: smList } = await supabaseClient.from('sous_matieres').select('*').eq('unite_dossier_id', udId).order('ordre', { ascending: true });
    if (smList && smList.length > 0) { afficherListeStructure(smList, 'sm'); return; }
    document.getElementById('contenuMatiere').innerHTML = '<p style="padding:0 20px;">Aucune sous-matière disponible pour l\'instant.</p>';
    return;
  }

  // Racine de la matière -> liste des Unités/Dossiers
  const { data: udList } = await supabaseClient.from('unites_dossiers').select('*').eq('matiere_id', matiereId).order('ordre', { ascending: true });
  if (udList && udList.length > 0) { afficherListeStructure(udList, 'ud'); return; }

  document.getElementById('contenuMatiere').innerHTML = '<p style="padding:0 20px;">Aucun contenu disponible pour cette matière pour l\'instant.</p>';
}

chargerContenu();
