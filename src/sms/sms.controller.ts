import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { SmsService } from './sms.service';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('test') @HttpCode(200)
  async test(@Body() b: { telephone: string; message: string }) {
    return { succes: await this.smsService.envoyerBrut(b.telephone, b.message) };
  }

  @Post('envoyer') @HttpCode(200)
  async envoyer(@Body() b: { telephone: string; type: string; data?: any }) {
    return { succes: await this.smsService.envoyer(b.telephone, b.type, b.data) };
  }

  @Post('inscription') @HttpCode(200)
  async inscription(@Body() b: { telephone: string; prenom: string; code_yira: string }) {
    const [s1, s2] = await Promise.all([
      this.smsService.envoyer(b.telephone, 'S1_BIENVENUE', { prenom: b.prenom }),
      this.smsService.envoyer(b.telephone, 'S2_CODE_YIRA', { code_yira: b.code_yira }),
    ]);
    return { s1, s2, mode: this.smsService.estModeSimule() ? 'SIMULE' : 'REEL' };
  }
}
