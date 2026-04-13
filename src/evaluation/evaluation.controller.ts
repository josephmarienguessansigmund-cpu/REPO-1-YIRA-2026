import { Controller, Post, Get, Body, Param, ParseIntPipe, UseGuards, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { IEvaluationProvider, EVALUATION_PROVIDER, EvaluationInitParams } from './evaluation.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantId } from '../tenant/tenant.decorator';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { YiraInternalService } from './yira-internal.service';

export class InitEvaluationDto {
  beneficiaire_id?: string;
  code_yira?: string;
  prenom?: string;
  nom?: string;
  niveau?: 'N1' | 'N2' | 'N3';
  parcours?: string;
  signaletique?: any;
}

export class SoumettreReponsesDto {
  assessment_id: number;
  code_yira?: string;
  niveau?: string;
  parcours?: string;
  reponses: { question_id: number; valeur: number }[];
}

export class GenererRapportDto {
  assessment_id: number;
  email_dest: string;
}

@Controller('evaluation')
export class EvaluationController {
  private supabase;

  constructor(
    @Inject(EVALUATION_PROVIDER) private readonly provider: IEvaluationProvider,
    private readonly yiraInternal: YiraInternalService,
    private readonly config: ConfigService,
  ) {
    this.supabase = createClient(
      this.config.get('SUPABASE_URL', ''),
      this.config.get('SUPABASE_SERVICE_KEY', ''),
    );
  }

  @Post('init')
  @HttpCode(HttpStatus.CREATED)
  async init(@Body() dto: InitEvaluationDto, @TenantId() tenant_id: string) {
    const params: EvaluationInitParams = {
      prenom: dto.prenom ?? 'Beneficiaire',
      nom: dto.nom ?? 'YIRA',
      niveau: dto.niveau ?? 'N1',
      tenant_id,
      signaletique: {
        genre: dto.signaletique?.genre ?? 'nsp',
        date_naissance: new Date(dto.signaletique?.date_naissance ?? '2000-01-01'),
        annees_experience: dto.signaletique?.annees_experience ?? 0,
        niveau_etude: dto.signaletique?.niveau_etude ?? 'bepc',
        type_formation: dto.signaletique?.type_formation ?? 'generale',
        statut: dto.signaletique?.statut ?? 'etudiant',
      },
    };
    const session = await this.provider.initialiserEvaluation(params);
    await this.supabase.from('yira_evaluation').insert({
      assessment_id: session.assessment_id,
      code_yira: dto.code_yira,
      niveau: dto.niveau ?? 'N1',
      parcours: dto.parcours ?? 'scolaire',
      statut: 'en_cours',
      canal: 'web',
      tenant_id: tenant_id ?? 'CI',
    });
    return {
      assessment_id: session.assessment_id,
      provider: session.provider,
      nb_questions: session.nb_questions,
      questions: session.questions,
    };
  }

  @Post('soumettre')
  @HttpCode(HttpStatus.OK)
  async soumettre(@Body() dto: SoumettreReponsesDto) {
    const resultat = this.yiraInternal.calculerScore(dto.reponses);
    await this.supabase.from('yira_evaluation').update({
      score_global: resultat.score_global,
      profil_riasec: resultat.profil_riasec,
      score_personnalite: resultat.scores_piliers?.personnalite ?? 0,
      score_soft_skills: resultat.scores_piliers?.soft_skills ?? 0,
      score_riasec: resultat.scores_piliers?.riasec ?? 0,
      score_motivation: resultat.scores_piliers?.motivation ?? 0,
      filiere_recommandee: resultat.filiere_recommandee,
      parcours_informel: resultat.parcours_informel ?? null,
      reponses: dto.reponses,
      statut: 'termine',
      date_fin: new Date().toISOString(),
    }).eq('assessment_id', dto.assessment_id);
    return {
      termine: true,
      assessment_id: dto.assessment_id,
      score_global: resultat.score_global,
      profil_riasec: resultat.profil_riasec,
      filiere_recommandee: resultat.filiere_recommandee,
      parcours_informel: resultat.parcours_informel,
      scores_piliers: resultat.scores_piliers,
      message: 'Evaluation terminee — profil genere',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':assessment_id/resultats')
  async resultats(@Param('assessment_id', ParseIntPipe) assessment_id: number) {
    const { data } = await this.supabase.from('yira_evaluation').select('*').eq('assessment_id', assessment_id).single();
    return data ?? await this.provider.recupererResultats(assessment_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rapport')
  async rapport(@Body() dto: GenererRapportDto, @TenantId() tenant_id: string) {
    const url = await this.provider.genererRapport(dto.assessment_id, dto.email_dest, tenant_id);
    return { url, expires_in: '24h' };
  }
}