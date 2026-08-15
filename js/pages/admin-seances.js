// Gestion CRUD des séances

verifierConnexion();

let seanceEnEdition = null;
let toutesLesClasses = [];
let toutesLesMatieres = [];
let toutesLesSousMatieres = [];
let tousLesUD = [];
let toutesLesSA = [];
let toutesLesSeances = [];
let tousLesAdmins = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resSousMatieres, resUD, resSA, resAdmins] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*'),
    supabaseClient.from('sa').select('*'),
    supabaseClient.from('administrateurs').select('id, nom')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesClasses = resClasses.data;
  toutesLesMatieres = resMatieres.data || [];
  toutesLesSousMatieres = resSousMatieres.data || [];
  tousLesUD = resUD.data || [];
  toutesLesSA = resSA.data || [];
  tousLesAdmins = resAdmins.data || [];

  const selectClasse = document.getElementById('classe');
  toutesLesClasses.forEach(classe => {
    const opt1 = document.createElement('option');
    opt1.value = classe.id;
    opt1.textContent = classe.nom;
    selectClasse.appendChild(opt1);
  });

  remplirFiltreClasse();
  chargerListe();
}

function nomAdmin(id) {
  const a = tousLesAdmins.find(x => x.id === id);
  return a ? a.nom : 'inconnu';
}

// ===== Formulaire d'ajout : cascade =====

function remplirMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  document.getElementById('sousMatiere').innerHTML = '<option value="">-- Aucune / non applicable --</option>';
  document.getElementById('uniteDossier').innerHTML = '<option value="">-- Aucun --</option>';
  document.getElementById('sa').innerHTML = '<option value="">-- Aucune / rattacher directement --</option>';

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

function remplirSousMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  document.getElementById('uniteDossier').innerHTML = '<option value="">-- Aucun --</option>';
  document.getElementById('sa').innerHTML = '<option value="">-- Aucune / rattacher directement --</option>';

  const selectSM = document.getElementById('sousMatiere');
  selectSM.innerHTML = '<option value="">-- Aucune / non applicable --</option>';
  if (!nomMatiere) return;

  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  const noms = [...new Set(toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id)).map(sm => sm.nom))].sort();
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectSM.appendChild(opt);
  });

  remplirUD();
}

function remplirUD() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const nomSM = document.getElementById('sousMatiere').value;
  document.getElementById('sa').innerHTML = '<option value="">-- Aucune / rattacher directement --</option>';

  const selectUD = document.getElementById('uniteDossier');
  selectUD.innerHTML = '<option value="">-- Aucun --</option>';
  if (!nomMatiere) return;

  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);

  let noms;
  if (nomSM) {
    const idsSM = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id) && sm.nom === nomSM).map(sm => sm.id);
    noms = [...new Set(tousLesUD.filter(ud => idsSM.includes(ud.sous_matiere_id)).map(ud => ud.nom))].sort();
  } else {
    noms = [...new Set(tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id)).map(ud => ud.nom))].sort();
  }

  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectUD.appendChild(opt);
  });

  remplirSA();
}

function remplirSA() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const nomSM = document.getElementById('sousMatiere').value;
  const nomUD = document.getElementById('uniteDossier').value;

  const selectSA = document.getElementById('sa');
  selectSA.innerHTML = '<option value="">-- Aucune / rattacher directement --</option>';
  if (!nomMatiere) return;

  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);

  let noms;
  if (nomUD) {
    let idsUD;
    if (nomSM) {
      const idsSM = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id) && sm.nom === nomSM).map(sm => sm.id);
      idsUD = tousLesUD.filter(ud => idsSM.includes(ud.sous_matiere_id) && ud.nom === nomUD).map(ud => ud.id);
    } else {
      idsUD = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id) && ud.nom === nomUD).map(ud => ud.id);
    }
    noms = [...new Set(toutesLesSA.filter(sa => idsUD.includes(sa.unite_dossier_id)).map(sa => sa.nom))].sort();
  } else if (nomSM) {
    const idsSM = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id) && sm.nom === nomSM).map(sm => sm.id);
    noms = [...new Set(toutesLesSA.filter(sa => idsSM.includes(sa.sous_matiere_id)).map(sa => sa.nom))].sort();
  } else {
    noms = [...new Set(toutesLesSA.filter(sa => idsMatieres.includes(sa.matiere_id)).map(sa => sa.nom))].sort();
  }

  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectSA.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirSousMatieres);
document.getElementById('sousMatiere').addEventListener('change', remplirUD);
document.getElementById('uniteDossier').addEventListener('change', remplirSA);

// ===== Filtres en cascade =====

function remplirFiltreClasse() {
  const selectFiltre = document.getElementById('filtreClasse');
  selectFiltre.innerHTML = '<option value="">Toutes les classes</option>';
  toutesLesClasses.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nom;
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
    opt.value = nom;
    opt.textContent = nom;
    selectFiltre.appendChild(opt);
  });
  remplirFiltreSousMatiere();
}

function remplirFiltreSousMatiere() {
  const classeId = document.getElementById('filtreClasse').value;
  const nomMatiere = document.getElementById('filtreMatiere').value;
  const selectFiltre = document.getElementById('filtreSousMatiere');
  selectFiltre.innerHTML = '<option value="">Toutes</option>';

  let idsMatieres = classeId ? toutesLesMatieres.filter(m => m.classe_id === classeId) : toutesLesMatieres;
  if (nomMatiere) idsMatieres = idsMatieres.filter(m => m.nom === nomMatiere);
  idsMatieres = idsMatieres.map(m => m.id);

  const source = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id));
  const noms = [...new Set(source.map(sm => sm.nom))].sort();
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectFiltre.appendChild(opt);
  });
  remplirFiltreUD();
}

function remplirFiltreUD() {
  const classeId = document.getElementById('filtreClasse').value;
  const nomMatiere = document.getElementById('filtreMatiere').value;
  const nomSM = document.getElementById('filtreSousMatiere').value;
  const selectFiltre = document.getElementById('filtreUD');
  selectFiltre.innerHTML = '<option value="">Tous</option>';

  let matieresFiltrees = classeId ? toutesLesMatieres.filter(m => m.classe_id === classeId) : toutesLesMatieres;
  if (nomMatiere) matieresFiltrees = matieresFiltrees.filter(m => m.nom === nomMatiere);
  const idsMatieres = matieresFiltrees.map(m => m.id);

  let source;
  if (nomSM) {
    const idsSM = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id) && sm.nom === nomSM).map(sm => sm.id);
    source = tousLesUD.filter(ud => idsSM.includes(ud.sous_matiere_id));
  } else {
    const idsSM = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id)).map(sm => sm.id);
    source = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id) || idsSM.includes(ud.sous_matiere_id));
  }

  const noms = [...new Set(source.map(ud => ud.nom))].sort();
  noms.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectFiltre.appendChild(opt);
  });
  remplirFiltreSA();
}

function remplirFiltreSA() {
  const nomsSAUniques = [...new Set(toutesLesSA.map(sa => sa.nom))].sort();
  const selectFiltre = document.getElementById('filtreSA');
  selectFiltre.innerHTML = '<option value="">Toutes</option>';
  nomsSAUniques.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectFiltre.appendChild(opt);
  });
}

document.getElementById('filtreClasse').addEventListener('change', () => { remplirFiltreMatiere(); chargerListe(); });
document.getElementById('filtreMatiere').addEventListener('change', () => { remplirFiltreSousMatiere(); chargerListe(); });
document.getElementById('filtreSousMatiere').addEventListener('change', () => { remplirFiltreUD(); chargerListe(); });
document.getElementById('filtreUD').addEventListener('change', () => { remplirFiltreSA(); chargerListe(); });
document.getElementById('filtreSemaine').addEventListener('change', chargerListe);
document.getElementById('filtreSA').addEventListener('change', chargerListe);
document.getElementById('filtreStatut').addEventListener('change', chargerListe);
document.getElementById('tri').addEventListener('change', chargerListe);
document.getElementById('affichagePrincipal').addEventListener('change', chargerListe);

// ===== Infos hiérarchiques =====

function retrouverInfos(seance) {
  let sa = seance.sa_id ? toutesLesSA.find(s => s.id === seance.sa_id) : null;
  let udId = seance.unite_dossier_id || (sa && sa.unite_dossier_id);
  let ud = udId ? tousLesUD.find(u => u.id === udId) : null;
  let smId = seance.sous_matiere_id || (sa && sa.sous_matiere_id) || (ud && ud.sous_matiere_id);
  let sm = smId ? toutesLesSousMatieres.find(s => s.id === smId) : null;
  let matiereId = seance.matiere_id || (sa && sa.matiere_id) || (ud && ud.matiere_id) || (sm && sm.matiere_id);
  let matiere = matiereId ? toutesLesMatieres.find(m => m.id === matiereId) : null;

  const classeId = matiere ? matiere.classe_id : null;
  const classeObj = toutesLesClasses.find(c => c.id === classeId);

  return {
    classeId,
    nomClasse: classeObj ? classeObj.nom : '?',
    nomMatiere: matiere ? matiere.nom : '?',
    nomSM: sm ? sm.nom : null,
    nomUD: ud ? ud.nom : null,
    semaineUD: ud ? ud.semaine : null,
    nomSA: sa ? sa.nom : null
  };
}

// ===== Liste, tri, affichage =====

async function chargerListe() {
  const container = document.getElementById('listeSeances');
  const filtreClasseId = document.getElementById('filtreClasse').value;
  const filtreMatiereNom = document.getElementById('filtreMatiere').value;
  const filtreSMNom = document.getElementById('filtreSousMatiere').value;
  const filtreUDNom = document.getElementById('filtreUD').value;
  const filtreSemaineVal = document.getElementById('filtreSemaine').value;
  const filtreSANom = document.getElementById('filtreSA').value;
  const filtreStatutVal = document.getElementById('filtreStatut').value;
  const triVal = document.getElementById('tri').value;
  const affichagePrincipal = document.getElementById('affichagePrincipal').value;

  let requete = supabaseClient.from('seances').select('*');
  if (triVal === 'date_desc') requete = requete.order('created_at', { ascending: false });
  else if (triVal === 'date_asc') requete = requete.order('created_at', { ascending: true });
  else requete = requete.order('ordre', { ascending: true });

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  toutesLesSeances = data;

  let donneesAffichees = data.map(s => ({ ...s, __infos: retrouverInfos(s) }));

  if (filtreClasseId) donneesAffichees = donneesAffichees.filter(s => s.__infos.classeId === filtreClasseId);
  if (filtreMatiereNom) donneesAffichees = donneesAffichees.filter(s => s.__infos.nomMatiere === filtreMatiereNom);
  if (filtreSMNom) donneesAffichees = donneesAffichees.filter(s => s.__infos.nomSM === filtreSMNom);
  if (filtreUDNom) donneesAffichees = donneesAffichees.filter(s => s.__infos.nomUD === filtreUDNom);
  if (filtreSemaineVal) donneesAffichees = donneesAffichees.filter(s => s.__infos.semaineUD === filtreSemaineVal);
  if (filtreSANom) donneesAffichees = donneesAffichees.filter(s => s.__infos.nomSA === filtreSANom);
  if (filtreStatutVal) donneesAffichees = donneesAffichees.filter(s => s.statut === filtreStatutVal);

  if (triVal === 'admin') {
    donneesAffichees.sort((a, b) => nomAdmin(a.cree_par).localeCompare(nomAdmin(b.cree_par)));
  } else if (triVal === 'statut') {
    donneesAffichees.sort((a, b) => a.statut.localeCompare(b.statut));
  }

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucune séance pour l'instant.";
    return;
  }

  const badgesStatut = { brouillon: '⚪ Brouillon', en_attente: '🟡 En attente', publie: '🟢 Publié' };

  container.innerHTML = '';
  donneesAffichees.forEach(seance => {
    const infos = seance.__infos;
    const libelleAffiche = `${seance.libelle === 'seance' ? 'Séance' : 'Séquence'} ${seance.numero || ''}`.trim();

    const champs = { titre: seance.titre, numero: libelleAffiche, matiere: infos.nomMatiere };
    const principal = champs[affichagePrincipal] || seance.titre;

    const parties = [];
    if (affichagePrincipal !== 'matiere') parties.push(infos.nomMatiere);
    if (infos.nomSM) parties.push(infos.nomSM);
    if (infos.nomUD) parties.push(infos.semaineUD ? `${infos.nomUD} (${infos.semaineUD})` : infos.nomUD);
    if (infos.nomSA) parties.push(infos.nomSA);
    if (affichagePrincipal !== 'numero') parties.push(libelleAffiche);
    parties.push(infos.nomClasse);
    const contexte = parties.join(' - ');

    const dateObj = new Date(seance.created_at);
    const dateAffichee = dateObj.toLocaleDateString('fr-FR') + ' à ' + dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const infosSoumission = `${dateAffichee} - ${nomAdmin(seance.cree_par)} - ${badgesStatut[seance.statut] || seance.statut}`;

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.style.flexDirection = 'column';
    ligne.style.alignItems = 'stretch';
    ligne.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span><strong>${principal}</strong> <small>(${contexte})</small></span>
        <div class="admin-ligne-actions">
          <button class="btn-modifier" data-id="${seance.id}">✏️</button>
          <button class="btn-supprimer" data-id="${seance.id}">🗑️</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--texte-gris);margin-top:4px;">${infosSoumission}</div>
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

  const infos = seance.__infos;
  Array.from(document.getElementById('classe').options).forEach(opt => {
    opt.selected = (opt.value === infos.classeId);
  });
  remplirMatieres();
  document.getElementById('matiere').value = infos.nomMatiere;
  remplirSousMatieres();

  let nomSM = '';
  if (seance.sous_matiere_id) {
    nomSM = toutesLesSousMatieres.find(s => s.id === seance.sous_matiere_id)?.nom || '';
  } else if (seance.unite_dossier_id) {
    const ud = tousLesUD.find(u => u.id === seance.unite_dossier_id);
    if (ud && ud.sous_matiere_id) nomSM = toutesLesSousMatieres.find(s => s.id === ud.sous_matiere_id)?.nom || '';
  } else if (seance.sa_id) {
    const sa = toutesLesSA.find(s => s.id === seance.sa_id);
    if (sa) {
      if (sa.sous_matiere_id) nomSM = toutesLesSousMatieres.find(s => s.id === sa.sous_matiere_id)?.nom || '';
      else if (sa.unite_dossier_id) {
        const ud = tousLesUD.find(u => u.id === sa.unite_dossier_id);
        if (ud && ud.sous_matiere_id) nomSM = toutesLesSousMatieres.find(s => s.id === ud.sous_matiere_id)?.nom || '';
      }
    }
  }
  document.getElementById('sousMatiere').value = nomSM;
  remplirUD();

  let nomUD = '';
  if (seance.unite_dossier_id) {
    nomUD = tousLesUD.find(u => u.id === seance.unite_dossier_id)?.nom || '';
  } else if (seance.sa_id) {
    const sa = toutesLesSA.find(s => s.id === seance.sa_id);
    if (sa && sa.unite_dossier_id) nomUD = tousLesUD.find(u => u.id === sa.unite_dossier_id)?.nom || '';
  }
  document.getElementById('uniteDossier').value = nomUD;
  remplirSA();
  document.getElementById('sa').value = infos.nomSA || '';

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
  document.getElementById('attention').value = seance.attention || '';
  document.getElementById('avertissement').value = seance.avertissement || '';
  document.getElementById('statut').value = seance.statut === 'publie' ? 'en_attente' : seance.statut;
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

function resoudreCibleSeance(classeId, nomMatiere, nomSM, nomUD, nomSA) {
  const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiere);
  if (!matiere) return null;

  if (nomSA) {
    let sa;
    if (nomUD) {
      let ud;
      if (nomSM) {
        const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSM);
        if (!sm) return null;
        ud = tousLesUD.find(u => u.sous_matiere_id === sm.id && u.nom === nomUD);
      } else {
        ud = tousLesUD.find(u => u.matiere_id === matiere.id && u.nom === nomUD);
      }
      if (!ud) return null;
      sa = toutesLesSA.find(s => s.unite_dossier_id === ud.id && s.nom === nomSA);
    } else if (nomSM) {
      const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSM);
      if (!sm) return null;
      sa = toutesLesSA.find(s => s.sous_matiere_id === sm.id && s.nom === nomSA);
    } else {
      sa = toutesLesSA.find(s => s.matiere_id === matiere.id && s.nom === nomSA);
    }
    if (!sa) return null;
    return { sa_id: sa.id, unite_dossier_id: null, sous_matiere_id: null, matiere_id: null };
  }

  if (nomUD) {
    let ud;
    if (nomSM) {
      const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSM);
      if (!sm) return null;
      ud = tousLesUD.find(u => u.sous_matiere_id === sm.id && u.nom === nomUD);
    } else {
      ud = tousLesUD.find(u => u.matiere_id === matiere.id && u.nom === nomUD);
    }
    if (!ud) return null;
    return { sa_id: null, unite_dossier_id: ud.id, sous_matiere_id: null, matiere_id: null };
  }

  if (nomSM) {
    const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSM);
    if (!sm) return null;
    return { sa_id: null, unite_dossier_id: null, sous_matiere_id: sm.id, matiere_id: null };
  }

  return { sa_id: null, unite_dossier_id: null, sous_matiere_id: null, matiere_id: matiere.id };
}

function existeDejaSequence(cible, libelle, numero, idAExclure) {
  return toutesLesSeances.some(s => {
    if (idAExclure && s.id === idAExclure) return false;
    if (s.libelle !== libelle) return false;
    if ((s.numero || null) !== (numero || null)) return false;
    return (s.sa_id || null) === (cible.sa_id || null)
      && (s.unite_dossier_id || null) === (cible.unite_dossier_id || null)
      && (s.sous_matiere_id || null) === (cible.sous_matiere_id || null)
      && (s.matiere_id || null) === (cible.matiere_id || null);
  });
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const nomSM = document.getElementById('sousMatiere').value;
  const nomUD = document.getElementById('uniteDossier').value;
  const nomSA = document.getElementById('sa').value;
  const libelle = document.getElementById('libelle').value;
  const numero = document.getElementById('numero').value ? parseInt(document.getElementById('numero').value) : null;
  const messageForm = document.getElementById('messageForm');

  if (classesChoisies.length === 0 || !nomMatiere) {
    messageForm.textContent = "Sélectionne au moins une classe et une matière.";
    return;
  }

  const donneesCommunes = {
    libelle,
    numero,
    titre: document.getElementById('titre').value,
    objectif: document.getElementById('objectif').value || null,
    competence: document.getElementById('competence').value || null,
    prerequis: document.getElementById('prerequis').value || null,
    introduction: document.getElementById('introduction').value || null,
    contenu: document.getElementById('contenu').value || null,
    exemples: document.getElementById('exemples').value || null,
    resume: document.getElementById('resume').value || null,
    a_retenir: document.getElementById('aRetenir').value || null,
    attention: document.getElementById('attention').value || null,
    avertissement: document.getElementById('avertissement').value || null,
    statut: document.getElementById('statut').value,
    ordre: parseInt(document.getElementById('ordre').value)
  };

  let resultat;

  if (seanceEnEdition) {
    const cible = resoudreCibleSeance(classesChoisies[0], nomMatiere, nomSM, nomUD, nomSA);
    if (!cible) {
      messageForm.textContent = "Combinaison invalide pour cette classe.";
      return;
    }
    if (existeDejaSequence(cible, libelle, numero, seanceEnEdition)) {
      messageForm.textContent = `Une ${libelle === 'seance' ? 'séance' : 'séquence'} avec ce numéro existe déjà à cet emplacement.`;
      return;
    }
    resultat = await supabaseClient.from('seances').update({ ...donneesCommunes, ...cible }).eq('id', seanceEnEdition);
  } else {
    const lignes = [];
    const classesIgnorees = [];
    const classesDoublons = [];

    classesChoisies.forEach(classeId => {
      const cible = resoudreCibleSeance(classeId, nomMatiere, nomSM, nomUD, nomSA);
      const classe = toutesLesClasses.find(c => c.id === classeId);
      if (!cible) {
        classesIgnorees.push(classe ? classe.nom : '?');
        return;
      }
      if (existeDejaSequence(cible, libelle, numero, null)) {
        classesDoublons.push(classe ? classe.nom : '?');
        return;
      }
      lignes.push({ ...donneesCommunes, ...cible, cree_par: profilAdmin.id });
    });

    if (lignes.length === 0) {
      messageForm.textContent = classesDoublons.length > 0
        ? `Cette ${libelle === 'seance' ? 'séance' : 'séquence'} existe déjà pour : ${classesDoublons.join(', ')}.`
        : "Aucune des classes sélectionnées n'a cette combinaison.";
      return;
    }

    resultat = await supabaseClient.from('seances').insert(lignes);

    const messages = [];
    if (classesIgnorees.length > 0) messages.push(`combinaison absente pour : ${classesIgnorees.join(', ')}`);
    if (classesDoublons.length > 0) messages.push(`déjà existante pour : ${classesDoublons.join(', ')}`);
    if (!resultat.error && messages.length > 0) {
      messageForm.style.color = '#b45309';
      messageForm.textContent = `Ajouté, mais ignoré (${messages.join(' ; ')}).`;
    }
  }

  if (resultat.error) {
    messageForm.textContent = "Erreur : " + resultat.error.message;
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  seanceEnEdition = null;
  if (!messageForm.textContent.includes('ignoré')) messageForm.textContent = '';
  messageForm.style.color = '';

  chargerListe();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== Boutons création rapide =====

document.getElementById('btnCreerMatiere').addEventListener('click', async () => {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  if (classesChoisies.length === 0) { alert("Sélectionne d'abord au moins une classe."); return; }
  const nom = prompt("Nom de la nouvelle matière :");
  if (!nom) return;
  const lignes = [], ignorees = [];
  classesChoisies.forEach(classeId => {
    if (toutesLesMatieres.some(m => m.classe_id === classeId && m.nom === nom)) {
      const c = toutesLesClasses.find(cl => cl.id === classeId);
      ignorees.push(c ? c.nom : '?');
      return;
    }
    lignes.push({ classe_id: classeId, nom, ordre: 1 });
  });
  if (lignes.length > 0) {
    const { data, error } = await supabaseClient.from('matieres').insert(lignes).select();
    if (error) { alert("Erreur : " + error.message); return; }
    toutesLesMatieres.push(...data);
  }
  remplirMatieres();
  document.getElementById('matiere').value = nom;
  remplirSousMatieres();
  if (ignorees.length > 0) alert("Déjà existante pour : " + ignorees.join(', '));
});

document.getElementById('btnCreerSousMatiere').addEventListener('click', async () => {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  if (classesChoisies.length === 0 || !nomMatiere) { alert("Choisis d'abord classe(s) et matière."); return; }
  const nom = prompt("Nom de la nouvelle sous-matière :");
  if (!nom) return;
  const lignes = [], ignorees = [];
  classesChoisies.forEach(classeId => {
    const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiere);
    if (!matiere) return;
    if (toutesLesSousMatieres.some(sm => sm.matiere_id === matiere.id && sm.nom === nom)) {
      const c = toutesLesClasses.find(cl => cl.id === classeId);
      ignorees.push(c ? c.nom : '?');
      return;
    }
    lignes.push({ matiere_id: matiere.id, nom, ordre: 1 });
  });
  if (lignes.length > 0) {
    const { data, error } = await supabaseClient.from('sous_matieres').insert(lignes).select();
    if (error) { alert("Erreur : " + error.message); return; }
    toutesLesSousMatieres.push(...data);
  }
  remplirSousMatieres();
  document.getElementById('sousMatiere').value = nom;
  remplirUD();
  if (ignorees.length > 0) alert("Déjà existante pour : " + ignorees.join(', '));
});

document.getElementById('btnCreerUD').addEventListener('click', async () => {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const nomSM = document.getElementById('sousMatiere').value;
  if (classesChoisies.length === 0 || !nomMatiere) { alert("Choisis d'abord classe(s) et matière."); return; }
  const nom = prompt("Nom (ex: Unité 1 ou Dossier 2) :");
  if (!nom) return;
  const type = (prompt("Type — tape 'unite' ou 'dossier' :", "unite") || "").trim().toLowerCase();
  if (type !== 'unite' && type !== 'dossier') { alert("Type invalide, annulé."); return; }
  let semaine = null;
  if (type === 'unite') {
    const rep = (prompt("Semaine — tape 1 ou 2, ou laisse vide :", "") || "").trim();
    if (rep === '1') semaine = "1ère semaine";
    if (rep === '2') semaine = "2e semaine";
  }
  const lignes = [], ignorees = [];
  classesChoisies.forEach(classeId => {
    const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiere);
    if (!matiere) return;
    let sousMatiereId = null;
    if (nomSM) {
      const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSM);
      if (!sm) return;
      sousMatiereId = sm.id;
    }
    const existeDeja = sousMatiereId
      ? tousLesUD.some(ud => ud.sous_matiere_id === sousMatiereId && ud.nom === nom)
      : tousLesUD.some(ud => ud.matiere_id === matiere.id && ud.nom === nom);
    if (existeDeja) {
      const c = toutesLesClasses.find(cl => cl.id === classeId);
      ignorees.push(c ? c.nom : '?');
      return;
    }
    lignes.push({ type, semaine, nom, ordre: 1, sous_matiere_id: sousMatiereId, matiere_id: sousMatiereId ? null : matiere.id });
  });
  if (lignes.length > 0) {
    const { data, error } = await supabaseClient.from('unites_dossiers').insert(lignes).select();
    if (error) { alert("Erreur : " + error.message); return; }
    tousLesUD.push(...data);
  }
  remplirUD();
  document.getElementById('uniteDossier').value = nom;
  remplirSA();
  if (ignorees.length > 0) alert("Déjà existante pour : " + ignorees.join(', '));
});

document.getElementById('btnCreerSA').addEventListener('click', async () => {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const nomSM = document.getElementById('sousMatiere').value;
  const nomUD = document.getElementById('uniteDossier').value;
  if (classesChoisies.length === 0 || !nomMatiere) { alert("Choisis d'abord classe(s) et matière."); return; }
  const nom = prompt("Nom de la nouvelle SA (ex: SA 1) :");
  if (!nom) return;
  const lignes = [], ignorees = [];
  classesChoisies.forEach(classeId => {
    const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiere);
    if (!matiere) return;
    let sousMatiereId = null, uniteDossierId = null;
    if (nomUD) {
      let ud;
      if (nomSM) {
        const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSM);
        if (!sm) return;
        ud = tousLesUD.find(u => u.sous_matiere_id === sm.id && u.nom === nomUD);
      } else {
        ud = tousLesUD.find(u => u.matiere_id === matiere.id && u.nom === nomUD);
      }
      if (!ud) return;
      uniteDossierId = ud.id;
    } else if (nomSM) {
      const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSM);
      if (!sm) return;
      sousMatiereId = sm.id;
    }
    const existeDeja = uniteDossierId
      ? toutesLesSA.some(sa => sa.unite_dossier_id === uniteDossierId && sa.nom === nom)
      : sousMatiereId
        ? toutesLesSA.some(sa => sa.sous_matiere_id === sousMatiereId && sa.nom === nom)
        : toutesLesSA.some(sa => sa.matiere_id === matiere.id && sa.nom === nom);
    if (existeDeja) {
      const c = toutesLesClasses.find(cl => cl.id === classeId);
      ignorees.push(c ? c.nom : '?');
      return;
    }
    lignes.push({
      nom, ordre: 1,
      unite_dossier_id: uniteDossierId,
      sous_matiere_id: uniteDossierId ? null : sousMatiereId,
      matiere_id: (uniteDossierId || sousMatiereId) ? null : matiere.id
    });
  });
  if (lignes.length > 0) {
    const { data, error } = await supabaseClient.from('sa').insert(lignes).select();
    if (error) { alert("Erreur : " + error.message); return; }
    toutesLesSA.push(...data);
  }
  remplirSA();
  document.getElementById('sa').value = nom;
  if (ignorees.length > 0) alert("Déjà existante pour : " + ignorees.join(', '));
});

// ===== Panneau de filtres repliable =====

document.getElementById('btnToggleFiltres').addEventListener('click', () => {
  const panneau = document.getElementById('panneauFiltres');
  panneau.style.display = panneau.style.display === 'none' ? 'flex' : 'none';
  panneau.style.flexDirection = 'column';
});

// ===== Bouton retour en haut =====

const btnRetourHaut = document.getElementById('btnRetourHaut');
window.addEventListener('scroll', () => {
  btnRetourHaut.style.display = window.scrollY > 300 ? 'block' : 'none';
});
btnRetourHaut.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

chargerDonneesBase();
