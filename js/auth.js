// Gère la connexion et la protection des pages admin

// Connexion (utilisée sur login.html)
async function initFormulaireLogin() {
  const form = document.getElementById('formLogin');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const messageErreur = document.getElementById('messageErreur');

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      messageErreur.textContent = "Email ou mot de passe incorrect.";
      return;
    }

    window.location.href = 'dashboard.html';
  });
}

// Protection des pages admin (utilisée sur toutes les pages sauf login.html)
async function verifierConnexion() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = 'login.html';
  }
}

// Déconnexion
async function deconnecter() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

initFormulaireLogin();
