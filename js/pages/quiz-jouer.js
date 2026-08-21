// Page publique : passer un quiz avec gestion des tentatives

const paramsQuiz = new URLSearchParams(window.location.search);
const quizId = paramsQuiz.get('id');

let quizActuel = null;
let questionsQuiz = [];
let indexActuel = 0;
let reponsesDonnees = [];

function clefStorage() {
  return `kekeli_quiz_${quizId}_tentatives`;
}

function nbTentativesUtilisees() {
  return parseInt(localStorage.getItem(clefStorage()) || '0');
}

function incrementerTentatives() {
  localStorage.setItem(clefStorage(), (nbTentativesUtilisees() + 1).toString());
}

function melanger(tableau) {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

async function chargerQuiz() {
  const container = document.getElementById('contenuQuiz');

  if (!quizId) {
    container.innerHTML = "Quiz introuvable.";
    return;
  }

  const { data: quiz, error } = await supabaseClient
    .from('quiz')
    .select('*')
    .eq('id', quizId)
    .eq('statut', 'publie')
    .single();

  if (error || !quiz) {
    container.innerHTML = "Ce quiz n'est pas disponible.";
    return;
  }

  quizActuel = quiz;

  const tentativesUtilisees = nbTentativesUtilisees();
  if (tentativesUtilisees >= quiz.tentatives_max) {
    container.innerHTML = `
      <h1 style="font-size:20px;color:var(--bleu-fonce);margin-bottom:12px;">${quiz.titre}</h1>
      <p>Tu as déjà utilisé tes ${quiz.tentatives_max} tentatives pour ce quiz sur cet appareil.</p>
    `;
    return;
  }

  const { data: liaisons, error: errLiaisons } = await supabaseClient
    .from('quiz_questions')
    .select('*, exercices(*)')
    .eq('quiz_id', quizId)
    .order('ordre', { ascending: true });

  if (errLiaisons || !liaisons || liaisons.length === 0) {
    container.innerHTML = `<h1 style="font-size:20px;margin-bottom:12px;">${quiz.titre}</h1><p>Ce quiz n'a pas encore de questions.</p>`;
    return;
  }

  questionsQuiz = liaisons.map(l => l.exercices).filter(ex => ex && ex.statut === 'publie');

  if (quiz.melange_questions) {
    questionsQuiz = melanger(questionsQuiz);
  }

  if (quiz.melange_reponses) {
    questionsQuiz = questionsQuiz.map(q => {
      if (q.type === 'qcm' && q.reponses_proposees) {
        return { ...q, reponses_proposees: melanger(q.reponses_proposees) };
      }
      return q;
    });
  }

  indexActuel = 0;
  reponsesDonnees = [];

  container.innerHTML = `
    <h1 style="font-size:20px;color:var(--bleu-fonce);margin-bottom:6px;">${quiz.titre}</h1>
    <p style="font-size:13px;color:var(--texte-gris);margin-bottom:20px;">Tentative ${tentativesUtilisees + 1} / ${quiz.tentatives_max} - ${questionsQuiz.length} question(s)</p>
    <div id="zoneQuestion"></div>
  `;

  afficherQuestion();
}

function normaliserQuiz(texte) {
  return (texte || '').toString().trim().toLowerCase();
}

function afficherQuestion() {
  const zone = document.getElementById('zoneQuestion');
  const q = questionsQuiz[indexActuel];

  let interfaceReponse = '';

  if (q.type === 'qcm' && q.reponses_proposees) {
    interfaceReponse = q.reponses_proposees.map(rep => `
      <label class="checkbox-label" style="display:block;padding:10px;background:var(--bleu-clair);border-radius:8px;margin-bottom:8px;">
        <input type="radio" name="reponseQuestion" value="${rep}"> ${rep}
      </label>
    `).join('');
  } else if (q.type === 'vrai_faux') {
    interfaceReponse = `
      <label class="checkbox-label" style="display:block;padding:10px;background:var(--bleu-clair);border-radius:8px;margin-bottom:8px;">
        <input type="radio" name="reponseQuestion" value="vrai"> Vrai
      </label>
      <label class="checkbox-label" style="display:block;padding:10px;background:var(--bleu-clair);border-radius:8px;margin-bottom:8px;">
        <input type="radio" name="reponseQuestion" value="faux"> Faux
      </label>
    `;
  } else {
    interfaceReponse = `<input type="text" id="champReponseQuiz" placeholder="Ta réponse..." style="width:100%;padding:12px;border:1px solid var(--bordure);border-radius:8px;font-size:16px;">`;
  }

  zone.innerHTML = `
    <p style="font-size:13px;color:var(--texte-gris);margin-bottom:8px;">Question ${indexActuel + 1} / ${questionsQuiz.length}</p>
    <p style="font-size:16px;line-height:1.6;margin-bottom:16px;">${q.enonce}</p>
    ${interfaceReponse}
    <button id="btnSuivant" class="btn-secondaire" style="margin-top:16px;">${indexActuel === questionsQuiz.length - 1 ? 'Terminer' : 'Question suivante'}</button>
  `;

  document.getElementById('btnSuivant').addEventListener('click', () => {
    let reponseDonnee = '';
    if (q.type === 'qcm' || q.type === 'vrai_faux') {
      const choisi = document.querySelector('input[name="reponseQuestion"]:checked');
      if (!choisi) { alert("Choisis une réponse."); return; }
      reponseDonnee = choisi.value;
    } else {
      reponseDonnee = document.getElementById('champReponseQuiz').value;
      if (!reponseDonnee.trim()) { alert("Écris une réponse."); return; }
    }

    const estCorrect = normaliserQuiz(reponseDonnee) === normaliserQuiz(q.bonne_reponse);
    reponsesDonnees.push({ question: q, reponseDonnee, estCorrect });

    indexActuel++;
    if (indexActuel < questionsQuiz.length) {
      afficherQuestion();
    } else {
      afficherResultat();
    }
  });
}

function afficherResultat() {
  incrementerTentatives();

  const container = document.getElementById('contenuQuiz');
  const nbCorrectes = reponsesDonnees.filter(r => r.estCorrect).length;
  const total = reponsesDonnees.length;
  const pourcentage = Math.round((nbCorrectes / total) * 100);

  const detailQuestions = reponsesDonnees.map((r, i) => `
    <div style="padding:12px;background:${r.estCorrect ? '#f0fdf4' : '#fef2f2'};border-radius:8px;margin-bottom:10px;">
      <p style="font-size:13px;color:var(--texte-gris);margin-bottom:4px;">Question ${i + 1}</p>
      <p style="margin-bottom:6px;">${r.question.enonce}</p>
      <p style="font-size:14px;">${r.estCorrect ? '✅' : '❌'} Ta réponse : <strong>${r.reponseDonnee}</strong></p>
      ${!r.estCorrect && r.question.bonne_reponse ? `<p style="font-size:14px;">Bonne réponse : <strong>${r.question.bonne_reponse}</strong></p>` : ''}
      ${r.question.explication ? `<p style="font-size:13px;margin-top:6px;color:var(--texte-gris);">${r.question.explication}</p>` : ''}
    </div>
  `).join('');

  container.innerHTML = `
    <h1 style="font-size:22px;color:var(--bleu-fonce);margin-bottom:8px;">Résultat</h1>
    <p style="font-size:32px;font-weight:700;color:var(--bleu-principal);margin-bottom:4px;">${pourcentage}%</p>
    <p style="color:var(--texte-gris);margin-bottom:24px;">${nbCorrectes} / ${total} bonnes réponses</p>
    ${detailQuestions}
    <a href="quiz.html" class="btn-secondaire" style="display:inline-block;margin-top:10px;text-decoration:none;">← Retour aux quiz</a>
  `;
}

chargerQuiz();
