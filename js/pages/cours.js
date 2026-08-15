// Page publique : liste des matières d'une classe

const paramsUrl = new URLSearchParams(window.location.search);
const classeId = paramsUrl.get('classe');

async function chargerMatieres() {
  const container = document.getElementById('listeMatieres');
  const titre = document.getElementById('titreClasse');

  if (!classeId) {
    container.innerHTML = "Aucune classe sélectionnée. Retourne à l'accueil pour en choisir une.";
    return;
  }

  const { data: classe, error: errClasse } = await supabaseClient
    .from('classes')
    .select('*')
    .eq('id', classeId)
    .single();

  if (errClasse || !classe) {
    titre.textContent = "Classe introuvable";
    container.innerHTML = '';
    return;
  }

  titre.textContent = `Cours - ${classe.nom}`;

  const { data: matieres, error } = await supabaseClient
    .from('matieres')
    .select('*')
    .eq('classe_id', classeId)
    .order('ordre', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  if (matieres.length === 0) {
    container.innerHTML = "Aucune matière disponible pour cette classe pour l'instant.";
    return;
  }

  container.innerHTML = '<div id="grilleMatieres" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:0 20px 24px;"></div>';
  const grille = document.getElementById('grilleMatieres');

  matieres.forEach(matiere => {
    const carte = document.createElement('a');
    carte.href = `matiere.html?id=${matiere.id}`;
    carte.className = 'carte-classe';
    carte.textContent = matiere.nom_complet || matiere.nom;
    grille.appendChild(carte);
  });
}

chargerMatieres();
