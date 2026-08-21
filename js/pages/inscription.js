// Page pages/inscription.html — création de compte élève / enseignant / parent

const roleSelect = document.getElementById('role');
const champsEleve = document.querySelectorAll('.champ-eleve');
const selectClasse = document.getElementById('classe');
const labelIdentifiant = document.getElementById('labelIdentifiant');
const identifiantInput = document.getElementById('identifiant');
const mascottes = document.getElementById('mascottes');
let mascotteChoisie = '🦁';

function actualiserChampsSelonRole() {
  const estEleve = roleSelect.value === 'eleve';
  champsEleve.forEach(champ => champ.style.display = estEleve ? 'block' : 'none');
  labelIdentifiant.textContent = estEleve ? "Nom d'utilisateur (identifiant)" : "E-mail";
  identifiantInput.placeholder = estEleve ? 'Ex: biodun.cm2' : 'Ex: nom@exemple.com';
}
roleSelect.addEventListener('change', actualiserChampsSelonRole);
actualiserChampsSelonRole();

mascottes.addEventListener('click', (e) => {
  const option = e.target.closest('.mascot-option');
  if (!option) return;
  mascottes.querySelectorAll('.mascot-option').forEach(o => o.classList.remove('selected'));
  option.classList.add('selected');
  mascotteChoisie = option.dataset.valeur;
});

async function chargerClasses() {
  const { data, error } = await supabaseClient.from('classes').select('id, nom').order('nom');
  if (error || !data || data.length === 0) {
    selectClasse.innerHTML = '<option value="">Classe non trouvée — contactez l\'école</option>';
    return;
  }
  selectClasse.innerHTML = data.map(c => `<option value="${c.id}">${c.nom}</option>`).join('');
}
chargerClasses();

document.getElementById('formInscription').addEventListener('submit', async (e) => {
  e.preventDefault();

  const messageErreur = document.getElementById('messageErreur');
  const btn = document.getElementById('btnInscription');
  messageErreur.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Création en cours...';

  const role = roleSelect.value;
  const { error } = await inscrire({
    role,
    prenom: document.getElementById('prenom').value.trim(),
    nom: document.getElementById('nom').value.trim(),
    identifiantOuEmail: identifiantInput.value.trim(),
    motDePasse: document.getElementById('motDePasse').value,
    classeId: role === 'eleve' ? (selectClasse.value || null) : null,
    mascotte: role === 'eleve' ? mascotteChoisie : null
  });

  if (error) {
    messageErreur.textContent = error.message || "Impossible de créer le compte. Vérifiez vos informations.";
    btn.disabled = false;
    btn.textContent = 'Créer mon compte ☀️';
    return;
  }

  window.location.href = urlTableauDeBord(role);
});
