import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IaService } from './ia.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ia')
@UseGuards(JwtAuthGuard)
export class IaController {
  constructor(private readonly iaService: IaService) {}
  @Post('orientation') async orientation(@Body() dto: any) { return this.iaService.genererRapportOrientation(dto); }
  @Post('orientation-multilingue') async orientationMultilingue(@Body() dto: any) { return this.iaService.genererRapportMultilingue(dto); }
  @Post('pii') async pii(@Body() dto: any) { return this.iaService.genererPII(dto); }
  @Post('curriculum') async curriculum(@Body() dto: any) { return this.iaService.genererCurriculum(dto); }
  @Post('4savoirs') async quatreSavoirs(@Body() dto: any) { return this.iaService.analyser4Savoirs(dto); }
  @Post('scorer-cv') async scorerCV(@Body() dto: any) { return this.iaService.scorerCV(dto); }
  @Post('orientation-scolaire') async orientationScolaire(@Body() dto: any) { return this.iaService.genererOrientationScolaire(dto); }
  @Post('diagnostic-orga') async diagnosticOrga(@Body() dto: any) { return this.iaService.diagnosticOrganisationnel(dto); }
  @Post('fonctionnaire') async fonctionnaire(@Body() dto: any) { return this.iaService.evaluerFonctionnaire(dto); }
  @Post('enseignant') async enseignant(@Body() dto: any) { return this.iaService.evaluerEnseignant(dto); }
  @Post('predictif') async predictif(@Body() dto: any) { return this.iaService.predireEvolutionCarriere(dto); }
}
