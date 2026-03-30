import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('conseiller/inscription')
  async inscrireConseiller(@Body() dto: any) {
    return this.authService.inscrireConseiller(dto);
  }

  @Post('conseiller/login')
  async loginConseiller(@Body() dto: { email: string; password: string }) {
    return this.authService.loginConseiller(dto.email, dto.password);
  }

  @Post('beneficiaire/inscription')
  async inscrireBeneficiaire(@Body() dto: any) {
    return this.authService.inscrireBeneficiaire(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profil')
  async profil(@Request() req: any) {
    return { message: 'Profil YIRA', utilisateur: req.user };
  }

  @Post('admin/login')
  async loginAdmin(@Body() dto: { email: string; password: string }) {
    return this.authService.loginAdmin(dto.email, dto.password);
  }

  @Post('drh/login')
  async loginDrh(@Body() dto: { email: string; password: string }) {
    return this.authService.loginConseiller(dto.email, dto.password);
  }

  @Post('etat/login')
  async loginEtat(@Body() dto: { email: string; password: string }) {
    return this.authService.loginConseiller(dto.email, dto.password);
  }

  @Post('verifier-otp')
  async verifierOtp(@Body() dto: { otp: string; token: string; role: string }) {
    // En Phase 0 pilote : accepter tout OTP valide (6 chiffres)
    // En Phase 1 : vérification via stockage Redis/Supabase
    if (!dto.otp || dto.otp.length !== 6) {
      return { valide: false, message: 'OTP invalide' };
    }
    // Mode pilote : OTP simulé — tout code à 6 chiffres est accepté
    return {
      valide: true,
      access_token: dto.token || '',
      mode: 'PILOTE',
      message: 'OTP validé (mode pilote Phase 0)'
    };
  }

  @Get('sante')
  sante() {
    return { status: 'ok', service: 'YIRA Auth', timestamp: new Date().toISOString() };
  }
}
// This line intentionally left blank
