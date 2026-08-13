// Récupère et affiche la liste des classes sur la page d'accueil
async function chargerClasses() {
  const container = document.getElementById('classesContainer');

  const { data, error } = await supabaseClient
    .from('classes')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur de chargement des classes.";
    console.error(error);
    return;
  }

  container.innerHTML = '';
  data.forEach(classe => {
    const carte = document.createElement('a');
    carte.href = `pages/cours.html?classe=${classe.id}`;
    carte.className = 'carte-classe';
    carte.textContent = classe.nom;
    container.appendChild(carte);
  });
}

chargerClasses();
