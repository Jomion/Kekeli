// Section accueil : quelques matières mises en avant (toutes classes confondues)

async function chargerMatieresAvant() {
  const container = document.getElementById('matieresAvantContainer');

  const { data: matieres, error } = await supabaseClient
    .from('matieres')
    .select('*, classes(nom)')
    .order('created_at', { ascending: false })
    .limit(6);

  if (error || !matieres || matieres.length === 0) {
    container.innerHTML = '<p style="padding:0 20px;color:var(--texte-gris);">Contenu à venir prochainement.</p>';
    return;
  }

  container.innerHTML = '<div class="grille-matieres-avant"></div>';
  const grille = container.querySelector('.grille-matieres-avant');

  matieres.forEach(m => {
    const carte = document.createElement('a');
    carte.href = `pages/matiere.html?id=${m.id}`;
    carte.className = 'carte-classe';
    carte.innerHTML = `${m.nom_complet || m.nom}<small style="display:block;font-weight:400;font-size:12px;margin-top:4px;">${m.classes ? m.classes.nom : ''}</small>`;
    grille.appendChild(carte);
  });
}

chargerMatieresAvant();
