// Page pages/login.html — connexion élève / enseignant / parent

document.getElementById('formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();

  const roleAttendu = document.getElementById('role').value;
  const identifiant = document.getElementById('identifiant').value.trim();
  const motDePasse = document.getElementById('motDePasse').value;
  const messageErreur = document.getElementById('messageErreur');
  const btn = document.getElementById('btnLogin');

  messageErreur.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Connexion...';

  const { error, profil } = await seConnecter(identifiant, motDePasse);

  if (error) {
    messageErreur.textContent = error.message;
    btn.disabled = false;
    btn.textContent = 'Se connecter 🚀';
    return;
  }

  if (profil.role !== roleAttendu) {
    messageErreur.textContent = `Ce compte est enregistré comme "${profil.role}", pas "${roleAttendu}". Vérifiez votre sélection.`;
    await supabaseClient.auth.signOut();
    btn.disabled = false;
    btn.textContent = 'Se connecter 🚀';
    return;
  }

  window.location.href = urlTableauDeBord(profil.role);
});
