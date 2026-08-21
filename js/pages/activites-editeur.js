// Éditeur d'activités par niveau + corrections miroir

let activitesActuelles = [];
let compteurIdTempActivite = 0;

const NIVEAUX = {
  1: { nomFon: 'Azɔ̀ví', nomFr: 'Apprenti', emoji: '🌱', classe: 'niveau-1' },
  2: { nomFon: 'Dèví', nomFr: 'Disciple', emoji: '🪘', classe: 'niveau-2' },
  3: { nomFon: 'Ògán', nomFr: 'Patron', emoji: '🦁', classe: 'niveau-3' },
  4: { nomFon: 'Axɔ́sú', nomFr: 'Roi', emoji: '👑', classe: 'niveau-4' }
};

const TYPES_ACTIVITE_BLOCS = {
  texte: '📝 Texte',
  qcm: 'QCM',
  vrai_faux: 'Vrai/Faux',
  reponse_saisie: 'Réponse à saisir',
  calcul: 'Calcul',
  texte_a_completer: 'Texte à compléter',
  association: 'Association',
  classement: 'Classement'
};

function idTempActivite(prefixe) {
  compteurIdTempActivite++;
  return `${prefixe}-temp-${compteurIdTempActivite}`;
}

// ===== Ajout d'une nouvelle activité =====
document.getElementById('btnAjouterActivite').addEventListener('click', () => {
  activitesActuelles.push({
    id: idTempActivite('activite'),
    niveau: 1,
    ordre: activitesActuelles.length,
    blocs: [],
    correction: { id: idTempActivite('correction'), blocs: [] }
  });
  rendreActivites();
});

// ===== Ajout d'un bloc dans une activité =====
function ajouterBlocActivite(activiteId, type) {
  const activite = activitesActuelles.find(a => a.id === activiteId);
  if (!activite) return;
  activite.blocs.push({ id: idTempActivite('bloc'), type, ordre: activite.blocs.length, contenu: {} });
  synchroniserCorrection(activite);
  rendreActivites();
}

// ===== Garde la correction alignée sur les blocs "question" de l'activité =====
function synchroniserCorrection(activite) {
  const blocsQuestions = activite.blocs.filter(b => b.type !== 'texte');

  // Retire les blocs de correction dont le bloc source n'existe plus
  activite.correction.blocs = activite.correction.blocs.filter(cb =>
    cb.estNoteLibre || blocsQuestions.some(b => b.id === cb.blocActiviteId)
  );

  // Ajoute les blocs de correction manquants
  blocsQuestions.forEach((b, i) => {
    const existe = activite.correction.blocs.some(cb => cb.blocActiviteId === b.id);
    if (!existe) {
      activite.correction.blocs.push({
        id: idTempActivite('corbloc'),
        blocActiviteId: b.id,
        type: b.type,
        ordre: i,
        contenu: {}
      });
    }
  });

  // S'assure qu'il y a toujours un bloc note libre à la fin (renommable)
  if (!activite.correction.blocs.some(cb => cb.estNoteLibre)) {
    activite.correction.blocs.push({
      id: idTempActivite('note'),
      estNoteLibre: true,
      type: 'note',
      ordre: 999,
      contenu: { nom: 'Remarque générale', texte: '' }
    });
  }
}

// ===== Construit les champs d'édition pour un bloc d'activité selon son type =====
function champsActiviteBloc(bloc) {
  const c = bloc.contenu;
  if (bloc.type === 'texte') {
    return `
      <input type="text" class="exercice-bloc-champ champ-nom-texte" placeholder="Nom du bloc (facultatif)" value="${c.nom || ''}">
      <textarea class="exercice-bloc-champ champ-texte-libre" rows="3" placeholder="Contenu...">${c.texte || ''}</textarea>
    `;
  }

  let champsSpecifiques = '';
  if (bloc.type === 'qcm') {
    champsSpecifiques = `<textarea class="exercice-bloc-champ champ-reponses" rows="3" placeholder="Réponses proposées, une par ligne">${(c.reponsesProposees || []).join('\n')}</textarea>`;
  }

  return `
    <textarea class="exercice-bloc-champ champ-enonce" rows="2" placeholder="Énoncé de la question">${c.enonce || ''}</textarea>
    ${champsSpecifiques}
  `;
}

// ===== Construit les champs d'édition pour un bloc de correction =====
function champsCorrectionBloc(cb) {
  if (cb.estNoteLibre) {
    return `
      <input type="text" class="exercice-bloc-champ champ-nom-note" placeholder="Nom du bloc" value="${cb.contenu.nom || ''}">
      <textarea class="exercice-bloc-champ champ-note-texte" rows="3" placeholder="Remarque, conseils de correction...">${cb.contenu.texte || ''}</textarea>
    `;
  }
  return `
    <input type="text" class="exercice-bloc-champ champ-bonne-reponse" placeholder="Bonne réponse attendue" value="${cb.contenu.bonneReponse || ''}">
    <textarea class="exercice-bloc-champ champ-explication" rows="2" placeholder="Explication (facultatif)">${cb.contenu.explication || ''}</textarea>
  `;
}

// ===== Rendu complet de la liste d'activités =====
function rendreActivites() {
  const container = document.getElementById('listeActivites');
  container.innerHTML = '';

  activitesActuelles.forEach(activite => {
    const niveauInfo = NIVEAUX[activite.niveau];

    const carte = document.createElement('div');
    carte.className = 'activite-carte';
    carte.dataset.activiteId = activite.id;

    let optionsNiveau = '';
    for (let n = 1; n <= 4; n++) {
      optionsNiveau += `<option value="${n}" ${activite.niveau === n ? 'selected' : ''}>${NIVEAUX[n].emoji} ${NIVEAUX[n].nomFon} (${NIVEAUX[n].nomFr})</option>`;
    }

    let htmlBlocs = activite.blocs.map(bloc => `
      <div class="exercice-bloc-editeur" data-bloc-id="${bloc.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="font-size:12px;">${TYPES_ACTIVITE_BLOCS[bloc.type]}</strong>
          <button type="button" class="btn-secondaire btn-supprimer-bloc-activite" data-bloc-id="${bloc.id}" style="padding:2px 8px;font-size:12px;">✕</button>
        </div>
        ${champsActiviteBloc(bloc)}
      </div>
    `).join('');

    const htmlCorrectionBlocs = activite.correction.blocs.slice().sort((a, b) => a.ordre - b.ordre).map(cb => {
      const blocSource = activite.blocs.find(b => b.id === cb.blocActiviteId);
      const rappelEnonce = blocSource ? `<p style="font-size:12px;color:var(--texte-gris);margin-bottom:6px;">Question : ${blocSource.contenu.enonce || '(énoncé vide)'}</p>` : '';
      return `
        <div class="exercice-bloc-editeur" data-corbloc-id="${cb.id}">
          ${rappelEnonce}
          ${champsCorrectionBloc(cb)}
        </div>
      `;
    }).join('');

    carte.innerHTML = `
      <div class="activite-entete ${niveauInfo.classe}">
        <div class="activite-entete-niveau">
          <select class="activite-select-niveau">${optionsNiveau}</select>
          <span>${niveauInfo.emoji}</span>
        </div>
        <button type="button" class="btn-secondaire btn-supprimer-activite" style="background:white;">🗑️ Supprimer l'activité</button>
      </div>
      <div class="activite-corps">
        <div class="liste-blocs-activite">${htmlBlocs || '<p style="font-size:13px;color:var(--texte-gris);">Aucun bloc pour l\'instant.</p>'}</div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
          <select class="activite-select-type-bloc" style="padding:8px;border:1px solid var(--bordure);border-radius:6px;flex:1;min-width:140px;">
            ${Object.entries(TYPES_ACTIVITE_BLOCS).map(([val, label]) => `<option value="${val}">${label}</option>`).join('')}
          </select>
          <button type="button" class="btn-secondaire btn-ajouter-bloc-activite">➕ Ajouter un bloc</button>
        </div>

        <div class="correction-zone">
          <div class="correction-zone-titre">✅ Correction de cette activité</div>
          ${htmlCorrectionBlocs || '<p style="font-size:13px;color:var(--texte-gris);">Ajoute des blocs à l\'activité pour faire apparaître leur correction ici.</p>'}
        </div>
      </div>
    `;

    container.appendChild(carte);

    // ===== Écouteurs =====
    carte.querySelector('.activite-select-niveau').addEventListener('change', (e) => {
      activite.niveau = parseInt(e.target.value);
      rendreActivites();
    });

    carte.querySelector('.btn-supprimer-activite').addEventListener('click', () => {
      if (!confirm("Supprimer cette activité et sa correction ?")) return;
      activitesActuelles = activitesActuelles.filter(a => a.id !== activite.id);
      rendreActivites();
    });

    carte.querySelector('.btn-ajouter-bloc-activite').addEventListener('click', () => {
      const type = carte.querySelector('.activite-select-type-bloc').value;
      synchroniserDonneesDepuisDom(activite);
      ajouterBlocActivite(activite.id, type);
    });

    carte.querySelectorAll('.btn-supprimer-bloc-activite').forEach(btn => {
      btn.addEventListener('click', () => {
        synchroniserDonneesDepuisDom(activite);
        activite.blocs = activite.blocs.filter(b => b.id !== btn.dataset.blocId);
        synchroniserCorrection(activite);
        rendreActivites();
      });
    });
  });

  mettreAJourMessageStatutNiveaux();
}

// ===== Récupère les valeurs saisies dans le DOM avant de re-rendre =====
function synchroniserDonneesDepuisDom(activiteCible) {
  document.querySelectorAll('.activite-carte').forEach(carte => {
    const activite = activitesActuelles.find(a => a.id === carte.dataset.activiteId);
    if (!activite) return;

    carte.querySelectorAll('.exercice-bloc-editeur[data-bloc-id]').forEach(blocEl => {
      const bloc = activite.blocs.find(b => b.id === blocEl.dataset.blocId);
      if (!bloc) return;
      if (bloc.type === 'texte') {
        bloc.contenu.nom = blocEl.querySelector('.champ-nom-texte')?.value || '';
        bloc.contenu.texte = blocEl.querySelector('.champ-texte-libre')?.value || '';
      } else {
        bloc.contenu.enonce = blocEl.querySelector('.champ-enonce')?.value || '';
        const champReponses = blocEl.querySelector('.champ-reponses');
        if (champReponses) {
          bloc.contenu.reponsesProposees = champReponses.value.split('\n').map(s => s.trim()).filter(Boolean);
        }
      }
    });

    carte.querySelectorAll('.exercice-bloc-editeur[data-corbloc-id]').forEach(cbEl => {
      const cb = activite.correction.blocs.find(c => c.id === cbEl.dataset.corblocId);
      if (!cb) return;
      if (cb.estNoteLibre) {
        cb.contenu.nom = cbEl.querySelector('.champ-nom-note')?.value || '';
        cb.contenu.texte = cbEl.querySelector('.champ-note-texte')?.value || '';
      } else {
        cb.contenu.bonneReponse = cbEl.querySelector('.champ-bonne-reponse')?.value || '';
        cb.contenu.explication = cbEl.querySelector('.champ-explication')?.value || '';
      }
    });
  });
}

// ===== Vérifie si le niveau 1 est complet (activité + blocs + correction remplie) =====
function niveau1EstComplet() {
  synchroniserDonneesDepuisDom();
  const activitesNiveau1 = activitesActuelles.filter(a => a.niveau === 1 && a.blocs.length > 0);
  if (activitesNiveau1.length === 0) return false;

  return activitesNiveau1.some(a => {
    const blocsQuestions = a.blocs.filter(b => b.type !== 'texte');
    if (blocsQuestions.length === 0) return false;
    return blocsQuestions.every(b => {
      const cb = a.correction.blocs.find(c => c.blocActiviteId === b.id);
      return cb && cb.contenu.bonneReponse && cb.contenu.bonneReponse.trim() !== '';
    });
  });
}

function mettreAJourMessageStatutNiveaux() {
  const zone = document.getElementById('messageStatutNiveaux');
  if (!zone) return;

  const niveauxPresents = [1, 2, 3, 4].filter(n => activitesActuelles.some(a => a.niveau === n && a.blocs.length > 0));
  const ok = niveau1EstComplet();

  const texte = niveauxPresents.length > 0
    ? `Niveaux ajoutés : ${niveauxPresents.map(n => NIVEAUX[n].emoji).join(' ')}`
    : 'Aucun niveau ajouté pour l\'instant.';

  zone.innerHTML = `<span class="${ok ? 'statut-niveau-ok' : 'statut-niveau-manquant'}">${ok ? '✅' : '⛔'} ${texte}${ok ? '' : ' — le niveau 🌱 Azɔ̀ví avec sa correction complète est requis pour publier.'}</span>`;
}

// ===== Réinitialisation / chargement =====
function reinitialiserActivites() {
  activitesActuelles = [];
  rendreActivites();
}

function chargerActivitesExistantes(activites, blocsParActivite, corrections, blocsParCorrection) {
  activitesActuelles = activites.map(a => {
    const correction = corrections.find(c => c.activite_id === a.id);
    return {
      id: a.id,
      niveau: a.niveau,
      ordre: a.ordre,
      blocs: (blocsParActivite[a.id] || []).map(b => ({ id: b.id, type: b.type, ordre: b.ordre, contenu: b.contenu || {} })),
      correction: {
        id: correction ? correction.id : idTempActivite('correction'),
        blocs: correction ? (blocsParCorrection[correction.id] || []).map(cb => ({
          id: cb.id,
          blocActiviteId: cb.bloc_activite_id,
          estNoteLibre: !cb.bloc_activite_id,
          type: cb.type,
          ordre: cb.ordre,
          contenu: cb.contenu || {}
        })) : []
      }
    };
  });
  rendreActivites();
}
