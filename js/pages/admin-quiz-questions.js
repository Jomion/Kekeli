// Gestion des questions associées à un quiz

verifierConnexion();

const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get('quiz');

let quizActuel = null;
let toutesLesMatieres = [];
let toutesLesSousMatieres = [];
let tousLesUD = [];
let toutesLesSA = [];
let toutesLesSeances = [];
let tousLesExercices = [];
let questionsActuelles = [];

if (!quizId) {
  document.getElementById('titreQuiz').textContent = "Erreur : aucun quiz sélectionné";
}

// Retrouve la matière d'une séance en remontant la hiérarchie
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

function classeIdDExercice(exercice) {
  if (!exercice.seance_id) return null;
  const seance = toutesLesSeances.find(s => s.id === exercice.seance_id);
  if (!seance) return null;
  const matiereId = matiereIdDeSeance(seance);
  const matiere = toutesLesMatieres.find(m => m.id === matiereId);
  return matiere ? matiere.classe_id : null;
}

function contexteExercice(exercice) {
  if (!exercice.seance_id) return 'indépendant';
  const seance = toutesLesSeances.find(s => s.id === exercice.seance_id);
  if (!seance) return '?';
  const matiereId = matiereIdDeSeance(seance);
  const matiere = toutesLesMatieres.find(m => m.id === matiereId);
  return `${matiere ? matiere.nom : '?'} - ${seance.titre}`;
}

async function chargerDonnees() {
  const [resQuiz, resMatieres, resSousMatieres, resUD, resSA, resSeances, resExercices, resQuestions] = await Promise.all([
    supabaseClient.from('quiz').select('*').eq('id', quizId).single(),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*'),
    supabaseClient.from('sa').select('*'),
    supabaseClient.from('seances').select('*'),
    supabaseClient.from('exercices').select('*'),
    supabaseClient.from('quiz_questions').select('*, exercices(*)').eq('quiz_id', quizId).order('ordre', { ascending: true })
  ]);

  if (resQuiz.error) {
    document.getElementById('titreQuiz').textContent = "Erreur : quiz introuvable";
    return;
  }

  quizActuel = resQuiz.data;
  toutesLesMatieres = resMatieres.data || [];
  toutesLesSousMatieres = resSousMatieres.data || [];
  tousLesUD = resUD.data || [];
  toutesLesSA = resSA.data || [];
  toutesLesSeances = resSeances.data || [];
  tousLesExercices = resExercices.data || [];
  questionsActuelles = resQuestions.data || [];

  document.getElementById('titreQuiz').textContent = `Questions : ${quizActuel.titre}`;

  // Remplit le filtre matière avec les matières de la classe du quiz
  const selectMatiere = document.getElementById('filtreMatiere');
  toutesLesMatieres.filter(m => m.classe_id === quizActuel.classe_id).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nom;
    selectMatiere.appendChild(opt);
  });

  afficherQuestionsActuelles();
  afficherExercicesDisponibles();
}

function afficherQuestionsActuelles() {
  const container = document.getElementById('listeQuestionsActuelles');

  if (questionsActuelles.length === 0) {
    container.innerHTML = "Aucune question ajoutée pour l'instant.";
    return;
  }

  container.innerHTML = '';
  questionsActuelles.forEach(qq => {
    const ex = qq.exercices;
    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${ex.titre || ex.enonce.substring(0, 40) + '...'} <small>(${ex.type})</small></span>
      <div class="admin-ligne-actions">
        <button class="btn-retirer" data-id="${qq.id}">➖ Retirer</button>
      </div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-retirer').forEach(btn => {
    btn.addEventListener('click', () => retirerQuestion(btn.dataset.id));
  });
}

function afficherExercicesDisponibles() {
  const container = document.getElementById('listeExercicesDisponibles');
  const filtreMatiereId = document.getElementById('filtreMatiere').value;
  const filtreType = document.getElementById('filtreType').value;

  const idsDejaAjoutes = questionsActuelles.map(qq => qq.exercice_id);

  let disponibles = tousLesExercices.filter(ex => {
    if (idsDejaAjoutes.includes(ex.id)) return false;
    if (classeIdDExercice(ex) !== quizActuel.classe_id) return false;
    if (filtreType && ex.type !== filtreType) return false;
    if (filtreMatiereId) {
      const seance = toutesLesSeances.find(s => s.id === ex.seance_id);
      if (!seance || matiereIdDeSeance(seance) !== filtreMatiereId) return false;
    }
    return true;
  });

  if (disponibles.length === 0) {
    container.innerHTML = "Aucun exercice disponible avec ces filtres.";
    return;
  }

  container.innerHTML = '';
  disponibles.forEach(ex => {
    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${ex.titre || ex.enonce.substring(0, 40) + '...'} <small>(${ex.type} - ${contexteExercice(ex)})</small></span>
      <div class="admin-ligne-actions">
        <button class="btn-ajouter-question" data-id="${ex.id}">➕ Ajouter</button>
      </div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-ajouter-question').forEach(btn => {
    btn.addEventListener('click', () => ajouterQuestion(btn.dataset.id));
  });
}

async function ajouterQuestion(exerciceId) {
  const { error } = await supabaseClient.from('quiz_questions').insert({
    quiz_id: quizId,
    exercice_id: exerciceId,
    ordre: questionsActuelles.length
  });

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  await chargerDonnees();
}

async function retirerQuestion(quizQuestionId) {
  const { error } = await supabaseClient.from('quiz_questions').delete().eq('id', quizQuestionId);

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  await chargerDonnees();
}

document.getElementById('filtreMatiere').addEventListener('change', afficherExercicesDisponibles);
document.getElementById('filtreType').addEventListener('change', afficherExercicesDisponibles);

if (quizId) {
  chargerDonnees();
}
