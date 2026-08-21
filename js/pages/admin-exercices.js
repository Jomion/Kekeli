// Gestion CRUD des exercices (nouvelle hiérarchie : Matière → Unité/Dossier → Sous-matière → SA → Séance)

let exerciceEnEdition = null;
let toutesLesClasses = [];
let toutesLesMatieres = [];
let tousLesUD = [];
let toutesLesSousMatieres = [];
let toutesLesSA = [];
let toutesLesSeances = [];
let tousLesExercices = [];
let tousLesAdmins = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resUD, resSM, resSA, resSeances, resAdmins] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('sa').select('*'),
    supabaseClient.from('seances').select('*'),
    supabaseClient.from('administrateurs').select('id, nom')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesClasses = resClasses.data.filter(c => peutAccederClasse(c.id));
  toutesLesMatieres = (resMatieres.data || []).filter(m => peutAccederClasse(m.classe_id) && peutAccederMatiere(m.id));
  tousLesUD = resUD.data || [];
  toutesLesSousMatieres = resSM.data || [];
  toutesLesSA = resSA.data || [];
  toutesLesSeances = resSeances.data || [];
  tousLesAdmins = resAdmins.data || [];

  const selectClasse = document.getElementById('classe');
  toutesLesClasses.forEach(classe => {
    const opt = document.createElement('option');
    opt.value = classe.id;
    opt.textContent = classe.nom;
    selectClasse.appendChild(opt);
  });

  remplirFiltreClasse();
  chargerListe();
}

function nomAdmin(id) {
  const a = tousLesAdmins.find(x => x.id === id);
  return a ? a.nom : 'inconnu';
}

// ===== Cascade formulaire =====

function viderAPartirDe(niveau) {
  if (niveau <= 1) document.getElementById('uniteDossier').innerHTML = '<option value="">-- Choisir d\'abord une matière --</option>';
  if (niveau <= 2) document.getElementById('sousMatiere').innerHTML = '<option value="">-- Choisir d\'abord une unité/dossier --</option>';
  if (niveau <= 3) document.getElementById('sa').innerHTML = '<option value="">-- Aucune --</option>';
  if (niveau <= 4) document.getElementById('seance').innerHTML = '<option value="">-- Aucune / exercice indépendant --</option>';
}

function remplirMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  viderAPartirDe(1);
  const selectMatiere = document.getElementById('matiere');
  selectMatiere.innerHTML = '<option value="">-- Choisir une matière --</option>';
  if (classesChoisies.length === 0) return;
  const noms = [...new Set(toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id)).map(m => m.nom))].sort();
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom; opt.textContent = nom;
    selectMatiere.appendChild(opt);
  });
}

function remplirUD() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  viderAPartirDe(2);
  const selectUD = document.getElementById('uniteDossier');
  selectUD.innerHTML = '<option value="">-- Choisir une unité/dossier --</option>';
  if (!nomMatiere) return;
  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id)).forEach(ud => {
    const opt = document.createElement('option');
    opt.value = ud.nom + (ud.semaine ? '|' + ud.semaine : '');
    opt.textContent = `${ud.nom}${ud.semaine ? ' (' + ud.semaine + ')' : ''} - ${ud.type}`;
    selectUD.appendChild(opt);
  });
}

function remplirSousMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const valeurUD = document.getElementById('uniteDossier').value;
  viderAPartirDe(3);
  const selectSM = document.getElementById('sousMatiere');
  selectSM.innerHTML = '<option value="">-- Choisir une sous-matière --</option>';
  if (!valeurUD) return;
  const [nomUD, semaineUD] = valeurUD.split('|');
  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  const idsUD = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id) && ud.nom === nomUD && (ud.semaine || '') === (semaineUD || '')).map(ud => ud.id);
  toutesLesSousMatieres.filter(sm => idsUD.includes(sm.unite_dossier_id)).forEach(sm => {
    const opt = document.createElement('option');
    opt.value = sm.nom; opt.textContent = sm.nom;
    selectSM.appendChild(opt);
  });
}

function remplirSA() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const valeurUD = document.getElementById('uniteDossier').value;
  const nomSM = document.getElementById('sousMatiere').value;
  viderAPartirDe(4);
  const selectSA = document.getElementById('sa');
  selectSA.innerHTML = '<option value="">-- Aucune --</option>';
  if (!nomSM) return;
  const [nomUD, semaineUD] = valeurUD.split('|');
  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  const idsUD = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id) && ud.nom === nomUD && (ud.semaine || '') === (semaineUD || '')).map(ud => ud.id);
  const idsSM = toutesLesSousMatieres.filter(sm => idsUD.includes(sm.unite_dossier_id) && sm.nom === nomSM).map(sm => sm.id);
  toutesLesSA.filter(sa => idsSM.includes(sa.sous_matiere_id)).forEach(sa => {
    const opt = document.createElement('option');
    opt.value = sa.nom; opt.textContent = sa.nom;
    selectSA.appendChild(opt);
  });
  remplirSeances();
}

function remplirSeances() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const valeurUD = document.getElementById('uniteDossier').value;
  const nomSM = document.getElementById('sousMatiere').value;
  const nomSA = document.getElementById('sa').value;
  const selectSeance = document.getElementById('seance');
  selectSeance.innerHTML = '<option value="">-- Aucune / exercice indépendant --</option>';
  if (!nomSM) return;

  const [nomUD, semaineUD] = valeurUD.split('|');
  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  const idsUD = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id) && ud.nom === nomUD && (ud.semaine || '') === (semaineUD || '')).map(ud => ud.id);
  const idsSM = toutesLesSousMatieres.filter(sm => idsUD.includes(sm.unite_dossier_id) && sm.nom === nomSM).map(sm => sm.id);

  let seancesFiltrees;
  if (nomSA) {
    const idsSA = toutesLesSA.filter(sa => idsSM.includes(sa.sous_matiere_id) && sa.nom === nomSA).map(sa => sa.id);
    seancesFiltrees = toutesLesSeances.filter(s => idsSA.includes(s.sa_id));
  } else {
    seancesFiltrees = toutesLesSeances.filter(s => idsSM.includes(s.sous_matiere_id));
  }

  seancesFiltrees.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.libelle === 'seance' ? 'Séance' : 'Séquence'} ${s.numero || ''} : ${s.titre}`;
    selectSeance.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirUD);
document.getElementById('uniteDossier').addEventListener('change', remplirSousMatieres);
document.getElementById('sousMatiere').addEventListener('change', remplirSA);
document.getElementById('sa').addEventListener('change', remplirSeances);

// ===== Filtres cascade =====

function remplirFiltreClasse() {
  const selectFiltre = document.getElementById('filtreClasse');
  selectFiltre.innerHTML = '<option value="">Toutes les classes</option>';
  toutesLesClasses.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.nom;
    selectFiltre.appendChild(opt);
  });
  remplirFiltreMatiere();
}

function remplirFiltreMatiere() {
  const classeId = document.getElementById('filtreClasse').value;
  const selectFiltre = document.getElementById('filtreMatiere');
  selectFiltre.innerHTML = '<option value="">Toutes les matières</option>';
  const source = classeId ? toutesLesMatieres.filter(m => m.classe_id === classeId) : toutesLesMatieres;
  const noms = [...new Set(source.map(m => m.nom))].sort();
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom; opt.textContent = nom;
    selectFiltre.appendChild(opt);
  });
}

document.getElementById('filtreClasse').addEventListener('change', () => { remplirFiltreMatiere(); chargerListe(); });
document.getElementById('filtreMatiere').addEventListener('change', chargerListe);
document.getElementById('filtreType').addEventListener('change', chargerListe);
document.getElementById('filtreStatut').addEventListener('change', chargerListe);
document.getElementById('tri').addEventListener('change', chargerListe);

// ===== Infos =====

function retrouverInfosSeance(seance) {
  const sm = toutesLesSousMatieres.find(s => s.id === seance.sous_matiere_id) ||
    (seance.sa_id ? toutesLesSousMatieres.find(s => s.id === (toutesLesSA.find(sa => sa.id === seance.sa_id) || {}).sous_matiere_id) : null);
  if (!sm) return { classeId: null, nomMatiere: '?' };
  const ud = tousLesUD.find(u => u.id === sm.unite_dossier_id);
  const matiere = ud ? toutesLesMatieres.find(m => m.id === ud.matiere_id) : null;
  return { classeId: matiere ? matiere.classe_id : null, nomMatiere: matiere ? matiere.nom : '?' };
}

function retrouverClasseId(exercice) {
  if (!exercice.seance_id) return null;
  const seance = toutesLesSeances.find(s => s.id === exercice.seance_id);
  if (!seance) return null;
  return retrouverInfosSeance(seance).classeId;
}

function retrouverNomMatiere(exercice) {
  if (!exercice.seance_id) return null;
  const seance = toutesLesSeances.find(s => s.id === exercice.seance_id);
  if (!seance) return null;
  return retrouverInfosSeance(seance).nomMatiere;
}

function retrouverContexte(exercice) {
  if (!exercice.seance_id) return 'exercice indépendant';
  const seance = toutesLesSeances.find(s => s.id === exercice.seance_id);
  return seance ? `${seance.libelle === 'seance' ? 'Séance' : 'Séquence'} ${seance.numero || ''} : ${seance.titre}` : '?';
}

// ===== Liste =====

async function chargerListe() {
  const container = document.getElementById('listeExercices');
  const filtreClasseId = document.getElementById('filtreClasse').value;
  const filtreMatiereNom = document.getElementById('filtreMatiere').value;
  const filtreType = document.getElementById('filtreType').value;
  const filtreStatutVal = document.getElementById('filtreStatut').value;
  const triVal = document.getElementById('tri').value;

  let requete = supabaseClient.from('exercices').select('*');
  if (triVal === 'date_desc') requete = requete.order('created_at', { ascending: false });
  else if (triVal === 'date_asc') requete = requete.order('created_at', { ascending: true });
  else requete = requete.order('ordre', { ascending: true });

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  tousLesExercices = data;

  let donneesAffichees = data.filter(ex => {
    if (!ex.seance_id) return true;
    const classeId = retrouverClasseId(ex);
    return classeId && peutAccederClasse(classeId);
  });

  if (filtreClasseId) donneesAffichees = donneesAffichees.filter(ex => retrouverClasseId(ex) === filtreClasseId);
  if (filtreMatiereNom) donneesAffichees = donneesAffichees.filter(ex => retrouverNomMatiere(ex) === filtreMatiereNom);
  if (filtreType) donneesAffichees = donneesAffichees.filter(ex => ex.type === filtreType);
  if (filtreStatutVal) donneesAffichees = donneesAffichees.filter(ex => ex.statut === filtreStatutVal);

  if (triVal === 'admin') {
    donneesAffichees.sort((a, b) => nomAdmin(a.cree_par).localeCompare(nomAdmin(b.cree_par)));
  } else if (triVal === 'statut') {
    donneesAffichees.sort((a, b) => a.statut.localeCompare(b.statut));
  }

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucun exercice pour l'instant.";
    return;
  }

  const badgesStatut = { brouillon: '⚪', en_attente: '🟡', publie: '🟢' };
  const lectureSeule = !peutModifier();

  container.innerHTML = '';
  donneesAffichees.forEach(ex => {
    const titreAffiche = ex.titre || ex.enonce.substring(0, 40) + '...';
    const dateObj = new Date(ex.created_at);
    const dateAffichee = dateObj.toLocaleDateString('fr-FR') + ' à ' + dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const infosSoumission = `${dateAffichee} - ${nomAdmin(ex.cree_par)} - ${ex.statut}`;

    const boutons = lectureSeule
      ? ''
      : `<button class="btn-modifier" data-id="${ex.id}">✏️</button><button class="btn-supprimer" data-id="${ex.id}">🗑️</button>`;

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.style.flexDirection = 'column';
    ligne.style.alignItems = 'stretch';
    ligne.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span>${badgesStatut[ex.statut] || ''} ${titreAffiche} <small>(${ex.type} - ${retrouverContexte(ex)})</small></span>
        <div class="admin-ligne-actions">${boutons}</div>
      </div>
      <div style="font-size:12px;color:var(--texte-gris);margin-top:4px;">${infosSoumission}</div>
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
    const sm = toutesLesSousMatieres.find(s => s.id === seance.sous_matiere_id) ||
      (seance.sa_id ? toutesLesSousMatieres.find(s => s.id === (toutesLesSA.find(sa => sa.id === seance.sa_id) || {}).sous_matiere_id) : null);
    const ud = sm ? tousLesUD.find(u => u.id === sm.unite_dossier_id) : null;
    const matiere = ud ? toutesLesMatieres.find(m => m.id === ud.matiere_id) : null;
    const classeId = matiere ? matiere.classe_id : null;

    Array.from(document.getElementById('classe').options).forEach(opt => {
      opt.selected = (opt.value === classeId);
    });
    remplirMatieres();
    document.getElementById('matiere').value = matiere ? matiere.nom : '';
    remplirUD();
    document.getElementById('uniteDossier').value = ud ? (ud.nom + (ud.semaine ? '|' + ud.semaine : '')) : '';
    remplirSousMatieres();
    document.getElementById('sousMatiere').value = sm ? sm.nom : '';
    remplirSA();

    let nomSA = '';
    if (seance.sa_id) nomSA = toutesLesSA.find(s => s.id === seance.sa_id)?.nom || '';
    document.getElementById('sa').value = nomSA;
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
  document.getElementById('statut').value = ex.statut === 'publie' ? 'en_attente' : ex.statut;
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
    resultat = await supabaseClient.from('exercices').insert({ ...payload, cree_par: profilAdmin.id });
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('btnToggleFiltres').addEventListener('click', () => {
  const panneau = document.getElementById('panneauFiltres');
  panneau.style.display = panneau.style.display === 'none' ? 'flex' : 'none';
  panneau.style.flexDirection = 'column';
});

const btnRetourHaut = document.getElementById('btnRetourHaut');
window.addEventListener('scroll', () => {
  btnRetourHaut.style.display = window.scrollY > 300 ? 'block' : 'none';
});
btnRetourHaut.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

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

initPage();
