// Gestion des administrateurs (réservé au super_admin)

async function initPage() {
  await verifierConnexion();

  if (!profilAdmin || profilAdmin.role !== 'super_admin') {
    document.getElementById('zoneAccesRefuse').style.display = 'block';
    return;
  }

  document.getElementById('zoneContenu').style.display = 'block';
  chargerDonneesBase();
}

let toutesLesClasses = [];
let toutesLesMatieres = [];
let tousLesAdmins = [];
let adminEnEdition = null;

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resAdmins] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*, classes(nom)').order('nom', { ascending: true }),
    supabaseClient.from('administrateurs').select('*').order('created_at', { ascending: true })
  ]);

  toutesLesClasses = resClasses.data || [];
  toutesLesMatieres = resMatieres.data || [];
  tousLesAdmins = resAdmins.data || [];

  const selectClasses = document.getElementById('classesAutorisees');
  toutesLesClasses.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nom;
    selectClasses.appendChild(opt);
  });

  const selectMatieres = document.getElementById('matieresAutorisees');
  toutesLesMatieres.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.nom} (${m.classes ? m.classes.nom : '?'})`;
    selectMatieres.appendChild(opt);
  });

  const selectControleur = document.getElementById('controleur');
  tousLesAdmins.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.nom} (${a.email})`;
    selectControleur.appendChild(opt);
  });

  chargerListe();
}

function valeursSelectionnees(selectId) {
  const select = document.getElementById(selectId);
  return Array.from(select.selectedOptions).map(opt => opt.value);
}

function definirValeursSelectionnees(selectId, valeurs) {
  const select = document.getElementById(selectId);
  Array.from(select.options).forEach(opt => {
    opt.selected = valeurs.includes(opt.value);
  });
}

async function chargerListe() {
  const container = document.getElementById('listeAdmins');

  const { data: liensControleurs } = await supabaseClient.from('administrateur_controleur').select('*');

  container.innerHTML = '';
  tousLesAdmins.forEach(admin => {
    const badgeRole = admin.role === 'super_admin' ? '👑 Super admin' : '👤 Admin';
    const badgeActif = admin.actif ? '🟢' : '🔴';
    const badgeLecture = admin.lecture_seule ? ' (lecture seule)' : '';

    const lien = (liensControleurs || []).find(l => l.administrateur_id === admin.id);
    let nomControleur = 'lui-même';
    if (lien) {
      const c = tousLesAdmins.find(a => a.id === lien.controleur_id);
      nomControleur = c ? c.nom : '?';
    } else if (admin.role !== 'super_admin') {
      const sa = tousLesAdmins.find(a => a.role === 'super_admin');
      nomControleur = sa ? `${sa.nom} (défaut)` : '?';
    }

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${badgeActif} ${admin.nom} <small>(${admin.email} - ${badgeRole}${badgeLecture} - contrôleur: ${nomControleur})</small></span>
      <div class="admin-ligne-actions">
        <button class="btn-modifier" data-id="${admin.id}">✏️</button>
        <button class="btn-supprimer" data-id="${admin.id}">🗑️</button>
      </div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-modifier').forEach(btn => {
    btn.addEventListener('click', () => activerModeEdition(btn.dataset.id));
  });
  document.querySelectorAll('.btn-supprimer').forEach(btn => {
    btn.addEventListener('click', () => supprimerAdmin(btn.dataset.id));
  });
}

async function activerModeEdition(id) {
  const admin = tousLesAdmins.find(a => a.id === id);
  if (!admin) return;

  const [resClasses, resMatieres, resTypes, resControleur] = await Promise.all([
    supabaseClient.from('administrateur_classes').select('classe_id').eq('administrateur_id', id),
    supabaseClient.from('administrateur_matieres').select('matiere_id').eq('administrateur_id', id),
    supabaseClient.from('administrateur_types_contenu').select('type_contenu').eq('administrateur_id', id),
    supabaseClient.from('administrateur_controleur').select('controleur_id').eq('administrateur_id', id).maybeSingle()
  ]);

  document.getElementById('uid').value = admin.id;
  document.getElementById('uid').readOnly = true;
  document.getElementById('email').value = admin.email;
  document.getElementById('nom').value = admin.nom;
  document.getElementById('role').value = admin.role;
  document.getElementById('lectureSeule').checked = admin.lecture_seule;
  document.getElementById('actif').checked = admin.actif;
  document.getElementById('controleur').value = resControleur.data ? resControleur.data.controleur_id : '';

  definirValeursSelectionnees('classesAutorisees', (resClasses.data || []).map(c => c.classe_id));
  definirValeursSelectionnees('matieresAutorisees', (resMatieres.data || []).map(m => m.matiere_id));
  definirValeursSelectionnees('typesAutorises', (resTypes.data || []).map(t => t.type_contenu));

  adminEnEdition = id;
  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function supprimerAdmin(id) {
  if (id === profilAdmin.id) {
    alert("Tu ne peux pas supprimer ton propre compte super administrateur.");
    return;
  }

  const confirmation = window.confirm("Supprimer cet administrateur ? (le compte de connexion Supabase Auth doit être supprimé séparément si besoin)");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('administrateurs').delete().eq('id', id);

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  chargerDonneesBase();
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  const messageForm = document.getElementById('messageForm');
  const uid = document.getElementById('uid').value.trim();
  const controleurId = document.getElementById('controleur').value;

  const payloadAdmin = {
    id: uid,
    email: document.getElementById('email').value,
    nom: document.getElementById('nom').value,
    role: document.getElementById('role').value,
    lecture_seule: document.getElementById('lectureSeule').checked,
    actif: document.getElementById('actif').checked
  };

  let resultat;
  if (adminEnEdition) {
    resultat = await supabaseClient.from('administrateurs').update(payloadAdmin).eq('id', adminEnEdition);
  } else {
    resultat = await supabaseClient.from('administrateurs').insert(payloadAdmin);
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  await supabaseClient.from('administrateur_classes').delete().eq('administrateur_id', uid);
  await supabaseClient.from('administrateur_matieres').delete().eq('administrateur_id', uid);
  await supabaseClient.from('administrateur_types_contenu').delete().eq('administrateur_id', uid);
  await supabaseClient.from('administrateur_controleur').delete().eq('administrateur_id', uid);

  const classesChoisies = valeursSelectionnees('classesAutorisees');
  const matieresChoisies = valeursSelectionnees('matieresAutorisees');
  const typesChoisis = valeursSelectionnees('typesAutorises');

  if (classesChoisies.length > 0) {
    await supabaseClient.from('administrateur_classes').insert(
      classesChoisies.map(classeId => ({ administrateur_id: uid, classe_id: classeId }))
    );
  }
  if (matieresChoisies.length > 0) {
    await supabaseClient.from('administrateur_matieres').insert(
      matieresChoisies.map(matiereId => ({ administrateur_id: uid, matiere_id: matiereId }))
    );
  }
  if (typesChoisis.length > 0) {
    await supabaseClient.from('administrateur_types_contenu').insert(
      typesChoisis.map(type => ({ administrateur_id: uid, type_contenu: type }))
    );
  }
  if (controleurId) {
    await supabaseClient.from('administrateur_controleur').insert({ administrateur_id: uid, controleur_id: controleurId });
  }

  document.getElementById('formAjout').reset();
  document.getElementById('uid').readOnly = false;
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  adminEnEdition = null;
  messageForm.textContent = '';

  chargerDonneesBase();
});

initPage();
