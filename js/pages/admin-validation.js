// Page de validation des séances en attente (réservée aux contrôleurs)

let toutesLesMatieres = [];
let toutesLesSousMatieres = [];
let tousLesUD = [];
let toutesLesSA = [];
let toutesLesClasses = [];
let tousLesAdmins = [];

function matiereIdDeSeance(seance) {
  function depuisSM(smId) {
    const sm = toutesLesSousMatieres.find(s => s.id === smId);
    return sm ? sm.matiere_id : null;
  }
  function depuisUD(udId) {
    const ud = tousLesUD.find(u => u.id === udId);
    if (!ud) return null;
    return ud.sous_matiere_id ? depuisSM(ud.sous_matiere_id) : ud.matiere_id;
  }
  if (seance.sa_id) {
    const sa = toutesLesSA.find(s => s.id === seance.sa_id);
    if (sa) {
      if (sa.unite_dossier_id) return depuisUD(sa.unite_dossier_id);
      if (sa.sous_matiere_id) return depuisSM(sa.sous_matiere_id);
      return sa.matiere_id;
    }
  }
  if (seance.unite_dossier_id) return depuisUD(seance.unite_dossier_id);
  if (seance.sous_matiere_id) return depuisSM(seance.sous_matiere_id);
  return seance.matiere_id;
}

function contexteSeance(seance) {
  const matiereId = matiereIdDeSeance(seance);
  const matiere = toutesLesMatieres.find(m => m.id === matiereId);
  const classe = matiere ? toutesLesClasses.find(c => c.id === matiere.classe_id) : null;
  const libelleAffiche = `${seance.libelle === 'seance' ? 'Séance' : 'Séquence'} ${seance.numero || ''}`.trim();
  return `${libelleAffiche} - ${matiere ? matiere.nom : '?'} - ${classe ? classe.nom : '?'}`;
}

function nomAdmin(id) {
  const a = tousLesAdmins.find(x => x.id === id);
  return a ? a.nom : 'inconnu';
}

async function chargerListe() {
  const container = document.getElementById('listeEnAttente');

  const [resMatieres, resSousMatieres, resUD, resSA, resClasses, resAdmins, resSeances] = await Promise.all([
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*'),
    supabaseClient.from('sa').select('*'),
    supabaseClient.from('classes').select('*'),
    supabaseClient.from('administrateurs').select('id, nom'),
    supabaseClient.from('seances').select('*').eq('statut', 'en_attente').order('created_at', { ascending: true })
  ]);

  toutesLesMatieres = resMatieres.data || [];
  toutesLesSousMatieres = resSousMatieres.data || [];
  tousLesUD = resUD.data || [];
  toutesLesSA = resSA.data || [];
  toutesLesClasses = resClasses.data || [];
  tousLesAdmins = resAdmins.data || [];

  let seancesAValider = resSeances.data || [];

  // Si pas super_admin, ne montrer que les séances des admins dont on est le contrôleur
  if (profilAdmin.role !== 'super_admin') {
    const { data: adminsControles } = await supabaseClient
      .from('administrateur_controleur')
      .select('administrateur_id')
      .eq('controleur_id', profilAdmin.id);

    const idsAutorises = (adminsControles || []).map(a => a.administrateur_id);
    idsAutorises.push(profilAdmin.id); // inclut ses propres séances si auto-contrôleur

    seancesAValider = seancesAValider.filter(s => idsAutorises.includes(s.cree_par));
  }

  if (seancesAValider.length === 0) {
    container.innerHTML = "Aucune séance en attente de validation.";
    return;
  }

  container.innerHTML = '';
  seancesAValider.forEach(seance => {
    const dateObj = new Date(seance.created_at);
    const dateAffichee = dateObj.toLocaleDateString('fr-FR') + ' à ' + dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.style.flexDirection = 'column';
    ligne.style.alignItems = 'stretch';
    ligne.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span><strong>${seance.titre}</strong> <small>(${contexteSeance(seance)})</small></span>
        <div class="admin-ligne-actions">
          <button class="btn-voir" data-id="${seance.id}">👁️ Voir</button>
          <button class="btn-valider" data-id="${seance.id}">✅ Publier</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--texte-gris);margin-top:4px;">Soumis le ${dateAffichee} par ${nomAdmin(seance.cree_par)}</div>
      <div id="apercu-${seance.id}" style="display:none;margin-top:10px;padding:12px;background:var(--bleu-clair);border-radius:8px;font-size:14px;"></div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-voir').forEach(btn => {
    btn.addEventListener('click', () => afficherApercu(btn.dataset.id, seancesAValider));
  });
  document.querySelectorAll('.btn-valider').forEach(btn => {
    btn.addEventListener('click', () => validerSeance(btn.dataset.id));
  });
}

function afficherApercu(id, liste) {
  const seance = liste.find(s => s.id === id);
  const zone = document.getElementById('apercu-' + id);
  if (!seance || !zone) return;

  if (zone.style.display === 'none') {
    zone.innerHTML = `
      ${seance.objectif ? `<p><strong>Objectif :</strong> ${seance.objectif}</p>` : ''}
      ${seance.introduction ? `<p><strong>Introduction :</strong> ${seance.introduction}</p>` : ''}
      ${seance.contenu ? `<p><strong>Contenu :</strong> ${seance.contenu}</p>` : ''}
      ${seance.exemples ? `<p><strong>Exemples :</strong> ${seance.exemples}</p>` : ''}
      ${seance.resume ? `<p><strong>Résumé :</strong> ${seance.resume}</p>` : ''}
      ${seance.a_retenir ? `<p><strong>À retenir :</strong> ${seance.a_retenir}</p>` : ''}
    `;
    zone.style.display = 'block';
  } else {
    zone.style.display = 'none';
  }
}

async function validerSeance(id) {
  const confirmation = window.confirm("Publier cette séance ? Elle deviendra visible publiquement.");
  if (confirmation !== true) return;

  const { error } = await supabaseClient
    .from('seances')
    .update({
      statut: 'publie',
      valide_par: profilAdmin.id,
      valide_le: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  chargerListe();
}

async function initPage() {
  await verifierConnexion();

  if (!peutValider()) {
    document.getElementById('zoneAccesRefuse').style.display = 'block';
    return;
  }

  document.getElementById('zoneContenu').style.display = 'block';
  chargerListe();
}

initPage();
