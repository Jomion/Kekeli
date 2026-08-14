// Gestion CRUD des sous-matières

verifierConnexion();

let sousMatiereEnEdition = null;
let toutesLesMatieres = [];

// Charge les classes dans les menus (formulaire + filtre)
async function chargerClasses() {
  const { data, error } = await supabaseClient
    .from('classes')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) {
    alert("Erreur classes : " + error.message);
    return;
  }

  const selectClasse = document.getElementById('classe');
  const selectFiltre = document.getElementById('filtreClasse');

  data.forEach(classe => {
    const opt1 = document.createElement('option');
    opt1.value = classe.id;
    opt1.textContent = classe.nom;
    selectClasse.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = classe.id;
    opt2.textContent = classe.nom;
    selectFiltre.appendChild(opt2);
  });

  // Charge aussi toutes les matières une seule fois, pour filtrer ensuite en mémoire
  const resultatMatieres = await supabaseClient.from('matieres').select('*');
  toutesLesMatieres = resultatMatieres.data || [];

  chargerListe();
}

// Remplit le menu "Matière" du formulaire selon la classe choisie
function remplirMatieresDuFormulaire() {
  const classeId = document.getElementById('classe').value;
  const selectMatiere = document.getElementById('matiere');

  selectMatiere.innerHTML = '<option value="">-- Choisir une matière --</option>';

  if (!classeId) {
    selectMatiere.innerHTML = '<option value="">-- Choisir d\'abord une classe --</option>';
    return;
  }

  const matieresFiltrees = toutesLesMatieres.filter(m => m.classe_id === classeId);
  matieresFiltrees.forEach(matiere => {
    const opt = document.createElement('option');
    opt.value = matiere.id;
    opt.textContent = matiere.nom;
    selectMatiere.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieresDuFormulaire);

// Charge et affiche la liste des sous-matières
async function chargerListe() {
  const container = document.getElementById('listeSousMatieres');
  const filtreClasseId = document.getElementById('filtreClasse').value;

  let requete = supabaseClient
    .from('sous_matieres')
    .select('*, matieres(nom, classe_id, classes(nom))')
    .order('ordre', { ascending: true });

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  let donneesAffichees = data;
  if (filtreClasseId) {
    donneesAffichees = data.filter(sm => sm.matieres && sm.matieres.classe_id === filtreClasseId);
  }

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucune sous-matière pour l'instant.";
    return;
  }

  container.innerHTML = '';
  donneesAffichees.forEach(sm => {
    const nomMatiere = sm.matieres ? sm.matieres.nom : '?';
    const nomClasse = sm.matieres && sm.matieres.classes ? sm.matieres.classes.nom : '?';

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${sm.nom} <small>(${nomMatiere} - ${nomClasse})</small></span>
      <div class="admin-ligne-actions">
        <button class="btn-modifier" data-id="${sm.id}">✏️</button>
        <button class="btn-supprimer" data-id="${sm.id}">🗑️</button>
      </div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-modifier').forEach(btn => {
    btn.addEventListener('click', () => activerModeEdition(btn.dataset.id, donneesAffichees));
  });
  document.querySelectorAll('.btn-supprimer').forEach(btn => {
    btn.addEventListener('click', () => supprimerSousMatiere(btn.dataset.id));
  });
}

function activerModeEdition(id, liste) {
  const sm = liste.find(s => s.id === id);
  if (!sm) return;

  document.getElementById('classe').value = sm.matieres.classe_id;
  remplirMatieresDuFormulaire();
  document.getElementById('matiere').value = sm.matiere_id;
  document.getElementById('nom').value = sm.nom;
  document.getElementById('ordre').value = sm.ordre;
  sousMatiereEnEdition = id;

  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function supprimerSousMatiere(id) {
  const confirmation = window.confirm("Supprimer cette sous-matière ? Tout son contenu lié sera aussi supprimé.");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('sous_matieres').delete().eq('id', id);

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  chargerListe();
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  const matiere_id = document.getElementById('matiere').value;
  const nom = document.getElementById('nom').value;
  const ordre = parseInt(document.getElementById('ordre').value);
  const messageForm = document.getElementById('messageForm');

  let resultat;
  if (sousMatiereEnEdition) {
    resultat = await supabaseClient
      .from('sous_matieres')
      .update({ matiere_id, nom, ordre })
      .eq('id', sousMatiereEnEdition);
  } else {
    resultat = await supabaseClient
      .from('sous_matieres')
      .insert({ matiere_id, nom, ordre });
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  sousMatiereEnEdition = null;
  messageForm.textContent = '';

  chargerListe();
});

document.getElementById('filtreClasse').addEventListener('change', chargerListe);

chargerClasses();
