// Définition des 16 blocs pédagogiques (cahier des charges §6.1)
// Réutilisé par l'éditeur (édition) et, plus tard, par la vue élève (lecture seule).

const TYPES_BLOCS = [
  { valeur: 'texte',      label: 'Texte',       icone: '📝', usage: 'Explication' },
  { valeur: 'titre',      label: 'Titre',       icone: '🔠', usage: 'Section' },
  { valeur: 'a_retenir',  label: 'À retenir',   icone: '⭐', usage: 'Notion essentielle' },
  { valeur: 'definition', label: 'Définition',  icone: '📖', usage: 'Terme' },
  { valeur: 'exemple',    label: 'Exemple',     icone: '💡', usage: 'Illustration' },
  { valeur: 'attention',  label: 'Attention',   icone: '⚠️', usage: 'Point de vigilance' },
  { valeur: 'astuce',     label: 'Astuce',      icone: '🎯', usage: 'Mémo / méthode' },
  { valeur: 'image',      label: 'Image',       icone: '🖼️', usage: 'Illustration' },
  { valeur: 'video',      label: 'Vidéo',       icone: '🎬', usage: 'Ressource' },
  { valeur: 'tableau',    label: 'Tableau',     icone: '📊', usage: 'Données' },
  { valeur: 'formule',    label: 'Formule',     icone: '🧮', usage: 'Mathématiques' },
  { valeur: 'activite',   label: 'Activité',    icone: '🙋', usage: 'Activité pédagogique' },
  { valeur: 'exercice',   label: 'Exercice',    icone: '✏️', usage: 'Entraînement interactif' },
  { valeur: 'quiz',       label: 'Quiz',        icone: '❓', usage: 'Questions' },
  { valeur: 'evaluation', label: 'Évaluation',  icone: '🧾', usage: 'Évaluation / épreuve' },
  { valeur: 'ressource',  label: 'Ressource',   icone: '📎', usage: 'Document ou média' }
];

function infoType(valeur) {
  return TYPES_BLOCS.find(t => t.valeur === valeur) || { label: valeur, icone: '❔' };
}

const TYPES_TEXTE_LIBRE = ['texte', 'a_retenir', 'definition', 'exemple', 'attention', 'astuce'];

// Génère le HTML d'édition d'un bloc. Aucune valeur n'est injectée dans un
// attribut on*="" : tous les écouteurs sont attachés ensuite via data-attributs
// (voir attacherEcouteursBloc dans editeur-seance.js) pour éviter tout souci
// d'échappement de guillemets dans le contenu.
function html_editeurBloc(bloc) {
  const c = bloc.contenu || {};
  switch (bloc.type_bloc) {
    case 'titre':
      return `<input type="text" data-champ="texte" placeholder="Titre de la section" value="${echapper(c.texte)}">`;

    case 'texte': case 'a_retenir': case 'definition': case 'exemple': case 'attention': case 'astuce':
      return `<textarea data-champ="texte" placeholder="Contenu...">${echapper(c.texte)}</textarea>`;

    case 'image': case 'video':
      return `
        <div class="champ-ligne"><label>URL</label><input type="url" data-champ="url" placeholder="https://..." value="${echapper(c.url)}"></div>
        <div class="champ-ligne"><label>Légende</label><input type="text" data-champ="legende" placeholder="Légende / description" value="${echapper(c.legende)}"></div>`;

    case 'ressource':
      return `
        <div class="champ-ligne"><label>Nom</label><input type="text" data-champ="nom" value="${echapper(c.nom)}"></div>
        <div class="champ-ligne"><label>URL</label><input type="url" data-champ="url" placeholder="https://..." value="${echapper(c.url)}"></div>`;

    case 'formule':
      return `<input type="text" data-champ="formule" placeholder="Ex: (a + b)² = a² + 2ab + b²" value="${echapper(c.formule)}">
        <p class="note-future">Rendu mathématique enrichi (LaTeX) prévu à une étape ultérieure.</p>`;

    case 'tableau':
      return html_editeurTableau(bloc, c);

    case 'activite':
      return `<textarea data-champ="consigne" placeholder="Consigne de l'activité...">${echapper(c.consigne)}</textarea>
        <div class="champ-ligne"><label>Palier</label>${html_selectPalier(bloc)}</div>`;

    case 'exercice': case 'quiz': case 'evaluation':
      return `<textarea data-champ="consigne" placeholder="Consigne (l'éditeur détaillé — questions, correction automatique — arrive à l'étape dédiée du projet)">${echapper(c.consigne)}</textarea>
        <p class="note-future">Éditeur complet (questions, correction automatique, barème) prévu à l'étape "Exercices &amp; épreuves" du projet.</p>`;

    default:
      return `<p class="note-future">Type de bloc non reconnu.</p>`;
  }
}

function html_editeurTableau(bloc, c) {
  const lignes = c.lignes && c.lignes.length ? c.lignes : [['', ''], ['', '']];
  const html = lignes.map((ligne, i) => `<tr>${ligne.map((cellule, j) => `
    <td><input type="text" data-tableau-ligne="${i}" data-tableau-colonne="${j}" value="${echapper(cellule)}"></td>
  `).join('')}</tr>`).join('');
  return `
    <table class="tableau-bloc" data-tableau="1"><tbody>${html}</tbody></table>
    <div class="champ-ligne">
      <button class="btn btn-discret" data-action="ajouter-ligne" type="button">+ Ligne</button>
      <button class="btn btn-discret" data-action="ajouter-colonne" type="button">+ Colonne</button>
    </div>`;
}

function html_selectPalier(bloc) {
  const paliers = [
    { v: '', l: '— aucun —' },
    { v: 'azovi', l: '🌱 Azɔ̀ví (très facile)' },
    { v: 'devi', l: '🪘 Dèví (moyen)' },
    { v: 'ogan', l: '🦁 Ògán (difficile)' },
    { v: 'axosu', l: '👑 Axɔ́sú (très difficile)' }
  ];
  return `<select class="palier-select" data-champ-palier="1">
    ${paliers.map(p => `<option value="${p.v}" ${(bloc.palier || '') === p.v ? 'selected' : ''}>${p.l}</option>`).join('')}
  </select>`;
}

function echapper(v) {
  return (v || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
