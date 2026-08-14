// Gestion CRUD des ressources

verifierConnexion();

let ressourceEnEdition = null;
let toutesLesMatieres = [];
let toutesLesSousMatieres = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resSousMatieres] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('sous_matieres').select('*')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesMatieres = resMatieres.data || [];
  toutesLesSousMatieres = resSousMatieres.data || [];

  const selectClasse = document.getElementById('classe');
  const selectFiltre = document.getElementById('filtreClasse');

  resClasses.data.forEach(classe => {
    const opt1 = document.createElement('option');
    opt1.value = classe.id;
    opt1.textContent = classe.nom;
    selectClasse.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = classe.id;
    opt2.textContent = classe.nom;
    selectFiltre.appendChild(opt2);
  });

  chargerListe();
}

function remplirMatieres() {
  const classeId = document.getElementById('classe').value;
  document.getElementById('sousMatiere').innerHTML = '<option value="">-- Aucune --</option>';

  const selectMatiere = document.getElementById('matiere');
  selectMatiere.innerHTML = '<option value="">-- Toutes matières --</option>';
  if (!classeId) return;

  toutesLesMatieres.filter(m => m.classe_id === classeId).forEach(matiere => {
    const opt = document.createElement('option');
    opt.value = matiere.id;
    opt.textContent = matiere.nom;
    selectMatiere.appendChild(opt);
  });
}

function remplirSousMatieres() {
  const matiereId = document.getElementById('matiere').value;
  const selectSM = document.getElementById('sousMatiere');
  selectSM.innerHTML = '<option value="">-- Aucune --</option>';
  if (!matiereId) return;

  toutesLesSousMatieres.filter(sm => sm.matiere_id === matiereId).forEach(sm => {
    const opt = document.createElement('option');
    opt.value = sm.id;
    opt.textContent = sm.nom;
    selectSM.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirSousMatieres);

function nomClasse(classeId) {
  if (!classeId) return 'toutes classes';
  const selectFiltre = document.getElementById('filtreClasse');
  const option = Array.from(selectFiltre.options).find(o => o.value === classeId);
  return option ? option.textContent : '?';
}

async function chargerListe() {
  const container = document.getElementById('listeRessources');
  const filtreClasseId = document.getElementById('filtreClasse').value;

  let requete = supabaseClient.from('ressources').select('*').order('created_at', { ascending: false });
  if (filtreClasseId) requete = requete.eq('classe_id', filtreClasseId);

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  if (data.length === 0) {
    container.innerHTML = "Aucune ressource pour l'instant.";
    return;
  }

  container.innerHTML = '';
  data.forEach(ressource => {
    const badgeStatut = ressource.statut === 'publie' ? '🟢' : '⚪';
    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${badgeStatut} ${ressource.titre} <small>(${ressource.type} - ${nomClasse(ressource.classe_id)})</small></span>
      <div class="admin-ligne-actions">
        <button class="btn-modifier" data-id="${ressource.id}">✏️</button>
        <button class="btn-supprimer" data-id="${ressource.id}">🗑️</button>
      </div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-modifier').forEach(btn => {
    btn.addEventListener('click', () => activerModeEdition(btn.dataset.id, data));
  });
  document.querySelectorAll('.btn-supprimer').forEach(btn => {
    btn.addEventListener('click', () => supprimerRessource(btn.dataset.id));
  });
}

function activerModeEdition(id, liste) {
  const ressource = liste.find(r => r.id === id);
  if (!ressource) return;

  document.getElementById('classe').value = ressource.classe_id || '';
  remplirMatieres();
  document.getElementById('matiere').value = ressource.matiere_id || '';
  remplirSousMatieres();
  document.getElementById('sousMatiere').value = ressource.sous_matiere_id || '';

  document.getElementById('titre').value = ressource.titre;
  document.getElementById('type').value = ressource.type;
  document.getElementById('url').value = ressource.url;
  document.getElementById('statut').value = ressource.statut;

  ressourceEnEdition = id;
  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function supprimerRessource(id) {
  const confirmation = window.confirm("Supprimer cette ressource ?");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('ressources').delete().eq('id', id);

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  chargerListe();
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  const messageForm = document.getElementById('messageForm');

  const payload = {
    classe_id: document.getElementById('classe').value || null,
    matiere_id: document.getElementById('matiere').value || null,
    sous_matiere_id: document.getElementById('sousMatiere').value || null,
    titre: document.getElementById('titre').value,
    type: document.getElementById('type').value,
    url: document.getElementById('url').value,
    statut: document.getElementById('statut').value
  };

  let resultat;
  if (ressourceEnEdition) {
    resultat = await supabaseClient.from('ressources').update(payload).eq('id', ressourceEnEdition);
  } else {
    resultat = await supabaseClient.from('ressources').insert(payload);
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  ressourceEnEdition = null;
  messageForm.textContent = '';

  chargerListe();
});

document.getElementById('filtreClasse').addEventListener('change', chargerListe);

chargerDonneesBase();
