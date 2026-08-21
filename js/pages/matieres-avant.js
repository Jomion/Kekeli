// Section accueil : quelques matières mises en avant, choisies aléatoirement à chaque visite

async function chargerMatieresAvant() {
  const container = document.getElementById('matieresAvantContainer');

  const { data: matieres, error } = await supabaseClient
    .from('matieres')
    .select('*, classes(nom)');

  if (error || !matieres || matieres.length === 0) {
    container.innerHTML = '<p style="padding:0 20px;color:var(--texte-gris);">Contenu à venir prochainement.</p>';
    return;
  }

  // Garde une seule matière par nom (évite les doublons comme "EPS" répété pour chaque classe)
  const parNom = {};
  matieres.forEach(m => {
    if (!parNom[m.nom]) parNom[m.nom] = [];
    parNom[m.nom].push(m);
  });

  const nomsUniques = Object.keys(parNom);

  // Mélange aléatoire des noms
  for (let i = nomsUniques.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nomsUniques[i], nomsUniques[j]] = [nomsUniques[j], nomsUniques[i]];
  }

  // Prend les 6 premiers noms après mélange, et pour chacun une matière au hasard parmi ses classes
  const selection = nomsUniques.slice(0, 6).map(nom => {
    const options = parNom[nom];
    return options[Math.floor(Math.random() * options.length)];
  });

  container.innerHTML = '<div class="grille-matieres-avant"></div>';
  const grille = container.querySelector('.grille-matieres-avant');

  selection.forEach(m => {
    const carte = document.createElement('a');
    carte.href = `pages/matiere.html?id=${m.id}`;
    carte.className = 'carte-classe';
    carte.innerHTML = `<span class="icone-matiere">${iconeMatiere(m.nom)}</span>${m.nom_complet || m.nom}<small style="display:block;font-weight:400;font-size:12px;margin-top:4px;">${m.classes ? m.classes.nom : ''}</small>`;
    grille.appendChild(carte);
  });
}

chargerMatieresAvant();
