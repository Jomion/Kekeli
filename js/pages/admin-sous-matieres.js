// Gestion CRUD des sous-matières

verifierConnexion();

let sousMatiereEnEdition = null;
let toutesLesMatieres = [];
let toutesLesClasses = [];

async function chargerClasses() {
  const [resClasses, resMatieres] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesClasses = resClasses.data;
  toutesLesMatieres = resMatieres.data || [];

  const selectClasse = document.getElementById('classe');
  const selectFiltre = document.getElementById('filtreClasse');

  toutesLesClasses.forEach(classe => {
    const opt1 = document.createElement('option');
    opt1.value = classe.id;
    opt1.textContent = classe.nom;
    selectClasse.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = classe.id;
    opt2.textContent = classe.nom;
    selectFiltre.appendChild(opt2);
  });

  // Filtre matière : liste des noms de matières distincts
  const nomsMatieresUniques = [...new Set(toutesLesMatieres.map(m => m.nom))].sort();
  const selectFiltreMatiere = document.getElementById('filtreMatiere');
  nomsMatieresUniques.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectFiltreMatiere.appendChild(opt);
  });

  chargerListe();
}

// Remplit le menu Matière avec les noms distincts des matières des classes cochées
function remplirMatieresDuFormulaire() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const selectMatiere = document.getElementById('matiere');

  selectMatiere.innerHTML = '<option value="">-- Choisir une matière --</option>';

  if (classesChoisies.length === 0) {
    selectMatiere.innerHTML = '<option value="">-- Choisir d\'abord une/des classe(s) --</option>';
    return;
  }

  const nomsDisponibles = [...new Set(
    toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id)).map(m => m.nom)
  )].sort();

  nomsDisponibles.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectMatiere.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieresDuFormulaire);

async function chargerListe() {
  const container = document.getElementById('listeSousMatieres');
  const filtreClasseId = document.getElementById('filtreClasse').value;
  const filtreMatiereNom = document.getElementById('filtreMatiere').value;

  const { data, error } = await supabaseClient
    .from('sous_matieres')
    .select('*, matieres(nom, classe_id, classes(nom))')
    .order('ordre', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  let donneesAffichees = data;
  if (filtreClasseId) {
    donneesAffichees = donneesAffichees.filter(sm => sm.matieres && sm.matieres.classe_id === filtreClasseId);
  }
  if (filtreMatiereNom) {
    donneesAffichees = donneesAffichees.filter(sm => sm.matieres && sm.matieres.nom === filtreMatiereNom);
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

  Array.from(document.getElementById('classe').options).forEach(opt => {
    opt.selected = (opt.value === sm.matieres.classe_id);
  });
  remplirMatieresDuFormulaire();
  document.getElementById('matiere').value = sm.matieres.nom;
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

  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiereChoisie = document.getElementById('matiere').value;
  const nom = document.getElementById('nom').value;
  const ordre = parseInt(document.getElementById('ordre').value);
  const messageForm = document.getElementById('messageForm');

  if (classesChoisies.length === 0 || !nomMatiereChoisie) {
    messageForm.textContent = "Sélectionne au moins une classe et une matière.";
    return;
  }

  let resultat;

  if (sousMatiereEnEdition) {
    const matiere = toutesLesMatieres.find(m => m.classe_id === classesChoisies[0] && m.nom === nomMatiereChoisie);
    resultat = await supabaseClient
      .from('sous_matieres')
      .update({ matiere_id: matiere.id, nom, ordre })
      .eq('id', sousMatiereEnEdition);
  } else {
    // Retrouve la matière correspondante pour chaque classe cochée
    const lignes = [];
    const classesIgnorees = [];

    classesChoisies.forEach(classeId => {
      const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiereChoisie);
      if (matiere) {
        lignes.push({ matiere_id: matiere.id, nom, ordre });
      } else {
        const classe = toutesLesClasses.find(c => c.id === classeId);
        classesIgnorees.push(classe ? classe.nom : '?');
      }
    });

    if (lignes.length === 0) {
      messageForm.textContent = "Aucune des classes sélectionnées n'a cette matière.";
      return;
    }

    resultat = await supabaseClient.from('sous_matieres').insert(lignes);

    if (!resultat.error && classesIgnorees.length > 0) {
      messageForm.style.color = '#b45309';
      messageForm.textContent = `Ajouté, mais ignoré pour : ${classesIgnorees.join(', ')} (matière absente pour ces classes).`;
    }
  }

  if (resultat.error) {
    if (resultat.error.code === '23505') {
      messageForm.textContent = "Cette sous-matière existe déjà pour au moins une des classes sélectionnées.";
    } else {
      messageForm.textContent = "Erreur : " + resultat.error.message;
    }
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  sousMatiereEnEdition = null;
  if (!messageForm.textContent.includes('ignoré')) messageForm.textContent = '';
  messageForm.style.color = '';

  chargerListe();
});

document.getElementById('filtreClasse').addEventListener('change', chargerListe);
document.getElementById('filtreMatiere').addEventListener('change', chargerListe);

chargerClasses();
