// Détecte une icône pertinente à partir du nom d'une matière

function iconeMatiere(nom) {
  const n = (nom || '').toLowerCase();

  if (n.includes('francais') || n.includes('français')) return '📖';
  if (n.includes('math')) return '🔢';
  if (n.includes('es') && n.length <= 3) return '🌍';
  if (n.includes('social') || n.includes('histoire') || n.includes('geographie') || n.includes('géographie')) return '🌍';
  if (n.includes('science') || n.includes('est') || n.includes('éveil') || n.includes('eveil')) return '🔬';
  if (n.includes('anglais') || n.includes('english')) return '🇬🇧';
  if (n.includes('art') || n.includes('dessin')) return '🎨';
  if (n.includes('sport') || n.includes('eps') || n.includes('physique')) return '⚽';
  if (n.includes('musique') || n.includes('chant')) return '🎵';
  if (n.includes('moral') || n.includes('civisme') || n.includes('education civique') || n.includes('éducation civique')) return '🤝';

  return '📘';
}
