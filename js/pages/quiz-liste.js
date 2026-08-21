// Page publique : liste des quiz disponibles pour une classe

async function chargerClassesQuiz() {
  const { data: classes, error } = await supabaseClient
    .from('classes')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) return;

  const select = document.getElementById('selectClasse');
  classes.forEach(classe => {
    const opt = document.createElement('option');
    opt.value = classe.id;
    opt.textContent = classe.nom;
    select.appendChild(opt);
  });
}

async function chargerQuiz(classeId) {
  const container = document.getElementById('listeQuizPublic');

  if (!classeId) {
    container.innerHTML = '<p style="padding:0 20px;color:var(--texte-gris);">Choisis une classe pour voir ses quiz.</p>';
    return;
  }

  const { data: quizList, error } = await supabaseClient
    .from('quiz')
    .select('*, matieres(nom, nom_complet)')
    .eq('classe_id', classeId)
    .eq('statut', 'publie')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  if (quizList.length === 0) {
    container.innerHTML = '<p style="padding:0 20px;">Aucun quiz disponible pour cette classe pour l\'instant.</p>';
    return;
  }

  container.innerHTML = '<div id="grilleQuiz" style="display:flex;flex-direction:column;gap:10px;padding:24px 20px;"></div>';
  const grille = document.getElementById('grilleQuiz');

  quizList.forEach(quiz => {
    const carte = document.createElement('a');
    carte.href = `quiz-jouer.html?id=${quiz.id}`;
    carte.className = 'admin-ligne';
    carte.style.textDecoration = 'none';
    const nomMatiere = quiz.matieres ? (quiz.matieres.nom_complet || quiz.matieres.nom) : 'Toutes matières';
    carte.innerHTML = `<span>${quiz.titre} <small>(${nomMatiere})</small></span>`;
    grille.appendChild(carte);
  });
}

document.getElementById('selectClasse').addEventListener('change', (e) => {
  chargerQuiz(e.target.value);
});

chargerClassesQuiz();
