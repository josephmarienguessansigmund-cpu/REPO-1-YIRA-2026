import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { SigmundService } from './sigmund.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sigmund')
export class SigmundController {
  constructor(private readonly sigmundService: SigmundService) {}

  @UseGuards(JwtAuthGuard)
  @Post('initialiser')
  async initialiser(@Body() dto: any) { return this.sigmundService.initialiserEvaluation(dto); }

  @UseGuards(JwtAuthGuard)
  @Post('session')
  async ouvrirSession(@Body() dto: { product_code?: string }) { return this.sigmundService.ouvrirSession(dto.product_code); }

  @UseGuards(JwtAuthGuard)
  @Post('reponses')
  async soumettreReponses(@Body() dto: { assessment_id: number; reponses: number[] }) {
    return this.sigmundService.soumettreReponses(dto.assessment_id, dto.reponses);
  }

  @UseGuards(JwtAuthGuard)
  @Get('donnees/:assessment_id')
  async recupererDonnees(@Param('assessment_id') id: string) { return this.sigmundService.recupererDonnees(parseInt(id)); }

  @Get('sante')
  sante() { return { status: 'ok', service: 'YIRA Sigmund SigmundTest CI', timestamp: new Date().toISOString() }; }
}
