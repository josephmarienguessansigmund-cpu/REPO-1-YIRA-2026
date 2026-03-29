import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { IaService } from './ia.service';

@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  // GET /api/v1/ia — health
  @Get()
  healthCheck() {
    return { status: 'Moteur IA YIRA opérationnel', nie: 'ACTIF' };
  }

  // GET /api/v1/ia/sante — health complet
  @Get('sante')
  async sante() {
    return await this.iaService.testerNIE();
  }

  // POST /api/v1/ia/inculturer — inculturation psychométrique
  @Post('inculturer')
  async inculturer(@Body() body: { sigmundId: string; originalText: string; niveau: string }) {
    return await this.iaService.inculturerQuestion(body.sigmundId, body.originalText, body.niveau);
  }

  // POST /api/v1/ia/rapport — rapport NIE complet (appelé par genererMonRapport)
  @Post('rapport')
  async rapport(@Body() body: any) {
    try {
      const raw = await this.iaService.genererRapportOrientation(body);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try { return JSON.parse(cleaned); } catch { return { rapport: raw }; }
    } catch (e) {
      return { error: e.message, rapport: 'Service temporairement indisponible' };
    }
  }

  // POST /api/v1/ia/orientation — orientation scolaire (appelé par buildTabOrientation)
  @Post('orientation')
  async orientation(@Body() body: any) {
    try {
      const raw = await this.iaService.genererOrientationScolaire(body);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try { return JSON.parse(cleaned); } catch { return { orientation: raw }; }
    } catch (e) {
      return { error: e.message };
    }
  }

  // POST /api/v1/ia/pii — Plan Insertion Individualisé
  @Post('pii')
  async pii(@Body() body: any) {
    try {
      const raw = await this.iaService.genererPII(body);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try { return JSON.parse(cleaned); } catch { return { pii: raw }; }
    } catch (e) {
      return { error: e.message };
    }
  }

  // POST /api/v1/ia/coaching — coaching adaptatif
  @Post('coaching')
  async coaching(@Body() body: any) {
    return await this.iaService.genererCoachingAdaptatif(body);
  }

  // POST /api/v1/ia/matching — matching emploi
  @Post('matching')
  async matching(@Body() body: any) {
    return await this.iaService.matcherEmploi(body);
  }

  // POST /api/v1/ia/fonctionnaire — évaluation fonctionnaire DGFP
  @Post('fonctionnaire')
  async fonctionnaire(@Body() body: any) {
    try {
      const raw = await this.iaService.evaluerFonctionnaire(body);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try { return JSON.parse(cleaned); } catch { return { evaluation: raw }; }
    } catch (e) {
      return { error: e.message };
    }
  }

  // POST /api/v1/ia/formation — plan de formation
  @Post('formation')
  async formation(@Body() body: any) {
    return await this.iaService.genererPlanFormation(body);
  }

  // POST /api/v1/ia/predictif — analyse prédictive
  @Post('predictif')
  async predictif(@Body() body: any) {
    return await this.iaService.analyserPredictif(body);
  }
}
