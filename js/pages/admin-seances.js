// Gestion CRUD des séances

verifierConnexion();

let seanceEnEdition = null;
let toutesLesClasses = [];
let toutesLesMatieres = [];
let toutesLesSousMatieres = [];
let tousLesUD = [];
let toutesLesSA = [];

async function chargerDonneesBase() {
  const [resClasses, resMatieres, resSousMatieres, resUD, resSA] = await Promise.all([
    supabaseClient.from('classes').select('*').order('ordre', { ascending: true }),
    supabaseClient.from('matieres').select('*'),
    supabaseClient.from('sous_matieres').select('*'),
    supabaseClient.from('unites_dossiers').select('*'),
    supabaseClient.from('sa').select('*')
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

  const nomsSAUniques = [...new Set(toutesLesSA.map(sa => sa.nom))].sort();
  const selectFiltreSA = document.getElementById('filtreSA');
  nomsSAUniques.forEach(nom => {
    const opt = document.createElement('option');
    opt.value = nom;
    opt.textContent = nom;
    selectFiltreSA.appendChild(opt);
  });

  chargerListe();
}

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

function retrouverClasseId(seance) {
  let matiereId = seance.matiere_id;

  function matiereDepuisSousMatiere(smId) {
    const sm = toutesLesSousMatieres.find(s => s.id === smId);
    return sm ? sm.matiere_id : null;
  }
  function matiereDepuisUD(udId) {
    const ud = tousLesUD.find(u => u.id === udId);
    if (!ud) return null;
    return ud.sous_matiere_id ? matiereDepuisSousMatiere(ud.sous_matiere_id) : ud.matiere_id;
  }

  if (seance.sa_id) {
    const sa = toutesLesSA.find(s => s.id === seance.sa_id);
    if (sa) {
      if (sa.unite_dossier_id) matiereId = matiereDepuisUD(sa.unite_dossier_id);
      else if (sa.sous_matiere_id) matiereId = matiereDepuisSousMatiere(sa.sous_matiere_id);
      else matiereId = sa.matiere_id;
    }
  } else if (seance.unite_dossier_id) {
    matiereId = matiereDepuisUD(seance.unite_dossier_id);
  } else if (seance.sous_matiere_id) {
    matiereId = matiereDepuisSousMatiere(seance.sous_matiere_id);
  }

  const matiere = toutesLesMatieres.find(m => m.id === matiereId);
  return matiere ? matiere.classe_id : null;
}

function retrouverInfos(seance) {
  const classeId = retrouverClasseId(seance);
  const classeObj = toutesLesClasses.find(c => c.id === classeId);
  const nomClasse = classeObj ? classeObj.nom : '?';

  let nomMatiere = '?', nomSA = null;
  if (seance.sa_id) {
    const sa = toutesLesSA.find(s => s.id === seance.sa_id);
    nomSA = sa ? sa.nom : '?';
  }

  const matiereId = (function() {
    if (seance.sa_id) {
      const sa = toutesLesSA.find(s => s.id === seance.sa_id);
      if (sa) {
        if (sa.unite_dossier_id) {
          const ud = tousLesUD.find(u => u.id === sa.unite_dossier_id);
          if (ud && ud.sous_matiere_id) return toutesLesSousMatieres.find(s => s.id === ud.sous_matiere_id)?.matiere_id;
          if (ud) return ud.matiere_id;
        }
        if (sa.sous_matiere_id) return toutesLesSousMatieres.find(s => s.id === sa.sous_matiere_id)?.matiere_id;
        return sa.matiere_id;
      }
    }
    if (seance.unite_dossier_id) {
      const ud = tousLesUD.find(u => u.id === seance.unite_dossier_id);
      if (ud && ud.sous_matiere_id) return toutesLesSousMatieres.find(s => s.id === ud.sous_matiere_id)?.matiere_id;
      if (ud) return ud.matiere_id;
    }
    if (seance.sous_matiere_id) return toutesLesSousMatieres.find(s => s.id === seance.sous_matiere_id)?.matiere_id;
    return seance.matiere_id;
  })();

  const m = toutesLesMatieres.find(mm => mm.id === matiereId);
  nomMatiere = m ? m.nom : '?';

  return { classeId, nomClasse, nomMatiere, nomSA };
}

async function chargerListe() {
  const container = document.getElementById('listeSeances');
  const filtreClasseId = document.getElementById('filtreClasse').value;
  const filtreMatiereNom = document.getElementById('filtreMatiere').value;
  const filtreSANom = document.getElementById('filtreSA').value;

  const { data, error } = await supabaseClient
    .from('seances')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  let donneesAffichees = data.map(s => ({ ...s, __infos: retrouverInfos(s) }));

  if (filtreClasseId) donneesAffichees = donneesAffichees.filter(s => s.__infos.classeId === filtreClasseId);
  if (filtreMatiereNom) donneesAffichees = donneesAffichees.filter(s => s.__infos.nomMatiere === filtreMatiereNom);
  if (filtreSANom) donneesAffichees = donneesAffichees.filter(s => s.__infos.nomSA === filtreSANom);

  if (donneesAffichees.length === 0) {
    container.innerHTML = "Aucune séance pour l'instant.";
    return;
  }

  container.innerHTML = '';
  donneesAffichees.forEach(seance => {
    const badgeStatut = seance.statut === 'publie' ? '🟢' : '⚪';
    const infos = seance.__infos;
    const contexte = `${infos.nomMatiere} - ${infos.nomClasse}`;
    const ligne = document.createElement('div');
    ligne.className = 'admin-ligne';
    ligne.innerHTML = `
      <span>${badgeStatut} ${seance.libelle === 'seance' ? 'Séance' : 'Séquence'} ${seance.numero || ''} : ${seance.titre} <small>(${contexte})</small></span>
      <div class="admin-ligne-actions">
        <button class="btn-modifier" data-id="${seance.id}">✏️</button>
        <button class="btn-supprimer" data-id="${seance.id}">🗑️</button>
      </div>
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
  document.getElementById('statut').value = seance.statut;
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

document.getElementById('formAjout').addEventListener('submit', async (e) => {
  e.preventDefault();

  const classesChoisies = Array.from(document.getElementById('classe').selectedOptions).map(o => o.value);
  const nomMatiere = document.getElementById('matiere').value;
  const nomSM = document.getElementById('sousMatiere').value;
  const nomUD = document.getElementById('uniteDossier').value;
  const nomSA = document.getElementById('sa').value;
  const messageForm = document.getElementById('messageForm');

  if (classesChoisies.length === 0 || !nomMatiere) {
    messageForm.textContent = "Sélectionne au moins une classe et une matière.";
    return;
  }

  const donneesCommunes = {
    libelle: document.getElementById('libelle').value,
    numero: document.getElementById('numero').value ? parseInt(document.getElementById('numero').value) : null,
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
    resultat = await supabaseClient.from('seances').update({ ...donneesCommunes, ...cible }).eq('id', seanceEnEdition);
  } else {
    const lignes = [];
    const classesIgnorees = [];

    classesChoisies.forEach(classeId => {
      const cible = resoudreCibleSeance(classeId, nomMatiere, nomSM, nomUD, nomSA);
      if (!cible) {
        const classe = toutesLesClasses.find(c => c.id === classeId);
        classesIgnorees.push(classe ? classe.nom : '?');
        return;
      }
      lignes.push({ ...donneesCommunes, ...cible });
    });

    if (lignes.length === 0) {
      messageForm.textContent = "Aucune des classes sélectionnées n'a cette combinaison.";
      return;
    }

    resultat = await supabaseClient.from('seances').insert(lignes);

    if (!resultat.error && classesIgnorees.length > 0) {
      messageForm.style.color = '#b45309';
      messageForm.textContent = `Ajouté, mais ignoré pour : ${classesIgnorees.join(', ')}.`;
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
});

document.getElementById('filtreClasse').addEventListener('change', chargerListe);
document.getElementById('filtreMatiere').addEventListener('change', chargerListe);
document.getElementById('filtreSA').addEventListener('change', chargerListe);

chargerDonneesBase();
