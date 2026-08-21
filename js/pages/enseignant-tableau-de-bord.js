// Page pages/enseignant/tableau-de-bord.html

(async function () {
  const profil = await requireRole('enseignant');
  if (!profil) return;

  document.getElementById('badgeUtilisateur').textContent = `🟢 Connecté : ${profil.prenom} ${profil.nom}`;

  document.getElementById('contenu').innerHTML = `
    <div class="welcome-container">
      <div class="welcome-card">
        <h1>Bienvenue, ${profil.prenom} !</h1>
        <p>Votre espace enseignant est prêt. La saisie des notes, l'attribution des devoirs et badges,
        et le lancement des visioconférences arrivent dans la prochaine étape du développement.</p>
      </div>
      <div class="actions-grid">
        <div class="action-card"><div class="action-icon">📝</div><div class="action-title">Saisir des notes</div><div class="action-desc">Bientôt disponible.</div></div>
        <div class="action-card"><div class="action-icon">📚</div><div class="action-title">Attribuer un devoir</div><div class="action-desc">Bientôt disponible.</div></div>
        <div class="action-card"><div class="action-icon">🎥</div><div class="action-title">Lancer une visioconférence</div><div class="action-desc">Bientôt disponible.</div></div>
      </div>
    </div>
  `;
})();
