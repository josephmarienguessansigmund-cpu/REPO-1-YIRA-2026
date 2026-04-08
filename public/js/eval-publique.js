/**
 * YIRA Digital — Module Évaluation Publique
 * Connexion : bouton "Démarrer le test" → _goPage → initEvalPublique → API
 *
 * Résout l'erreur : initEvalPublique is not defined
 *
 * À inclure AVANT le script principal dans le HTML :
 * <script src="/js/eval-publique.js"></script>
 */

// ─── Configuration ────────────────────────────────────────────────────────────

const YIRA_API_URL = window.YIRA_CONFIG?.api_url ?? 'https://api.yira.ci';
const YIRA_TENANT  = window.YIRA_CONFIG?.tenant_id ?? 'ci';

// ─── Registre des pages (utilisé par _goPage) ────────────────────────────────

const YIRA_PAGES = {
  accueil:    () => afficherSection('section-accueil'),
  evaluation: () => initEvalPublique(),
  profil:     () => afficherSection('section-profil'),
  quiz:       () => afficherSection('section-quiz'),
  resultats:  () => afficherSection('section-resultats'),
};

// ─── Routeur de pages ─────────────────────────────────────────────────────────

function _goPage(page) {
  if (!YIRA_PAGES[page]) {
    console.error(`[YIRA] Page inconnue : "${page}". Pages disponibles : ${Object.keys(YIRA_PAGES).join(', ')}`);
    return;
  }
  // Masquer toutes les sections
  document.querySelectorAll('[data-yira-section]').forEach(el => {
    el.style.display = 'none';
  });
  // Exécuter la page cible
  YIRA_PAGES[page]();
}

// ─── initEvalPublique — point d'entrée du bouton "Démarrer le test" ──────────
//
// Chaîne complète :
// bouton onclick="_goPage('evaluation')"
//   → _goPage('evaluation')
//   → initEvalPublique()
//   → collecterProfilCandidat()
//   → POST /api/evaluation/init
//   → afficherQuestionnaire(questions)

async function initEvalPublique() {
  console.log('[YIRA] initEvalPublique() → démarrage');

  // 1. Afficher la section évaluation
  afficherSection('section-evaluation');

  // 2. Afficher l'état de chargement
  setEvalStatus('chargement', 'Préparation de votre évaluation...');

  try {
    // 3. Collecter le profil depuis le formulaire d'inscription
    const profil = collecterProfilCandidat();
    if (!profil.valide) {
      setEvalStatus('erreur', profil.message);
      return;
    }

    // 4. Appel API → EvaluationController.init()
    const response = await fetch(`${YIRA_API_URL}/api/evaluation/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': YIRA_TENANT,
      },
      body: JSON.stringify({
        beneficiaire_id: profil.beneficiaire_id,
        prenom: profil.prenom,
        nom: profil.nom,
        niveau: profil.niveau,
        signaletique: profil.signaletique,
      }),
    });

    if (!response.ok) {
      const erreur = await response.json().catch(() => ({ message: 'Erreur serveur' }));
      throw new Error(erreur.message ?? `HTTP ${response.status}`);
    }

    const data = await response.json();
    // data = { assessment_id, provider, nb_questions, questions[] }

    // 5. Sauvegarder assessment_id pour la soumission finale
    sessionStorage.setItem('yira_assessment_id', String(data.assessment_id));
    sessionStorage.setItem('yira_provider', data.provider);
    sessionStorage.setItem('yira_nb_questions', String(data.nb_questions));

    console.log(`[YIRA] Session ouverte → assessment_id=${data.assessment_id} · provider=${data.provider} · ${data.nb_questions} questions`);

    // 6. Afficher le questionnaire
    setEvalStatus('actif', '');
    afficherQuestionnaire(data.questions, data.assessment_id);

  } catch (err) {
    console.error('[YIRA] initEvalPublique erreur:', err);
    setEvalStatus('erreur', `Impossible de démarrer l'évaluation : ${err.message}. Veuillez réessayer.`);
  }
}

// ─── Collecte du profil candidat depuis le DOM ────────────────────────────────

function collecterProfilCandidat() {
  const prenom   = document.querySelector('[data-yira="prenom"]')?.value?.trim();
  const nom      = document.querySelector('[data-yira="nom"]')?.value?.trim();
  const niveau   = document.querySelector('[data-yira="niveau"]')?.value ?? 'N2';
  const genre    = document.querySelector('[data-yira="genre"]')?.value ?? 'nsp';
  const dob      = document.querySelector('[data-yira="date_naissance"]')?.value;
  const diplome  = document.querySelector('[data-yira="niveau_etude"]')?.value ?? 'bac';
  const statut   = document.querySelector('[data-yira="statut"]')?.value ?? 'etudiant';

  // Validation minimale
  if (!prenom) return { valide: false, message: 'Veuillez saisir votre prénom.' };
  if (!nom)    return { valide: false, message: 'Veuillez saisir votre nom.' };
  if (!dob)    return { valide: false, message: 'Veuillez saisir votre date de naissance.' };

  return {
    valide: true,
    beneficiaire_id: sessionStorage.getItem('yira_beneficiaire_id') ?? '',
    prenom,
    nom,
    niveau: ['N1','N2','N3'].includes(niveau) ? niveau : 'N2',
    signaletique: {
      genre,
      date_naissance: new Date(dob).toISOString(),
      annees_experience: parseInt(document.querySelector('[data-yira="experience"]')?.value ?? '0', 10),
      niveau_etude: diplome,
      type_formation: document.querySelector('[data-yira="formation"]')?.value ?? 'autre',
      statut,
    },
  };
}

// ─── Affichage du questionnaire ───────────────────────────────────────────────

function afficherQuestionnaire(questions, assessment_id) {
  const container = document.getElementById('yira-questionnaire');
  if (!container) {
    console.error('[YIRA] Élément #yira-questionnaire introuvable dans le DOM');
    return;
  }

  // État local du questionnaire
  let questionActuelle = 0;
  const reponses = new Array(questions.length).fill(null);

  function afficherQuestion(index) {
    const q = questions[index];
    if (!q) return;

    const choix = [q.r1, q.r2, q.r3, q.r4, q.r5, q.r6]
      .filter(Boolean)
      .slice(0, q.nb_reponses);

    container.innerHTML = `
      <div class="yira-question-wrapper">
        <div class="yira-progress">
          <div class="yira-progress-bar" style="width:${Math.round(((index) / questions.length) * 100)}%"></div>
        </div>
        <p class="yira-progress-label">${index + 1} / ${questions.length}</p>
        <h3 class="yira-question-label">${q.label_question}</h3>
        <div class="yira-choix-grid">
          ${choix.map((choix, i) => `
            <button
              class="yira-choix-btn ${reponses[index] === i + 1 ? 'selected' : ''}"
              onclick="yiraSelectionnerReponse(${index}, ${i + 1})"
              data-choix="${i + 1}">
              ${choix}
            </button>
          `).join('')}
        </div>
        <div class="yira-nav">
          ${index > 0 ? `<button class="yira-btn-secondary" onclick="yiraPrecedent()">Précédent</button>` : '<span></span>'}
          ${index < questions.length - 1
            ? `<button class="yira-btn-primary" onclick="yiraSuivant()" ${reponses[index] === null ? 'disabled' : ''}>Suivant</button>`
            : `<button class="yira-btn-success" onclick="yiraSoumettre()" ${reponses[index] === null ? 'disabled' : ''}>Terminer et voir mes résultats</button>`
          }
        </div>
      </div>
    `;
  }

  // Exposer les fonctions de navigation dans le scope global
  window.yiraSelectionnerReponse = function(qIndex, valeur) {
    reponses[qIndex] = valeur;
    afficherQuestion(qIndex); // re-render avec sélection visible
    // Auto-avancer après 400ms si pas dernière question
    if (qIndex < questions.length - 1) {
      setTimeout(() => yiraSuivant(), 400);
    }
  };

  window.yiraSuivant = function() {
    if (reponses[questionActuelle] === null) return; // pas de réponse sélectionnée
    questionActuelle++;
    afficherQuestion(questionActuelle);
  };

  window.yiraPrecedent = function() {
    if (questionActuelle > 0) {
      questionActuelle--;
      afficherQuestion(questionActuelle);
    }
  };

  window.yiraSoumettre = async function() {
    if (reponses.includes(null)) {
      alert('Veuillez répondre à toutes les questions.');
      return;
    }
    setEvalStatus('chargement', 'Analyse de vos réponses en cours...');
    try {
      const response = await fetch(`${YIRA_API_URL}/api/evaluation/soumettre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': YIRA_TENANT },
        body: JSON.stringify({ assessment_id, reponses }),
      });
      const data = await response.json();
      if (data.termine) {
        sessionStorage.setItem('yira_eval_terminee', 'true');
        _goPage('resultats');
      }
    } catch (err) {
      setEvalStatus('erreur', `Erreur lors de la soumission : ${err.message}`);
    }
  };

  // Afficher la première question
  afficherQuestion(0);
}

// ─── Utilitaires DOM ──────────────────────────────────────────────────────────

function afficherSection(id) {
  // Masquer tout
  document.querySelectorAll('[data-yira-section]').forEach(el => {
    el.style.display = 'none';
  });
  // Afficher la cible
  const el = document.getElementById(id) ?? document.querySelector(`[data-yira-section="${id}"]`);
  if (el) {
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    console.warn(`[YIRA] Section "${id}" introuvable dans le DOM`);
  }
}

function setEvalStatus(etat, message) {
  const statusEl = document.getElementById('yira-eval-status');
  if (!statusEl) return;
  statusEl.className = `yira-status yira-status-${etat}`;
  statusEl.textContent = message;
  statusEl.style.display = message ? 'block' : 'none';
}

// ─── Export global (accessible depuis onclick="...") ─────────────────────────

window._goPage         = _goPage;
window.initEvalPublique = initEvalPublique;

console.log('[YIRA] eval-publique.js chargé → initEvalPublique disponible');