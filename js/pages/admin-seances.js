// Gestion CRUD des séances (nouvelle hiérarchie : Matière → Unité/Dossier → Sous-matière → SA)

let seanceEnEdition = null;
let toutesLesClasses = [];
let toutesLesMatieres = [];
let tousLesUD = [];
let toutesLesSousMatieres = [];
let toutesLesSA = [];
let toutesLesSeances = [];
let tousLesAdmins = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resUD, resSM, resSA, resAdmins] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('sa').select('*'),
    supabaseClient.from('administrateurs').select('id, nom')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesClasses = resClasses.data.filter(c => peutAccederClasse(c.id));
  toutesLesMatieres = (resMatieres.data || []).filter(m => peutAccederClasse(m.classe_id) && peutAccederMatiere(m.id));
  tousLesUD = resUD.data || [];
  toutesLesSousMatieres = resSM.data || [];
  toutesLesSA = resSA.data || [];
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

// ===== Formulaire d'ajout : cascade =====

function remplirMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  document.getElementById('uniteDossier').innerHTML = '<option value="">-- Choisir d\'abord une matière --</option>';
  document.getElementById('sousMatiere').innerHTML = '<option value="">-- Choisir d\'abord une unité/dossier --</option>';
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

function remplirUD() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  document.getElementById('sousMatiere').innerHTML = '<option value="">-- Choisir d\'abord une unité/dossier --</option>';
  document.getElementById('sa').innerHTML = '<option value="">-- Aucune / rattacher directement --</option>';

  const selectUD = document.getElementById('uniteDossier');
  selectUD.innerHTML = '<option value="">-- Choisir une unité/dossier --</option>';
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

function remplirSousMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const valeurUD = document.getElementById('uniteDossier').value;
  document.getElementById('sa').innerHTML = '<option value="">-- Aucune / rattacher directement --</option>';

  const selectSM = document.getElementById('sousMatiere');
  selectSM.innerHTML = '<option value="">-- Choisir une sous-matière --</option>';
  if (!valeurUD) return;

  const [nomUD, semaineUD] = valeurUD.split('|');
  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  const udsCorrespondants = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id) && ud.nom === nomUD && (ud.semaine || '') === (semaineUD || ''));
  const idsUD = udsCorrespondants.map(ud => ud.id);

  const smDisponibles = toutesLesSousMatieres.filter(sm => idsUD.includes(sm.unite_dossier_id));
  smDisponibles.forEach(sm => {
    const opt = document.createElement('option');
    opt.value = sm.nom;
    opt.textContent = sm.nom;
    selectSM.appendChild(opt);
  });

  remplirSA();
}

function remplirSA() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const valeurUD = document.getElementById('uniteDossier').value;
  const nomSM = document.getElementById('sousMatiere').value;

  const selectSA = document.getElementById('sa');
  selectSA.innerHTML = '<option value="">-- Aucune / rattacher directement --</option>';
  if (!nomSM) return;

  const [nomUD, semaineUD] = valeurUD.split('|');
  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  const udsCorrespondants = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id) && ud.nom === nomUD && (ud.semaine || '') === (semaineUD || ''));
  const idsUD = udsCorrespondants.map(ud => ud.id);
  const smsCorrespondantes = toutesLesSousMatieres.filter(sm => idsUD.includes(sm.unite_dossier_id) && sm.nom === nomSM);
  const idsSM = smsCorrespondantes.map(sm => sm.id);

  const saDisponibles = toutesLesSA.filter(sa => idsSM.includes(sa.sous_matiere_id));
  saDisponibles.forEach(sa => {
    const opt = document.createElement('option');
    opt.value = sa.nom;
    opt.textContent = sa.nom;
    selectSA.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirUD);
document.getElementById('uniteDossier').addEventListener('change', remplirSousMatieres);
document.getElementById('sousMatiere').addEventListener('change', remplirSA);

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
  remplirFiltreUD();
}

function remplirFiltreUD() {
  const classeId = document.getElementById('filtreClasse').value;
  const nomMatiere = document.getElementById('filtreMatiere').value;
  const selectFiltre = document.getElementById('filtreUD');
  selectFiltre.innerHTML = '<option value="">Tous</option>';

  let matieresFiltrees = classeId ? toutesLesMatieres.filter(m => m.classe_id === classeId) : toutesLesMatieres;
  if (nomMatiere) matieresFiltrees = matieresFiltrees.filter(m => m.nom === nomMatiere);
  const idsMatieres = matieresFiltrees.map(m => m.id);

  const source = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id));
  const noms = [...new Set(source.map(ud => ud.nom))].sort();
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
  const nomUD = document.getElementById('filtreUD').value;
  const selectFiltre = document.getElementById('filtreSousMatiere');
  selectFiltre.innerHTML = '<option value="">Toutes</option>';

  let matieresFiltrees = classeId ? toutesLesMatieres.filter(m => m.classe_id === classeId) : toutesLesMatieres;
  if (nomMatiere) matieresFiltrees = matieresFiltrees.filter(m => m.nom === nomMatiere);
  const idsMatieres = matieresFiltrees.map(m => m.id);

  let udsFiltres = tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id));
  if (nomUD) udsFiltres = udsFiltres.filter(ud => ud.nom === nomUD);
  const idsUD = udsFiltres.map(ud => ud.id);

  const source = toutesLesSousMatieres.filter(sm => idsUD.includes(sm.unite_dossier_id));
  const noms = [...new Set(source.map(sm => sm.nom))].sort();
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
document.getElementById('filtreMatiere').addEventListener('change', () => { remplirFiltreUD(); chargerListe(); });
document.getElementById('filtreUD').addEventListener('change', () => { remplirFiltreSousMatiere(); chargerListe(); });
document.getElementById('filtreSemaine').addEventListener('change', chargerListe);
document.getElementById('filtreSousMatiere').addEventListener('change', () => { remplirFiltreSA(); chargerListe(); });
document.getElementById('filtreSA').addEventListener('change', chargerListe);
document.getElementById('filtreStatut').addEventListener('change', chargerListe);
document.getElementById('tri').addEventListener('change', chargerListe);
document.getElementById('affichagePrincipal').addEventListener('change', chargerListe);

// ===== Infos hiérarchiques =====

function retrouverInfos(seance) {
  let sa = seance.sa_id ? toutesLesSA.find(s => s.id === seance.sa_id) : null;
  let smId = seance.sous_matiere_id || (sa && sa.sous_matiere_id);
  let sm = smId ? toutesLesSousMatieres.find(s => s.id === smId) : null;
  let ud = sm ? tousLesUD.find(u => u.id === sm.unite_dossier_id) : null;
  let matiere = ud ? toutesLesMatieres.find(m => m.id === ud.matiere_id) : null;

  const classeId = matiere ? matiere.classe_id : null;
  const classeObj = toutesLesClasses.find(c => c.id === classeId);

  return {
    classeId,
    nomClasse: classeObj ? classeObj.nom : '?',
    nomMatiere: matiere ? matiere.nom : '?',
    nomUD: ud ? ud.nom : null,
    semaineUD: ud ? ud.semaine : null,
    nomSM: sm ? sm.nom : null,
    nomSA: sa ? sa.nom : null
  };
}

// ===== Liste, tri, affichage =====

async function chargerListe() {
  const container = document.getElementById('listeSeances');
  const filtreClasseId = document.getElementById('filtreClasse').value;
  const filtreMatiereNom = document.getElementById('filtreMatiere').value;
  const filtreUDNom = document.getElementById('filtreUD').value;
  const filtreSemaineVal = document.getElementById('filtreSemaine').value;
  const filtreSMNom = document.getElementById('filtreSousMatiere').value;
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

  const idsSeancesVisibles = data.map(s => s.id);
  const { data: activitesToutes } = idsSeancesVisibles.length > 0
    ? await supabaseClient.from('seance_activites').select('seance_id, niveau').in('seance_id', idsSeancesVisibles)
    : { data: [] };

  const niveauxParSeance = {};
  (activitesToutes || []).forEach(a => {
    if (!niveauxParSeance[a.seance_id]) niveauxParSeance[a.seance_id] = new Set();
    niveauxParSeance[a.seance_id].add(a.niveau);
  });

  let donneesAffichees = data.map(s => ({ ...s, __infos: retrouverInfos(s) }))
    .filter(s => s.__infos.classeId && peutAccederClasse(s.__infos.classeId));

  if (filtreClasseId) donneesAffichees = donneesAffichees.filter(s => s.__infos.classeId === filtreClasseId);
  if (filtreMatiereNom) donneesAffichees = donneesAffichees.filter(s => s.__infos.nomMatiere === filtreMatiereNom);
  if (filtreUDNom) donneesAffichees = donneesAffichees.filter(s => s.__infos.nomUD === filtreUDNom);
  if (filtreSemaineVal) donneesAffichees = donneesAffichees.filter(s => s.__infos.semaineUD === filtreSemaineVal);
  if (filtreSMNom) donneesAffichees = donneesAffichees.filter(s => s.__infos.nomSM === filtreSMNom);
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
  const lectureSeule = !peutModifier();

  container.innerHTML = '';
  donneesAffichees.forEach(seance => {
    const infos = seance.__infos;
    const libelleAffiche = `${seance.libelle === 'seance' ? 'Séance' : 'Séquence'} ${seance.numero || ''}`.trim();

    const champs = { titre: seance.titre, numero: libelleAffiche, matiere: infos.nomMatiere };
    const principal = champs[affichagePrincipal] || seance.titre;

    const parties = [];
    if (affichagePrincipal !== 'matiere') parties.push(infos.nomMatiere);
    if (infos.nomUD) parties.push(infos.semaineUD ? `${infos.nomUD} (${infos.semaineUD})` : infos.nomUD);
    if (infos.nomSM) parties.push(infos.nomSM);
    if (infos.nomSA) parties.push(infos.nomSA);
    if (affichagePrincipal !== 'numero') parties.push(libelleAffiche);
    parties.push(infos.nomClasse);
    const contexte = parties.join(' - ');

    const dateObj = new Date(seance.created_at);
    const dateAffichee = dateObj.toLocaleDateString('fr-FR') + ' à ' + dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const infosSoumission = `${dateAffichee} - ${nomAdmin(seance.cree_par)} - ${badgesStatut[seance.statut] || seance.statut}`;

    const niveauxPresents = niveauxParSeance[seance.id] ? [...niveauxParSeance[seance.id]].sort() : [];
    const emojisNiveaux = { 1: '🌱', 2: '🪘', 3: '🦁', 4: '👑' };
    const badgesNiveaux = niveauxPresents.length > 0 ? niveauxPresents.map(n => emojisNiveaux[n]).join(' ') : '<span style="color:var(--texte-gris);">aucune activité</span>';

    const boutons = lectureSeule
      ? `<button class="btn-voir-activites" data-id="${seance.id}">🎯</button>`
      : `<button class="btn-voir-activites" data-id="${seance.id}">🎯</button><button class="btn-modifier" data-id="${seance.id}">✏️</button><button class="btn-supprimer" data-id="${seance.id}">🗑️</button>`;

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.style.flexDirection = 'column';
    ligne.style.alignItems = 'stretch';
    ligne.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span><strong>${principal}</strong> <small>(${contexte})</small></span>
        <div class="admin-ligne-actions">${boutons}</div>
      </div>
      <div style="font-size:12px;color:var(--texte-gris);margin-top:4px;">${infosSoumission} — Activités : ${badgesNiveaux}</div>
      <div id="apercu-activites-${seance.id}" style="display:none;margin-top:10px;padding:12px;background:var(--bleu-clair);border-radius:8px;"></div>
    `;
    container.appendChild(ligne);
  });

  document.querySelectorAll('.btn-voir-activites').forEach(btn => {
    btn.addEventListener('click', () => afficherApercuActivites(btn.dataset.id));
  });

  if (!lectureSeule) {
    document.querySelectorAll('.btn-modifier').forEach(btn => {
      btn.addEventListener('click', () => activerModeEdition(btn.dataset.id, donneesAffichees));
    });
    document.querySelectorAll('.btn-supprimer').forEach(btn => {
      btn.addEventListener('click', () => supprimerSeance(btn.dataset.id));
    });
  }
}

async function afficherApercuActivites(seanceId) {
  const zone = document.getElementById('apercu-activites-' + seanceId);
  if (!zone) return;
  if (zone.style.display !== 'none') { zone.style.display = 'none'; return; }

  zone.style.display = 'block';
  zone.innerHTML = 'Chargement...';

  const { data: activites } = await supabaseClient.from('seance_activites').select('*').eq('seance_id', seanceId).order('niveau', { ascending: true });

  if (!activites || activites.length === 0) {
    zone.innerHTML = '<p style="font-size:13px;">Aucune activité ajoutée pour cette séance.</p>';
    return;
  }

  const emojisNiveaux = { 1: '🌱 Azɔ̀ví', 2: '🪘 Dèví', 3: '🦁 Ògán', 4: '👑 Axɔ́sú' };
  const idsActivites = activites.map(a => a.id);

  const { data: blocs } = await supabaseClient.from('activite_blocs').select('*').in('activite_id', idsActivites).order('ordre', { ascending: true });
  const { data: corrections } = await supabaseClient.from('activite_corrections').select('*').in('activite_id', idsActivites);
  const idsCorrections = (corrections || []).map(c => c.id);
  const { data: correctionBlocs } = idsCorrections.length > 0
    ? await supabaseClient.from('correction_blocs').select('*').in('correction_id', idsCorrections).order('ordre', { ascending: true })
    : { data: [] };

  let html = '';
  activites.forEach(a => {
    const blocsActivite = (blocs || []).filter(b => b.activite_id === a.id);
    const correction = (corrections || []).find(c => c.activite_id === a.id);
    const blocsCorrection = correction ? (correctionBlocs || []).filter(cb => cb.correction_id === correction.id) : [];

    html += `<div style="margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--bordure);">
      <strong>${emojisNiveaux[a.niveau]}</strong>`;

    blocsActivite.forEach(b => {
      if (b.type === 'texte') {
        html += `<p style="font-size:13px;margin-top:6px;"><em>${b.contenu.nom || 'Texte'} :</em> ${b.contenu.texte || '(vide)'}</p>`;
      } else {
        const cb = blocsCorrection.find(c => c.bloc_activite_id === b.id);
        html += `<p style="font-size:13px;margin-top:6px;"><strong>Q :</strong> ${b.contenu.enonce || '(vide)'}<br><strong>Réponse :</strong> ${cb && cb.contenu.bonneReponse ? cb.contenu.bonneReponse : '<span style="color:#dc2626;">manquante</span>'}</p>`;
      }
    });

    html += `</div>`;
  });

  zone.innerHTML = html;
}

async function chargerActivitesDepuisBase(seanceId) {
  const { data: activites } = await supabaseClient.from('seance_activites').select('*').eq('seance_id', seanceId).order('ordre', { ascending: true });

  if (!activites || activites.length === 0) {
    reinitialiserActivites();
    return;
  }

  const idsActivites = activites.map(a => a.id);
  const { data: blocs } = await supabaseClient.from('activite_blocs').select('*').in('activite_id', idsActivites).order('ordre', { ascending: true });
  const { data: corrections } = await supabaseClient.from('activite_corrections').select('*').in('activite_id', idsActivites);

  const idsCorrections = (corrections || []).map(c => c.id);
  const { data: correctionBlocs } = idsCorrections.length > 0
    ? await supabaseClient.from('correction_blocs').select('*').in('correction_id', idsCorrections).order('ordre', { ascending: true })
    : { data: [] };

  const blocsParActivite = {};
  (blocs || []).forEach(b => {
    if (!blocsParActivite[b.activite_id]) blocsParActivite[b.activite_id] = [];
    blocsParActivite[b.activite_id].push(b);
  });

  const blocsParCorrection = {};
  (correctionBlocs || []).forEach(cb => {
    if (!blocsParCorrection[cb.correction_id]) blocsParCorrection[cb.correction_id] = [];
    blocsParCorrection[cb.correction_id].push(cb);
  });

  chargerActivitesExistantes(activites, blocsParActivite, corrections || [], blocsParCorrection);
}

async function sauvegarderActivites(seanceId) {
  synchroniserDonneesDepuisDom();

  await supabaseClient.from('seance_activites').delete().eq('seance_id', seanceId);

  for (let i = 0; i < activitesActuelles.length; i++) {
    const activite = activitesActuelles[i];
    if (activite.blocs.length === 0) continue;

    const { data: nouvelleActivite, error: errActivite } = await supabaseClient
      .from('seance_activites')
      .insert({ seance_id: seanceId, niveau: activite.niveau, ordre: i, statut: 'brouillon', cree_par: profilAdmin.id })
      .select().single();

    if (errActivite || !nouvelleActivite) continue;

    const lignesBlocs = activite.blocs.map((b, bi) => ({
      activite_id: nouvelleActivite.id, type: b.type, ordre: bi, contenu: b.contenu
    }));
    const { data: blocsInseres } = await supabaseClient.from('activite_blocs').insert(lignesBlocs).select();

    const { data: nouvelleCorrection } = await supabaseClient
      .from('activite_corrections')
      .insert({ activite_id: nouvelleActivite.id, statut: 'brouillon', cree_par: profilAdmin.id })
      .select().single();

    if (nouvelleCorrection && blocsInseres) {
      const lignesCorrection = activite.correction.blocs.map((cb, cbi) => {
        let blocActiviteReelId = null;
        if (!cb.estNoteLibre) {
          const indexOriginal = activite.blocs.findIndex(b => b.id === cb.blocActiviteId);
          if (indexOriginal !== -1 && blocsInseres[indexOriginal]) {
            blocActiviteReelId = blocsInseres[indexOriginal].id;
          }
        }
        return {
          correction_id: nouvelleCorrection.id,
          bloc_activite_id: blocActiviteReelId,
          type: cb.type,
          ordre: cbi,
          contenu: cb.contenu
        };
      });
      await supabaseClient.from('correction_blocs').insert(lignesCorrection);
    }
  }
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
  remplirUD();
  document.getElementById('uniteDossier').value = infos.nomUD + (infos.semaineUD ? '|' + infos.semaineUD : '');
  remplirSousMatieres();
  document.getElementById('sousMatiere').value = infos.nomSM;
  remplirSA();
  document.getElementById('sa').value = infos.nomSA || '';

  document.getElementById('libelle').value = seance.libelle;
  document.getElementById('numero').value = seance.numero || '';
  document.getElementById('titre').value = seance.titre;
  document.getElementById('statut').value = seance.statut === 'publie' ? 'en_attente' : seance.statut;
  document.getElementById('ordre').value = seance.ordre;

  supabaseClient.from('seance_blocs').select('*').eq('seance_id', id).order('ordre', { ascending: true })
    .then(({ data }) => chargerBlocsExistants(data || []));

  chargerActivitesDepuisBase(id);

  seanceEnEdition = id;
  document.querySelector('#formAjout button[type="submit"]').textContent = '✏️ Modifier';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function supprimerSeance(id) {
  const confirmation = window.confirm("Supprimer cette séance ? Tout son contenu lié (exercices, blocs, activités...) sera aussi supprimé.");
  if (confirmation !== true) return;

  const { error } = await supabaseClient.from('seances').delete().eq('id', id);

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  chargerListe();
}

function resoudreCibleSeance(classeId, nomMatiere, valeurUD, nomSM, nomSA) {
  const [nomUD, semaineUD] = valeurUD.split('|');
  const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiere);
  if (!matiere) return null;

  const ud = tousLesUD.find(u => u.matiere_id === matiere.id && u.nom === nomUD && (u.semaine || '') === (semaineUD || ''));
  if (!ud) return null;

  const sm = toutesLesSousMatieres.find(s => s.unite_dossier_id === ud.id && s.nom === nomSM);
  if (!sm) return null;

  if (nomSA) {
    const sa = toutesLesSA.find(s => s.sous_matiere_id === sm.id && s.nom === nomSA);
    if (!sa) return null;
    return { sa_id: sa.id, sous_matiere_id: null };
  }

  return { sa_id: null, sous_matiere_id: sm.id };
}

function existeDejaSequence(cible, libelle, numero, idAExclure) {
  return toutesLesSeances.some(s => {
    if (idAExclure && s.id === idAExclure) return false;
    if (s.libelle !== libelle) return false;
    if ((s.numero || null) !== (numero || null)) return false;
    return (s.sa_id || null) === (cible.sa_id || null)
      && (s.sous_matiere_id || null) === (cible.sous_matiere_id || null);
  });
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!peutModifier()) return;

  synchroniserContenuBlocs();

  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const valeurUD = document.getElementById('uniteDossier').value;
  const nomSM = document.getElementById('sousMatiere').value;
  const nomSA = document.getElementById('sa').value;
  const libelle = document.getElementById('libelle').value;
  const numero = document.getElementById('numero').value ? parseInt(document.getElementById('numero').value) : null;
  const messageForm = document.getElementById('messageForm');

  if (classesChoisies.length === 0 || !nomMatiere || !valeurUD || !nomSM) {
    messageForm.textContent = "Remplis classe, matière, unité/dossier et sous-matière.";
    return;
  }

  const statutChoisi = document.getElementById('statut').value;
  if (statutChoisi === 'en_attente' && !niveau1EstComplet()) {
    messageForm.textContent = "⛔ Impossible d'envoyer en validation : le niveau 🌱 Azɔ̀ví (avec sa correction complète) est requis.";
    return;
  }

  const donneesCommunes = {
    libelle,
    numero,
    titre: document.getElementById('titre').value,
    statut: statutChoisi,
    ordre: parseInt(document.getElementById('ordre').value)
  };

  let resultat;
  let idSeanceTraitee = null;

  if (seanceEnEdition) {
    const cible = resoudreCibleSeance(classesChoisies[0], nomMatiere, valeurUD, nomSM, nomSA);
    if (!cible) {
      messageForm.textContent = "Combinaison invalide pour cette classe.";
      return;
    }
    if (existeDejaSequence(cible, libelle, numero, seanceEnEdition)) {
      messageForm.textContent = `Une ${libelle === 'seance' ? 'séance' : 'séquence'} avec ce numéro existe déjà à cet emplacement.`;
      return;
    }
    resultat = await supabaseClient.from('seances').update({ ...donneesCommunes, ...cible }).eq('id', seanceEnEdition);
    idSeanceTraitee = seanceEnEdition;
  } else {
    const lignes = [];
    const classesIgnorees = [];
    const classesDoublons = [];

    classesChoisies.forEach(classeId => {
      const cible = resoudreCibleSeance(classeId, nomMatiere, valeurUD, nomSM, nomSA);
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

    resultat = await supabaseClient.from('seances').insert(lignes).select();
    if (resultat.data && resultat.data.length > 0) {
      idSeanceTraitee = resultat.data[0].id;
    }

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

  if (idSeanceTraitee) {
    await supabaseClient.from('seance_blocs').delete().eq('seance_id', idSeanceTraitee);
    if (blocsActuels.length > 0) {
      const lignesBlocs = blocsActuels.map((b, i) => ({
        seance_id: idSeanceTraitee,
        type: b.type,
        ordre: i,
        contenu: b.contenu
      }));
      await supabaseClient.from('seance_blocs').insert(lignesBlocs);
    }

    await sauvegarderActivites(idSeanceTraitee);
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  seanceEnEdition = null;
  reinitialiserBlocs();
  reinitialiserActivites();
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
  remplirUD();
  if (ignorees.length > 0) alert("Déjà existante pour : " + ignorees.join(', '));
});

document.getElementById('btnCreerUD').addEventListener('click', async () => {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
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
    const existeDeja = tousLesUD.some(ud => ud.matiere_id === matiere.id && ud.nom === nom && (ud.semaine || '') === (semaine || ''));
    if (existeDeja) {
      const c = toutesLesClasses.find(cl => cl.id === classeId);
      ignorees.push(c ? c.nom : '?');
      return;
    }
    lignes.push({ type, semaine, nom, ordre: 1, matiere_id: matiere.id });
  });
  if (lignes.length > 0) {
    const { data, error } = await supabaseClient.from('unites_dossiers').insert(lignes).select();
    if (error) { alert("Erreur : " + error.message); return; }
    tousLesUD.push(...data);
  }
  remplirUD();
  document.getElementById('uniteDossier').value = nom + (semaine ? '|' + semaine : '');
  remplirSousMatieres();
  if (ignorees.length > 0) alert("Déjà existante pour : " + ignorees.join(', '));
});

document.getElementById('btnCreerSousMatiere').addEventListener('click', async () => {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const valeurUD = document.getElementById('uniteDossier').value;
  if (classesChoisies.length === 0 || !nomMatiere || !valeurUD) { alert("Choisis d'abord classe(s), matière et unité/dossier."); return; }
  const nom = prompt("Nom de la nouvelle sous-matière :");
  if (!nom) return;
  const [nomUD, semaineUD] = valeurUD.split('|');
  const lignes = [], ignorees = [];
  classesChoisies.forEach(classeId => {
    const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiere);
    if (!matiere) return;
    const ud = tousLesUD.find(u => u.matiere_id === matiere.id && u.nom === nomUD && (u.semaine || '') === (semaineUD || ''));
    if (!ud) return;
    if (toutesLesSousMatieres.some(sm => sm.unite_dossier_id === ud.id && sm.nom === nom)) {
      const c = toutesLesClasses.find(cl => cl.id === classeId);
      ignorees.push(c ? c.nom : '?');
      return;
    }
    lignes.push({ unite_dossier_id: ud.id, matiere_id: matiere.id, nom, ordre: 1 });
  });
  if (lignes.length > 0) {
    const { data, error } = await supabaseClient.from('sous_matieres').insert(lignes).select();
    if (error) { alert("Erreur : " + error.message); return; }
    toutesLesSousMatieres.push(...data);
  }
  remplirSousMatieres();
  document.getElementById('sousMatiere').value = nom;
  remplirSA();
  if (ignorees.length > 0) alert("Déjà existante pour : " + ignorees.join(', '));
});

document.getElementById('btnCreerSA').addEventListener('click', async () => {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const valeurUD = document.getElementById('uniteDossier').value;
  const nomSM = document.getElementById('sousMatiere').value;
  if (classesChoisies.length === 0 || !nomMatiere || !valeurUD || !nomSM) { alert("Choisis d'abord classe(s), matière, unité/dossier et sous-matière."); return; }
  const nom = prompt("Nom de la nouvelle SA (ex: SA 1) :");
  if (!nom) return;
  const [nomUD, semaineUD] = valeurUD.split('|');
  const lignes = [], ignorees = [];
  classesChoisies.forEach(classeId => {
    const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiere);
    if (!matiere) return;
    const ud = tousLesUD.find(u => u.matiere_id === matiere.id && u.nom === nomUD && (u.semaine || '') === (semaineUD || ''));
    if (!ud) return;
    const sm = toutesLesSousMatieres.find(s => s.unite_dossier_id === ud.id && s.nom === nomSM);
    if (!sm) return;
    if (toutesLesSA.some(sa => sa.sous_matiere_id === sm.id && sa.nom === nom)) {
      const c = toutesLesClasses.find(cl => cl.id === classeId);
      ignorees.push(c ? c.nom : '?');
      return;
    }
    lignes.push({ sous_matiere_id: sm.id, nom, ordre: 1 });
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

// ===== Initialisation avec vérification des permissions =====

async function initPage() {
  await verifierConnexion();

  if (!peutAccederType('seances')) {
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
