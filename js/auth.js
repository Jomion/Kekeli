// Gère la connexion, la protection des pages admin, et les permissions

let profilAdmin = null; // rempli après vérification de connexion

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

// Protection des pages admin + chargement du profil de permissions
async function verifierConnexion() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const { data: admin, error } = await supabaseClient
    .from('administrateurs')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !admin || !admin.actif) {
    alert("Compte administrateur introuvable ou désactivé.");
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
    return;
  }

  profilAdmin = admin;

  // Charge les restrictions (classes, matières, types de contenu autorisés)
  const [resClasses, resMatieres, resTypes] = await Promise.all([
    supabaseClient.from('administrateur_classes').select('classe_id').eq('administrateur_id', admin.id),
    supabaseClient.from('administrateur_matieres').select('matiere_id').eq('administrateur_id', admin.id),
    supabaseClient.from('administrateur_types_contenu').select('type_contenu').eq('administrateur_id', admin.id)
  ]);

  profilAdmin.classesAutorisees = (resClasses.data || []).map(c => c.classe_id);
  profilAdmin.matieresAutorisees = (resMatieres.data || []).map(m => m.matiere_id);
  profilAdmin.typesAutorises = (resTypes.data || []).map(t => t.type_contenu);
}

// Vérifie si l'admin actuel a le droit d'accéder à un type de contenu donné
// (ex: 'seances', 'exercices', 'quiz', 'epreuves', 'ressources')
function peutAccederType(typeContenu) {
  if (!profilAdmin) return false;
  if (profilAdmin.role === 'super_admin') return true;
  if (profilAdmin.typesAutorises.length === 0) return true; // aucune restriction = accès à tout
  return profilAdmin.typesAutorises.includes(typeContenu);
}

// Vérifie si l'admin actuel a le droit de voir une classe donnée
function peutAccederClasse(classeId) {
  if (!profilAdmin) return false;
  if (profilAdmin.role === 'super_admin') return true;
  if (profilAdmin.classesAutorisees.length === 0) return true;
  return profilAdmin.classesAutorisees.includes(classeId);
}

// Vérifie si l'admin actuel a le droit de voir une matière donnée
function peutAccederMatiere(matiereId) {
  if (!profilAdmin) return false;
  if (profilAdmin.role === 'super_admin') return true;
  if (profilAdmin.matieresAutorisees.length === 0) return true;
  return profilAdmin.matieresAutorisees.includes(matiereId);
}

// Vérifie si l'admin peut modifier (pas juste lire)
function peutModifier() {
  if (!profilAdmin) return false;
  return !profilAdmin.lecture_seule;
}

// Déconnexion
async function deconnecter() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

initFormulaireLogin();
