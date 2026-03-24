import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { IaService } from './ia.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ia')
export class IaController {

  // Endpoint public - démonstration NIE sans JWT
  @Get('demo/:code_yira')
  async demoOrientation(@Param('code_yira') code: string) {
    return this.iaService.genererRapportOrientation({
      prenom: 'Bénéficiaire',
      profil_riasec: 'RIS',
      score_global: 82,
      score_aptitudes: 88,
      niveau_etude: 'bac',
      district: 'Abidjan',
      age: 22,
      country_code: 'CI',
      langue: 'fr',
      code_yira: code
    });
  }
  constructor(private readonly iaService: IaService) {}

  // Endpoint public pour tester le NIE
  @Get('sante')
  async sante() {
    return this.iaService.testerNIE();
  }

  @UseGuards(JwtAuthGuard)
  @Post('orientation')
  async orientation(@Body() dto: any) { return this.iaService.genererRapportOrientation(dto); }

  @UseGuards(JwtAuthGuard)
  @Post('pii')
  async pii(@Body() dto: any) { return this.iaService.genererPII(dto); }

  @UseGuards(JwtAuthGuard)
  @Post('curriculum')
  async curriculum(@Body() dto: any) { return this.iaService.genererCurriculum(dto); }

  @UseGuards(JwtAuthGuard)
  @Post('4savoirs')
  async quatreSavoirs(@Body() dto: any) { return this.iaService.analyser4Savoirs(dto); }

  @UseGuards(JwtAuthGuard)
  @Post('scorer-cv')
  async scorerCV(@Body() dto: any) { return this.iaService.scorerCV(dto); }

  @UseGuards(JwtAuthGuard)
  @Post('orientation-scolaire')
  async orientationScolaire(@Body() dto: any) { return this.iaService.genererOrientationScolaire(dto); }

  @UseGuards(JwtAuthGuard)
  @Post('diagnostic-orga')
  async diagnosticOrga(@Body() dto: any) { return this.iaService.diagnosticOrganisationnel(dto); }

  @UseGuards(JwtAuthGuard)

  @Post('formation')
  async formation(@Body() dto: any) { return this.iaService.genererPlanFormation(dto); }

  @Post('matching-emploi')
  async matchingEmploi(@Body() dto: any) { return this.iaService.matcherEmploi(dto); }

  @Post('coaching-adaptatif')
  async coachingAdaptatif(@Body() dto: any) { return this.iaService.genererCoachingAdaptatif(dto); }

  @Post('analyse-predictive')
  async analysePredictive(@Body() dto: any) { return this.iaService.analyserPredictif(dto); }

  @Post('fonctionnaire')
  async fonctionnaire(@Body() dto: any) { return this.iaService.evaluerFonctionnaire(dto); }

  @UseGuards(JwtAuthGuard)
  @Post('enseignant')
  async enseignant(@Body() dto: any) { return this.iaService.evaluerEnseignant(dto); }

  @UseGuards(JwtAuthGuard)
  @Post('predictif')
  async predictif(@Body() dto: any) { return this.iaService.predireEvolutionCarriere(dto); }
}
