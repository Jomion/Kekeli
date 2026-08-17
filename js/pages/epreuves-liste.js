// Page publique : liste des épreuves, filtrable

let toutesLesMatieresEpr = [];

async function chargerClassesEpreuves() {
  const { data: classes, error } = await supabaseClient
    .from('classes')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) return;

  const select = document.getElementById('selectClasse');
  classes.forEach(classe => {
    const opt = document.createElement('option');
    opt.value = classe.id;
    opt.textContent = classe.nom;
    select.appendChild(opt);
  });

  const { data: matieres } = await supabaseClient.from('matieres').select('*');
  toutesLesMatieresEpr = matieres || [];
}

function remplirMatieresEpreuves() {
  const classeId = document.getElementById('selectClasse').value;
  const select = document.getElementById('selectMatiere');
  select.innerHTML = '<option value="">-- Tous les champs de formation --</option>';

  const source = classeId ? toutesLesMatieresEpr.filter(m => m.classe_id === classeId) : toutesLesMatieresEpr;
  source.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nom_complet || m.nom;
    select.appendChild(opt);
  });
}

document.getElementById('selectClasse').addEventListener('change', () => { remplirMatieresEpreuves(); chargerEpreuves(); });
document.getElementById('selectMatiere').addEventListener('change', chargerEpreuves);
document.getElementById('selectTrimestre').addEventListener('change', chargerEpreuves);

async function chargerEpreuves() {
  const container = document.getElementById('listeEpreuvesPublic');
  const classeId = document.getElementById('selectClasse').value;
  const matiereId = document.getElementById('selectMatiere').value;
  const trimestre = document.getElementById('selectTrimestre').value;

  if (!classeId) {
    container.innerHTML = "Choisis une classe pour voir ses épreuves.";
    return;
  }

  let requete = supabaseClient.from('epreuves').select('*, matieres(nom, nom_complet)').eq('classe_id', classeId).eq('statut', 'publie').order('created_at', { ascending: false });
  if (matiereId) requete = requete.eq('matiere_id', matiereId);
  if (trimestre) requete = requete.eq('trimestre', trimestre);

  const { data, error } = await requete;

  if (error) {
    container.innerHTML = "Erreur : " + error.message;
    return;
  }

  if (data.length === 0) {
    container.innerHTML = '<p style="padding:0 20px;">Aucune épreuve disponible avec ces filtres.</p>';
    return;
  }

  container.innerHTML = '<div id="grilleEpr" style="display:flex;flex-direction:column;gap:10px;padding:24px 20px;"></div>';
  const grille = document.getElementById('grilleEpr');

  data.forEach(epreuve => {
    const nomMatiere = epreuve.matieres ? (epreuve.matieres.nom_complet || epreuve.matieres.nom) : '?';

    let liens = '';
    if (epreuve.type_realisation === 'pdf' || epreuve.type_realisation === 'les_deux') {
      if (epreuve.fichier_pdf_url) {
        liens += `<a href="${epreuve.fichier_pdf_url}" target="_blank" class="btn-secondaire" style="margin-right:8px;text-decoration:none;">📄 PDF</a>`;
      }
      if (epreuve.correction_pdf_url) {
        liens += `<a href="${epreuve.correction_pdf_url}" target="_blank" class="btn-secondaire" style="text-decoration:none;">✅ Corrigé</a>`;
      }
    }
    if (epreuve.type_realisation === 'en_ligne' || epreuve.type_realisation === 'les_deux') {
      liens += `<span style="font-size:12px;color:var(--texte-gris);"> (réalisation en ligne bientôt disponible)</span>`;
    }

    const bloc = document.createElement('div');
    bloc.className = 'admin-ligne';
    bloc.style.flexDirection = 'column';
    bloc.style.alignItems = 'stretch';
    bloc.innerHTML = `
      <span><strong>${epreuve.titre}</strong> <small>(${nomMatiere} - ${epreuve.trimestre}${epreuve.type_epreuve ? ' - ' + epreuve.type_epreuve : ''})</small></span>
      <div style="margin-top:8px;">${liens || '<span style="font-size:12px;color:var(--texte-gris);">Pas encore de fichier disponible.</span>'}</div>
    `;
    grille.appendChild(bloc);
  });
}

chargerClassesEpreuves();
