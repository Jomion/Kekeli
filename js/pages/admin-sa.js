// Gestion CRUD des SA (hiérarchie fixe : Matière → Unité/Dossier → Sous-matière → SA)

let saEnEdition = null;
let toutesLesClasses = [];
let toutesLesMatieres = [];
let tousLesUD = [];
let toutesLesSousMatieres = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resUD, resSM] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*'),
    supabaseClient.from('sous_matieres').select('*')
  ]);

  if (resClasses.error) {
    alert("Erreur classes : " + resClasses.error.message);
    return;
  }

  toutesLesClasses = resClasses.data;
  toutesLesMatieres = resMatieres.data || [];
  tousLesUD = resUD.data || [];
  toutesLesSousMatieres = resSM.data || [];

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

  const nomsUDUniques = [...new Set(tousLesUD.map(ud => ud.nom))].sort();
  const selectFiltreUD = document.getElementById('filtreUD');
  nomsUDUniques.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectFiltreUD.appendChild(opt);
  });

  chargerListe();
}

function remplirMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  document.getElementById('uniteDossier').innerHTML = '<option value="">-- Choisir d\'abord une matière --</option>';
  document.getElementById('sousMatiere').innerHTML = '<option value="">-- Choisir d\'abord une unité/dossier --</option>';

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
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirUD);
document.getElementById('uniteDossier').addEventListener('change', remplirSousMatieres);

function retrouverClasseId(sa) {
  const sm = toutesLesSousMatieres.find(s => s.id === sa.sous_matiere_id);
  if (!sm) return null;
  const ud = tousLesUD.find(u => u.id === sm.unite_dossier_id);
  if (!ud) return null;
  const matiere = toutesLesMatieres.find(m => m.id === ud.matiere_id);
  return matiere ? matiere.classe_id : null;
}

function retrouverInfos(sa) {
  const classeId = retrouverClasseId(sa);
  const classeObj = toutesLesClasses.find(c => c.id === classeId);
  const sm = toutesLesSousMatieres.find(s => s.id === sa.sous_matiere_id);
  const ud = sm ? tousLesUD.find(u => u.id === sm.unite_dossier_id) : null;
  const matiere = ud ? toutesLesMatieres.find(m => m.id === ud.matiere_id) : null;

  return {
    classeId,
    nomClasse: classeObj ? classeObj.nom : '?',
    nomMatiere: matiere ? matiere.nom : '?',
    nomUD: ud ? ud.nom : '?',
    semaineUD: ud ? ud.semaine : null,
    nomSM: sm ? sm.nom : '?'
  };
}

async function chargerListe() {
  const container = document.getElementById('listeSA');
  const filtreClasseId = document.getElementById('filtreClasse').value;
  const filtreMatiereNom = document.getElementById('filtreMatiere').value;
  const filtreUDNom = document.getElementById('filtreUD').value;

  const { data, error } = await supabaseClient
    .from('sa')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  let donneesAffichees = data.map(sa => ({ ...sa, __infos: retrouverInfos(sa) }));

  if (filtreClasseId) donneesAffichees = donneesAffichees.filter(sa => sa.__infos.classeId === filtreClasseId);
  if (filtreMatiereNom) donneesAffichees = donneesAffichees.filter(sa => sa.__infos.nomMatiere === filtreMatiereNom);
  if (filtreUDNom) donneesAffichees = donneesAffichees.filter(sa => sa.__infos.nomUD === filtreUDNom);

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucune SA pour l'instant.";
    return;
  }

  container.innerHTML = '';
  donneesAffichees.forEach(sa => {
    const infos = sa.__infos;
    const contexte = `${infos.nomSM} - ${infos.nomUD}${infos.semaineUD ? ' (' + infos.semaineUD + ')' : ''} - ${infos.nomMatiere} - ${infos.nomClasse}`;

    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${sa.nom} <small>(${contexte})</small></span>
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

  const infos = sa.__infos;
  Array.from(document.getElementById('classe').options).forEach(opt => {
    opt.selected = (opt.value === infos.classeId);
  });
  remplirMatieres();
  document.getElementById('matiere').value = infos.nomMatiere;
  remplirUD();
  document.getElementById('uniteDossier').value = infos.nomUD + (infos.semaineUD ? '|' + infos.semaineUD : '');
  remplirSousMatieres();
  document.getElementById('sousMatiere').value = infos.nomSM;

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

function resoudreSousMatiere(classeId, nomMatiere, valeurUD, nomSM) {
  const [nomUD, semaineUD] = valeurUD.split('|');
  const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiere);
  if (!matiere) return null;
  const ud = tousLesUD.find(u => u.matiere_id === matiere.id && u.nom === nomUD && (u.semaine || '') === (semaineUD || ''));
  if (!ud) return null;
  return toutesLesSousMatieres.find(sm => sm.unite_dossier_id === ud.id && sm.nom === nomSM);
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const valeurUD = document.getElementById('uniteDossier').value;
  const nomSM = document.getElementById('sousMatiere').value;
  const nom = document.getElementById('nom').value;
  const ordre = parseInt(document.getElementById('ordre').value);
  const messageForm = document.getElementById('messageForm');

  if (classesChoisies.length === 0 || !nomMatiere || !valeurUD || !nomSM) {
    messageForm.textContent = "Remplis tous les champs (classe, matière, unité/dossier, sous-matière).";
    return;
  }

  let resultat;

  if (saEnEdition) {
    const sm = resoudreSousMatiere(classesChoisies[0], nomMatiere, valeurUD, nomSM);
    if (!sm) { messageForm.textContent = "Combinaison invalide."; return; }
    resultat = await supabaseClient.from('sa').update({ sous_matiere_id: sm.id, nom, ordre }).eq('id', saEnEdition);
  } else {
    const lignes = [];
    const ignorees = [];

    classesChoisies.forEach(classeId => {
      const sm = resoudreSousMatiere(classeId, nomMatiere, valeurUD, nomSM);
      if (!sm) {
        const classe = toutesLesClasses.find(c => c.id === classeId);
        ignorees.push(classe ? classe.nom : '?');
        return;
      }
      lignes.push({ sous_matiere_id: sm.id, nom, ordre });
    });

    if (lignes.length === 0) {
      messageForm.textContent = "Aucune des classes sélectionnées n'a cette combinaison.";
      return;
    }

    resultat = await supabaseClient.from('sa').insert(lignes);

    if (!resultat.error && ignorees.length > 0) {
      messageForm.style.color = '#b45309';
      messageForm.textContent = `Ajouté, mais ignoré pour : ${ignorees.join(', ')}.`;
    }
  }

  if (resultat.error) {
    if (resultat.error.code === '23505') {
      messageForm.textContent = "Cette SA existe déjà pour cette sous-matière.";
    } else {
      messageForm.textContent = "Erreur : " + resultat.error.message;
    }
    return;
  }

  document.getElementById('formAjout').reset();
  document.querySelector('#formAjout button[type="submit"]').textContent = '➕ Ajouter';
  saEnEdition = null;
  if (!messageForm.textContent.includes('ignoré')) messageForm.textContent = '';
  messageForm.style.color = '';

  chargerListe();
});

document.getElementById('filtreClasse').addEventListener('change', chargerListe);
document.getElementById('filtreMatiere').addEventListener('change', chargerListe);
document.getElementById('filtreUD').addEventListener('change', chargerListe);

async function initPage() {
  await verifierConnexion();
  if (!profilAdmin || profilAdmin.role !== 'super_admin') {
    document.body.innerHTML = '<p style="padding:40px;text-align:center;color:#dc2626;">Accès réservé au super administrateur.</p>';
    return;
  }
  chargerDonneesBase();
}
initPage();
