// Gestion CRUD des épreuves

let epreuveEnEdition = null;
let toutesLesClasses = [];
let toutesLesMatieres = [];
let tousLesAdmins = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resAdmins] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('administrateurs').select('id, nom')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesClasses = resClasses.data.filter(c => peutAccederClasse(c.id));
  toutesLesMatieres = (resMatieres.data || []).filter(m => peutAccederClasse(m.classe_id) && peutAccederMatiere(m.id));
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
  const selectMatiere = document.getElementById('matiere');
  selectMatiere.innerHTML = '<option value="">-- Choisir une matière --</option>';
  if (classesChoisies.length === 0) return;
  const noms = [...new Set(toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id)).map(m => m.nom))].sort();
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom; opt.textContent = nom;
    selectMatiere.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieres);

function remplirFiltreClasse() {
  const selectFiltre = document.getElementById('filtreClasse');
  selectFiltre.innerHTML = '<option value="">Toutes les classes</option>';
  toutesLesClasses.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.nom;
    selectFiltre.appendChild(opt);
  });
  remplirFiltreMatiere();
}

function remplirFiltreMatiere() {
  const classeId = document.getElementById('filtreClasse').value;
  const selectFiltre = document.getElementById('filtreMatiere');
  selectFiltre.innerHTML = '<option value="">Toutes les matières</option>';
  const source = classeId ? toutesLesMatieres.filter(m => m.classe_id === classeId) : toutesLesMatieres;
  const noms = [...new Set(source.map(m => m.nom))].sort();
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom; opt.textContent = nom;
    selectFiltre.appendChild(opt);
  });
}

document.getElementById('filtreClasse').addEventListener('change', () => { remplirFiltreMatiere(); chargerListe(); });
document.getElementById('filtreMatiere').addEventListener('change', chargerListe);
document.getElementById('filtreTrimestre').addEventListener('change', chargerListe);
document.getElementById('filtreStatut').addEventListener('change', chargerListe);
document.getElementById('tri').addEventListener('change', chargerListe);

function nomClasse(classeId) {
  const c = toutesLesClasses.find(cl => cl.id === classeId);
  return c ? c.nom : '?';
}

function nomMatiere(matiereId) {
  const m = toutesLesMatieres.find(mm => mm.id === matiereId);
  return m ? m.nom : '?';
}

async function chargerListe() {
  const container = document.getElementById('listeEpreuves');
  const filtreClasseId = document.getElementById('filtreClasse').value;
  const filtreMatiereNom = document.getElementById('filtreMatiere').value;
  const filtreTrimestre = document.getElementById('filtreTrimestre').value;
  const filtreStatutVal = document.getElementById('filtreStatut').value;
  const triVal = document.getElementById('tri').value;

  let requete = supabaseClient.from('epreuves').select('*');
  if (triVal === 'date_asc') requete = requete.order('created_at', { ascending: true });
  else requete = requete.order('created_at', { ascending: false });

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  let donneesAffichees = data.filter(ep => peutAccederClasse(ep.classe_id));

  if (filtreClasseId) donneesAffichees = donneesAffichees.filter(ep => ep.classe_id === filtreClasseId);
  if (filtreMatiereNom) donneesAffichees = donneesAffichees.filter(ep => nomMatiere(ep.matiere_id) === filtreMatiereNom);
  if (filtreTrimestre) donneesAffichees = donneesAffichees.filter(ep => ep.trimestre === filtreTrimestre);
  if (filtreStatutVal) donneesAffichees = donneesAffichees.filter(ep => ep.statut === filtreStatutVal);

  if (triVal === 'admin') {
    donneesAffichees.sort((a, b) => nomAdmin(a.cree_par).localeCompare(nomAdmin(b.cree_par)));
  } else if (triVal === 'statut') {
    donneesAffichees.sort((a, b) => a.statut.localeCompare(b.statut));
  }

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucune épreuve pour l'instant.";
    return;
  }

  const badgesStatut = { brouillon: '⚪', en_attente: '🟡', publie: '🟢' };
  const lectureSeule = !peutModifier();

  container.innerHTML = '';
  donneesAffichees.forEach(epreuve => {
    const dateObj = new Date(epreuve.created_at);
    const dateAffichee = dateObj.toLocaleDateString('fr-FR') + ' à ' + dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const infosSoumission = `${dateAffichee} - ${nomAdmin(epreuve.cree_par)} - ${epreuve.statut}`;

    const boutons = lectureSeule
      ? ''
      : `<button class="btn-modifier" data-id="${epreuve.id}">✏️</button><button class="btn-supprimer" data-id="${epreuve.id}">🗑️</button>`;

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.style.flexDirection = 'column';
    ligne.style.alignItems = 'stretch';
    ligne.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span>${badgesStatut[epreuve.statut] || ''} ${epreuve.titre} <small>(${nomMatiere(epreuve.matiere_id)} - ${nomClasse(epreuve.classe_id)} - ${epreuve.trimestre})</small></span>
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
      btn.addEventListener('click', () => supprimerEpreuve(btn.dataset.id));
    });
  }
}

function activerModeEdition(id, liste) {
  const epreuve = liste.find(e => e.id === id);
  if (!epreuve) return;

  Array.from(document.getElementById('classe').options).forEach(opt => {
    opt.selected = (opt.value === epreuve.classe_id);
  });
  remplirMatieres();
  document.getElementById('matiere').value = nomMatiere(epreuve.matiere_id);

  document.getElementById('titre').value = epreuve.titre;
  document.getElementById('trimestre').value = epreuve.trimestre;
  document.getElementById('anneeScolaire').value = epreuve.annee_scolaire;
  document.getElementById('typeEpreuve').value = epreuve.type_epreuve || '';
  document.getElementById('typeRealisation').value = epreuve.type_realisation;
  document.getElementById('fichierPdfUrl').value = epreuve.fichier_pdf_url || '';
  document.getElementById('correctionPdfUrl').value = epreuve.correction_pdf_url || '';
  document.getElementById('statut').value = epreuve.statut === 'publie' ? 'en_attente' : epreuve.statut;

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

  if (!peutModifier()) return;

  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiereChoisie = document.getElementById('matiere').value;
  const messageForm = document.getElementById('messageForm');

  if (classesChoisies.length === 0 || !nomMatiereChoisie) {
    messageForm.textContent = "Sélectionne au moins une classe et une matière.";
    return;
  }

  const donneesCommunes = {
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
    const matiere = toutesLesMatieres.find(m => m.classe_id === classesChoisies[0] && m.nom === nomMatiereChoisie);
    resultat = await supabaseClient.from('epreuves').update({ ...donneesCommunes, classe_id: classesChoisies[0], matiere_id: matiere.id }).eq('id', epreuveEnEdition);
  } else {
    const lignes = [];
    const ignorees = [];
    classesChoisies.forEach(classeId => {
      const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiereChoisie);
      if (!matiere) {
        const classe = toutesLesClasses.find(c => c.id === classeId);
        ignorees.push(classe ? classe.nom : '?');
        return;
      }
      lignes.push({ ...donneesCommunes, classe_id: classeId, matiere_id: matiere.id, cree_par: profilAdmin.id });
    });

    if (lignes.length === 0) {
      messageForm.textContent = "Aucune des classes sélectionnées n'a cette matière.";
      return;
    }

    resultat = await supabaseClient.from('epreuves').insert(lignes);

    if (!resultat.error && ignorees.length > 0) {
      messageForm.style.color = '#b45309';
      messageForm.textContent = `Ajouté, mais ignoré pour : ${ignorees.join(', ')}.`;
    }
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  epreuveEnEdition = null;
  if (!messageForm.textContent.includes('ignoré')) messageForm.textContent = '';
  messageForm.style.color = '';

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

  if (!peutAccederType('epreuves')) {
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
