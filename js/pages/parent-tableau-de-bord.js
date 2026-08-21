// Page pages/parent/tableau-de-bord.html

(async function () {
  const profil = await requireRole('parent');
  if (!profil) return;

  document.getElementById('badgeUtilisateur').textContent = `🟢 Connecté : ${profil.prenom} ${profil.nom}`;

  // Enfants déjà liés à ce parent (table parent_eleve)
  const { data: liens } = await supabaseClient
    .from('parent_eleve')
    .select('eleve_id, profils:eleve_id(prenom, nom)')
    .eq('parent_id', profil.id);

  const listeEnfants = (liens && liens.length > 0)
    ? liens.map(l => `<li>${l.profils?.prenom || ''} ${l.profils?.nom || ''}</li>`).join('')
    : `<li>Aucun enfant lié pour le moment.</li>`;

  document.getElementById('contenu').innerHTML = `
    <div class="welcome-container">
      <div class="welcome-card">
        <h1>Bienvenue, ${profil.prenom} !</h1>
        <p>Vos enfants :</p>
        <ul>${listeEnfants}</ul>
        <p>Le suivi des devoirs et notes, la messagerie avec les enseignants et le paiement des frais
        arrivent dans la prochaine étape du développement.</p>
      </div>
      <div class="actions-grid">
        <div class="action-card"><div class="action-icon">📊</div><div class="action-title">Suivi des devoirs et notes</div><div class="action-desc">Bientôt disponible.</div></div>
        <div class="action-card"><div class="action-icon">💬</div><div class="action-title">Messagerie enseignant</div><div class="action-desc">Bientôt disponible.</div></div>
        <div class="action-card"><div class="action-icon">💳</div><div class="action-title">Paiement des frais</div><div class="action-desc">Bientôt disponible.</div></div>
      </div>
    </div>
  `;
})();
