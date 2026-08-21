// Gestion CRUD des sous-matières (désormais rattachées à une Unité/Dossier)

let sousMatiereEnEdition = null;
let toutesLesClasses = [];
let toutesLesMatieres = [];
let tousLesUD = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resUD] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesClasses = resClasses.data;
  toutesLesMatieres = resMatieres.data || [];
  tousLesUD = resUD.data || [];

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

function remplirMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  document.getElementById('uniteDossier').innerHTML = '<option value="">-- Choisir d\'abord une matière --</option>';

  const selectMatiere = document.getElementById('matiere');
  selectMatiere.innerHTML = '<option value="">-- Choisir une matière --</option>';
  if (classesChoisies.length === 0) return;

  const noms = [...new Set(toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id)).map(m => m.nom))].sort();
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectMatiere.appendChild(opt);
  });
}

function remplirUD() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const selectUD = document.getElementById('uniteDossier');
  selectUD.innerHTML = '<option value="">-- Aucune --</option>';
  if (!nomMatiere) return;

  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  const udDisponibles = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id));

  udDisponibles.forEach(ud => {
    const opt = document.createElement('option');
    opt.value = ud.nom + (ud.semaine ? '|' + ud.semaine : '');
    opt.textContent = `${ud.nom}${ud.semaine ? ' (' + ud.semaine + ')' : ''} - ${ud.type}`;
    selectUD.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', () => { remplirMatieres(); remplirUD(); });
document.getElementById('matiere').addEventListener('change', remplirUD);

async function chargerListe() {
  const container = document.getElementById('listeSousMatieres');
  const filtreClasseId = document.getElementById('filtreClasse').value;
  const filtreMatiereNom = document.getElementById('filtreMatiere').value;

  const { data, error } = await supabaseClient
    .from('sous_matieres')
    .select('*, unites_dossiers(nom, semaine, type, matiere_id, matieres(nom, classe_id))')
    .order('ordre', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  let donneesAffichees = data.map(sm => {
    const ud = sm.unites_dossiers;
    const matiere = ud ? ud.matieres : null;
    return {
      ...sm,
      udNom: ud ? ud.nom : '?',
      udSemaine: ud ? ud.semaine : null,
      matiereNom: matiere ? matiere.nom : '?',
      classeId: matiere ? matiere.classe_id : null
    };
  });

  if (filtreClasseId) donneesAffichees = donneesAffichees.filter(sm => sm.classeId === filtreClasseId);
  if (filtreMatiereNom) donneesAffichees = donneesAffichees.filter(sm => sm.matiereNom === filtreMatiereNom);

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucune sous-matière pour l'instant.";
    return;
  }

  container.innerHTML = '';
  donneesAffichees.forEach(sm => {
    const classeObj = toutesLesClasses.find(c => c.id === sm.classeId);
    const semaineAffichee = sm.udSemaine ? ` - ${sm.udSemaine}` : '';

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${sm.nom} <small>(${sm.udNom}${semaineAffichee} - ${sm.matiereNom} - ${classeObj ? classeObj.nom : '?'})</small></span>
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
    opt.selected = (opt.value === sm.classeId);
  });
  remplirMatieres();
  document.getElementById('matiere').value = sm.matiereNom;
  remplirUD();
  document.getElementById('uniteDossier').value = sm.udNom + (sm.udSemaine ? '|' + sm.udSemaine : '');

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

// Retrouve l'UD réel à partir de la valeur "nom|semaine" du select
function resoudreUD(classeId, nomMatiere, valeurUD) {
  const [nomUD, semaineUD] = valeurUD.split('|');
  const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiere);
  if (!matiere) return null;
  return tousLesUD.find(ud => ud.matiere_id === matiere.id && ud.nom === nomUD && (ud.semaine || '') === (semaineUD || ''));
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiereChoisie = document.getElementById('matiere').value;
  const valeurUD = document.getElementById('uniteDossier').value;
  const nom = document.getElementById('nom').value;
  const ordre = parseInt(document.getElementById('ordre').value);
  const messageForm = document.getElementById('messageForm');

  if (classesChoisies.length === 0 || !nomMatiereChoisie || !valeurUD) {
    messageForm.textContent = "Sélectionne une classe, une matière et une unité/dossier.";
    return;
  }

  let resultat;

  if (sousMatiereEnEdition) {
    const ud = resoudreUD(classesChoisies[0], nomMatiereChoisie, valeurUD);
    if (!ud) { messageForm.textContent = "Combinaison invalide."; return; }
    resultat = await supabaseClient.from('sous_matieres').update({ unite_dossier_id: ud.id, matiere_id: ud.matiere_id, nom, ordre }).eq('id', sousMatiereEnEdition);
  } else {
    const lignes = [];
    const ignorees = [];

    classesChoisies.forEach(classeId => {
      const ud = resoudreUD(classeId, nomMatiereChoisie, valeurUD);
      if (!ud) {
        const classe = toutesLesClasses.find(c => c.id === classeId);
        ignorees.push(classe ? classe.nom : '?');
        return;
      }
      lignes.push({ unite_dossier_id: ud.id, matiere_id: ud.matiere_id, nom, ordre });
    });

    if (lignes.length === 0) {
      messageForm.textContent = "Aucune des classes sélectionnées n'a cette combinaison matière/unité.";
      return;
    }

    resultat = await supabaseClient.from('sous_matieres').insert(lignes);

    if (!resultat.error && ignorees.length > 0) {
      messageForm.style.color = '#b45309';
      messageForm.textContent = `Ajouté, mais ignoré pour : ${ignorees.join(', ')}.`;
    }
  }

  if (resultat.error) {
    if (resultat.error.code === '23505') {
      messageForm.textContent = "Cette sous-matière existe déjà pour cette unité/dossier.";
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

async function initPage() {
  await verifierConnexion();
  if (!profilAdmin || profilAdmin.role !== 'super_admin') {
    document.body.innerHTML = '<p style="padding:40px;text-align:center;color:#dc2626;">Accès réservé au super administrateur.</p>';
    return;
  }
  chargerDonneesBase();
}
initPage();
