// Gestion CRUD des Unités/Dossiers

let udEnEdition = null;
let toutesLesMatieres = [];
let toutesLesSousMatieres = [];
let toutesLesClasses = [];

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

  toutesLesClasses = resClasses.data;
  toutesLesMatieres = resMatieres.data || [];
  toutesLesSousMatieres = resSousMatieres.data || [];

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

// Remplit Matière avec les noms distincts des matières des classes cochées
function remplirMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const selectMatiere = document.getElementById('matiere');
  document.getElementById('sousMatiere').innerHTML = '<option value="">-- Aucune / non applicable --</option>';

  selectMatiere.innerHTML = '<option value="">-- Choisir une matière --</option>';
  if (classesChoisies.length === 0) return;

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

// Remplit Sous-matière avec les noms distincts pour la matière + classes choisies
function remplirSousMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const selectSM = document.getElementById('sousMatiere');

  selectSM.innerHTML = '<option value="">-- Aucune / non applicable --</option>';
  if (!nomMatiere) return;

  const matieresConcernees = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere);
  const idsMatieres = matieresConcernees.map(m => m.id);

  const nomsSM = [...new Set(
    toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id)).map(sm => sm.nom)
  )].sort();

  nomsSM.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectSM.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirSousMatieres);

async function chargerListe() {
  const container = document.getElementById('listeUnitesDossiers');
  const filtreClasseId = document.getElementById('filtreClasse').value;
  const filtreMatiereNom = document.getElementById('filtreMatiere').value;

  const { data, error } = await supabaseClient
    .from('unites_dossiers')
    .select('*, sous_matieres(nom, matiere_id), matieres(nom, classe_id)')
    .order('ordre', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

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
    donneesAffichees = donneesAffichees.filter(item => item.classeId === filtreClasseId);
  }
  if (filtreMatiereNom) {
    donneesAffichees = donneesAffichees.filter(item => item.matiereNom === filtreMatiereNom);
  }

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucune unité/dossier pour l'instant.";
    return;
  }

  container.innerHTML = '';
  donneesAffichees.forEach(item => {
    const classeObj = toutesLesClasses.find(c => c.id === item.classeId);
    const nomClasseAffiche = classeObj ? classeObj.nom : '?';
    const contexte = item.sousMatiereNom
      ? `${item.sousMatiereNom} - ${item.matiereNom} - ${nomClasseAffiche}`
      : `${item.matiereNom} - ${nomClasseAffiche}`;
    const semaineAffichee = item.semaine ? ` - ${item.semaine}` : '';
    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${item.nom} <small>(${item.type} - ${contexte}${semaineAffichee})</small></span>
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

  Array.from(document.getElementById('classe').options).forEach(opt => {
    opt.selected = (opt.value === item.classeId);
  });
  remplirMatieres();
  document.getElementById('matiere').value = item.matiereNom;
  remplirSousMatieres();
  document.getElementById('sousMatiere').value = item.sousMatiereNom || '';

  document.getElementById('type').value = item.type;
  document.getElementById('semaine').value = item.semaine || '';
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

  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiereChoisie = document.getElementById('matiere').value;
  const nomSousMatiereChoisie = document.getElementById('sousMatiere').value;
  const type = document.getElementById('type').value;
  const semaine = document.getElementById('semaine').value || null;
  const nom = document.getElementById('nom').value;
  const ordre = parseInt(document.getElementById('ordre').value);
  const messageForm = document.getElementById('messageForm');

  if (classesChoisies.length === 0 || !nomMatiereChoisie) {
    messageForm.textContent = "Sélectionne au moins une classe et une matière.";
    return;
  }

  let resultat;

  if (udEnEdition) {
    const matiere = toutesLesMatieres.find(m => m.classe_id === classesChoisies[0] && m.nom === nomMatiereChoisie);
    const sm = nomSousMatiereChoisie
      ? toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSousMatiereChoisie)
      : null;

    resultat = await supabaseClient.from('unites_dossiers').update({
      type, semaine, nom, ordre,
      sous_matiere_id: sm ? sm.id : null,
      matiere_id: sm ? null : matiere.id
    }).eq('id', udEnEdition);
  } else {
    const lignes = [];
    const classesIgnorees = [];

    classesChoisies.forEach(classeId => {
      const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiereChoisie);
      if (!matiere) {
        const classe = toutesLesClasses.find(c => c.id === classeId);
        classesIgnorees.push(classe ? classe.nom : '?');
        return;
      }

      let sousMatiereId = null;
      if (nomSousMatiereChoisie) {
        const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSousMatiereChoisie);
        if (!sm) {
          const classe = toutesLesClasses.find(c => c.id === classeId);
          classesIgnorees.push(classe ? classe.nom : '?');
          return;
        }
        sousMatiereId = sm.id;
      }

      lignes.push({
        type, semaine, nom, ordre,
        sous_matiere_id: sousMatiereId,
        matiere_id: sousMatiereId ? null : matiere.id
      });
    });

    if (lignes.length === 0) {
      messageForm.textContent = "Aucune des classes sélectionnées n'a cette matière/sous-matière.";
      return;
    }

    resultat = await supabaseClient.from('unites_dossiers').insert(lignes);

    if (!resultat.error && classesIgnorees.length > 0) {
      messageForm.style.color = '#b45309';
      messageForm.textContent = `Ajouté, mais ignoré pour : ${classesIgnorees.join(', ')}.`;
    }
  }

  if (resultat.error) {
    if (resultat.error.code === '23505') {
      messageForm.textContent = "Cet élément existe déjà pour au moins une des classes sélectionnées.";
    } else {
      messageForm.textContent = "Erreur : " + resultat.error.message;
    }
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  udEnEdition = null;
  if (!messageForm.textContent.includes('ignoré')) messageForm.textContent = '';
  messageForm.style.color = '';

  chargerListe();
});

document.getElementById('filtreClasse').addEventListener('change', chargerListe);
document.getElementById('filtreMatiere').addEventListener('change', chargerListe);

async function initPage() {
  await verifierConnexion();
  if (!profilAdmin || profilAdmin.role !== 'super_admin') {
    document.body.innerHTML = '<p style="padding:40px;text-align:center;color:#dc2626;">Accès réservé au super administrateur.</p>';
    return;
  }
  chargerDonneesBase();
}
initPage();
