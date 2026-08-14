// Gestion CRUD des classes

async function verifierAccesSuperAdmin() {
  await verifierConnexion();
  if (profilAdmin.role !== 'super_admin') {
    document.body.innerHTML = '<p style="padding:40px;text-align:center;color:#dc2626;">Accès réservé au super administrateur.</p>';
    throw new Error('Accès refusé');
  }
}
verifierAccesSuperAdmin();

let classeEnEdition = null; // null = mode ajout, sinon = id de la classe modifiée

// Charge et affiche la liste des classes
async function chargerListe() {
  const container = document.getElementById('listeClasses');

  const { data, error } = await supabaseClient
    .from('classes')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  if (data.length === 0) {
    container.innerHTML = "Aucune classe pour l'instant.";
    return;
  }

  container.innerHTML = '';
  data.forEach(classe => {
    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${classe.nom} <small>(ordre: ${classe.ordre})</small></span>
      <div class="admin-ligne-actions">
        <button class="btn-modifier" data-id="${classe.id}">✏️</button>
        <button class="btn-supprimer" data-id="${classe.id}">🗑️</button>
      </div>
    `;
    container.appendChild(ligne);
  });

  // Attache les événements sur les nouveaux boutons
  document.querySelectorAll('.btn-modifier').forEach(btn => {
    btn.addEventListener('click', () => activerModeEdition(btn.dataset.id, data));
  });
  document.querySelectorAll('.btn-supprimer').forEach(btn => {
    btn.addEventListener('click', () => supprimerClasse(btn.dataset.id));
  });
}

// Prépare le formulaire pour modifier une classe existante
function activerModeEdition(id, listeClasses) {
  const classe = listeClasses.find(c => c.id === id);
  if (!classe) return;

  document.getElementById('nom').value = classe.nom;
  document.getElementById('ordre').value = classe.ordre;
  classeEnEdition = id;

  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Supprime une classe
async function supprimerClasse(id) {
  const confirmation = window.confirm("Supprimer cette classe ? Tout son contenu lié sera aussi supprimé.");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('classes').delete().eq('id', id);

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  chargerListe();
}

// Gère l'envoi du formulaire (ajout OU modification)
document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nom = document.getElementById('nom').value;
  const ordre = parseInt(document.getElementById('ordre').value);
  const messageForm = document.getElementById('messageForm');

  let resultat;
  if (classeEnEdition) {
    resultat = await supabaseClient
      .from('classes')
      .update({ nom, ordre })
      .eq('id', classeEnEdition);
  } else {
    resultat = await supabaseClient
      .from('classes')
      .insert({ nom, ordre });
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  // Réinitialise le formulaire
  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  classeEnEdition = null;
  messageForm.textContent = '';

  chargerListe();
});

chargerListe();
