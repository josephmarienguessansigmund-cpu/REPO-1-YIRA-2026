import {
  Controller, Post, Get, Body, Param,
  ParseIntPipe, UseGuards, Inject, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  IEvaluationProvider,
  EVALUATION_PROVIDER,
  EvaluationInitParams,
} from './evaluation.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantId } from '../tenant/tenant.decorator';

// ─────────────────────────────────────────────────────────────────────────────
// EvaluationController
//
// Endpoints consommés par :
//   - Le bouton "Démarrer le test" (frontend web/app) → POST /evaluation/init
//   - USSD *7572# → POST /evaluation/init (même endpoint)
//   - App Android → POST /evaluation/init (même endpoint)
//
// La chaîne complète :
//   bouton onclick → _goPage('evaluation') → initEvalPublique()
//   → fetch('POST /api/evaluation/init') → EvaluationController.init()
//   → EVALUATION_PROVIDER.initialiserEvaluation() → SigmundService ou YiraInternal
// ─────────────────────────────────────────────────────────────────────────────

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class InitEvaluationDto {
  beneficiaire_id: string;
  prenom: string;
  nom: string;
  niveau: 'N1' | 'N2' | 'N3';
  signaletique: {
    genre: 'homme' | 'femme' | 'nsp';
    date_naissance: string; // ISO string depuis le frontend
    annees_experience: number;
    niveau_etude: string;
    type_formation: string;
    statut: string;
  };
}

export class SoumettreReponsesDto {
  assessment_id: number;
  reponses: number[];
}

export class GenererRapportDto {
  assessment_id: number;
  email_dest: string;
}

// ─── Contrôleur ──────────────────────────────────────────────────────────────

@Controller('evaluation')
export class EvaluationController {
  constructor(
    @Inject(EVALUATION_PROVIDER)
    private readonly provider: IEvaluationProvider,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/evaluation/init
  //
  // Point d'entrée du bouton "Démarrer le test" sur le site YIRA
  // Appelé par initEvalPublique() côté frontend
  //
  // Pas de JwtAuthGuard ici → accès public (le jeune n'est pas encore connecté)
  // ──────────────────────────────────────────────────────────────────────────
  @Post('init')
  @HttpCode(HttpStatus.CREATED)
  async init(
    @Body() dto: InitEvaluationDto,
    @TenantId() tenant_id: string,
  ) {
    const params: EvaluationInitParams = {
      prenom: dto.prenom,
      nom: dto.nom,
      niveau: dto.niveau,
      tenant_id,
      signaletique: {
        ...dto.signaletique,
        date_naissance: new Date(dto.signaletique.date_naissance),
      },
    };

    const session = await this.provider.initialiserEvaluation(params);

    return {
      assessment_id: session.assessment_id,
      provider: session.provider,
      nb_questions: session.nb_questions,
      questions: session.questions,
      // Le frontend stocke assessment_id en sessionStorage
      // et affiche les questions une par une
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/evaluation/soumettre
  // Envoie toutes les réponses du candidat
  // ──────────────────────────────────────────────────────────────────────────
  @Post('soumettre')
  @HttpCode(HttpStatus.OK)
  async soumettre(@Body() dto: SoumettreReponsesDto) {
    const termine = await this.provider.soumettreReponses({
      assessment_id: dto.assessment_id,
      reponses: dto.reponses,
    });

    return {
      termine,
      assessment_id: dto.assessment_id,
      message: termine
        ? 'Évaluation terminée — rapport en génération'
        : 'Réponses enregistrées partiellement',
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/evaluation/:assessment_id/resultats
  // ──────────────────────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get(':assessment_id/resultats')
  async resultats(@Param('assessment_id', ParseIntPipe) assessment_id: number) {
    return this.provider.recupererResultats(assessment_id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // POST /api/evaluation/rapport
  // Génère le PDF et retourne l'URL
  // ──────────────────────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('rapport')
  async rapport(
    @Body() dto: GenererRapportDto,
    @TenantId() tenant_id: string,
  ) {
    const url = await this.provider.genererRapport(
      dto.assessment_id,
      dto.email_dest,
      tenant_id,
    );
    return { url, expires_in: '24h' };
  }
}