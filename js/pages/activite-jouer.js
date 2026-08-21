// Page publique : passer une activité (par niveau) et voir le score

const paramsActivite = new URLSearchParams(window.location.search);
const activiteId = paramsActivite.get('id');

const NIVEAUX_PUB = {
  1: { nomFon: 'Azɔ̀ví', nomFr: 'Apprenti', emoji: '🌱', classe: 'niveau-1' },
  2: { nomFon: 'Dèví', nomFr: 'Disciple', emoji: '🪘', classe: 'niveau-2' },
  3: { nomFon: 'Ògán', nomFr: 'Patron', emoji: '🦁', classe: 'niveau-3' },
  4: { nomFon: 'Axɔ́sú', nomFr: 'Roi', emoji: '👑', classe: 'niveau-4' }
};

let blocsQuestions = [];
let indexQuestionActuelle = 0;
let reponsesEleve = [];
let correctionsParBloc = {};

function normaliserActivite(texte) {
  return (texte || '').toString().trim().toLowerCase();
}

async function chargerActivite() {
  const container = document.getElementById('contenuActivite');

  if (!activiteId) {
    container.innerHTML = "Activité introuvable.";
    return;
  }

  const { data: activite, error } = await supabaseClient
    .from('seance_activites')
    .select('*, seances(titre)')
    .eq('id', activiteId)
    .eq('statut', 'publie')
    .single();

  if (error || !activite) {
    container.innerHTML = "Cette activité n'est pas disponible.";
    return;
  }

  const { data: blocs } = await supabaseClient.from('activite_blocs').select('*').eq('activite_id', activiteId).order('ordre', { ascending: true });

  const { data: correction } = await supabaseClient.from('activite_corrections').select('*').eq('activite_id', activiteId).eq('statut', 'publie').maybeSingle();

  if (correction) {
    const { data: correctionBlocs } = await supabaseClient.from('correction_blocs').select('*').eq('correction_id', correction.id);
    (correctionBlocs || []).forEach(cb => {
      if (cb.bloc_activite_id) correctionsParBloc[cb.bloc_activite_id] = cb.contenu;
    });
  }

  const niveauInfo = NIVEAUX_PUB[activite.niveau];
  const blocsAffichables = (blocs || []);
  blocsQuestions = blocsAffichables.filter(b => b.type !== 'texte');

  let htmlIntro = `
    <div class="rendu-niveau-badge-grand ${niveauInfo.classe}">
      <span class="nom-fon">${niveauInfo.emoji} ${niveauInfo.nomFon}</span>
      <span class="nom-fr">${niveauInfo.nomFr}</span>
    </div>
    <p style="color:var(--texte-gris);font-size:13px;margin-bottom:16px;">${activite.seances ? activite.seances.titre : ''}</p>
  `;

  // Affiche les blocs "texte" d'introduction en premier
  const blocsTexte = blocsAffichables.filter(b => b.type === 'texte');
  blocsTexte.forEach(b => {
    htmlIntro += `<div class="rendu-bloc rendu-bloc-texte">${b.contenu.nom ? `<span class="rendu-bloc-label">${b.contenu.nom}</span>` : ''}<p>${b.contenu.texte || ''}</p></div>`;
  });

  if (blocsQuestions.length === 0) {
    container.innerHTML = htmlIntro + '<p>Cette activité n\'a pas encore de question.</p>';
    return;
  }

  container.innerHTML = htmlIntro + '<div id="zoneQuestionActivite"></div>';
  indexQuestionActuelle = 0;
  reponsesEleve = [];
  afficherQuestionActivite();
}

function construireInterfaceReponse(bloc) {
  if (bloc.type === 'qcm' && bloc.contenu.reponsesProposees) {
    return bloc.contenu.reponsesProposees.map(rep => `
      <label class="checkbox-label" style="display:block;padding:10px;background:var(--bleu-clair);border-radius:8px;margin-bottom:8px;">
        <input type="radio" name="reponseActivite" value="${rep}"> ${rep}
      </label>
    `).join('');
  }
  if (bloc.type === 'vrai_faux') {
    return `
      <label class="checkbox-label" style="display:block;padding:10px;background:var(--bleu-clair);border-radius:8px;margin-bottom:8px;">
        <input type="radio" name="reponseActivite" value="vrai"> Vrai
      </label>
      <label class="checkbox-label" style="display:block;padding:10px;background:var(--bleu-clair);border-radius:8px;margin-bottom:8px;">
        <input type="radio" name="reponseActivite" value="faux"> Faux
      </label>
    `;
  }
  return `<input type="text" id="champReponseActivite" placeholder="Ta réponse..." style="width:100%;padding:12px;border:1px solid var(--bordure);border-radius:8px;font-size:16px;">`;
}

function afficherQuestionActivite() {
  const zone = document.getElementById('zoneQuestionActivite');
  const bloc = blocsQuestions[indexQuestionActuelle];

  zone.innerHTML = `
    <p style="font-size:13px;color:var(--texte-gris);margin-bottom:8px;">Question ${indexQuestionActuelle + 1} / ${blocsQuestions.length}</p>
    <p style="font-size:16px;line-height:1.6;margin-bottom:16px;">${bloc.contenu.enonce || ''}</p>
    ${construireInterfaceReponse(bloc)}
    <button id="btnSuivantActivite" class="btn-secondaire" style="margin-top:16px;">${indexQuestionActuelle === blocsQuestions.length - 1 ? 'Terminer' : 'Suivant'}</button>
  `;

  document.getElementById('btnSuivantActivite').addEventListener('click', () => {
    let reponse = '';
    if (bloc.type === 'qcm' || bloc.type === 'vrai_faux') {
      const choisi = document.querySelector('input[name="reponseActivite"]:checked');
      if (!choisi) { alert("Choisis une réponse."); return; }
      reponse = choisi.value;
    } else {
      reponse = document.getElementById('champReponseActivite').value;
      if (!reponse.trim()) { alert("Écris une réponse."); return; }
    }

    const correctionBloc = correctionsParBloc[bloc.id] || {};
    const estCorrect = correctionBloc.bonneReponse ? normaliserActivite(reponse) === normaliserActivite(correctionBloc.bonneReponse) : null;

    reponsesEleve.push({ bloc, reponse, estCorrect, correctionBloc });

    indexQuestionActuelle++;
    if (indexQuestionActuelle < blocsQuestions.length) {
      afficherQuestionActivite();
    } else {
      afficherScoreActivite();
    }
  });
}

function afficherScoreActivite() {
  const container = document.getElementById('contenuActivite');
  const corrigees = reponsesEleve.filter(r => r.estCorrect !== null);
  const correctes = corrigees.filter(r => r.estCorrect).length;
  const pourcentage = corrigees.length > 0 ? Math.round((correctes / corrigees.length) * 100) : null;

  const details = reponsesEleve.map((r, i) => `
    <div style="padding:12px;background:${r.estCorrect === true ? '#f0fdf4' : r.estCorrect === false ? '#fef2f2' : '#f8fafc'};border-radius:8px;margin-bottom:10px;">
      <p style="font-size:13px;color:var(--texte-gris);margin-bottom:4px;">Question ${i + 1}</p>
      <p style="margin-bottom:6px;">${r.bloc.contenu.enonce}</p>
      <p style="font-size:14px;">${r.estCorrect === true ? '✅' : r.estCorrect === false ? '❌' : '📝'} Ta réponse : <strong>${r.reponse}</strong></p>
      ${r.estCorrect === false && r.correctionBloc.bonneReponse ? `<p style="font-size:14px;">Bonne réponse : <strong>${r.correctionBloc.bonneReponse}</strong></p>` : ''}
      ${r.correctionBloc.explication ? `<p style="font-size:13px;margin-top:6px;color:var(--texte-gris);">${r.correctionBloc.explication}</p>` : ''}
    </div>
  `).join('');

  container.innerHTML = `
    <h1 style="font-size:22px;color:var(--bleu-fonce);margin-bottom:8px;">Résultat</h1>
    ${pourcentage !== null ? `<p style="font-size:32px;font-weight:700;color:var(--bleu-principal);margin-bottom:4px;">${pourcentage}%</p>` : '<p style="color:var(--texte-gris);margin-bottom:12px;">Correction non encore disponible pour cette activité.</p>'}
    ${details}
  `;
}

chargerActivite();
