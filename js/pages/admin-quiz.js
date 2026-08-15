// Gestion CRUD des quiz

let quizEnEdition = null;
let toutesLesClasses = [];
let toutesLesMatieres = [];
let toutesLesSousMatieres = [];
let tousLesAdmins = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resSousMatieres, resAdmins] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('administrateurs').select('id, nom')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesClasses = resClasses.data.filter(c => peutAccederClasse(c.id));
  toutesLesMatieres = (resMatieres.data || []).filter(m => peutAccederClasse(m.classe_id) && peutAccederMatiere(m.id));
  toutesLesSousMatieres = resSousMatieres.data || [];
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

function remplirMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  document.getElementById('sousMatiere').innerHTML = '<option value="">-- Aucune --</option>';
  const selectMatiere = document.getElementById('matiere');
  selectMatiere.innerHTML = '<option value="">-- Toutes matières --</option>';
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
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirSousMatieres);

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
document.getElementById('filtreStatut').addEventListener('change', chargerListe);
document.getElementById('tri').addEventListener('change', chargerListe);

function nomClasse(classeId) {
  const c = toutesLesClasses.find(cl => cl.id === classeId);
  return c ? c.nom : '?';
}

function nomMatiereParId(matiereId) {
  if (!matiereId) return null;
  const m = toutesLesMatieres.find(mm => mm.id === matiereId);
  return m ? m.nom : null;
}

async function chargerListe() {
  const container = document.getElementById('listeQuiz');
  const filtreClasseId = document.getElementById('filtreClasse').value;
  const filtreMatiereNom = document.getElementById('filtreMatiere').value;
  const filtreStatutVal = document.getElementById('filtreStatut').value;
  const triVal = document.getElementById('tri').value;

  let requete = supabaseClient.from('quiz').select('*');
  if (triVal === 'date_asc') requete = requete.order('created_at', { ascending: true });
  else requete = requete.order('created_at', { ascending: false });

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  let donneesAffichees = data.filter(q => peutAccederClasse(q.classe_id));

  if (filtreClasseId) donneesAffichees = donneesAffichees.filter(q => q.classe_id === filtreClasseId);
  if (filtreMatiereNom) donneesAffichees = donneesAffichees.filter(q => nomMatiereParId(q.matiere_id) === filtreMatiereNom);
  if (filtreStatutVal) donneesAffichees = donneesAffichees.filter(q => q.statut === filtreStatutVal);

  if (triVal === 'admin') {
    donneesAffichees.sort((a, b) => nomAdmin(a.cree_par).localeCompare(nomAdmin(b.cree_par)));
  } else if (triVal === 'statut') {
    donneesAffichees.sort((a, b) => a.statut.localeCompare(b.statut));
  }

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucun quiz pour l'instant.";
    return;
  }

  const badgesStatut = { brouillon: '⚪', en_attente: '🟡', publie: '🟢' };
  const lectureSeule = !peutModifier();

  container.innerHTML = '';
  donneesAffichees.forEach(quiz => {
    const dateObj = new Date(quiz.created_at);
    const dateAffichee = dateObj.toLocaleDateString('fr-FR') + ' à ' + dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const infosSoumission = `${dateAffichee} - ${nomAdmin(quiz.cree_par)} - ${quiz.statut}`;

    const boutons = lectureSeule
      ? ''
      : `<a href="gestion-quiz-questions.html?quiz=${quiz.id}" class="btn-secondaire">📋 Questions</a><button class="btn-modifier" data-id="${quiz.id}">✏️</button><button class="btn-supprimer" data-id="${quiz.id}">🗑️</button>`;

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.style.flexDirection = 'column';
    ligne.style.alignItems = 'stretch';
    ligne.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span>${badgesStatut[quiz.statut] || ''} ${quiz.titre} <small>(${nomClasse(quiz.classe_id)})</small></span>
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
      btn.addEventListener('click', () => supprimerQuiz(btn.dataset.id));
    });
  }
}

function activerModeEdition(id, liste) {
  const quiz = liste.find(q => q.id === id);
  if (!quiz) return;

  Array.from(document.getElementById('classe').options).forEach(opt => {
    opt.selected = (opt.value === quiz.classe_id);
  });
  remplirMatieres();
  document.getElementById('matiere').value = nomMatiereParId(quiz.matiere_id) || '';
  remplirSousMatieres();
  if (quiz.sous_matiere_id) {
    const sm = toutesLesSousMatieres.find(s => s.id === quiz.sous_matiere_id);
    document.getElementById('sousMatiere').value = sm ? sm.nom : '';
  }

  document.getElementById('titre').value = quiz.titre;
  document.getElementById('tentativesMax').value = quiz.tentatives_max;
  document.getElementById('melangeQuestions').checked = quiz.melange_questions;
  document.getElementById('melangeReponses').checked = quiz.melange_reponses;
  document.getElementById('statut').value = quiz.statut === 'publie' ? 'en_attente' : quiz.statut;

  quizEnEdition = id;
  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function supprimerQuiz(id) {
  const confirmation = window.confirm("Supprimer ce quiz ? Les questions associées seront aussi retirées (pas les exercices eux-mêmes).");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('quiz').delete().eq('id', id);

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  chargerListe();
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!peutModifier()) return;

  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiereChoisie = document.getElementById('matiere').value;
  const nomSousMatiereChoisie = document.getElementById('sousMatiere').value;
  const messageForm = document.getElementById('messageForm');

  if (classesChoisies.length === 0) {
    messageForm.textContent = "Sélectionne au moins une classe.";
    return;
  }

  const donneesCommunes = {
    titre: document.getElementById('titre').value,
    tentatives_max: parseInt(document.getElementById('tentativesMax').value),
    melange_questions: document.getElementById('melangeQuestions').checked,
    melange_reponses: document.getElementById('melangeReponses').checked,
    statut: document.getElementById('statut').value
  };

  let resultat;

  if (quizEnEdition) {
    let matiereId = null, sousMatiereId = null;
    if (nomMatiereChoisie) {
      const matiere = toutesLesMatieres.find(m => m.classe_id === classesChoisies[0] && m.nom === nomMatiereChoisie);
      matiereId = matiere ? matiere.id : null;
      if (matiere && nomSousMatiereChoisie) {
        const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSousMatiereChoisie);
        sousMatiereId = sm ? sm.id : null;
      }
    }
    resultat = await supabaseClient.from('quiz').update({
      ...donneesCommunes,
      classe_id: classesChoisies[0],
      matiere_id: matiereId,
      sous_matiere_id: sousMatiereId
    }).eq('id', quizEnEdition);
  } else {
    const lignes = classesChoisies.map(classeId => {
      let matiereId = null, sousMatiereId = null;
      if (nomMatiereChoisie) {
        const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiereChoisie);
        matiereId = matiere ? matiere.id : null;
        if (matiere && nomSousMatiereChoisie) {
          const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSousMatiereChoisie);
          sousMatiereId = sm ? sm.id : null;
        }
      }
      return { ...donneesCommunes, classe_id: classeId, matiere_id: matiereId, sous_matiere_id: sousMatiereId, cree_par: profilAdmin.id };
    });

    resultat = await supabaseClient.from('quiz').insert(lignes);
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  document.getElementById('formAjout').reset();
  document.getElementById('tentativesMax').value = 2;
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  quizEnEdition = null;
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

  if (!peutAccederType('quiz')) {
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
