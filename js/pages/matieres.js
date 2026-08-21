// Page publique : liste des matières, filtrable par classe

const paramsMatieres = new URLSearchParams(window.location.search);
const classePreselectionnee = paramsMatieres.get('classe');

async function chargerClasses() {
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

  if (classePreselectionnee) {
    select.value = classePreselectionnee;
    chargerMatieres(classePreselectionnee);
  }
}

async function chargerMatieres(classeId) {
  const container = document.getElementById('listeMatieres');

  if (!classeId) {
    container.innerHTML = '<p style="padding:0 20px;color:var(--texte-gris);">Choisis une classe pour voir ses matières.</p>';
    return;
  }

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
    container.innerHTML = '<p style="padding:0 20px;">Aucune matière disponible pour cette classe pour l\'instant.</p>';
    return;
  }

  container.innerHTML = '<div id="grille" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:24px 20px;"></div>';
  const grille = document.getElementById('grille');

  matieres.forEach(matiere => {
    const carte = document.createElement('a');
        const carte = document.createElement('a');
    carte.href = `matiere.html?id=${matiere.id}`;
    carte.className = 'carte-classe';
    carte.innerHTML = `<span class="icone-matiere">${iconeMatiere(matiere.nom)}</span>${matiere.nom_complet || matiere.nom}`;
    grille.appendChild(carte);
  });
}

document.getElementById('selectClasse').addEventListener('change', (e) => {
  chargerMatieres(e.target.value);
});

chargerClasses();
