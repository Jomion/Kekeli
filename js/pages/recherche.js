// Page publique : recherche globale sur le contenu publié

let toutesLesMatieresRech = [];
let delaiRecherche = null;

async function chargerClassesRecherche() {
  const { data: classes, error } = await supabaseClient
    .from('classes')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) return;

  const select = document.getElementById('filtreClasseRecherche');
  classes.forEach(classe => {
    const opt = document.createElement('option');
    opt.value = classe.id;
    opt.textContent = classe.nom;
    select.appendChild(opt);
  });

  const { data: matieres } = await supabaseClient.from('matieres').select('*');
  toutesLesMatieresRech = matieres || [];
}

document.getElementById('champRecherche').addEventListener('input', () => {
  clearTimeout(delaiRecherche);
  delaiRecherche = setTimeout(lancerRecherche, 400);
});
document.getElementById('filtreClasseRecherche').addEventListener('change', lancerRecherche);
document.getElementById('filtreTypeRecherche').addEventListener('change', lancerRecherche);

function classeIdDepuisMatiereId(matiereId) {
  const m = toutesLesMatieresRech.find(mm => mm.id === matiereId);
  return m ? m.classe_id : null;
}

async function lancerRecherche() {
  const terme = document.getElementById('champRecherche').value.trim();
  const filtreClasse = document.getElementById('filtreClasseRecherche').value;
  const filtreType = document.getElementById('filtreTypeRecherche').value;
  const container = document.getElementById('resultatsRecherche');

  if (terme.length < 2) {
    container.innerHTML = "Tape au moins 2 caractères pour lancer la recherche.";
    return;
  }

  container.innerHTML = "Recherche en cours...";

  const resultats = [];

  if (!filtreType || filtreType === 'seances') {
    const { data } = await supabaseClient.from('seances').select('*').eq('statut', 'publie').ilike('titre', `%${terme}%`).limit(20);
    (data || []).forEach(item => {
      const classeId = classeIdDepuisMatiereId(item.matiere_id) || null;
      if (!filtreClasse || classeId === filtreClasse) {
        resultats.push({ type: 'Séance', titre: item.titre, lien: `seance.html?id=${item.id}` });
      }
    });
  }

  if (!filtreType || filtreType === 'exercices') {
    const { data } = await supabaseClient.from('exercices').select('*').eq('statut', 'publie').or(`titre.ilike.%${terme}%,enonce.ilike.%${terme}%`).limit(20);
    (data || []).forEach(item => {
      resultats.push({ type: 'Exercice', titre: item.titre || item.enonce.substring(0, 50) + '...', lien: `exercice.html?id=${item.id}` });
    });
  }

  if (!filtreType || filtreType === 'quiz') {
    let req = supabaseClient.from('quiz').select('*').eq('statut', 'publie').ilike('titre', `%${terme}%`).limit(20);
    if (filtreClasse) req = req.eq('classe_id', filtreClasse);
    const { data } = await req;
    (data || []).forEach(item => {
      resultats.push({ type: 'Quiz', titre: item.titre, lien: `quiz-jouer.html?id=${item.id}` });
    });
  }

  if (!filtreType || filtreType === 'epreuves') {
    let req = supabaseClient.from('epreuves').select('*').eq('statut', 'publie').ilike('titre', `%${terme}%`).limit(20);
    if (filtreClasse) req = req.eq('classe_id', filtreClasse);
    const { data } = await req;
    (data || []).forEach(item => {
      resultats.push({ type: 'Épreuve', titre: item.titre, lien: `epreuves.html?classe=${item.classe_id}` });
    });
  }

  if (!filtreType || filtreType === 'ressources') {
    let req = supabaseClient.from('ressources').select('*').eq('statut', 'publie').ilike('titre', `%${terme}%`).limit(20);
    if (filtreClasse) req = req.eq('classe_id', filtreClasse);
    const { data } = await req;
    (data || []).forEach(item => {
      resultats.push({ type: 'Ressource', titre: item.titre, lien: item.url });
    });
  }

  afficherResultats(resultats);
}

function afficherResultats(resultats) {
  const container = document.getElementById('resultatsRecherche');

  if (resultats.length === 0) {
    container.innerHTML = "Aucun résultat trouvé.";
    return;
  }

  container.innerHTML = '<div id="grilleRech" style="display:flex;flex-direction:column;gap:10px;padding-top:20px;"></div>';
  const grille = document.getElementById('grilleRech');

  resultats.forEach(r => {
    const carte = document.createElement('a');
    carte.href = r.lien;
    if (r.type === 'Ressource') carte.target = '_blank';
    carte.className = 'admin-ligne';
    carte.style.textDecoration = 'none';
    carte.innerHTML = `<span>${r.titre} <small>(${r.type})</small></span>`;
    grille.appendChild(carte);
  });
}

chargerClassesRecherche();
