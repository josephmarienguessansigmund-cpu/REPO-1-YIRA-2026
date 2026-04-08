import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AffectationService, ProfilOrientation } from './affectation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantId } from '../tenant/tenant.decorator';

@UseGuards(JwtAuthGuard)
@Controller('affectation')
export class AffectationController {
  constructor(private readonly affectationService: AffectationService) {}

  @Post('orienter')
  async orienter(@Body() dto: any, @TenantId() country_code: string) {
    const profil: ProfilOrientation = { ...dto, country_code };
    return this.affectationService.affecterBeneficiaire(profil);
  }

  @Get('etablissements/:famille')
  async etablissements(
    @Param('famille') famille: string,
    @TenantId() country_code: string,
  ) {
    return this.affectationService.chercherEtablissementsPublic(famille, country_code);
  }
}
