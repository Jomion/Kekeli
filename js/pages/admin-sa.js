// Gestion CRUD des SA

let saEnEdition = null;
let toutesLesClasses = [];
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

  toutesLesClasses = resClasses.data;
  toutesLesMatieres = resMatieres.data || [];
  toutesLesSousMatieres = resSousMatieres.data || [];
  tousLesUD = resUD.data || [];

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
  const selectMatiere = document.getElementById('matiere');
  document.getElementById('sousMatiere').innerHTML = '<option value="">-- Aucune / non applicable --</option>';
  document.getElementById('uniteDossier').innerHTML = '<option value="">-- Aucun / rattacher directement --</option>';

  selectMatiere.innerHTML = '<option value="">-- Choisir une matière --</option>';
  if (classesChoisies.length === 0) return;

  const nomsDisponibles = [...new Set(
    toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id)).map(m => m.nom)
  )].sort();

  nomsDisponibles.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectMatiere.appendChild(opt);
  });
}

function remplirSousMatieres() {
  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  document.getElementById('uniteDossier').innerHTML = '<option value="">-- Aucun / rattacher directement --</option>';

  const selectSM = document.getElementById('sousMatiere');
  selectSM.innerHTML = '<option value="">-- Aucune / non applicable --</option>';
  if (!nomMatiere) return;

  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);
  const nomsSM = [...new Set(
    toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id)).map(sm => sm.nom)
  )].sort();

  nomsSM.forEach(nom => {
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

  const selectUD = document.getElementById('uniteDossier');
  selectUD.innerHTML = '<option value="">-- Aucun / rattacher directement --</option>';
  if (!nomMatiere) return;

  const idsMatieres = toutesLesMatieres.filter(m => classesChoisies.includes(m.classe_id) && m.nom === nomMatiere).map(m => m.id);

  let idsCibles;
  if (nomSM) {
    idsCibles = toutesLesSousMatieres.filter(sm => idsMatieres.includes(sm.matiere_id) && sm.nom === nomSM).map(sm => sm.id);
    var nomsUD = [...new Set(tousLesUD.filter(ud => idsCibles.includes(ud.sous_matiere_id)).map(ud => ud.nom))].sort();
  } else {
    var nomsUD = [...new Set(tousLesUD.filter(ud => idsMatieres.includes(ud.matiere_id)).map(ud => ud.nom))].sort();
  }

  nomsUD.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectUD.appendChild(opt);
  });
}

document.getElementById('classe').addEventListener('change', remplirMatieres);
document.getElementById('matiere').addEventListener('change', remplirSousMatieres);
document.getElementById('sousMatiere').addEventListener('change', remplirUD);

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

function retrouverInfos(sa) {
  const classeId = retrouverClasseId(sa);
  const classeObj = toutesLesClasses.find(c => c.id === classeId);
  const nomClasse = classeObj ? classeObj.nom : '?';

  let nomMatiere = '?', nomUD = null;
  if (sa.unite_dossier_id) {
    const ud = tousLesUD.find(u => u.id === sa.unite_dossier_id);
    nomUD = ud ? ud.nom : '?';
    if (ud && ud.sous_matiere_id) {
      const sm = toutesLesSousMatieres.find(s => s.id === ud.sous_matiere_id);
      const m = sm ? toutesLesMatieres.find(mm => mm.id === sm.matiere_id) : null;
      nomMatiere = m ? m.nom : '?';
    } else if (ud) {
      const m = toutesLesMatieres.find(mm => mm.id === ud.matiere_id);
      nomMatiere = m ? m.nom : '?';
    }
  } else if (sa.sous_matiere_id) {
    const sm = toutesLesSousMatieres.find(s => s.id === sa.sous_matiere_id);
    const m = sm ? toutesLesMatieres.find(mm => mm.id === sm.matiere_id) : null;
    nomMatiere = m ? m.nom : '?';
  } else if (sa.matiere_id) {
    const m = toutesLesMatieres.find(mm => mm.id === sa.matiere_id);
    nomMatiere = m ? m.nom : '?';
  }

  return { classeId, nomClasse, nomMatiere, nomUD };
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
    const contexte = infos.nomUD
      ? `${infos.nomUD} - ${infos.nomMatiere} - ${infos.nomClasse}`
      : `${infos.nomMatiere} - ${infos.nomClasse}`;

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
  remplirSousMatieres();

  if (sa.sous_matiere_id) {
    const sm = toutesLesSousMatieres.find(s => s.id === sa.sous_matiere_id);
    document.getElementById('sousMatiere').value = sm ? sm.nom : '';
  } else if (sa.unite_dossier_id) {
    const ud = tousLesUD.find(u => u.id === sa.unite_dossier_id);
    if (ud && ud.sous_matiere_id) {
      const sm = toutesLesSousMatieres.find(s => s.id === ud.sous_matiere_id);
      document.getElementById('sousMatiere').value = sm ? sm.nom : '';
    }
  }
  remplirUD();
  document.getElementById('uniteDossier').value = infos.nomUD || '';

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

// Retrouve l'id précis (matière, sous-matière ou UD) pour une classe donnée
function resoudreCibleSA(classeId, nomMatiere, nomSM, nomUD) {
  const matiere = toutesLesMatieres.find(m => m.classe_id === classeId && m.nom === nomMatiere);
  if (!matiere) return null;

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
    return { unite_dossier_id: ud.id, sous_matiere_id: null, matiere_id: null };
  }

  if (nomSM) {
    const sm = toutesLesSousMatieres.find(s => s.matiere_id === matiere.id && s.nom === nomSM);
    if (!sm) return null;
    return { unite_dossier_id: null, sous_matiere_id: sm.id, matiere_id: null };
  }

  return { unite_dossier_id: null, sous_matiere_id: null, matiere_id: matiere.id };
}

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const nomSM = document.getElementById('sousMatiere').value;
  const nomUD = document.getElementById('uniteDossier').value;
  const nom = document.getElementById('nom').value;
  const ordre = parseInt(document.getElementById('ordre').value);
  const messageForm = document.getElementById('messageForm');

  if (classesChoisies.length === 0 || !nomMatiere) {
    messageForm.textContent = "Sélectionne au moins une classe et une matière.";
    return;
  }

  let resultat;

  if (saEnEdition) {
    const cible = resoudreCibleSA(classesChoisies[0], nomMatiere, nomSM, nomUD);
    if (!cible) {
      messageForm.textContent = "Combinaison invalide pour cette classe.";
      return;
    }
    resultat = await supabaseClient.from('sa').update({ nom, ordre, ...cible }).eq('id', saEnEdition);
  } else {
    const lignes = [];
    const classesIgnorees = [];

    classesChoisies.forEach(classeId => {
      const cible = resoudreCibleSA(classeId, nomMatiere, nomSM, nomUD);
      if (!cible) {
        const classe = toutesLesClasses.find(c => c.id === classeId);
        classesIgnorees.push(classe ? classe.nom : '?');
        return;
      }
      lignes.push({ nom, ordre, ...cible });
    });

    if (lignes.length === 0) {
      messageForm.textContent = "Aucune des classes sélectionnées n'a cette combinaison matière/sous-matière/unité.";
      return;
    }

    resultat = await supabaseClient.from('sa').insert(lignes);

    if (!resultat.error && classesIgnorees.length > 0) {
      messageForm.style.color = '#b45309';
      messageForm.textContent = `Ajouté, mais ignoré pour : ${classesIgnorees.join(', ')}.`;
    }
  }

  if (resultat.error) {
    if (resultat.error.code === '23505') {
      messageForm.textContent = "Cette SA existe déjà pour au moins une des classes sélectionnées.";
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
