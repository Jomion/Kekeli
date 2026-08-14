// Gestion CRUD des Unités/Dossiers

async function verifierAccesSuperAdmin() {
  await verifierConnexion();
  if (profilAdmin.role !== 'super_admin') {
    document.body.innerHTML = '<p style="padding:40px;text-align:center;color:#dc2626;">Accès réservé au super administrateur.</p>';
    throw new Error('Accès refusé');
  }
}
verifierAccesSuperAdmin();

let udEnEdition = null;
let toutesLesMatieres = [];
let toutesLesSousMatieres = [];

// Charge classes, matières et sous-matières une seule fois
async function chargerDonneesBase() {
  const resultatClasses = await supabaseClient.from('classes').select('*').order('ordre', { ascending: true });
  const resultatMatieres = await supabaseClient.from('matieres').select('*');
  const resultatSousMatieres = await supabaseClient.from('sous_matieres').select('*');

  if (resultatClasses.error) {
    alert("Erreur classes : " + resultatClasses.error.message);
    return;
  }

  toutesLesMatieres = resultatMatieres.data || [];
  toutesLesSousMatieres = resultatSousMatieres.data || [];

  const selectClasse = document.getElementById('classe');
  const selectFiltre = document.getElementById('filtreClasse');

  resultatClasses.data.forEach(classe => {
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

// Remplit le menu Matière selon la classe choisie
function remplirMatieres() {
  const classeId = document.getElementById('classe').value;
  const selectMatiere = document.getElementById('matiere');
  const selectSousMatiere = document.getElementById('sousMatiere');

  selectMatiere.innerHTML = '<option value="">-- Choisir une matière --</option>';
  selectSousMatiere.innerHTML = '<option value="">-- Aucune / non applicable --</option>';

  if (!classeId) {
    selectMatiere.innerHTML = '<option value="">-- Choisir d\'abord une classe --</option>';
    return;
  }

  toutesLesMatieres.filter(m => m.classe_id === classeId).forEach(matiere => {
    const opt = document.createElement('option');
    opt.value = matiere.id;
    opt.textContent = matiere.nom;
    selectMatiere.appendChild(opt);
  });
}

// Remplit le menu Sous-matière selon la matière choisie
function remplirSousMatieres() {
  const matiereId = document.getElementById('matiere').value;
  const selectSousMatiere = document.getElementById('sousMatiere');

  selectSousMatiere.innerHTML = '<option value="">-- Aucune / non applicable --</option>';

  if (!matiereId) return;

  toutesLesSousMatieres.filter(sm => sm.matiere_id === matiereId).forEach(sm => {
    const opt = document.createElement('option');
    opt.value = sm.id;
    opt.textContent = sm.nom;
    selectSousMatiere.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirSousMatieres);

// Charge et affiche la liste
async function chargerListe() {
  const container = document.getElementById('listeUnitesDossiers');
  const filtreClasseId = document.getElementById('filtreClasse').value;

  const { data, error } = await supabaseClient
    .from('unites_dossiers')
    .select('*, sous_matieres(nom, matiere_id), matieres(nom, classe_id)')
    .order('ordre', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  // Détermine la classe réelle de chaque ligne (via sous-matière OU matière directe)
  const enrichi = data.map(item => {
    let matiereReelle = item.matieres;
    let sousMatiereNom = null;

    if (item.sous_matieres) {
      sousMatiereNom = item.sous_matieres.nom;
      const matiereParentId = item.sous_matieres.matiere_id;
      matiereReelle = toutesLesMatieres.find(m => m.id === matiereParentId) || null;
    }

    return {
      ...item,
      matiereNom: matiereReelle ? matiereReelle.nom : '?',
      classeId: matiereReelle ? matiereReelle.classe_id : null,
      sousMatiereNom
    };
  });

  let donneesAffichees = enrichi;
  if (filtreClasseId) {
    donneesAffichees = enrichi.filter(item => item.classeId === filtreClasseId);
  }

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucune unité/dossier pour l'instant.";
    return;
  }

  container.innerHTML = '';
  donneesAffichees.forEach(item => {
    const contexte = item.sousMatiereNom
      ? `${item.sousMatiereNom} - ${item.matiereNom}`
      : item.matiereNom;

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${item.nom} <small>(${item.type} - ${contexte})</small></span>
      <div class="admin-ligne-actions">
        <button class="btn-modifier" data-id="${item.id}">✏️</button>
        <button class="btn-supprimer" data-id="${item.id}">🗑️</button>
      </div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-modifier').forEach(btn => {
    btn.addEventListener('click', () => activerModeEdition(btn.dataset.id, donneesAffichees));
  });
  document.querySelectorAll('.btn-supprimer').forEach(btn => {
    btn.addEventListener('click', () => supprimerUD(btn.dataset.id));
  });
}

function activerModeEdition(id, liste) {
  const item = liste.find(i => i.id === id);
  if (!item) return;

  document.getElementById('classe').value = item.classeId;
  remplirMatieres();

  const matiereId = item.sous_matieres ? item.sous_matieres.matiere_id : item.matiere_id;
  document.getElementById('matiere').value = matiereId;
  remplirSousMatieres();

  document.getElementById('sousMatiere').value = item.sous_matiere_id || '';
  document.getElementById('type').value = item.type;
  document.getElementById('nom').value = item.nom;
  document.getElementById('ordre').value = item.ordre;
  udEnEdition = id;

  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function supprimerUD(id) {
  const confirmation = window.confirm("Supprimer cet élément ? Tout son contenu lié sera aussi supprimé.");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('unites_dossiers').delete().eq('id', id);

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  chargerListe();
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  const matiereId = document.getElementById('matiere').value;
  const sousMatiereId = document.getElementById('sousMatiere').value;
  const type = document.getElementById('type').value;
  const nom = document.getElementById('nom').value;
  const ordre = parseInt(document.getElementById('ordre').value);
  const messageForm = document.getElementById('messageForm');

  // Si une sous-matière est choisie, on l'utilise ; sinon on rattache directement à la matière
  const payload = {
    type,
    nom,
    ordre,
    sous_matiere_id: sousMatiereId || null,
    matiere_id: sousMatiereId ? null : matiereId
  };

  let resultat;
  if (udEnEdition) {
    resultat = await supabaseClient.from('unites_dossiers').update(payload).eq('id', udEnEdition);
  } else {
    resultat = await supabaseClient.from('unites_dossiers').insert(payload);
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  udEnEdition = null;
  messageForm.textContent = '';

  chargerListe();
});

document.getElementById('filtreClasse').addEventListener('change', chargerListe);

chargerDonneesBase();
