// Gestion CRUD des exercices

let exerciceEnEdition = null;
let toutesLesClasses = [];
let toutesLesMatieres = [];
let toutesLesSousMatieres = [];
let tousLesUD = [];
let toutesLesSA = [];
let toutesLesSeances = [];
let tousLesExercices = [];
let tousLesAdmins = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resSousMatieres, resUD, resSA, resSeances, resAdmins] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*'),
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
  toutesLesSousMatieres = resSousMatieres.data || [];
  tousLesUD = resUD.data || [];
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
  if (niveau <= 1) document.getElementById('sousMatiere').innerHTML = '<option value="">-- Aucune --</option>';
  if (niveau <= 2) document.getElementById('uniteDossier').innerHTML = '<option value="">-- Aucun --</option>';
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

function remplirSousMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  viderAPartirDe(2);
  const selectSM = document.getElementById('sousMatiere');
  selectSM.innerHTML = '<option value="">-- Aucune --</option>';
  if (!nomMatiere) return;
  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  const noms = [...new Set(toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id)).map(sm => sm.nom))].sort();
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom; opt.textContent = nom;
    selectSM.appendChild(opt);
  });
  remplirUD();
}

function remplirUD() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const nomSM = document.getElementById('sousMatiere').value;
  viderAPartirDe(3);
  const selectUD = document.getElementById('uniteDossier');
  selectUD.innerHTML = '<option value="">-- Aucun --</option>';
  if (!nomMatiere) return;
  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  let noms;
  if (nomSM) {
    const idsSM = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id) && sm.nom === nomSM).map(sm => sm.id);
    noms = [...new Set(tousLesUD.filter(ud => idsSM.includes(ud.sous_matiere_id)).map(ud => ud.nom))].sort();
  } else {
    noms = [...new Set(tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id)).map(ud => ud.nom))].sort();
  }
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom; opt.textContent = nom;
    selectUD.appendChild(opt);
  });
  remplirSA();
}

function remplirSA() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const nomSM = document.getElementById('sousMatiere').value;
  const nomUD = document.getElementById('uniteDossier').value;
  viderAPartirDe(4);
  const selectSA = document.getElementById('sa');
  selectSA.innerHTML = '<option value="">-- Aucune --</option>';
  if (!nomMatiere) return;
  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  let noms;
  if (nomUD) {
    let idsUD;
    if (nomSM) {
      const idsSM = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id) && sm.nom === nomSM).map(sm => sm.id);
      idsUD = tousLesUD.filter(ud => idsSM.includes(ud.sous_matiere_id) && ud.nom === nomUD).map(ud => ud.id);
    } else {
      idsUD = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id) && ud.nom === nomUD).map(ud => ud.id);
    }
    noms = [...new Set(toutesLesSA.filter(sa => idsUD.includes(sa.unite_dossier_id)).map(sa => sa.nom))].sort();
  } else if (nomSM) {
    const idsSM = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id) && sm.nom === nomSM).map(sm => sm.id);
    noms = [...new Set(toutesLesSA.filter(sa => idsSM.includes(sa.sous_matiere_id)).map(sa => sa.nom))].sort();
  } else {
    noms = [...new Set(toutesLesSA.filter(sa => idsMatieres.includes(sa.matiere_id)).map(sa => sa.nom))].sort();
  }
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom; opt.textContent = nom;
    selectSA.appendChild(opt);
  });
  remplirSeances();
}

function remplirSeances() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const nomSM = document.getElementById('sousMatiere').value;
  const nomUD = document.getElementById('uniteDossier').value;
  const nomSA = document.getElementById('sa').value;
  const selectSeance = document.getElementById('seance');
  selectSeance.innerHTML = '<option value="">-- Aucune / exercice indépendant --</option>';
  if (!nomMatiere) return;
  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);

  let seancesFiltrees;
  if (nomSA) {
    let idsSA;
    if (nomUD) {
      let idsUD;
      if (nomSM) {
        const idsSM = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id) && sm.nom === nomSM).map(sm => sm.id);
        idsUD = tousLesUD.filter(ud => idsSM.includes(ud.sous_matiere_id) && ud.nom === nomUD).map(ud => ud.id);
      } else {
        idsUD = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id) && ud.nom === nomUD).map(ud => ud.id);
      }
      idsSA = toutesLesSA.filter(sa => idsUD.includes(sa.unite_dossier_id) && sa.nom === nomSA).map(sa => sa.id);
    } else if (nomSM) {
      const idsSM = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id) && sm.nom === nomSM).map(sm => sm.id);
      idsSA = toutesLesSA.filter(sa => idsSM.includes(sa.sous_matiere_id) && sa.nom === nomSA).map(sa => sa.id);
    } else {
      idsSA = toutesLesSA.filter(sa => idsMatieres.includes(sa.matiere_id) && sa.nom === nomSA).map(sa => sa.id);
    }
    seancesFiltrees = toutesLesSeances.filter(s => idsSA.includes(s.sa_id));
  } else if (nomUD) {
    let idsUD;
    if (nomSM) {
      const idsSM = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id) && sm.nom === nomSM).map(sm => sm.id);
      idsUD = tousLesUD.filter(ud => idsSM.includes(ud.sous_matiere_id) && ud.nom === nomUD).map(ud => ud.id);
    } else {
      idsUD = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id) && ud.nom === nomUD).map(ud => ud.id);
    }
    seancesFiltrees = toutesLesSeances.filter(s => idsUD.includes(s.unite_dossier_id));
  } else if (nomSM) {
    const idsSM = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id) && sm.nom === nomSM).map(sm => sm.id);
    seancesFiltrees = toutesLesSeances.filter(s => idsSM.includes(s.sous_matiere_id));
  } else {
    seancesFiltrees = toutesLesSeances.filter(s => idsMatieres.includes(s.matiere_id));
  }

  seancesFiltrees.forEach(s => {
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

function retrouverNomMatiere(exercice) {
  if (!exercice.seance_id) return null;
  const seance = toutesLesSeances.find(s => s.id === exercice.seance_id);
  if (!seance) return null;
  const matiereId = matiereIdDeSeance(seance);
  const matiere = toutesLesMatieres.find(m => m.id === matiereId);
  return matiere ? matiere.nom : null;
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
    const matiereId = matiereIdDeSeance(seance);
    const matiere = toutesLesMatieres.find(m => m.id === matiereId);
    const classeId = matiere ? matiere.classe_id : null;

    Array.from(document.getElementById('classe').options).forEach(opt => {
      opt.selected = (opt.value === classeId);
    });
    remplirMatieres();
    document.getElementById('matiere').value = matiere ? matiere.nom : '';
    remplirSousMatieres();

    let nomSM = '';
    if (seance.sous_matiere_id) nomSM = toutesLesSousMatieres.find(s => s.id === seance.sous_matiere_id)?.nom || '';
    else if (seance.unite_dossier_id) {
      const ud = tousLesUD.find(u => u.id === seance.unite_dossier_id);
      if (ud && ud.sous_matiere_id) nomSM = toutesLesSousMatieres.find(s => s.id === ud.sous_matiere_id)?.nom || '';
    } else if (seance.sa_id) {
      const sa = toutesLesSA.find(s => s.id === seance.sa_id);
      if (sa) {
        if (sa.sous_matiere_id) nomSM = toutesLesSousMatieres.find(s => s.id === sa.sous_matiere_id)?.nom || '';
        else if (sa.unite_dossier_id) {
          const ud = tousLesUD.find(u => u.id === sa.unite_dossier_id);
          if (ud && ud.sous_matiere_id) nomSM = toutesLesSousMatieres.find(s => s.id === ud.sous_matiere_id)?.nom || '';
        }
      }
    }
    document.getElementById('sousMatiere').value = nomSM;
    remplirUD();

    let nomUD = '';
    if (seance.unite_dossier_id) nomUD = tousLesUD.find(u => u.id === seance.unite_dossier_id)?.nom || '';
    else if (seance.sa_id) {
      const sa = toutesLesSA.find(s => s.id === seance.sa_id);
      if (sa && sa.unite_dossier_id) nomUD = tousLesUD.find(u => u.id === sa.unite_dossier_id)?.nom || '';
    }
    document.getElementById('uniteDossier').value = nomUD;
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

// ===== Panneau filtres repliable =====

document.getElementById('btnToggleFiltres').addEventListener('click', () => {
  const panneau = document.getElementById('panneauFiltres');
  panneau.style.display = panneau.style.display === 'none' ? 'flex' : 'none';
  panneau.style.flexDirection = 'column';
});

// ===== Bouton retour en haut =====

const btnRetourHaut = document.getElementById('btnRetourHaut');
window.addEventListener('scroll', () => {
  btnRetourHaut.style.display = window.scrollY > 300 ? 'block' : 'none';
});
btnRetourHaut.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== Init avec permissions =====

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
