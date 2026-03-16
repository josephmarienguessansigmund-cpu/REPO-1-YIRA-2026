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

  @Get('sante')
  sante() {
    return { status: 'ok', service: 'YIRA Auth', timestamp: new Date().toISOString() };
  }
}
