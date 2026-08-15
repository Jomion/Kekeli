// Gestion CRUD des matières

let matiereEnEdition = null;
let classesDisponibles = [];

async function chargerClasses() {
  const { data, error } = await supabaseClient
    .from('classes')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) {
    alert("Erreur classes : " + error.message);
    return;
  }

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

  // En modification, une seule classe est sélectionnée (celle de la matière existante)
  Array.from(document.getElementById('classe').options).forEach(opt => {
    opt.selected = (opt.value === matiere.classe_id);
  });
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

  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(opt => opt.value);
  const nom = document.getElementById('nom').value;
  const ordre = parseInt(document.getElementById('ordre').value);
  const messageForm = document.getElementById('messageForm');

  if (classesChoisies.length === 0) {
    messageForm.textContent = "Sélectionne au moins une classe.";
    return;
  }

  let resultat;

  if (matiereEnEdition) {
    // En modification, une seule classe (la première sélectionnée)
    resultat = await supabaseClient
      .from('matieres')
      .update({ classe_id: classesChoisies[0], nom, ordre })
      .eq('id', matiereEnEdition);
  } else {
    // En ajout, une ligne par classe sélectionnée
    const lignes = classesChoisies.map(classeId => ({ classe_id: classeId, nom, ordre }));
    resultat = await supabaseClient.from('matieres').insert(lignes);
  }

  if (resultat.error) {
    if (resultat.error.code === '23505') {
      messageForm.textContent = "Cette matière existe déjà pour au moins une des classes sélectionnées.";
    } else {
      messageForm.textContent = "Erreur : " + resultat.error.message;
    }
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  matiereEnEdition = null;
  messageForm.textContent = '';

  chargerListe();
});

document.getElementById('filtreClasse').addEventListener('change', chargerListe);

async function initPage() {
  await verifierConnexion();
  if (!profilAdmin || profilAdmin.role !== 'super_admin') {
    document.body.innerHTML = '<p style="padding:40px;text-align:center;color:#dc2626;">Accès réservé au super administrateur.</p>';
    return;
  }
  chargerClasses().then(chargerListe);
}
initPage();
