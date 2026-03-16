import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}
  @UseGuards(JwtAuthGuard)
  @Post('envoyer')
  async envoyer(@Body() dto: { type: string; beneficiaire_id: string; telephone: string; prenom: string; params?: any }) {
    switch (dto.type) {
      case 'S1': await this.smsService.envoyerS1Inscription({ ...dto, code_yira: dto.params?.code_yira }); break;
      case 'S3': await this.smsService.envoyerS3EvalTerminee(dto); break;
      case 'S7': await this.smsService.envoyerS7ResultatCQP({ ...dto, filiere: dto.params?.filiere, code_yira: dto.params?.code_yira }); break;
      case 'S8': await this.smsService.envoyerS8Embauche({ ...dto, employeur: dto.params?.employeur, poste: dto.params?.poste }); break;
      default: return { message: 'Type SMS invalide' };
    }
    return { message: `SMS ${dto.type} envoye`, telephone: dto.telephone };
  }
}
