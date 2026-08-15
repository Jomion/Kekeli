// Page publique : navigation dans la structure d'une matière (s'adapte à ce qui existe réellement)

const params = new URLSearchParams(window.location.search);
const matiereId = params.get('id');
const smId = params.get('sm');
const udId = params.get('ud');
const saId = params.get('sa');

function construireLien(nouveauxParams) {
  const p = new URLSearchParams();
  p.set('id', matiereId);
  if (nouveauxParams.sm) p.set('sm', nouveauxParams.sm);
  if (nouveauxParams.ud) p.set('ud', nouveauxParams.ud);
  if (nouveauxParams.sa) p.set('sa', nouveauxParams.sa);
  return 'matiere.html?' + p.toString();
}

function afficherListeStructure(items, type) {
  const container = document.getElementById('contenuMatiere');
  container.innerHTML = '<div id="grille" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:0 20px 24px;"></div>';
  const grille = document.getElementById('grille');

  items.forEach(item => {
    const carte = document.createElement('a');
    carte.className = 'carte-classe';

    let lienParams = { sm: smId, ud: udId, sa: saId };
    if (type === 'sm') lienParams = { sm: item.id };
    if (type === 'ud') lienParams = { sm: smId, ud: item.id };
    if (type === 'sa') lienParams = { sm: smId, ud: udId, sa: item.id };

    carte.href = construireLien(lienParams);

    let libelle = item.nom;
    if (type === 'ud' && item.semaine) libelle += ` (${item.semaine})`;
    carte.textContent = libelle;
    grille.appendChild(carte);
  });
}

async function afficherSeances(filtre) {
  const container = document.getElementById('contenuMatiere');

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
    container.innerHTML = "Aucune séance publiée pour l'instant à cet endroit.";
    return;
  }

  container.innerHTML = '<div id="grille" style="display:flex;flex-direction:column;gap:10px;padding:0 20px 24px;"></div>';
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

  document.getElementById('titreMatiere').textContent = matiere.nom_complet || matiere.nom;

  // Niveau SA choisi -> on affiche les séances de cette SA
  if (saId) {
    afficherSeances({ sa_id: saId });
    return;
  }

  // Niveau Unité/Dossier choisi -> on cherche des SA dessous, sinon les séances
  if (udId) {
    const { data: saList } = await supabaseClient.from('sa').select('*').eq('unite_dossier_id', udId).order('ordre', { ascending: true });
    if (saList && saList.length > 0) { afficherListeStructure(saList, 'sa'); return; }
    afficherSeances({ unite_dossier_id: udId });
    return;
  }

  // Niveau Sous-matière choisi -> on cherche Unité/Dossier, sinon SA, sinon séances
  if (smId) {
    const { data: udList } = await supabaseClient.from('unites_dossiers').select('*').eq('sous_matiere_id', smId).order('ordre', { ascending: true });
    if (udList && udList.length > 0) { afficherListeStructure(udList, 'ud'); return; }

    const { data: saList } = await supabaseClient.from('sa').select('*').eq('sous_matiere_id', smId).order('ordre', { ascending: true });
    if (saList && saList.length > 0) { afficherListeStructure(saList, 'sa'); return; }

    afficherSeances({ sous_matiere_id: smId });
    return;
  }

  // Racine de la matière -> Sous-matière, sinon Unité/Dossier, sinon SA, sinon séances
  const { data: smList } = await supabaseClient.from('sous_matieres').select('*').eq('matiere_id', matiereId).order('ordre', { ascending: true });
  if (smList && smList.length > 0) { afficherListeStructure(smList, 'sm'); return; }

  const { data: udList } = await supabaseClient.from('unites_dossiers').select('*').eq('matiere_id', matiereId).order('ordre', { ascending: true });
  if (udList && udList.length > 0) { afficherListeStructure(udList, 'ud'); return; }

  const { data: saList } = await supabaseClient.from('sa').select('*').eq('matiere_id', matiereId).order('ordre', { ascending: true });
  if (saList && saList.length > 0) { afficherListeStructure(saList, 'sa'); return; }

  afficherSeances({ matiere_id: matiereId });
}

chargerContenu();
