// Gestion CRUD des exercices

let exerciceEnEdition = null;
let toutesLesMatieres = [];
let toutesLesSousMatieres = [];
let tousLesUD = [];
let toutesLesSA = [];
let toutesLesSeances = [];

async function initPage() {
  await verifierConnexion();

  if (!peutAccederType('exercices')) {
    document.body.innerHTML = '<p style="padding:40px;text-align:center;color:#dc2626;">Accès non autorisé à ce contenu.</p>';
    return;
  }

  if (!peutModifier()) {
    document.getElementById('formAjout').style.display = 'none';
    document.querySelector('.admin-contenu').insertAdjacentHTML('afterbegin', '<p style="padding:12px;background:#fef3c7;border-radius:8px;margin-bottom:16px;">🔒 Mode lecture seule : consultation uniquement.</p>');
  }

  chargerDonneesBase();
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

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesMatieres = (resMatieres.data || []).filter(m => peutAccederClasse(m.classe_id) && peutAccederMatiere(m.id));
  toutesLesSousMatieres = resSousMatieres.data || [];
  tousLesUD = resUD.data || [];
  toutesLesSA = resSA.data || [];
  toutesLesSeances = resSeances.data || [];

  const classesAutorisees = (resClasses.data || []).filter(c => peutAccederClasse(c.id));

  const selectClasse = document.getElementById('classe');
  const selectFiltre = document.getElementById('filtreClasse');

  classesAutorisees.forEach(classe => {
    const opt1 = document.createElement('option');
    opt1.value = classe.id;
    opt1.textContent = classe.nom;
    selectClasse.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = classe.id;
    opt2.textContent = classe.nom;
    selectFiltre.appendChild(opt2);
  });

  chargerListe();
}

function viderAPartirDe(niveau) {
  if (niveau <= 1) document.getElementById('sousMatiere').innerHTML = '<option value="">-- Aucune --</option>';
  if (niveau <= 2) document.getElementById('uniteDossier').innerHTML = '<option value="">-- Aucun --</option>';
  if (niveau <= 3) document.getElementById('sa').innerHTML = '<option value="">-- Aucune --</option>';
  if (niveau <= 4) document.getElementById('seance').innerHTML = '<option value="">-- Aucune / exercice indépendant --</option>';
}

function remplirMatieres() {
  const classeId = document.getElementById('classe').value;
  viderAPartirDe(1);

  const selectMatiere = document.getElementById('matiere');
  selectMatiere.innerHTML = '<option value="">-- Choisir une matière --</option>';
  if (!classeId) return;

  toutesLesMatieres.filter(m => m.classe_id === classeId).forEach(matiere => {
    const opt = document.createElement('option');
    opt.value = matiere.id;
    opt.textContent = matiere.nom;
    selectMatiere.appendChild(opt);
  });
}

function remplirSousMatieres() {
  const matiereId = document.getElementById('matiere').value;
  viderAPartirDe(2);

  const selectSM = document.getElementById('sousMatiere');
  selectSM.innerHTML = '<option value="">-- Aucune --</option>';
  if (!matiereId) return;

  toutesLesSousMatieres.filter(sm => sm.matiere_id === matiereId).forEach(sm => {
    const opt = document.createElement('option');
    opt.value = sm.id;
    opt.textContent = sm.nom;
    selectSM.appendChild(opt);
  });

  remplirUD();
}

function remplirUD() {
  const matiereId = document.getElementById('matiere').value;
  const sousMatiereId = document.getElementById('sousMatiere').value;
  viderAPartirDe(3);

  const selectUD = document.getElementById('uniteDossier');
  selectUD.innerHTML = '<option value="">-- Aucun --</option>';

  tousLesUD.filter(ud => sousMatiereId ? ud.sous_matiere_id === sousMatiereId : ud.matiere_id === matiereId)
    .forEach(ud => {
      const opt = document.createElement('option');
      opt.value = ud.id;
      opt.textContent = `${ud.nom} (${ud.type})`;
      selectUD.appendChild(opt);
    });

  remplirSA();
}

function remplirSA() {
  const matiereId = document.getElementById('matiere').value;
  const sousMatiereId = document.getElementById('sousMatiere').value;
  const uniteDossierId = document.getElementById('uniteDossier').value;
  viderAPartirDe(4);

  const selectSA = document.getElementById('sa');
  selectSA.innerHTML = '<option value="">-- Aucune --</option>';

  toutesLesSA.filter(sa => {
    if (uniteDossierId) return sa.unite_dossier_id === uniteDossierId;
    if (sousMatiereId) return sa.sous_matiere_id === sousMatiereId;
    return sa.matiere_id === matiereId;
  }).forEach(sa => {
    const opt = document.createElement('option');
    opt.value = sa.id;
    opt.textContent = sa.nom;
    selectSA.appendChild(opt);
  });

  remplirSeances();
}

function remplirSeances() {
  const matiereId = document.getElementById('matiere').value;
  const sousMatiereId = document.getElementById('sousMatiere').value;
  const uniteDossierId = document.getElementById('uniteDossier').value;
  const saId = document.getElementById('sa').value;

  const selectSeance = document.getElementById('seance');
  selectSeance.innerHTML = '<option value="">-- Aucune / exercice indépendant --</option>';

  toutesLesSeances.filter(s => {
    if (saId) return s.sa_id === saId;
    if (uniteDossierId) return s.unite_dossier_id === uniteDossierId;
    if (sousMatiereId) return s.sous_matiere_id === sousMatiereId;
    return s.matiere_id === matiereId;
  }).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.libelle === 'seance' ? 'Séance' : 'Séquence'} ${s.numero || ''} : ${s.titre}`;
    selectSeance.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirSousMatieres);
document.getElementById('sousMatiere').addEventListener('change', remplirUD);
document.getElementById('uniteDossier').addEventListener('change', remplirSA);
document.getElementById('sa').addEventListener('change', remplirSeances);

function matiereIdDeSeance(seance) {
  function depuisSM(smId) {
    const sm = toutesLesSousMatieres.find(s => s.id === smId);
    return sm ? sm.matiere_id : null;
  }
  function depuisUD(udId) {
    const ud = tousLesUD.find(u => u.id === udId);
    if (!ud) return null;
    return ud.sous_matiere_id ? depuisSM(ud.sous_matiere_id) : ud.matiere_id;
  }
  if (seance.sa_id) {
    const sa = toutesLesSA.find(s => s.id === seance.sa_id);
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

function retrouverClasseId(exercice) {
  if (!exercice.seance_id) return null;
  const seance = toutesLesSeances.find(s => s.id === exercice.seance_id);
  if (!seance) return null;
  const matiereId = matiereIdDeSeance(seance);
  const matiere = toutesLesMatieres.find(m => m.id === matiereId);
  return matiere ? matiere.classe_id : null;
}

function retrouverContexte(exercice) {
  if (!exercice.seance_id) return 'exercice indépendant';
  const seance = toutesLesSeances.find(s => s.id === exercice.seance_id);
  return seance ? `${seance.libelle === 'seance' ? 'Séance' : 'Séquence'} ${seance.numero || ''} : ${seance.titre}` : '?';
}

async function chargerListe() {
  const container = document.getElementById('listeExercices');
  const filtreClasseId = document.getElementById('filtreClasse').value;

  const { data, error } = await supabaseClient
    .from('exercices')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  let donneesAffichees = data.filter(ex => {
    if (!ex.seance_id) return true; // exercice indépendant, visible par tous
    const classeId = retrouverClasseId(ex);
    return classeId && peutAccederClasse(classeId);
  });

  if (filtreClasseId) {
    donneesAffichees = donneesAffichees.filter(ex => retrouverClasseId(ex) === filtreClasseId);
  }

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucun exercice pour l'instant.";
    return;
  }

  const lectureSeule = !peutModifier();

  container.innerHTML = '';
  donneesAffichees.forEach(ex => {
    const badgeStatut = ex.statut === 'publie' ? '🟢' : '⚪';
    const titreAffiche = ex.titre || ex.enonce.substring(0, 40) + '...';
    const boutons = lectureSeule
      ? ''
      : `<button class="btn-modifier" data-id="${ex.id}">✏️</button><button class="btn-supprimer" data-id="${ex.id}">🗑️</button>`;
    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${badgeStatut} ${titreAffiche} <small>(${ex.type} - ${retrouverContexte(ex)})</small></span>
      <div class="admin-ligne-actions">${boutons}</div>
    `;
    container.appendChild(ligne);
  });

  if (!lectureSeule) {
    document.querySelectorAll('.btn-modifier').forEach(btn => {
      btn.addEventListener('click', () => activerModeEdition(btn.dataset.id, donneesAffichees));
    });
    document.querySelectorAll('.btn-supprimer').forEach(btn => {
      btn.addEventListener('click', () => supprimerExercice(btn.dataset.id));
    });
  }
}

function activerModeEdition(id, liste) {
  const ex = liste.find(e => e.id === id);
  if (!ex) return;

  if (ex.seance_id) {
    const seance = toutesLesSeances.find(s => s.id === ex.seance_id);
    const matiereId = matiereIdDeSeance(seance);
    const matiere = toutesLesMatieres.find(m => m.id === matiereId);
    const classeId = matiere ? matiere.classe_id : null;

    document.getElementById('classe').value = classeId;
    remplirMatieres();
    document.getElementById('matiere').value = matiereId;
    remplirSousMatieres();

    document.getElementById('sousMatiere').value = seance.sous_matiere_id || (seance.sa_id ? (toutesLesSA.find(s => s.id === seance.sa_id) || {}).sous_matiere_id || '' : '') || '';
    remplirUD();
    document.getElementById('uniteDossier').value = seance.unite_dossier_id || (seance.sa_id ? (toutesLesSA.find(s => s.id === seance.sa_id) || {}).unite_dossier_id || '' : '') || '';
    remplirSA();
    document.getElementById('sa').value = seance.sa_id || '';
    remplirSeances();
    document.getElementById('seance').value = ex.seance_id;
  }

  document.getElementById('titre').value = ex.titre || '';
  document.getElementById('enonce').value = ex.enonce;
  document.getElementById('type').value = ex.type;
  document.getElementById('reponsesProposees').value = ex.reponses_proposees ? ex.reponses_proposees.join('\n') : '';
  document.getElementById('bonneReponse').value = ex.bonne_reponse || '';
  document.getElementById('correction').value = ex.correction || '';
  document.getElementById('explication').value = ex.explication || '';
  document.getElementById('bareme').value = ex.bareme || '';
  document.getElementById('difficulte').value = ex.difficulte || 'facile';
  document.getElementById('statut').value = ex.statut;
  document.getElementById('ordre').value = ex.ordre;

  exerciceEnEdition = id;
  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function supprimerExercice(id) {
  const confirmation = window.confirm("Supprimer cet exercice ?");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('exercices').delete().eq('id', id);

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  chargerListe();
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!peutModifier()) return;

  const seanceId = document.getElementById('seance').value;
  const messageForm = document.getElementById('messageForm');

  const reponsesTexte = document.getElementById('reponsesProposees').value.trim();
  const reponsesArray = reponsesTexte ? reponsesTexte.split('\n').map(r => r.trim()).filter(r => r) : null;

  const payload = {
    seance_id: seanceId || null,
    titre: document.getElementById('titre').value || null,
    enonce: document.getElementById('enonce').value,
    type: document.getElementById('type').value,
    reponses_proposees: reponsesArray,
    bonne_reponse: document.getElementById('bonneReponse').value || null,
    correction: document.getElementById('correction').value || null,
    explication: document.getElementById('explication').value || null,
    bareme: document.getElementById('bareme').value ? parseFloat(document.getElementById('bareme').value) : null,
    difficulte: document.getElementById('difficulte').value,
    statut: document.getElementById('statut').value,
    ordre: parseInt(document.getElementById('ordre').value)
  };

  let resultat;
  if (exerciceEnEdition) {
    resultat = await supabaseClient.from('exercices').update(payload).eq('id', exerciceEnEdition);
  } else {
    resultat = await supabaseClient.from('exercices').insert(payload);
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  exerciceEnEdition = null;
  messageForm.textContent = '';

  chargerListe();
});

document.getElementById('filtreClasse').addEventListener('change', chargerListe);

initPage();
