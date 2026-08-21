// Page pages/eleve/tableau-de-bord.html

(async function () {
  const profil = await requireRole('eleve');
  if (!profil) return; // redirection déjà effectuée par requireRole()

  document.getElementById('badgeUtilisateur').textContent = `🟢 Connecté : ${profil.prenom}`;

  const { data: eleve } = await supabaseClient
    .from('eleves')
    .select('mascotte, palier_actuel, serie_jours_courante')
    .eq('id', profil.id)
    .single();

  const mascotte = eleve?.mascotte || '🦁';
  const serie = eleve?.serie_jours_courante || 0;

  document.getElementById('contenu').innerHTML = `
    <div class="welcome-container">
      <div class="welcome-card">
        <div class="mascot-avatar">${mascotte}</div>
        <h1>Akwaba / Bienvenue, ${profil.prenom} !</h1>
        <p>Ravi de te revoir. Es-tu prêt à illuminer tes connaissances aujourd'hui ?</p>
        <div class="streak-info">🔥 Série actuelle : ${serie} jour${serie > 1 ? 's' : ''} consécutif${serie > 1 ? 's' : ''} d'apprentissage !</div>
      </div>

      <div class="section-title">Que souhaites-tu faire aujourd'hui ?</div>
      <div class="actions-grid">
        <a href="../cours.html" class="action-card">
          <div class="action-icon">📖</div>
          <div class="action-title">Continuer ma leçon</div>
          <div class="action-desc">Reprends là où tu t'es arrêté.</div>
          <div class="btn-start" style="background: var(--devi);">Reprendre ⏳</div>
        </a>
        <a href="../quiz.html" class="action-card">
          <div class="action-icon">🎯</div>
          <div class="action-title">Relever un défi</div>
          <div class="action-desc">Gagne de nouveaux badges en progressant par palier.</div>
          <div class="btn-start" style="background: var(--azovi);">Lancer un défi 🚀</div>
        </a>
        <div class="action-card" style="opacity: 0.6;">
          <div class="action-icon">📊</div>
          <div class="action-title">Mon tableau de progression</div>
          <div class="action-desc">Notes, devoirs et badges — bientôt disponible ici.</div>
          <div class="btn-start" style="background: var(--bleu-kekeli);">Bientôt 🔜</div>
        </div>
      </div>
    </div>
  `;
})();
