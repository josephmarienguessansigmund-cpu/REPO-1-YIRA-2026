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

  @Get('sante')
  sante() {
    return { status: 'ok', service: 'YIRA Auth', timestamp: new Date().toISOString() };
  }
}
// This line intentionally left blank
