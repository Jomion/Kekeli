// Éditeur de blocs de contenu riche (Phase 1 + Phase 2)

let blocsActuels = [];
let compteurBlocTemp = 0;

const LABELS_BLOCS = {
  texte: '📝 Texte',
  definition: '📘 Définition',
  regle: '📏 Règle',
  exemple: '💡 Exemple',
  a_retenir: '⭐ À retenir',
  astuce: '🔑 Astuce',
  attention_bloc: '⚠️ Attention',
  image: '🖼️ Image',
  video: '🎬 Vidéo',
  audio: '🔊 Audio',
  tableau: '📊 Tableau',
  exercice: '✏️ Exercice associé',
  ressource: '📎 Ressource'
};

const TYPES_RICHTEXT = ['texte', 'definition', 'regle', 'exemple', 'a_retenir', 'astuce', 'attention_bloc'];

function genererIdTemp() {
  compteurBlocTemp++;
  return 'temp-' + compteurBlocTemp;
}

function reindexerOrdre() {
  blocsActuels.forEach((b, i) => { b.ordre = i; });
}

// ===== Extraction d'un ID YouTube depuis un lien =====
function extraireIdYoutube(url) {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// ===== Upload vers Supabase Storage =====
async function uploaderFichier(file, dossier) {
  const extension = file.name.split('.').pop();
  const nomFichier = `${dossier}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;

  const { data, error } = await supabaseClient.storage.from('kekeli-media').upload(nomFichier, file);
  if (error) {
    alert("Erreur d'upload : " + error.message);
    return null;
  }

  const { data: urlData } = supabaseClient.storage.from('kekeli-media').getPublicUrl(nomFichier);
  return urlData.publicUrl;
}

function construireCorpsBloc(bloc) {
  if (TYPES_RICHTEXT.includes(bloc.type)) {
    return `<div class="zone-quill-${bloc.id}"></div>`;
  }

  if (bloc.type === 'image') {
    return `
      <input type="file" accept="image/*" class="champ-upload-image" data-bloc-id="${bloc.id}">
      <p class="bloc-upload-statut">${bloc.contenu.url ? 'Image chargée ✓' : 'Aucune image pour l\'instant'}</p>
      ${bloc.contenu.url ? `<img src="${bloc.contenu.url}" class="bloc-apercu-media">` : ''}
      <input type="text" class="bloc-champ champ-legende" placeholder="Légende (facultatif)" value="${bloc.contenu.legende || ''}" style="margin-top:8px;">
    `;
  }

  if (bloc.type === 'video') {
    const idYt = extraireIdYoutube(bloc.contenu.url);
    return `
      <input type="text" class="bloc-champ champ-url-video" placeholder="Lien YouTube (ex: https://youtube.com/watch?v=...)" value="${bloc.contenu.url || ''}">
      ${idYt ? `<div class="bloc-apercu-media" style="aspect-ratio:16/9;"><iframe src="https://www.youtube.com/embed/${idYt}" style="width:100%;height:100%;border-radius:8px;border:none;"></iframe></div>` : '<p class="bloc-upload-statut">Colle un lien YouTube valide pour voir l\'aperçu.</p>'}
    `;
  }

  if (bloc.type === 'audio') {
    return `
      <input type="file" accept="audio/*" class="champ-upload-audio" data-bloc-id="${bloc.id}">
      <p class="bloc-upload-statut">${bloc.contenu.url ? 'Audio chargé ✓' : 'Aucun audio pour l\'instant'}</p>
      ${bloc.contenu.url ? `<audio controls src="${bloc.contenu.url}" style="width:100%;margin-top:8px;"></audio>` : ''}
    `;
  }

  if (bloc.type === 'tableau') {
    const lignes = bloc.contenu.lignes || [['', ''], ['', '']];
    let html = '<table class="bloc-tableau-editeur"><tbody>';
    lignes.forEach((ligne, li) => {
      html += '<tr>';
      ligne.forEach((cellule, ci) => {
        html += `<td><input type="text" class="champ-cellule-tableau" data-ligne="${li}" data-colonne="${ci}" value="${cellule || ''}"></td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    html += `<div class="bloc-tableau-actions">
      <button type="button" class="btn-secondaire btn-ajouter-ligne">➕ Ligne</button>
      <button type="button" class="btn-secondaire btn-ajouter-colonne">➕ Colonne</button>
    </div>`;
    return html;
  }

  if (bloc.type === 'exercice') {
    return `
      <select class="bloc-champ champ-select-exercice">
        <option value="">-- Choisir un exercice existant --</option>
      </select>
      <p class="bloc-upload-statut">${bloc.contenu.exerciceId ? 'Exercice sélectionné ✓' : 'Aucun exercice sélectionné (liste chargée depuis les exercices déjà créés dans ce projet)'}</p>
    `;
  }

  if (bloc.type === 'ressource') {
    return `
      <input type="text" class="bloc-champ champ-titre-ressource" placeholder="Titre de la ressource" value="${bloc.contenu.titre || ''}">
      <input type="text" class="bloc-champ champ-url-ressource" placeholder="Lien (PDF, document...)" value="${bloc.contenu.url || ''}">
    `;
  }

  return '<p>Type de bloc inconnu.</p>';
}

async function rendreListeBlocs() {
  const container = document.getElementById('listeBlocs');
  container.innerHTML = '';

  for (const bloc of blocsActuels) {
    const div = document.createElement('div');
    div.className = 'bloc-editeur';
    div.dataset.blocId = bloc.id;
    div.innerHTML = `
      <div class="bloc-editeur-header">
        <span class="bloc-editeur-titre">${LABELS_BLOCS[bloc.type] || bloc.type}</span>
        <div class="bloc-editeur-actions">
          <button type="button" data-action="haut">↑</button>
          <button type="button" data-action="bas">↓</button>
          <button type="button" data-action="reduire">▾</button>
          <button type="button" data-action="dupliquer">⧉</button>
          <button type="button" data-action="supprimer">🗑️</button>
        </div>
      </div>
      <div class="bloc-editeur-corps">${construireCorpsBloc(bloc)}</div>
    `;
    container.appendChild(div);

    // Éditeur riche (types texte)
    if (TYPES_RICHTEXT.includes(bloc.type)) {
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
    }

    // Image : upload + légende
    const inputImage = div.querySelector('.champ-upload-image');
    if (inputImage) {
      inputImage.addEventListener('change', async (e) => {
        const fichier = e.target.files[0];
        if (!fichier) return;
        const statutP = div.querySelector('.bloc-upload-statut');
        statutP.textContent = 'Envoi en cours...';
        const url = await uploaderFichier(fichier, 'images');
        if (url) {
          bloc.contenu.url = url;
          rendreListeBlocs();
        }
      });
      const champLegende = div.querySelector('.champ-legende');
      champLegende.addEventListener('input', (e) => { bloc.contenu.legende = e.target.value; });
    }

    // Vidéo : URL YouTube
    const champVideo = div.querySelector('.champ-url-video');
    if (champVideo) {
      champVideo.addEventListener('input', (e) => {
        bloc.contenu.url = e.target.value;
      });
      champVideo.addEventListener('blur', () => rendreListeBlocs());
    }

    // Audio : upload
    const inputAudio = div.querySelector('.champ-upload-audio');
    if (inputAudio) {
      inputAudio.addEventListener('change', async (e) => {
        const fichier = e.target.files[0];
        if (!fichier) return;
        const statutP = div.querySelector('.bloc-upload-statut');
        statutP.textContent = 'Envoi en cours...';
        const url = await uploaderFichier(fichier, 'audio');
        if (url) {
          bloc.contenu.url = url;
          rendreListeBlocs();
        }
      });
    }

    // Tableau : cellules + ajout ligne/colonne
    const tableauEl = div.querySelector('.bloc-tableau-editeur');
    if (tableauEl) {
      if (!bloc.contenu.lignes) bloc.contenu.lignes = [['', ''], ['', '']];

      div.querySelectorAll('.champ-cellule-tableau').forEach(input => {
        input.addEventListener('input', (e) => {
          const li = parseInt(e.target.dataset.ligne);
          const ci = parseInt(e.target.dataset.colonne);
          bloc.contenu.lignes[li][ci] = e.target.value;
        });
      });

      div.querySelector('.btn-ajouter-ligne').addEventListener('click', () => {
        const nbColonnes = bloc.contenu.lignes[0].length;
        bloc.contenu.lignes.push(new Array(nbColonnes).fill(''));
        rendreListeBlocs();
      });
      div.querySelector('.btn-ajouter-colonne').addEventListener('click', () => {
        bloc.contenu.lignes.forEach(ligne => ligne.push(''));
        rendreListeBlocs();
      });
    }

    // Exercice : charge la liste des exercices disponibles
    const selectExercice = div.querySelector('.champ-select-exercice');
    if (selectExercice) {
      const { data: exercicesDispo } = await supabaseClient.from('exercices').select('id, titre, enonce').order('created_at', { ascending: false }).limit(200);
      (exercicesDispo || []).forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex.id;
        opt.textContent = ex.titre || ex.enonce.substring(0, 50) + '...';
        if (bloc.contenu.exerciceId === ex.id) opt.selected = true;
        selectExercice.appendChild(opt);
      });
      selectExercice.addEventListener('change', (e) => {
        bloc.contenu.exerciceId = e.target.value;
      });
    }

    // Ressource : titre + url
    const champTitreRessource = div.querySelector('.champ-titre-ressource');
    const champUrlRessource = div.querySelector('.champ-url-ressource');
    if (champTitreRessource) {
      champTitreRessource.addEventListener('input', (e) => { bloc.contenu.titre = e.target.value; });
      champUrlRessource.addEventListener('input', (e) => { bloc.contenu.url = e.target.value; });
    }

    div.querySelectorAll('.bloc-editeur-actions button').forEach(btn => {
      btn.addEventListener('click', () => gererActionBloc(bloc.id, btn.dataset.action, div));
    });
  }
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
    const copie = { id: genererIdTemp(), type: original.type, ordre: 0, contenu: JSON.parse(JSON.stringify(original.contenu)) };
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
  blocsActuels.push({ id: genererIdTemp(), type, ordre: blocsActuels.length, contenu: {} });
  rendreListeBlocs();
});

function reinitialiserBlocs() {
  blocsActuels = [];
  rendreListeBlocs();
}

function chargerBlocsExistants(liste) {
  blocsActuels = liste.map(b => ({ id: b.id, type: b.type, ordre: b.ordre, contenu: b.contenu || {} }));
  rendreListeBlocs();
}

// ===== Rendu pour la prévisualisation =====

const LABELS_BLOCS_RENDU = {
  definition: '📘 Définition', regle: '📏 Règle', exemple: '💡 Exemple',
  a_retenir: '⭐ À retenir', astuce: '🔑 Astuce', attention_bloc: '⚠️ Attention'
};

function construireHtmlBloc(bloc) {
  const c = bloc.contenu || {};

  if (TYPES_RICHTEXT.includes(bloc.type)) {
    const html = c.html || '';
    if (bloc.type === 'texte') {
      return `<div class="rendu-bloc rendu-bloc-texte"><div class="ql-editor">${html}</div></div>`;
    }
    return `<div class="rendu-bloc rendu-bloc-${bloc.type}"><span class="rendu-bloc-label">${LABELS_BLOCS_RENDU[bloc.type]}</span><div class="ql-editor">${html}</div></div>`;
  }

  if (bloc.type === 'image') {
    if (!c.url) return '';
    return `<figure class="rendu-bloc rendu-bloc-image"><img src="${c.url}">${c.legende ? `<figcaption>${c.legende}</figcaption>` : ''}</figure>`;
  }

  if (bloc.type === 'video') {
    const idYt = extraireIdYoutube(c.url);
    if (!idYt) return '';
    return `<div class="rendu-bloc rendu-bloc-video"><iframe src="https://www.youtube.com/embed/${idYt}"></iframe></div>`;
  }

  if (bloc.type === 'audio') {
    if (!c.url) return '';
    return `<div class="rendu-bloc rendu-bloc-audio"><audio controls src="${c.url}"></audio></div>`;
  }

  if (bloc.type === 'tableau') {
    if (!c.lignes) return '';
    const html = c.lignes.map(ligne => '<tr>' + ligne.map(cell => `<td>${cell || ''}</td>`).join('') + '</tr>').join('');
    return `<div class="rendu-bloc rendu-bloc-tableau"><table>${html}</table></div>`;
  }

  if (bloc.type === 'exercice') {
    if (!c.exerciceId) return '';
    return `<div class="rendu-bloc rendu-bloc-exercice"><a href="#">✏️ Exercice associé (aperçu — lien actif une fois publié)</a></div>`;
  }

  if (bloc.type === 'ressource') {
    if (!c.url) return '';
    return `<div class="rendu-bloc rendu-bloc-ressource"><a href="${c.url}" target="_blank">📎 ${c.titre || 'Ressource'}</a></div>`;
  }

  return '';
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
