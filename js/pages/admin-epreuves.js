// Gestion CRUD des épreuves

verifierConnexion();

let epreuveEnEdition = null;
let toutesLesMatieres = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesMatieres = resMatieres.data || [];

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
  const selectMatiere = document.getElementById('matiere');
  selectMatiere.innerHTML = '<option value="">-- Choisir une matière --</option>';
  if (!classeId) return;

  toutesLesMatieres.filter(m => m.classe_id === classeId).forEach(matiere => {
    const opt = document.createElement('option');
    opt.value = matiere.id;
    opt.textContent = matiere.nom;
    selectMatiere.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieres);

function nomClasse(classeId) {
  const selectFiltre = document.getElementById('filtreClasse');
  const option = Array.from(selectFiltre.options).find(o => o.value === classeId);
  return option ? option.textContent : '?';
}

function nomMatiere(matiereId) {
  const m = toutesLesMatieres.find(m => m.id === matiereId);
  return m ? m.nom : '?';
}

async function chargerListe() {
  const container = document.getElementById('listeEpreuves');
  const filtreClasseId = document.getElementById('filtreClasse').value;

  let requete = supabaseClient.from('epreuves').select('*').order('created_at', { ascending: false });
  if (filtreClasseId) requete = requete.eq('classe_id', filtreClasseId);

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  if (data.length === 0) {
    container.innerHTML = "Aucune épreuve pour l'instant.";
    return;
  }

  container.innerHTML = '';
  data.forEach(epreuve => {
    const badgeStatut = epreuve.statut === 'publie' ? '🟢' : '⚪';
    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${badgeStatut} ${epreuve.titre} <small>(${nomMatiere(epreuve.matiere_id)} - ${nomClasse(epreuve.classe_id)} - ${epreuve.trimestre})</small></span>
      <div class="admin-ligne-actions">
        <button class="btn-modifier" data-id="${epreuve.id}">✏️</button>
        <button class="btn-supprimer" data-id="${epreuve.id}">🗑️</button>
      </div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-modifier').forEach(btn => {
    btn.addEventListener('click', () => activerModeEdition(btn.dataset.id, data));
  });
  document.querySelectorAll('.btn-supprimer').forEach(btn => {
    btn.addEventListener('click', () => supprimerEpreuve(btn.dataset.id));
  });
}

function activerModeEdition(id, liste) {
  const epreuve = liste.find(e => e.id === id);
  if (!epreuve) return;

  document.getElementById('classe').value = epreuve.classe_id;
  remplirMatieres();
  document.getElementById('matiere').value = epreuve.matiere_id;

  document.getElementById('titre').value = epreuve.titre;
  document.getElementById('trimestre').value = epreuve.trimestre;
  document.getElementById('anneeScolaire').value = epreuve.annee_scolaire;
  document.getElementById('typeEpreuve').value = epreuve.type_epreuve || '';
  document.getElementById('typeRealisation').value = epreuve.type_realisation;
  document.getElementById('fichierPdfUrl').value = epreuve.fichier_pdf_url || '';
  document.getElementById('correctionPdfUrl').value = epreuve.correction_pdf_url || '';
  document.getElementById('statut').value = epreuve.statut;

  epreuveEnEdition = id;
  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function supprimerEpreuve(id) {
  const confirmation = window.confirm("Supprimer cette épreuve ?");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('epreuves').delete().eq('id', id);

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
    classe_id: document.getElementById('classe').value,
    matiere_id: document.getElementById('matiere').value,
    titre: document.getElementById('titre').value,
    trimestre: document.getElementById('trimestre').value,
    annee_scolaire: document.getElementById('anneeScolaire').value,
    type_epreuve: document.getElementById('typeEpreuve').value || null,
    type_realisation: document.getElementById('typeRealisation').value,
    fichier_pdf_url: document.getElementById('fichierPdfUrl').value || null,
    correction_pdf_url: document.getElementById('correctionPdfUrl').value || null,
    statut: document.getElementById('statut').value
  };

  let resultat;
  if (epreuveEnEdition) {
    resultat = await supabaseClient.from('epreuves').update(payload).eq('id', epreuveEnEdition);
  } else {
    resultat = await supabaseClient.from('epreuves').insert(payload);
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  epreuveEnEdition = null;
  messageForm.textContent = '';

  chargerListe();
});

document.getElementById('filtreClasse').addEventListener('change', chargerListe);

chargerDonneesBase();
