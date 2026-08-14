// Gestion CRUD des séances

verifierConnexion();

let seanceEnEdition = null;
let toutesLesMatieres = [];
let toutesLesSousMatieres = [];
let tousLesUD = [];
let toutesLesSA = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resSousMatieres, resUD, resSA] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*'),
    supabaseClient.from('sa').select('*')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesMatieres = resMatieres.data || [];
  toutesLesSousMatieres = resSousMatieres.data || [];
  tousLesUD = resUD.data || [];
  toutesLesSA = resSA.data || [];

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
  document.getElementById('sousMatiere').innerHTML = '<option value="">-- Aucune / non applicable --</option>';
  document.getElementById('uniteDossier').innerHTML = '<option value="">-- Aucun --</option>';
  document.getElementById('sa').innerHTML = '<option value="">-- Aucune / rattacher directement --</option>';

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

function remplirSousMatieres() {
  const matiereId = document.getElementById('matiere').value;
  document.getElementById('uniteDossier').innerHTML = '<option value="">-- Aucun --</option>';
  document.getElementById('sa').innerHTML = '<option value="">-- Aucune / rattacher directement --</option>';

  const selectSM = document.getElementById('sousMatiere');
  selectSM.innerHTML = '<option value="">-- Aucune / non applicable --</option>';
  if (!matiereId) return;

  toutesLesSousMatieres.filter(sm => sm.matiere_id === matiereId).forEach(sm => {
    const opt = document.createElement('option');
    opt.value = sm.id;
    opt.textContent = sm.nom;
    selectSM.appendChild(opt);
  });

  remplirUD();
}

function remplirUD() {
  const matiereId = document.getElementById('matiere').value;
  const sousMatiereId = document.getElementById('sousMatiere').value;
  document.getElementById('sa').innerHTML = '<option value="">-- Aucune / rattacher directement --</option>';

  const selectUD = document.getElementById('uniteDossier');
  selectUD.innerHTML = '<option value="">-- Aucun --</option>';

  const udFiltres = tousLesUD.filter(ud => {
    if (sousMatiereId) return ud.sous_matiere_id === sousMatiereId;
    return ud.matiere_id === matiereId;
  });

  udFiltres.forEach(ud => {
    const opt = document.createElement('option');
    opt.value = ud.id;
    opt.textContent = `${ud.nom} (${ud.type})`;
    selectUD.appendChild(opt);
  });

  remplirSA();
}

function remplirSA() {
  const matiereId = document.getElementById('matiere').value;
  const sousMatiereId = document.getElementById('sousMatiere').value;
  const uniteDossierId = document.getElementById('uniteDossier').value;

  const selectSA = document.getElementById('sa');
  selectSA.innerHTML = '<option value="">-- Aucune / rattacher directement --</option>';

  const saFiltrees = toutesLesSA.filter(sa => {
    if (uniteDossierId) return sa.unite_dossier_id === uniteDossierId;
    if (sousMatiereId) return sa.sous_matiere_id === sousMatiereId;
    return sa.matiere_id === matiereId;
  });

  saFiltrees.forEach(sa => {
    const opt = document.createElement('option');
    opt.value = sa.id;
    opt.textContent = sa.nom;
    selectSA.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirSousMatieres);
document.getElementById('sousMatiere').addEventListener('change', remplirUD);
document.getElementById('uniteDossier').addEventListener('change', remplirSA);

// Remonte la hiérarchie complète d'une séance pour retrouver sa classe_id
function retrouverClasseId(seance) {
  let matiereId = seance.matiere_id;

  function matiereDepuisSousMatiere(smId) {
    const sm = toutesLesSousMatieres.find(s => s.id === smId);
    return sm ? sm.matiere_id : null;
  }
  function matiereDepuisUD(udId) {
    const ud = tousLesUD.find(u => u.id === udId);
    if (!ud) return null;
    return ud.sous_matiere_id ? matiereDepuisSousMatiere(ud.sous_matiere_id) : ud.matiere_id;
  }

  if (seance.sa_id) {
    const sa = toutesLesSA.find(s => s.id === seance.sa_id);
    if (sa) {
      if (sa.unite_dossier_id) matiereId = matiereDepuisUD(sa.unite_dossier_id);
      else if (sa.sous_matiere_id) matiereId = matiereDepuisSousMatiere(sa.sous_matiere_id);
      else matiereId = sa.matiere_id;
    }
  } else if (seance.unite_dossier_id) {
    matiereId = matiereDepuisUD(seance.unite_dossier_id);
  } else if (seance.sous_matiere_id) {
    matiereId = matiereDepuisSousMatiere(seance.sous_matiere_id);
  }

  const matiere = toutesLesMatieres.find(m => m.id === matiereId);
  return matiere ? matiere.classe_id : null;
}

function retrouverContexte(seance) {
  if (seance.sa_id) {
    const sa = toutesLesSA.find(s => s.id === seance.sa_id);
    return sa ? sa.nom : '?';
  }
  if (seance.unite_dossier_id) {
    const ud = tousLesUD.find(u => u.id === seance.unite_dossier_id);
    return ud ? ud.nom : '?';
  }
  if (seance.sous_matiere_id) {
    const sm = toutesLesSousMatieres.find(s => s.id === seance.sous_matiere_id);
    return sm ? sm.nom : '?';
  }
  if (seance.matiere_id) {
    const m = toutesLesMatieres.find(m => m.id === seance.matiere_id);
    return m ? m.nom : '?';
  }
  return '?';
}

async function chargerListe() {
  const container = document.getElementById('listeSeances');
  const filtreClasseId = document.getElementById('filtreClasse').value;

  const { data, error } = await supabaseClient
    .from('seances')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  let donneesAffichees = data;
  if (filtreClasseId) {
    donneesAffichees = data.filter(s => retrouverClasseId(s) === filtreClasseId);
  }

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucune séance pour l'instant.";
    return;
  }

  container.innerHTML = '';
  donneesAffichees.forEach(seance => {
    const badgeStatut = seance.statut === 'publie' ? '🟢' : '⚪';
    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${badgeStatut} ${seance.libelle === 'seance' ? 'Séance' : 'Séquence'} ${seance.numero || ''} : ${seance.titre} <small>(${retrouverContexte(seance)})</small></span>
      <div class="admin-ligne-actions">
        <button class="btn-modifier" data-id="${seance.id}">✏️</button>
        <button class="btn-supprimer" data-id="${seance.id}">🗑️</button>
      </div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-modifier').forEach(btn => {
    btn.addEventListener('click', () => activerModeEdition(btn.dataset.id, donneesAffichees));
  });
  document.querySelectorAll('.btn-supprimer').forEach(btn => {
    btn.addEventListener('click', () => supprimerSeance(btn.dataset.id));
  });
}

function activerModeEdition(id, liste) {
  const seance = liste.find(s => s.id === id);
  if (!seance) return;

  const classeId = retrouverClasseId(seance);
  document.getElementById('classe').value = classeId;
  remplirMatieres();

  // Retrouve la matière réelle
  let matiereId = seance.matiere_id;
  let sousMatiereId = seance.sous_matiere_id;
  let uniteDossierId = seance.unite_dossier_id;

  if (seance.sa_id) {
    const sa = toutesLesSA.find(s => s.id === seance.sa_id);
    uniteDossierId = sa.unite_dossier_id;
    sousMatiereId = sa.sous_matiere_id;
    matiereId = sa.matiere_id;
  }

  if (uniteDossierId) {
    const ud = tousLesUD.find(u => u.id === uniteDossierId);
    sousMatiereId = ud.sous_matiere_id;
    matiereId = ud.sous_matiere_id
      ? toutesLesSousMatieres.find(s => s.id === ud.sous_matiere_id).matiere_id
      : ud.matiere_id;
  } else if (sousMatiereId) {
    matiereId = toutesLesSousMatieres.find(s => s.id === sousMatiereId).matiere_id;
  }

  document.getElementById('matiere').value = matiereId;
  remplirSousMatieres();
  document.getElementById('sousMatiere').value = sousMatiereId || '';
  remplirUD();
  document.getElementById('uniteDossier').value = uniteDossierId || '';
  remplirSA();
  document.getElementById('sa').value = seance.sa_id || '';

  document.getElementById('libelle').value = seance.libelle;
  document.getElementById('numero').value = seance.numero || '';
  document.getElementById('titre').value = seance.titre;
  document.getElementById('objectif').value = seance.objectif || '';
  document.getElementById('competence').value = seance.competence || '';
  document.getElementById('prerequis').value = seance.prerequis || '';
  document.getElementById('introduction').value = seance.introduction || '';
  document.getElementById('contenu').value = seance.contenu || '';
  document.getElementById('exemples').value = seance.exemples || '';
  document.getElementById('resume').value = seance.resume || '';
  document.getElementById('aRetenir').value = seance.a_retenir || '';
  document.getElementById('statut').value = seance.statut;
  document.getElementById('ordre').value = seance.ordre;

  seanceEnEdition = id;
  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function supprimerSeance(id) {
  const confirmation = window.confirm("Supprimer cette séance ? Tout son contenu lié (exercices...) sera aussi supprimé.");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('seances').delete().eq('id', id);

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
  const uniteDossierId = document.getElementById('uniteDossier').value;
  const saId = document.getElementById('sa').value;
  const messageForm = document.getElementById('messageForm');

  // Priorité : SA > Unité/Dossier > Sous-matière > Matière
  const payload = {
    libelle: document.getElementById('libelle').value,
    numero: document.getElementById('numero').value ? parseInt(document.getElementById('numero').value) : null,
    titre: document.getElementById('titre').value,
    objectif: document.getElementById('objectif').value || null,
    competence: document.getElementById('competence').value || null,
    prerequis: document.getElementById('prerequis').value || null,
    introduction: document.getElementById('introduction').value || null,
    contenu: document.getElementById('contenu').value || null,
    exemples: document.getElementById('exemples').value || null,
    resume: document.getElementById('resume').value || null,
    a_retenir: document.getElementById('aRetenir').value || null,
    statut: document.getElementById('statut').value,
    ordre: parseInt(document.getElementById('ordre').value),
    sa_id: saId || null,
    unite_dossier_id: (!saId && uniteDossierId) ? uniteDossierId : null,
    sous_matiere_id: (!saId && !uniteDossierId && sousMatiereId) ? sousMatiereId : null,
    matiere_id: (!saId && !uniteDossierId && !sousMatiereId) ? matiereId : null
  };

  let resultat;
  if (seanceEnEdition) {
    resultat = await supabaseClient.from('seances').update(payload).eq('id', seanceEnEdition);
  } else {
    resultat = await supabaseClient.from('seances').insert(payload);
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  seanceEnEdition = null;
  messageForm.textContent = '';

  chargerListe();
});

document.getElementById('filtreClasse').addEventListener('change', chargerListe);

chargerDonneesBase();
