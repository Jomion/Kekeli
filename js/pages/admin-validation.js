// Page de validation - tous types de contenu (réservée aux contrôleurs)

let toutesLesMatieres = [];
let toutesLesSousMatieres = [];
let tousLesUD = [];
let toutesLesSA = [];
let toutesLesClasses = [];
let tousLesAdmins = [];
let typeActuel = 'seances';

function matiereIdDepuisRattachement(item) {
  function depuisSM(smId) {
    const sm = toutesLesSousMatieres.find(s => s.id === smId);
    return sm ? sm.matiere_id : null;
  }
  function depuisUD(udId) {
    const ud = tousLesUD.find(u => u.id === udId);
    if (!ud) return null;
    return ud.sous_matiere_id ? depuisSM(ud.sous_matiere_id) : ud.matiere_id;
  }
  if (item.sa_id) {
    const sa = toutesLesSA.find(s => s.id === item.sa_id);
    if (sa) {
      if (sa.unite_dossier_id) return depuisUD(sa.unite_dossier_id);
      if (sa.sous_matiere_id) return depuisSM(sa.sous_matiere_id);
      return sa.matiere_id;
    }
  }
  if (item.unite_dossier_id) return depuisUD(item.unite_dossier_id);
  if (item.sous_matiere_id) return depuisSM(item.sous_matiere_id);
  return item.matiere_id;
}

function nomAdmin(id) {
  const a = tousLesAdmins.find(x => x.id === id);
  return a ? a.nom : 'inconnu';
}

function nomClasseDepuisMatiereId(matiereId) {
  const m = toutesLesMatieres.find(mm => mm.id === matiereId);
  if (!m) return '?';
  const c = toutesLesClasses.find(cl => cl.id === m.classe_id);
  return c ? c.nom : '?';
}

function nomMatiereParId(matiereId) {
  const m = toutesLesMatieres.find(mm => mm.id === matiereId);
  return m ? m.nom : '?';
}

// Construit le contexte affiché selon le type
function contexteItem(type, item) {
  if (type === 'seances') {
    const matiereId = matiereIdDepuisRattachement(item);
    const libelleAffiche = `${item.libelle === 'seance' ? 'Séance' : 'Séquence'} ${item.numero || ''}`.trim();
    return `${libelleAffiche} - ${nomMatiereParId(matiereId)} - ${nomClasseDepuisMatiereId(matiereId)}`;
  }
  if (type === 'exercices') {
    return item.type;
  }
  if (type === 'quiz') {
    const c = toutesLesClasses.find(cl => cl.id === item.classe_id);
    return c ? c.nom : '?';
  }
  if (type === 'epreuves') {
    const c = toutesLesClasses.find(cl => cl.id === item.classe_id);
    return `${nomMatiereParId(item.matiere_id)} - ${c ? c.nom : '?'} - ${item.trimestre}`;
  }
  if (type === 'ressources') {
    const c = item.classe_id ? toutesLesClasses.find(cl => cl.id === item.classe_id) : null;
    return c ? c.nom : 'générale';
  }
  return '';
}

function titreItem(type, item) {
  if (type === 'seances') return item.titre;
  if (type === 'exercices') return item.titre || item.enonce.substring(0, 50) + '...';
  if (type === 'quiz') return item.titre;
  if (type === 'epreuves') return item.titre;
  if (type === 'ressources') return item.titre;
  return '?';
}

function classeIdItem(type, item) {
  if (type === 'seances' || type === 'exercices') {
    const matiereId = matiereIdDepuisRattachement(item);
    const m = toutesLesMatieres.find(mm => mm.id === matiereId);
    return m ? m.classe_id : null;
  }
  return item.classe_id || null;
}

async function chargerDonneesBase() {
  const [resMatieres, resSousMatieres, resUD, resSA, resClasses, resAdmins] = await Promise.all([
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*'),
    supabaseClient.from('sa').select('*'),
    supabaseClient.from('classes').select('*'),
    supabaseClient.from('administrateurs').select('id, nom')
  ]);

  toutesLesMatieres = resMatieres.data || [];
  toutesLesSousMatieres = resSousMatieres.data || [];
  tousLesUD = resUD.data || [];
  toutesLesSA = resSA.data || [];
  toutesLesClasses = resClasses.data || [];
  tousLesAdmins = resAdmins.data || [];
}

async function idsAutorisesPourControle() {
  if (profilAdmin.role === 'super_admin') return null; // null = tout voir

  const { data: adminsControles } = await supabaseClient
    .from('administrateur_controleur')
    .select('administrateur_id')
    .eq('controleur_id', profilAdmin.id);

  const ids = (adminsControles || []).map(a => a.administrateur_id);
  ids.push(profilAdmin.id);
  return ids;
}

async function chargerListe() {
  const container = document.getElementById('listeEnAttente');
  container.innerHTML = 'Chargement...';

  const descriptions = {
    seances: "Séances en attente de validation.",
    exercices: "Exercices en attente de validation.",
    quiz: "Quiz en attente de validation.",
    epreuves: "Épreuves en attente de validation.",
    ressources: "Ressources en attente de validation."
  };
  document.getElementById('descriptionOnglet').textContent = descriptions[typeActuel];

  const { data, error } = await supabaseClient
    .from(typeActuel)
    .select('*')
    .eq('statut', 'en_attente')
    .order('created_at', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  const idsAutorises = await idsAutorisesPourControle();
  let items = data;
  if (idsAutorises !== null) {
    items = items.filter(i => idsAutorises.includes(i.cree_par));
  }

  if (items.length === 0) {
    container.innerHTML = "Rien en attente de validation ici pour l'instant.";
    return;
  }

  container.innerHTML = '';
  items.forEach(item => {
    const dateObj = new Date(item.created_at);
    const dateAffichee = dateObj.toLocaleDateString('fr-FR') + ' à ' + dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.style.flexDirection = 'column';
    ligne.style.alignItems = 'stretch';
    ligne.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span><strong>${titreItem(typeActuel, item)}</strong> <small>(${contexteItem(typeActuel, item)})</small></span>
        <div class="admin-ligne-actions">
          <button class="btn-voir" data-id="${item.id}">👁️ Voir</button>
          <button class="btn-valider" data-id="${item.id}">✅ Publier</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--texte-gris);margin-top:4px;">Soumis le ${dateAffichee} par ${nomAdmin(item.cree_par)}</div>
      <div id="apercu-${item.id}" style="display:none;margin-top:10px;padding:12px;background:var(--bleu-clair);border-radius:8px;font-size:14px;"></div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-voir').forEach(btn => {
    btn.addEventListener('click', () => afficherApercu(btn.dataset.id, items));
  });
  document.querySelectorAll('.btn-valider').forEach(btn => {
    btn.addEventListener('click', () => validerItem(btn.dataset.id));
  });
}

function afficherApercu(id, liste) {
  const item = liste.find(i => i.id === id);
  const zone = document.getElementById('apercu-' + id);
  if (!item || !zone) return;

  if (zone.style.display !== 'none') { zone.style.display = 'none'; return; }

  let html = '';
  if (typeActuel === 'seances') {
    html = `
      ${item.objectif ? `<p><strong>Objectif :</strong> ${item.objectif}</p>` : ''}
      ${item.introduction ? `<p><strong>Introduction :</strong> ${item.introduction}</p>` : ''}
      ${item.contenu ? `<p><strong>Contenu :</strong> ${item.contenu}</p>` : ''}
      ${item.exemples ? `<p><strong>Exemples :</strong> ${item.exemples}</p>` : ''}
      ${item.resume ? `<p><strong>Résumé :</strong> ${item.resume}</p>` : ''}
    `;
  } else if (typeActuel === 'exercices') {
    html = `
      <p><strong>Énoncé :</strong> ${item.enonce}</p>
      ${item.reponses_proposees ? `<p><strong>Réponses proposées :</strong> ${item.reponses_proposees.join(', ')}</p>` : ''}
      ${item.bonne_reponse ? `<p><strong>Bonne réponse :</strong> ${item.bonne_reponse}</p>` : ''}
      ${item.correction ? `<p><strong>Correction :</strong> ${item.correction}</p>` : ''}
    `;
  } else if (typeActuel === 'quiz') {
    html = `<p><strong>Tentatives max :</strong> ${item.tentatives_max}</p><p>Vérifie que des questions ont bien été associées via la gestion des quiz avant de publier.</p>`;
  } else if (typeActuel === 'epreuves') {
    html = `
      <p><strong>Type :</strong> ${item.type_epreuve || 'non précisé'}</p>
      <p><strong>Réalisation :</strong> ${item.type_realisation}</p>
      ${item.fichier_pdf_url ? `<p><strong>PDF :</strong> <a href="${item.fichier_pdf_url}" target="_blank">voir le fichier</a></p>` : ''}
    `;
  } else if (typeActuel === 'ressources') {
    html = `<p><strong>Type :</strong> ${item.type}</p><p><strong>Lien :</strong> <a href="${item.url}" target="_blank">${item.url}</a></p>`;
  }

  zone.innerHTML = html || '<p>Aucun détail supplémentaire.</p>';
  zone.style.display = 'block';
}

async function validerItem(id) {
  const confirmation = window.confirm("Publier ce contenu ? Il deviendra visible publiquement.");
  if (confirmation !== true) return;

  const { error } = await supabaseClient
    .from(typeActuel)
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

document.querySelectorAll('.onglet-validation').forEach(btn => {
  btn.addEventListener('click', () => {
    typeActuel = btn.dataset.type;
    document.querySelectorAll('.onglet-validation').forEach(b => b.style.background = '');
    btn.style.background = 'var(--bleu-principal)';
    btn.style.color = 'white';
    chargerListe();
  });
});

async function initPage() {
  await verifierConnexion();

  if (!peutValider()) {
    document.getElementById('zoneAccesRefuse').style.display = 'block';
    return;
  }

  document.getElementById('zoneContenu').style.display = 'block';
  await chargerDonneesBase();

  // Active l'onglet Séances par défaut
  document.querySelector('.onglet-validation[data-type="seances"]').style.background = 'var(--bleu-principal)';
  document.querySelector('.onglet-validation[data-type="seances"]').style.color = 'white';

  chargerListe();
}

initPage();
