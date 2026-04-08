// ─────────────────────────────────────────────────────────────────────────────
// IEvaluationProvider — contrat que TOUT fournisseur d'évaluation doit respecter
//
// Actuellement 2 implémentations :
//   - SigmundService    → moteur psychométrique externe (SOAP)
//   - YiraInternalService → moteur interne YIRA (futur, IA native)
//
// Le EvaluationController ne connaît QUE cette interface.
// On bascule entre les deux sans toucher au contrôleur.
// ─────────────────────────────────────────────────────────────────────────────

export interface EvaluationSession {
  assessment_id: number;
  provider: 'sigmund' | 'yira_internal';
  nb_questions: number;
  questions: EvaluationQuestion[];
}

export interface EvaluationQuestion {
  label_question: string;
  r1?: string;
  r2?: string;
  r3?: string;
  r4?: string;
  r5?: string;
  r6?: string;
  nb_reponses: number;
}

export interface EvaluationResultat {
  assessment_id: number;
  provider: 'sigmund' | 'yira_internal';
  scores: number[];
  profil_riasec: string;          // ex: "SAE", "IRC"
  score_employabilite: number;    // /100
  criteres: string[];
  rapport_pdf_url?: string;
  pii_genere?: boolean;
}

export interface EvaluationInitParams {
  prenom: string;
  nom: string;
  niveau: 'N1' | 'N2' | 'N3';
  tenant_id: string;
  signaletique: {
    genre: 'homme' | 'femme' | 'nsp';
    date_naissance: Date;
    annees_experience: number;
    niveau_etude: string;
    type_formation: string;
    statut: string;
  };
}

export interface EvaluationReponses {
  assessment_id: number;
  reponses: number[];
}

// ─── Interface principale ───────────────────────────────────────────────────

export interface IEvaluationProvider {
  /**
   * Démarre une session d'évaluation
   * WS1+WS2+WS3+WS4 pour Sigmund / équivalent interne pour YIRA
   */
  initialiserEvaluation(params: EvaluationInitParams): Promise<EvaluationSession>;

  /**
   * Soumet toutes les réponses du candidat
   */
  soumettreReponses(data: EvaluationReponses): Promise<boolean>;

  /**
   * Récupère les résultats complets après soumission
   */
  recupererResultats(assessment_id: number): Promise<EvaluationResultat>;

  /**
   * Génère le rapport PDF (URL valable 24h pour Sigmund)
   */
  genererRapport(
    assessment_id: number,
    email_dest: string,
    tenant_id: string,
  ): Promise<string>;
}

// ─── Token d'injection NestJS ───────────────────────────────────────────────
// Permet de switcher le provider sans modifier le contrôleur

export const EVALUATION_PROVIDER = 'EVALUATION_PROVIDER';