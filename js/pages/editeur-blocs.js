// Éditeur de blocs de contenu riche (Phase 1 : texte enrichi)

let blocsActuels = []; // { id (temp ou réel), type, ordre, contenu: {texte}, instanceQuill }
let compteurBlocTemp = 0;

const LABELS_BLOCS = {
  texte: '📝 Texte',
  definition: '📘 Définition',
  regle: '📏 Règle',
  exemple: '💡 Exemple',
  a_retenir: '⭐ À retenir',
  astuce: '🔑 Astuce',
  attention_bloc: '⚠️ Attention'
};

function genererIdTemp() {
  compteurBlocTemp++;
  return 'temp-' + compteurBlocTemp;
}

function reindexerOrdre() {
  blocsActuels.forEach((b, i) => { b.ordre = i; });
}

function rendreListeBlocs() {
  const container = document.getElementById('listeBlocs');
  container.innerHTML = '';

  blocsActuels.forEach((bloc, index) => {
    const div = document.createElement('div');
    div.className = 'bloc-editeur';
    div.dataset.blocId = bloc.id;
    div.innerHTML = `
      <div class="bloc-editeur-header">
        <span class="bloc-editeur-titre">${LABELS_BLOCS[bloc.type] || bloc.type}</span>
        <div class="bloc-editeur-actions">
          <button type="button" data-action="haut" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" data-action="bas" ${index === blocsActuels.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" data-action="reduire">▾</button>
          <button type="button" data-action="dupliquer">⧉</button>
          <button type="button" data-action="supprimer">🗑️</button>
        </div>
      </div>
      <div class="bloc-editeur-corps">
        <div class="zone-quill-${bloc.id}"></div>
      </div>
    `;
    container.appendChild(div);

    const zone = div.querySelector(`.zone-quill-${bloc.id}`);
    const quill = new Quill(zone, {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ header: [2, 3, false] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link'],
          [{ color: [] }, { background: [] }],
          ['clean']
        ]
      }
    });
    if (bloc.contenu && bloc.contenu.html) {
      quill.clipboard.dangerouslyPasteHTML(bloc.contenu.html);
    }
    bloc.instanceQuill = quill;

    div.querySelectorAll('.bloc-editeur-actions button').forEach(btn => {
      btn.addEventListener('click', () => gererActionBloc(bloc.id, btn.dataset.action, div));
    });
  });
}

function synchroniserContenuBlocs() {
  blocsActuels.forEach(bloc => {
    if (bloc.instanceQuill) {
      bloc.contenu = { html: bloc.instanceQuill.root.innerHTML };
    }
  });
}

function gererActionBloc(id, action, divElement) {
  synchroniserContenuBlocs();
  const index = blocsActuels.findIndex(b => b.id === id);
  if (index === -1) return;

  if (action === 'haut' && index > 0) {
    [blocsActuels[index - 1], blocsActuels[index]] = [blocsActuels[index], blocsActuels[index - 1]];
    reindexerOrdre();
    rendreListeBlocs();
  } else if (action === 'bas' && index < blocsActuels.length - 1) {
    [blocsActuels[index + 1], blocsActuels[index]] = [blocsActuels[index], blocsActuels[index + 1]];
    reindexerOrdre();
    rendreListeBlocs();
  } else if (action === 'reduire') {
    divElement.classList.toggle('replie');
  } else if (action === 'dupliquer') {
    const original = blocsActuels[index];
    const copie = { id: genererIdTemp(), type: original.type, ordre: 0, contenu: { ...original.contenu } };
    blocsActuels.splice(index + 1, 0, copie);
    reindexerOrdre();
    rendreListeBlocs();
  } else if (action === 'supprimer') {
    const confirmation = window.confirm("Supprimer ce bloc ?");
    if (!confirmation) return;
    blocsActuels.splice(index, 1);
    reindexerOrdre();
    rendreListeBlocs();
  }
}

document.getElementById('btnAjouterBloc').addEventListener('click', () => {
  synchroniserContenuBlocs();
  const type = document.getElementById('typeNouveauBloc').value;
  blocsActuels.push({ id: genererIdTemp(), type, ordre: blocsActuels.length, contenu: { html: '' } });
  rendreListeBlocs();
});

function reinitialiserBlocs() {
  blocsActuels = [];
  rendreListeBlocs();
}

function chargerBlocsExistants(liste) {
  blocsActuels = liste.map(b => ({ id: b.id, type: b.type, ordre: b.ordre, contenu: b.contenu }));
  rendreListeBlocs();
}

function construireHtmlBloc(bloc) {
  const html = bloc.contenu && bloc.contenu.html ? bloc.contenu.html : '';
  if (bloc.type === 'texte') {
    return `<div class="rendu-bloc rendu-bloc-texte"><div class="ql-editor">${html}</div></div>`;
  }
  return `<div class="rendu-bloc rendu-bloc-${bloc.type}">
    <span class="rendu-bloc-label">${LABELS_BLOCS[bloc.type] || bloc.type}</span>
    <div class="ql-editor">${html}</div>
  </div>`;
}

document.getElementById('btnPrevisualiser').addEventListener('click', () => {
  synchroniserContenuBlocs();
  const modal = document.getElementById('modalPrevisualisation');
  const contenu = document.getElementById('contenuPreview');

  const titre = document.getElementById('titre').value || '(sans titre)';
  const htmlBlocs = blocsActuels.map(construireHtmlBloc).join('');

  contenu.innerHTML = `<h2 style="margin-bottom:16px;">${titre}</h2>${htmlBlocs || '<p style="color:var(--texte-gris);">Aucun bloc ajouté.</p>'}`;
  modal.style.display = 'block';
});

document.getElementById('btnFermerPreview').addEventListener('click', () => {
  document.getElementById('modalPrevisualisation').style.display = 'none';
});
