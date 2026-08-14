// Gestion CRUD des SA

async function verifierAccesSuperAdmin() {
  await verifierConnexion();
  if (profilAdmin.role !== 'super_admin') {
    document.body.innerHTML = '<p style="padding:40px;text-align:center;color:#dc2626;">Accès réservé au super administrateur.</p>';
    throw new Error('Accès refusé');
  }
}
verifierAccesSuperAdmin();

let saEnEdition = null;
let toutesLesMatieres = [];
let toutesLesSousMatieres = [];
let tousLesUD = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resSousMatieres, resUD] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesMatieres = resMatieres.data || [];
  toutesLesSousMatieres = resSousMatieres.data || [];
  tousLesUD = resUD.data || [];

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
  document.getElementById('sousMatiere').innerHTML = '<option value="">-- Aucune / non applicable --</option>';
  document.getElementById('uniteDossier').innerHTML = '<option value="">-- Aucun / rattacher directement --</option>';

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
  const selectSM = document.getElementById('sousMatiere');
  document.getElementById('uniteDossier').innerHTML = '<option value="">-- Aucun / rattacher directement --</option>';

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
  const selectUD = document.getElementById('uniteDossier');

  selectUD.innerHTML = '<option value="">-- Aucun / rattacher directement --</option>';

  // Les unités/dossiers rattachées soit à cette sous-matière, soit directement à cette matière
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
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirSousMatieres);
document.getElementById('sousMatiere').addEventListener('change', remplirUD);

// Retrouve la classe_id d'une SA en remontant la hiérarchie
function retrouverClasseId(sa) {
  let matiereId = sa.matiere_id;

  if (sa.unite_dossier_id) {
    const ud = tousLesUD.find(u => u.id === sa.unite_dossier_id);
    if (ud) {
      if (ud.sous_matiere_id) {
        const sm = toutesLesSousMatieres.find(s => s.id === ud.sous_matiere_id);
        matiereId = sm ? sm.matiere_id : null;
      } else {
        matiereId = ud.matiere_id;
      }
    }
  } else if (sa.sous_matiere_id) {
    const sm = toutesLesSousMatieres.find(s => s.id === sa.sous_matiere_id);
    matiereId = sm ? sm.matiere_id : null;
  }

  const matiere = toutesLesMatieres.find(m => m.id === matiereId);
  return matiere ? matiere.classe_id : null;
}

function retrouverContexte(sa) {
  if (sa.unite_dossier_id) {
    const ud = tousLesUD.find(u => u.id === sa.unite_dossier_id);
    return ud ? `${ud.nom}` : '?';
  }
  if (sa.sous_matiere_id) {
    const sm = toutesLesSousMatieres.find(s => s.id === sa.sous_matiere_id);
    return sm ? sm.nom : '?';
  }
  if (sa.matiere_id) {
    const m = toutesLesMatieres.find(m => m.id === sa.matiere_id);
    return m ? m.nom : '?';
  }
  return '?';
}

async function chargerListe() {
  const container = document.getElementById('listeSA');
  const filtreClasseId = document.getElementById('filtreClasse').value;

  const { data, error } = await supabaseClient
    .from('sa')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  let donneesAffichees = data;
  if (filtreClasseId) {
    donneesAffichees = data.filter(sa => retrouverClasseId(sa) === filtreClasseId);
  }

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucune SA pour l'instant.";
    return;
  }

  container.innerHTML = '';
  donneesAffichees.forEach(sa => {
    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${sa.nom} <small>(${retrouverContexte(sa)})</small></span>
      <div class="admin-ligne-actions">
        <button class="btn-modifier" data-id="${sa.id}">✏️</button>
        <button class="btn-supprimer" data-id="${sa.id}">🗑️</button>
      </div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-modifier').forEach(btn => {
    btn.addEventListener('click', () => activerModeEdition(btn.dataset.id, donneesAffichees));
  });
  document.querySelectorAll('.btn-supprimer').forEach(btn => {
    btn.addEventListener('click', () => supprimerSA(btn.dataset.id));
  });
}

function activerModeEdition(id, liste) {
  const sa = liste.find(s => s.id === id);
  if (!sa) return;

  const classeId = retrouverClasseId(sa);
  document.getElementById('classe').value = classeId;
  remplirMatieres();

  let matiereId = sa.matiere_id;
  if (sa.unite_dossier_id) {
    const ud = tousLesUD.find(u => u.id === sa.unite_dossier_id);
    matiereId = ud.sous_matiere_id
      ? toutesLesSousMatieres.find(s => s.id === ud.sous_matiere_id).matiere_id
      : ud.matiere_id;
  } else if (sa.sous_matiere_id) {
    matiereId = toutesLesSousMatieres.find(s => s.id === sa.sous_matiere_id).matiere_id;
  }
  document.getElementById('matiere').value = matiereId;
  remplirSousMatieres();

  document.getElementById('sousMatiere').value = sa.sous_matiere_id || (sa.unite_dossier_id ? (tousLesUD.find(u => u.id === sa.unite_dossier_id).sous_matiere_id || '') : '');
  remplirUD();

  document.getElementById('uniteDossier').value = sa.unite_dossier_id || '';
  document.getElementById('nom').value = sa.nom;
  document.getElementById('ordre').value = sa.ordre;
  saEnEdition = id;

  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function supprimerSA(id) {
  const confirmation = window.confirm("Supprimer cette SA ? Tout son contenu lié sera aussi supprimé.");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('sa').delete().eq('id', id);

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
  const nom = document.getElementById('nom').value;
  const ordre = parseInt(document.getElementById('ordre').value);
  const messageForm = document.getElementById('messageForm');

  // Priorité : Unité/Dossier > Sous-matière > Matière
  const payload = {
    nom,
    ordre,
    unite_dossier_id: uniteDossierId || null,
    sous_matiere_id: (!uniteDossierId && sousMatiereId) ? sousMatiereId : null,
    matiere_id: (!uniteDossierId && !sousMatiereId) ? matiereId : null
  };

  let resultat;
  if (saEnEdition) {
    resultat = await supabaseClient.from('sa').update(payload).eq('id', saEnEdition);
  } else {
    resultat = await supabaseClient.from('sa').insert(payload);
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  saEnEdition = null;
  messageForm.textContent = '';

  chargerListe();
});

document.getElementById('filtreClasse').addEventListener('change', chargerListe);

chargerDonneesBase();
