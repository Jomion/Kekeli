// Page publique : affichage et correction d'un exercice

const paramsEx = new URLSearchParams(window.location.search);
const exerciceId = paramsEx.get('id');

let exerciceActuel = null;

function normaliser(texte) {
  return (texte || '').toString().trim().toLowerCase();
}

function afficherCorrection(estCorrect) {
  const zone = document.getElementById('zoneCorrection');
  const couleur = estCorrect ? '#16a34a' : '#dc2626';
  const symbole = estCorrect ? '✅ Bonne réponse !' : '❌ Pas tout à fait...';

  let html = `<p style="font-weight:600;color:${couleur};margin-bottom:10px;">${symbole}</p>`;

  if (exerciceActuel.bonne_reponse) {
    html += `<p style="margin-bottom:8px;"><strong>Réponse attendue :</strong> ${exerciceActuel.bonne_reponse}</p>`;
  }
  if (exerciceActuel.correction) {
    html += `<p style="margin-bottom:8px;"><strong>Correction :</strong> ${exerciceActuel.correction}</p>`;
  }
  if (exerciceActuel.explication) {
    html += `<p><strong>Explication :</strong> ${exerciceActuel.explication}</p>`;
  }

  zone.innerHTML = html;
  zone.style.display = 'block';
  zone.style.background = estCorrect ? '#f0fdf4' : '#fef2f2';
  zone.style.border = `1px solid ${couleur}`;
}

function afficherCorrectionManuelle() {
  const zone = document.getElementById('zoneCorrection');
  let html = '<p style="font-weight:600;margin-bottom:10px;">📝 Voici la correction :</p>';
  if (exerciceActuel.bonne_reponse) html += `<p style="margin-bottom:8px;"><strong>Réponse attendue :</strong> ${exerciceActuel.bonne_reponse}</p>`;
  if (exerciceActuel.correction) html += `<p style="margin-bottom:8px;"><strong>Correction :</strong> ${exerciceActuel.correction}</p>`;
  if (exerciceActuel.explication) html += `<p><strong>Explication :</strong> ${exerciceActuel.explication}</p>`;
  zone.innerHTML = html;
  zone.style.display = 'block';
  zone.style.background = 'var(--bleu-clair)';
  zone.style.border = '1px solid var(--bordure)';
}

function construireInterface() {
  const ex = exerciceActuel;
  const zoneReponse = document.getElementById('zoneReponse');

  if (ex.type === 'qcm' && ex.reponses_proposees) {
    zoneReponse.innerHTML = ex.reponses_proposees.map((rep, i) => `
      <label class="checkbox-label" style="display:block;padding:10px;background:var(--bleu-clair);border-radius:8px;margin-bottom:8px;">
        <input type="radio" name="reponseQcm" value="${rep}"> ${rep}
      </label>
    `).join('') + '<button id="btnValider" class="btn-secondaire" style="margin-top:10px;">Valider ma réponse</button>';

    document.getElementById('btnValider').addEventListener('click', () => {
      const choisi = document.querySelector('input[name="reponseQcm"]:checked');
      if (!choisi) { alert("Choisis une réponse."); return; }
      afficherCorrection(normaliser(choisi.value) === normaliser(ex.bonne_reponse));
    });

  } else if (ex.type === 'vrai_faux') {
    zoneReponse.innerHTML = `
      <button class="btn-secondaire" id="btnVrai" style="margin-right:10px;">Vrai</button>
      <button class="btn-secondaire" id="btnFaux">Faux</button>
    `;
    document.getElementById('btnVrai').addEventListener('click', () => afficherCorrection(normaliser('vrai') === normaliser(ex.bonne_reponse)));
    document.getElementById('btnFaux').addEventListener('click', () => afficherCorrection(normaliser('faux') === normaliser(ex.bonne_reponse)));

  } else if (ex.type === 'reponse_saisie' || ex.type === 'calcul' || ex.type === 'texte_a_completer') {
    zoneReponse.innerHTML = `
      <input type="text" id="champReponse" placeholder="Ta réponse..." style="width:100%;padding:12px;border:1px solid var(--bordure);border-radius:8px;font-size:16px;margin-bottom:10px;">
      <button id="btnValider" class="btn-secondaire">Valider ma réponse</button>
    `;
    document.getElementById('btnValider').addEventListener('click', () => {
      const valeur = document.getElementById('champReponse').value;
      if (!valeur.trim()) { alert("Écris une réponse."); return; }
      afficherCorrection(normaliser(valeur) === normaliser(ex.bonne_reponse));
    });

  } else {
    // association, classement, ou tout autre type -> pas de correction automatique
    zoneReponse.innerHTML = `<button id="btnVoirCorrection" class="btn-secondaire">👁️ Voir la correction</button>`;
    document.getElementById('btnVoirCorrection').addEventListener('click', afficherCorrectionManuelle);
  }
}

async function chargerExercice() {
  const container = document.getElementById('contenuExercice');

  if (!exerciceId) {
    container.innerHTML = "Exercice introuvable.";
    return;
  }

  const { data: exercice, error } = await supabaseClient
    .from('exercices')
    .select('*')
    .eq('id', exerciceId)
    .eq('statut', 'publie')
    .single();

  if (error || !exercice) {
    container.innerHTML = "Cet exercice n'est pas disponible.";
    return;
  }

  exerciceActuel = exercice;

  const badgeDifficulte = { facile: '🟢 Facile', moyen: '🟡 Moyen', difficile: '🔴 Difficile' };

  container.innerHTML = `
    ${exercice.titre ? `<h1 style="font-size:20px;color:var(--bleu-fonce);margin-bottom:8px;">${exercice.titre}</h1>` : ''}
    <p style="font-size:13px;color:var(--texte-gris);margin-bottom:16px;">${badgeDifficulte[exercice.difficulte] || ''} ${exercice.bareme ? '- Barème : ' + exercice.bareme : ''}</p>
    <p style="font-size:16px;line-height:1.6;margin-bottom:20px;white-space:pre-wrap;">${exercice.enonce}</p>
    <div id="zoneReponse"></div>
    <div id="zoneCorrection" style="display:none;margin-top:16px;padding:14px;border-radius:8px;"></div>
  `;

  construireInterface();
}

chargerExercice();
