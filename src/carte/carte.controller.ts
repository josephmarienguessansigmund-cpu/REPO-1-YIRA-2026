import { Controller, Get, Post, Put, Body, Param, UseGuards, Query } from '@nestjs/common';
import { CarteService } from './carte.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('carte')
export class CarteController {
  constructor(private readonly carteService: CarteService) {}

  // Endpoint debug - liste tous les bénéficiaires
  @Get('debug/beneficiaires')
  async debugBenef() {
    return this.carteService.debugBeneficiaires();
  }

  @Get(':code_yira')
  async profilPublic(@Param('code_yira') code: string) {
    return this.carteService.getProfilPublic(code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('creer')
  async creerCarte(@Body() dto: { beneficiaire_id: string }) {
    return this.carteService.creerCarte(dto.beneficiaire_id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/activer')
  async activerCarte(@Param('id') id: string) {
    return this.carteService.activerCarte(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/certification')
  async ajouterCertification(@Param('id') id: string, @Body() dto: { certification: string }) {
    return this.carteService.ajouterCertification(id, dto.certification);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/wallet')
  async lierWallet(@Param('id') id: string, @Body() dto: { wallet_numero: string }) {
    return this.carteService.lierWallet(id, dto.wallet_numero);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats/global')
  async stats(@Query('country_code') cc = 'CI') {
    return this.carteService.getStatsCarte(cc);
  }
}
