// Page publique : liste globale des exercices publiés, filtrable

let toutesLesMatieresPub = [];
let toutesLesSousMatieresPub = [];
let tousLesUDPub = [];
let toutesLesSAPub = [];
let toutesLesSeancesPub = [];

function matiereIdDeSeancePub(seance) {
  function depuisSM(smId) {
    const sm = toutesLesSousMatieresPub.find(s => s.id === smId);
    return sm ? sm.matiere_id : null;
  }
  function depuisUD(udId) {
    const ud = tousLesUDPub.find(u => u.id === udId);
    if (!ud) return null;
    return ud.sous_matiere_id ? depuisSM(ud.sous_matiere_id) : ud.matiere_id;
  }
  if (seance.sa_id) {
    const sa = toutesLesSAPub.find(s => s.id === seance.sa_id);
    if (sa) {
      if (sa.unite_dossier_id) return depuisUD(sa.unite_dossier_id);
      if (sa.sous_matiere_id) return depuisSM(sa.sous_matiere_id);
      return sa.matiere_id;
    }
  }
  if (seance.unite_dossier_id) return depuisUD(seance.unite_dossier_id);
  if (seance.sous_matiere_id) return depuisSM(seance.sous_matiere_id);
  return seance.matiere_id;
}

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resSousMatieres, resUD, resSA, resSeances] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*'),
    supabaseClient.from('sa').select('*'),
    supabaseClient.from('seances').select('*')
  ]);

  toutesLesMatieresPub = resMatieres.data || [];
  toutesLesSousMatieresPub = resSousMatieres.data || [];
  tousLesUDPub = resUD.data || [];
  toutesLesSAPub = resSA.data || [];
  toutesLesSeancesPub = resSeances.data || [];

  const selectClasse = document.getElementById('selectClasse');
  (resClasses.data || []).forEach(classe => {
    const opt = document.createElement('option');
    opt.value = classe.id;
    opt.textContent = classe.nom;
    selectClasse.appendChild(opt);
  });

  chargerListe();
}

function remplirMatieresFiltre() {
  const classeId = document.getElementById('selectClasse').value;
  const select = document.getElementById('selectMatiere');
  select.innerHTML = '<option value="">-- Toutes les matières --</option>';

  const source = classeId ? toutesLesMatieresPub.filter(m => m.classe_id === classeId) : toutesLesMatieresPub;
  source.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nom_complet || m.nom;
    select.appendChild(opt);
  });
}

document.getElementById('selectClasse').addEventListener('change', () => { remplirMatieresFiltre(); chargerListe(); });
document.getElementById('selectMatiere').addEventListener('change', chargerListe);
document.getElementById('selectType').addEventListener('change', chargerListe);

async function chargerListe() {
  const container = document.getElementById('listeExercicesPublic');
  const classeId = document.getElementById('selectClasse').value;
  const matiereId = document.getElementById('selectMatiere').value;
  const type = document.getElementById('selectType').value;

  let requete = supabaseClient.from('exercices').select('*').eq('statut', 'publie').order('created_at', { ascending: false });
  if (type) requete = requete.eq('type', type);

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  let donnees = data.filter(ex => ex.seance_id); // seuls les exercices liés à une séance sont géolocalisables

  donnees = donnees.map(ex => {
    const seance = toutesLesSeancesPub.find(s => s.id === ex.seance_id);
    const mId = seance ? matiereIdDeSeancePub(seance) : null;
    const matiere = mId ? toutesLesMatieresPub.find(m => m.id === mId) : null;
    return { ...ex, __matiereId: mId, __classeId: matiere ? matiere.classe_id : null };
  });

  if (classeId) donnees = donnees.filter(ex => ex.__classeId === classeId);
  if (matiereId) donnees = donnees.filter(ex => ex.__matiereId === matiereId);

  if (donnees.length === 0) {
    container.innerHTML = '<p style="padding:0 20px;">Aucun exercice disponible avec ces filtres.</p>';
    return;
  }

  container.innerHTML = '<div id="grilleEx" style="display:flex;flex-direction:column;gap:10px;padding:0 20px 24px;"></div>';
  const grille = document.getElementById('grilleEx');

  donnees.forEach(ex => {
    const matiere = toutesLesMatieresPub.find(m => m.id === ex.__matiereId);
    const titre = ex.titre || ex.enonce.substring(0, 50) + '...';

    const carte = document.createElement('a');
    carte.href = `exercice.html?id=${ex.id}`;
    carte.className = 'admin-ligne';
    carte.style.textDecoration = 'none';
    carte.innerHTML = `<span>${titre} <small>(${ex.type} - ${matiere ? (matiere.nom_complet || matiere.nom) : '?'})</small></span>`;
    grille.appendChild(carte);
  });
}

chargerDonneesBase();
