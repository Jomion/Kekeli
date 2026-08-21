// Page publique : liste des ressources publiées, filtrable

async function chargerClassesRessources() {
  const { data: classes, error } = await supabaseClient
    .from('classes')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) return;

  const select = document.getElementById('selectClasse');
  classes.forEach(classe => {
    const opt = document.createElement('option');
    opt.value = classe.id;
    opt.textContent = classe.nom;
    select.appendChild(opt);
  });

  chargerRessources();
}

document.getElementById('selectClasse').addEventListener('change', chargerRessources);
document.getElementById('selectType').addEventListener('change', chargerRessources);

const icones = { pdf: '📄', image: '🖼️', fiche: '📋', document: '📁', corrige: '✅', autre: '📎' };

async function chargerRessources() {
  const container = document.getElementById('listeRessourcesPublic');
  const classeId = document.getElementById('selectClasse').value;
  const type = document.getElementById('selectType').value;

  let requete = supabaseClient.from('ressources').select('*').eq('statut', 'publie').order('created_at', { ascending: false });
  if (classeId) requete = requete.eq('classe_id', classeId);
  if (type) requete = requete.eq('type', type);

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  if (data.length === 0) {
    container.innerHTML = '<p style="padding:0 20px;">Aucune ressource disponible avec ces filtres.</p>';
    return;
  }

  container.innerHTML = '<div id="grilleRes" style="display:flex;flex-direction:column;gap:10px;padding:24px 20px;"></div>';
  const grille = document.getElementById('grilleRes');

  data.forEach(ressource => {
    const carte = document.createElement('a');
    carte.href = ressource.url;
    carte.target = '_blank';
    carte.className = 'admin-ligne';
    carte.style.textDecoration = 'none';
    carte.innerHTML = `<span>${icones[ressource.type] || '📎'} ${ressource.titre}</span>`;
    grille.appendChild(carte);
  });
}

chargerClassesRessources();
