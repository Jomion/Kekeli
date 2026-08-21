// ============================================================
// Authentification multi-rôles KEKELI : élève, enseignant, parent
// (l'admin garde son propre système dans js/auth.js)
//
// Chaque page qui utilise ce fichier doit d'abord définir :
//   const RACINE_SITE = "..."; // chemin relatif vers la racine du site
// Exemples : "" à la racine, "../" dans /pages/, "../../" dans /pages/eleve/
// ============================================================

const DOMAINE_IDENTIFIANT = 'eleves.kekeli.app'; // email technique pour comptes sans e-mail réel

function _racine() {
  return typeof RACINE_SITE === 'string' ? RACINE_SITE : '';
}

function estUnEmail(valeur) {
  return /\S+@\S+\.\S+/.test(valeur || '');
}

// --- RÉSOLUTION IDENTIFIANT -> EMAIL TECHNIQUE ----------------------

// À l'inscription, on connaît déjà l'email technique choisi.
function construireEmailInscription(identifiantOuEmail) {
  return estUnEmail(identifiantOuEmail)
    ? identifiantOuEmail
    : `${identifiantOuEmail.trim().toLowerCase()}@${DOMAINE_IDENTIFIANT}`;
}

// À la connexion, si ce n'est pas un email, on interroge Supabase
// (fonction SQL email_depuis_identifiant) pour retrouver l'email technique.
async function resoudreEmailConnexion(identifiantOuEmail) {
  if (estUnEmail(identifiantOuEmail)) return identifiantOuEmail;

  const { data, error } = await supabaseClient
    .rpc('email_depuis_identifiant', { p_identifiant: identifiantOuEmail.trim().toLowerCase() });

  if (error || !data) return null;
  return data;
}

// --- INSCRIPTION -----------------------------------------------------

async function inscrire({ role, prenom, nom, identifiantOuEmail, motDePasse, classeId, mascotte }) {
  const email = construireEmailInscription(identifiantOuEmail);

  const { data, error } = await supabaseClient.auth.signUp({ email, password: motDePasse });
  if (error) return { error };

  const userId = data.user?.id;
  if (!userId) return { error: { message: "Le compte n'a pas pu être créé. Réessayez." } };

  const { error: erreurProfil } = await supabaseClient.from('profils').insert({
    id: userId,
    role,
    nom,
    prenom,
    identifiant: estUnEmail(identifiantOuEmail) ? null : identifiantOuEmail.trim().toLowerCase(),
    email
  });
  if (erreurProfil) return { error: erreurProfil };

  let erreurRole = null;
  if (role === 'eleve') {
    ({ error: erreurRole } = await supabaseClient.from('eleves').insert({
      id: userId,
      classe_id: classeId || null,
      mascotte: mascotte || '🦁'
    }));
  } else if (role === 'enseignant') {
    ({ error: erreurRole } = await supabaseClient.from('enseignants').insert({ id: userId }));
  } else if (role === 'parent') {
    ({ error: erreurRole } = await supabaseClient.from('parents').insert({ id: userId }));
  }
  if (erreurRole) return { error: erreurRole };

  return { data };
}

// --- CONNEXION ---------------------------------------------------------

async function seConnecter(identifiantOuEmail, motDePasse) {
  const email = await resoudreEmailConnexion(identifiantOuEmail);
  if (!email) return { error: { message: "Identifiant ou e-mail introuvable." } };

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: motDePasse });
  if (error) return { error: { message: "Identifiant/e-mail ou mot de passe incorrect." } };

  const profil = await chargerProfil(data.user.id);
  if (!profil) return { error: { message: "Profil introuvable pour ce compte." } };
  if (!profil.actif) {
    await supabaseClient.auth.signOut();
    return { error: { message: "Ce compte a été désactivé." } };
  }

  return { data, profil };
}

async function chargerProfil(userId) {
  const { data, error } = await supabaseClient.from('profils').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
}

// --- NAVIGATION SELON LE RÔLE -------------------------------------------

function urlTableauDeBord(role) {
  const racine = _racine();
  switch (role) {
    case 'eleve': return `${racine}pages/eleve/tableau-de-bord.html`;
    case 'enseignant': return `${racine}pages/enseignant/tableau-de-bord.html`;
    case 'parent': return `${racine}pages/parent/tableau-de-bord.html`;
    case 'admin': return `${racine}pages/admin/dashboard.html`;
    default: return `${racine}index.html`;
  }
}

function urlLogin() {
  return `${_racine()}pages/login.html`;
}

// --- PROTECTION DES PAGES -----------------------------------------------

// À appeler en haut de chaque page réservée à un rôle :
//   const profil = await requireRole('eleve');
//   if (!profil) return; // la redirection a déjà eu lieu
async function requireRole(roleAttendu) {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = urlLogin();
    return null;
  }

  const profil = await chargerProfil(session.user.id);

  if (!profil || !profil.actif) {
    await supabaseClient.auth.signOut();
    window.location.href = urlLogin();
    return null;
  }

  if (profil.role !== roleAttendu) {
    // connecté, mais pas le bon rôle pour cette page -> renvoi vers son propre espace
    window.location.href = urlTableauDeBord(profil.role);
    return null;
  }

  return profil;
}

async function deconnecterUtilisateur() {
  await supabaseClient.auth.signOut();
  window.location.href = urlLogin();
}
