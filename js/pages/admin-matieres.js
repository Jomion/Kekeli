// Gestion CRUD des matières

verifierConnexion();

let matiereEnEdition = null;
let classesDisponibles = [];

// Charge les classes dans les deux menus déroulants (formulaire + filtre)
async function chargerClasses() {
  const { data, error } = await supabaseClient
    .from('classes')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) return;

  classesDisponibles = data;

  const selectClasse = document.getElementById('classe');
  const selectFiltre = document.getElementById('filtreClasse');

  data.forEach(classe => {
    const option1 = document.createElement('option');
    option1.value = classe.id;
    option1.textContent = classe.nom;
    selectClasse.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = classe.id;
    option2.textContent = classe.nom;
    selectFiltre.appendChild(option2);
  });
}

// Charge et affiche la liste des matières (avec filtre optionnel)
async function chargerListe() {
  const container = document.getElementById('listeMatieres');
  const filtreId = document.getElementById('filtreClasse').value;

  let requete = supabaseClient
    .from('matieres')
    .select('*, classes(nom)')
    .order('ordre', { ascending: true });

  if (filtreId) {
    requete = requete.eq('classe_id', filtreId);
  }

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  if (data.length === 0) {
    container.innerHTML = "Aucune matière pour l'instant.";
    return;
  }

  container.innerHTML = '';
  data.forEach(matiere => {
    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${matiere.nom} <small>(${matiere.classes.nom})</small></span>
      <div class="admin-ligne-actions">
        <button class="btn-modifier" data-id="${matiere.id}">✏️</button>
        <button class="btn-supprimer" data-id="${matiere.id}">🗑️</button>
      </div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-modifier').forEach(btn => {
    btn.addEventListener('click', () => activerModeEdition(btn.dataset.id, data));
  });
  document.querySelectorAll('.btn-supprimer').forEach(btn => {
    btn.addEventListener('click', () => supprimerMatiere(btn.dataset.id));
  });
}

function activerModeEdition(id, liste) {
  const matiere = liste.find(m => m.id === id);
  if (!matiere) return;

  document.getElementById('classe').value = matiere.classe_id;
  document.getElementById('nom').value = matiere.nom;
  document.getElementById('ordre').value = matiere.ordre;
  matiereEnEdition = id;

  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function supprimerMatiere(id) {
  const confirmation = window.confirm("Supprimer cette matière ? Tout son contenu lié sera aussi supprimé.");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('matieres').delete().eq('id', id);

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  chargerListe();
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  const classe_id = document.getElementById('classe').value;
  const nom = docum
