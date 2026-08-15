// Page publique : affichage du contenu complet d'une séance

const paramsSeance = new URLSearchParams(window.location.search);
const seanceId = paramsSeance.get('id');

function bloc(titre, contenu) {
  if (!contenu) return '';
  return `<section style="margin-bottom:20px;">
    <h3 style="font-size:15px;color:var(--bleu-fonce);margin-bottom:6px;">${titre}</h3>
    <p style="white-space:pre-wrap;line-height:1.6;">${contenu}</p>
  </section>`;
}

async function chargerSeance() {
  const container = document.getElementById('contenuSeance');

  if (!seanceId) {
    container.innerHTML = "Séance introuvable.";
    return;
  }

  const { data: seance, error } = await supabaseClient
    .from('seances')
    .select('*')
    .eq('id', seanceId)
    .eq('statut', 'publie')
    .single();

  if (error || !seance) {
    container.innerHTML = "Cette séance n'est pas disponible.";
    return;
  }

  const libelleAffiche = `${seance.libelle === 'seance' ? 'Séance' : 'Séquence'} ${seance.numero || ''}`.trim();

  // Récupère les exercices publiés liés à cette séance
  const { data: exercices } = await supabaseClient
    .from('exercices')
    .select('id, titre')
    .eq('seance_id', seanceId)
    .eq('statut', 'publie')
    .order('ordre', { ascending: true });

  let sectionExercices = '';
  if (exercices && exercices.length > 0) {
    sectionExercices = `
      <section style="margin-top:24px;padding-top:20px;border-top:1px solid var(--bordure);">
        <h3 style="font-size:15px;color:var(--bleu-fonce);margin-bottom:10px;">Exercices associés</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${exercices.map(ex => `<a href="exercice.html?id=${ex.id}" class="admin-ligne" style="text-decoration:none;">${ex.titre || 'Exercice'}</a>`).join('')}
        </div>
      </section>
    `;
  }

  container.innerHTML = `
    <p style="color:var(--texte-gris);font-size:13px;margin-bottom:4px;">${libelleAffiche}</p>
    <h1 style="font-size:22px;color:var(--bleu-fonce);margin-bottom:20px;">${seance.titre}</h1>

    ${bloc('Objectif', seance.objectif)}
    ${bloc('Compétence', seance.competence)}
    ${bloc('Prérequis', seance.prerequis)}
    ${bloc('Introduction', seance.introduction)}
    ${bloc('Contenu', seance.contenu)}
    ${bloc('Exemples', seance.exemples)}
    ${bloc('Résumé', seance.resume)}
    ${bloc('À retenir', seance.a_retenir)}
    ${bloc('⚠️ Attention', seance.attention)}
    ${bloc('🚫 Avertissement', seance.avertissement)}

    ${sectionExercices}
  `;
}

chargerSeance();
