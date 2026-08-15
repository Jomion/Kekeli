// Gestion CRUD des ressources

let ressourceEnEdition = null;
let toutesLesClasses = [];
let toutesLesMatieres = [];
let toutesLesSousMatieres = [];
let tousLesAdmins = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resSousMatieres, resAdmins] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('administrateurs').select('id, nom')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesClasses = resClasses.data.filter(c => peutAccederClasse(c.id));
  toutesLesMatieres = (resMatieres.data || []).filter(m => peutAccederClasse(m.classe_id) && peutAccederMatiere(m.id));
  toutesLesSousMatieres = resSousMatieres.data || [];
  tousLesAdmins = resAdmins.data || [];

  const selectClasse = document.getElementById('classe');
  toutesLesClasses.forEach(classe => {
    const opt = document.createElement('option');
    opt.value = classe.id;
    opt.textContent = classe.nom;
    selectClasse.appendChild(opt);
  });

  remplirFiltreClasse();
  chargerListe();
}

function nomAdmin(id) {
  const a = tousLesAdmins.find(x => x.id === id);
  return a ? a.nom : 'inconnu';
}

function remplirMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  document.getElementById('sousMatiere').innerHTML = '<option value="">-- Aucune --</option>';
  const selectMatiere = document.getElementById('matiere');
  selectMatiere.innerHTML = '<option value="">-- Toutes matières --</option>';
  if (classesChoisies.length === 0) return;
  const noms = [...new Set(toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id)).map(m => m.nom))].sort();
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom; opt.textContent = nom;
    selectMatiere.appendChild(opt);
  });
}

function remplirSousMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const selectSM = document.getElementById('sousMatiere');
  selectSM.innerHTML = '<option value="">-- Aucune --</option>';
  if (!nomMatiere) return;
  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  const noms = [...new Set(toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id)).map(sm => sm.nom))].sort();
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom; opt.textContent = nom;
    selectSM.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirSousMatieres);

function remplirFiltreClasse() {
  const selectFiltre = document.getElementById('filtreClasse');
  selectFiltre.innerHTML = '<option value="">Toutes les classes</option>';
  toutesLesClasses.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.nom;
    selectFiltre.appendChild(opt);
  });
}

document.getElementById('filtreClasse').addEventListener('change', chargerListe);
document.getElementById('filtreType').addEventListener('change', chargerListe);
document.getElementById('filtreStatut').addEventListener('change', chargerListe);
document.getElementById('tri').addEventListener('change', chargerListe);

function nomClasse(classeId) {
  if (!classeId) return 'toutes classes';
  const c = toutesLesClasses.find(cl => cl.id === classeId);
  return c ? c.nom : '?';
}

async function chargerListe() {
  const container = document.getElementById('listeRessources');
  const filtreClasseId = document.getElementById('filtreClasse').value;
  const filtreType = document.getElementById('filtreType').value;
  const filtreStatutVal = document.getElementById('filtreStatut').value;
  const triVal = document.getElementById('tri').value;

  let requete = supabaseClient.from('ressources').select('*');
  if (triVal === 'date_asc') requete = requete.order('created_at', { ascending: true });
  else requete = requete.order('created_at', { ascending: false });

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  let donneesAffichees = data.filter(r => !r.classe_id || peutAccederClasse(r.classe_id));

  if (filtreClasseId) donneesAffichees = donneesAffichees.filter(r => r.classe_id === filtreClasseId);
  if (filtreType) donneesAffichees = donneesAffichees.filter(r => r.type === filtreType);
  if (filtreStatutVal) donneesAffichees = donneesAffichees.filter(r => r.statut === filtreStatutVal);

  if (triVal === 'admin') {
    donneesAffichees.sort((a, b) => nomAdmin(a.cree_par).localeCompare(nomAdmin(b.cree_par)));
  } else if (triVal === 'statut') {
    donneesAffichees.sort((a, b) => a.statut.localeCompare(b.statut));
  }

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucune ressource pour l'instant.";
    return;
  }

  const badgesStatut = { brouillon: '⚪', en_attente: '🟡', publie: '🟢' };
  const lectureSeule = !peutModifier();

  container.innerHTML = '';
  donneesAffichees.forEach(ressource => {
    const dateObj = new Date(ressource.created_at);
    const dateAffichee = dateObj.toLocaleDateString('fr-FR') + ' à ' + dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const infosSoumission = `${dateAffichee} - ${nomAdmin(ressource.cree_par)} - ${ressource.statut}`;

    const boutons = lectureSeule
      ? ''
      : `<button class="btn-modifier" data-id="${ressource.id}">✏️</button><button class="btn-supprimer" data-id="${ressource.id}">🗑️</button>`;

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.style.flexDirection = 'column';
    ligne.style.alignItems = 'stretch';
    ligne.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span>${badgesStatut[ressource.statut] || ''} ${ressource.titre} <small>(${ressource.type} - ${nomClasse(ressource.classe_id)})</small></span>
        <div class="admin-ligne-actions">${boutons}</div>
      </div>
      <div style="font-size:12px;color:var(--texte-gris);margin-top:4px;">${infosSoumission}</div>
    `;
    container.appendChild(ligne);
  });

  if (!lectureSeule) {
    document.querySelectorAll('.btn-modifier').forEach(btn => {
      btn.addEventListener('click', () => activerModeEdition(btn.dataset.id, donneesAffichees));
    });
    document.querySelectorAll('.btn-supprimer').forEach(btn => {
      btn.addEventListener('click', () => supprimerRessource(btn.dataset.id));
    });
  }
}

function activerModeEdition(id, liste) {
  const ressource = liste.find(r => r.id === id);
  if (!ressource) return;

  if (ressource.classe_id) {
    Array.from(document.getElementById('classe').options).forEach(opt => {
      opt.selected = (opt.value === ressource.classe_id);
    });
  }
  remplirMatieres();
  if (ressource.matiere_id) {
    const m = toutesLesMatieres.find(mm => mm.id === ressource.matiere_id);
    document.getElementById('matiere').value = m ? m.nom : '';
  }
  remplirSousMatieres();
  if (ressource.sous_matiere_id) {
    const sm = toutesLesSousMatieres.find(s => s.id === ressource.sous_matiere_id);
    document.getElementById('sousMatiere').value = sm ? sm.nom : '';
  }

  document.getElementById('titre').value = ressource.titre;
  document.getElementById('type').value = ressource.type;
  document.getElementById('url').value = ressource.url;
  document.getElementById('statut').value = ressource.statut === 'publie' ? 'en_attente' : ressource.statut;

  ressourceEnEdition = id;
  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function supprimerRessource(id) {
  const confirmation = window.confirm("Supprimer cette ressource ?");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('ressources').delete().eq('id', id);

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  chargerListe();
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!peutModifier()) return;

  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiereChoisie = document.getElementById('matiere').value;
  const nomSousMatiereChoisie = document.getElementById('sousMatiere').value;
  const messageForm = document.getElementById('messageForm');

  const donneesCommunes = {
    titre: document.getElementById('titre').value,
    type: document.getElementById('type').value,
    url: document.getElementById('url').value,
    statut: document.getElementById('statut').value
  };

  let resultat;

  if (ressourceEnEdition) {
    let matiereId = null, sousMatiereId = null;
    if (classesChoisies.length > 0 && nomMatiereChoisie) {
      const matiere = toutesLesMatieres.find(m => m.classe_id === classesChoisies[0] && m.nom === nomMatiereChoisie);
      matiereId = matiere ? matiere.id : null;
      if (matiere && nomSousMatiereChoisie) {
        const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSousMatiereChoisie);
        sousMatiereId = sm ? sm.id : null;
      }
    }
    resultat = await supabaseClient.from('ressources').update({
      ...donneesCommunes,
      classe_id: classesChoisies[0] || null,
      matiere_id: matiereId,
      sous_matiere_id: sousMatiereId
    }).eq('id', ressourceEnEdition);
  } else {
    if (classesChoisies.length === 0) {
      // Ressource générale, pas liée à une classe précise
      resultat = await supabaseClient.from('ressources').insert({
        ...donneesCommunes,
        classe_id: null, matiere_id: null, sous_matiere_id: null,
        cree_par: profilAdmin.id
      });
    } else {
      const lignes = [];
      classesChoisies.forEach(classeId => {
        let matiereId = null, sousMatiereId = null;
        if (nomMatiereChoisie) {
          const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiereChoisie);
          matiereId = matiere ? matiere.id : null;
          if (matiere && nomSousMatiereChoisie) {
            const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSousMatiereChoisie);
            sousMatiereId = sm ? sm.id : null;
          }
        }
        lignes.push({ ...donneesCommunes, classe_id: classeId, matiere_id: matiereId, sous_matiere_id: sousMatiereId, cree_par: profilAdmin.id });
      });
      resultat = await supabaseClient.from('ressources').insert(lignes);
    }
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  ressourceEnEdition = null;
  messageForm.textContent = '';

  chargerListe();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('btnToggleFiltres').addEventListener('click', () => {
  const panneau = document.getElementById('panneauFiltres');
  panneau.style.display = panneau.style.display === 'none' ? 'flex' : 'none';
  panneau.style.flexDirection = 'column';
});

const btnRetourHaut = document.getElementById('btnRetourHaut');
window.addEventListener('scroll', () => {
  btnRetourHaut.style.display = window.scrollY > 300 ? 'block' : 'none';
});
btnRetourHaut.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

async function initPage() {
  await verifierConnexion();

  if (!peutAccederType('ressources')) {
    document.body.innerHTML = '<p style="padding:40px;text-align:center;color:#dc2626;">Accès non autorisé à ce contenu.</p>';
    return;
  }

  if (!peutModifier()) {
    document.getElementById('formAjout').style.display = 'none';
    document.querySelector('.admin-contenu').insertAdjacentHTML('afterbegin', '<p style="padding:12px;background:#fef3c7;border-radius:8px;margin-bottom:16px;">🔒 Mode lecture seule : consultation uniquement.</p>');
  }

  chargerDonneesBase();
}

initPage();
