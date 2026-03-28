import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('envoyer')
  async envoyer(@Body() dto: {
    type: string;
    telephone: string;
    prenom: string;
    params?: any;
  }) {
    const { type, telephone, prenom, params } = dto;

    switch (type) {
      case 'SP1':
        await this.smsService.envoyerCodeYira(telephone, prenom, params?.code_yira || '');
        break;
      case 'S1':
        await this.smsService.envoyerS1Inscription(telephone, prenom, params?.code_yira || '');
        break;
      case 'SP2':
        await this.smsService.envoyerSP2Parents(telephone, prenom);
        break;
      case 'S3':
        await this.smsService.envoyerS3EvalTerminee(telephone, prenom);
        break;
      case 'SP3':
        await this.smsService.envoyerSP3Formation(telephone, prenom, params?.etablissement || '');
        break;
      case 'SP4':
        await this.smsService.envoyerSP4Inactivite(telephone, prenom);
        break;
      case 'SP5':
        await this.smsService.envoyerSP5Insertion(telephone, prenom, params?.poste || '', params?.employeur || '');
        break;
      case 'S7':
        await this.smsService.envoyerS7ResultatCQP(telephone, prenom, params?.filiere || '', params?.code_yira || '');
        break;
      case 'S8':
        await this.smsService.envoyerS8Embauche(telephone, prenom, params?.employeur || '', params?.poste || '');
        break;
      case 'OTP':
        const otp = this.smsService.genererOTP();
        await this.smsService.envoyerOTP(telephone, otp);
        return { message: 'OTP envoye', otp: this.smsService.estModeSimule() ? otp : '******' };
      case 'QUIZ':
        await this.smsService.envoyerRappelQuiz(telephone, prenom);
        break;
      case 'ALERTE':
        await this.smsService.envoyerAlerteConseiller(telephone, prenom, params?.alerte || '');
        break;
      default:
        return { message: 'Type SMS invalide', types_valides: ['SP1','S1','SP2','S3','SP3','SP4','SP5','S7','S8','OTP','QUIZ','ALERTE'] };
    }

    return {
      message: `SMS ${type} envoye`,
      telephone,
      mode: this.smsService.estModeSimule() ? 'SIMULE' : 'REEL'
    };
  }

  @Post('test')
  async tester(@Body() dto: { telephone: string; message: string }) {
    const ok = await this.smsService.envoyer(dto.telephone, dto.message);
    return { 
      envoye: ok, 
      mode: this.smsService.estModeSimule() ? 'SIMULE' : 'REEL',
      message: dto.message 
    };
  }
}
