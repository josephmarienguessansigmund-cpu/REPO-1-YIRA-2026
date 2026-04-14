import { Injectable, Logger } from '@nestjs/common';
import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  constructor(private config: ConfigService) {}

  private templates: Record<string, (d: any) => string> = {
    S1_BIENVENUE: d => `YIRA: Bienvenue ${d.prenom}! Composez *7572# pour votre test gratuit. yira-ci.com`,
    S2_CODE_YIRA: d => `YIRA: Votre code personnel: ${d.code_yira}. Gardez-le! Acces a votre dossier sur tous les canaux.`,
    S3_TEST_COMMENCE: d => `YIRA: Test SigmundTest demarre pour ${d.prenom}. ${d.nb_questions} questions.`,
    S4_TEST_TERMINE: d => `YIRA: Test termine ${d.prenom}! Score: ${d.score}/100. Rapport: yira-ci.com`,
    S5_RESULTAT: d => `YIRA Filiere ${d.filiere}: ${d.prenom}, oriente(e) vers ${d.famille_metier}. Delai: ${d.delai}.`,
    S6_AFFECTATION: d => `YIRA: ${d.prenom}, affecte(e) a ${d.etablissement}. Debut: ${d.date_debut}.`,
    S7_DEBUT_FORMATION: d => `YIRA: Rappel! Formation DEMAIN a ${d.heure} chez ${d.etablissement}.`,
    S8_CERTIFICATION: d => `YIRA FELICITATIONS ${d.prenom}! Vous avez obtenu votre ${d.certification}.`,
    S9_OFFRE_EMPLOI: d => `YIRA Emploi: ${d.prenom}, ${d.employeur} recherche ${d.poste}. *7572# option 4`,
    S10_ENTRETIEN: d => `YIRA: Entretien DEMAIN ${d.heure} chez ${d.employeur}. Bon courage ${d.prenom}!`,
    S11_SUIVI: d => `YIRA Suivi J+${d.jours}: ${d.prenom}, etes-vous en poste chez ${d.employeur}? OUI/NON`,
  };

  async envoyer(telephone: string, type: string, data?: any): Promise<boolean> {
    const fn = this.templates[type];
    if (!fn) { this.logger.warn(`Template SMS inconnu: ${type}`); return false; }
    return this.envoyerBrut(telephone, fn(data || {}));
  }

  async envoyerBrut(telephone: string, message: string): Promise<boolean> {
    const key = this.config.get('AT_API_KEY');
    const user = this.config.get('AT_USERNAME');
    if (!key || !user) {
      this.logger.warn(`[SMS SIMULE] ${telephone}: ${message.substring(0, 60)}`);
      return true;
    }
    try {
      const body = new URLSearchParams({ username: user, to: telephone, message: message.substring(0, 160), from: this.config.get('AT_SENDER_ID', 'YIRA-CI') });
      const r = await fetch('https://api.africastalking.com/version1/messaging', { method: 'POST', headers: { apiKey: key, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: body.toString() });
      if (!r.ok) throw new Error(`AT API ${r.status}`);
      const result = await r.json();
      const ok = result?.SMSMessageData?.Recipients?.[0]?.status === 'Success';
      this.logger.log(`SMS ${ok ? 'OK' : 'FAIL'} → ${telephone.slice(-4)}`);
      return ok;
    } catch (e: any) {
      this.logger.error(`SMS error: ${e.message}`);
      return false;
    }
  }

  estModeSimule(): boolean {
    return !this.config.get('AT_API_KEY') || !this.config.get('AT_USERNAME');
  }
}

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('test') @HttpCode(200)
  async test(@Body() b: any) {
    return { succes: await this.smsService.envoyerBrut(b.telephone, b.message) };
  }

  @Post('envoyer') @HttpCode(200)
  async envoyer(@Body() b: any) {
    return { succes: await this.smsService.envoyer(b.telephone, b.type, b.data) };
  }

  @Post('inscription') @HttpCode(200)
  async inscription(@Body() b: any) {
    const [s1, s2] = await Promise.all([
      this.smsService.envoyer(b.telephone, 'S1_BIENVENUE', { prenom: b.prenom }),
      this.smsService.envoyer(b.telephone, 'S2_CODE_YIRA', { code_yira: b.code_yira }),
    ]);
    return { s1, s2, mode: this.smsService.estModeSimule() ? 'SIMULE' : 'REEL' };
  }
}
