import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IEvaluationProvider,
  EvaluationSession,
  EvaluationResultat,
  EvaluationInitParams,
  EvaluationReponses,
} from './evaluation.interface';

// ─────────────────────────────────────────────────────────────────────────────
// YiraInternalService — moteur d'évaluation natif YIRA
//
// Statut actuel : PHASE 2 — squelette prêt, logique IA à implémenter
//
// Ce service sera activé via .env : EVALUATION_PROVIDER=yira_internal
// Il prendra le relai de SigmundService quand le moteur IA YIRA sera mature.
//
// Différence avec SigmundService :
//   - Pas d'appel SOAP externe → tout est calculé localement
//   - Questionnaire culturalisé CI dès le départ (pas de retraduction)
//   - Scores directement en format YIRA (pas de mapping RIASEC → CI)
//   - Connexion directe à la base référentiel métiers par tenant
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class YiraInternalService implements IEvaluationProvider {
  private readonly logger = new Logger(YiraInternalService.name);

  constructor(private config: ConfigService) {}

  // ── IEvaluationProvider : initialiserEvaluation ──────────────────────────

  async initialiserEvaluation(params: EvaluationInitParams): Promise<EvaluationSession> {
    this.logger.log(`YiraInternal: initialisation évaluation ${params.niveau} pour ${params.prenom} ${params.nom} · tenant: ${params.tenant_id}`);

    // TODO Phase 2 : charger le questionnaire depuis yira_questionnaire_items
    // filtré par tenant_id + niveau + langue du tenant

    const assessment_id = this.genererAssessmentId();

    // Questionnaire de démonstration — remplacé par BDD en Phase 2
    const questions = this.getQuestionnaireDemoParNiveau(params.niveau);

    return {
      assessment_id,
      provider: 'yira_internal',
      nb_questions: questions.length,
      questions,
    };
  }

  // ── IEvaluationProvider : soumettreReponses ───────────────────────────────

  async soumettreReponses(data: EvaluationReponses): Promise<boolean> {
    this.logger.log(`YiraInternal: soumission ${data.reponses.length} réponses → assessment ${data.assessment_id}`);

    // TODO Phase 2 :
    // 1. Sauvegarder les réponses dans yira_evaluation_reponses
    // 2. Déclencher le calcul des scores YIRA (algo interne)
    // 3. Appeler l'IA YIRA pour culturalisation
    // 4. Générer le PII automatiquement

    return true; // toujours "terminé" en mode interne
  }

  // ── IEvaluationProvider : recupererResultats ──────────────────────────────

  async recupererResultats(assessment_id: number): Promise<EvaluationResultat> {
    this.logger.log(`YiraInternal: récupération résultats → assessment ${assessment_id}`);

    // TODO Phase 2 : charger depuis yira_evaluation_scores
    // + appel moteur IA culturalisation

    // Résultat de démonstration
    return {
      assessment_id,
      provider: 'yira_internal',
      scores: [72, 65, 58, 80, 45, 60],
      profil_riasec: 'SAE',
      score_employabilite: 72,
      criteres: ['Social', 'Entreprenant', 'Artistique'],
      pii_genere: false,
      rapport_pdf_url: undefined,
    };
  }

  // ── IEvaluationProvider : genererRapport ──────────────────────────────────

  async genererRapport(
    assessment_id: number,
    email_dest: string,
    tenant_id: string,
  ): Promise<string> {
    this.logger.log(`YiraInternal: génération rapport PDF → assessment ${assessment_id} · tenant ${tenant_id}`);

    // TODO Phase 2 :
    // 1. Appeler YiraIAService.culturaliserRapport()
    // 2. Générer PDF avec template YIRA (puppeteer ou pdfmake)
    // 3. Uploader sur S3/Supabase Storage
    // 4. Envoyer email avec lien
    // 5. Retourner URL

    return `https://storage.yira.ci/${tenant_id}/rapports/yira-${assessment_id}.pdf`;
  }

  // ── Helpers privés ────────────────────────────────────────────────────────

  private genererAssessmentId(): number {
    // Préfixe 9 pour distinguer des IDs Sigmund (qui commencent par 1xxxxx)
    return parseInt(`9${Date.now().toString().slice(-7)}`, 10);
  }

  private getQuestionnaireDemoParNiveau(niveau: 'N1' | 'N2' | 'N3') {
    // Questions culturalisées CI — à remplacer par BDD en Phase 2
    const questionsBase = [
      {
        label_question: "Dans votre travail idéal, qu'est-ce qui vous attire le plus ?",
        r1: 'Travailler avec mes mains, construire, réparer',
        r2: 'Analyser, comprendre, résoudre des problèmes complexes',
        r3: 'Créer, exprimer, imaginer',
        r4: 'Aider les autres, enseigner, conseiller',
        nb_reponses: 4,
      },
      {
        label_question: "Comment vous comportez-vous dans un groupe de travail ?",
        r1: 'Je préfère travailler seul, à mon rythme',
        r2: "J'organise et dirige naturellement le groupe",
        r3: 'Je suis les instructions et fais ma part',
        r4: 'Je fais le lien entre les membres du groupe',
        nb_reponses: 4,
      },
      {
        label_question: "Quelle situation vous met le plus à l'aise ?",
        r1: 'Un environnement stable, avec des règles claires',
        r2: 'Des défis nouveaux et des situations variées',
        r3: 'Quand je peux aider quelqu\'un directement',
        r4: 'Quand je peux prendre des décisions importantes',
        nb_reponses: 4,
      },
    ];

    // N3 reçoit des questions supplémentaires sur le leadership
    if (niveau === 'N3') {
      return [
        ...questionsBase,
        {
          label_question: "Face à un conflit dans votre équipe, vous...",
          r1: 'Intervenez immédiatement pour trouver une solution',
          r2: 'Écoutez chaque partie avant de décider',
          r3: 'Laissez le groupe résoudre par lui-même',
          r4: 'Escaladez à votre supérieur',
          nb_reponses: 4,
        },
      ];
    }

    return questionsBase;
  }
}