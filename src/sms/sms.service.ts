import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  constructor(private config: ConfigService) {}

  private tpl: Record<string, (d: any) => string> = {
    S1_BIENVENUE:        d => `YIRA: Bienvenue ${d.prenom}! Composez *7572# pour votre test gratuit. yira-ci.com`,
    S2_CODE_YIRA:        d => `YIRA: Code: ${d.code_yira}. Gardez-le! Acces dossier sur tous canaux.`,
    S3_TEST_COMMENCE:    d => `YIRA: Test demarre ${d.prenom}. ${d.nb_questions||30} questions. Bonne chance!`,
    S4_TEST_TERMINE:     d => `YIRA: Test termine ${d.prenom}! Score: ${d.score}/100. yira-ci.com`,
    S5_RESULTAT:         d => `YIRA Filiere ${d.filiere}: ${d.prenom}, oriente vers ${d.famille_metier}. Delai: ${d.delai}.`,
    S6_AFFECTATION:      d => `YIRA: ${d.prenom}, affecte a ${d.etablissement}. Debut: ${d.date_debut}.`,
    S7_DEBUT_FORMATION:  d => `YIRA: Rappel! Formation DEMAIN ${d.heure} chez ${d.etablissement}.`,
    S8_CERTIFICATION:    d => `YIRA BRAVO ${d.prenom}! Certification ${d.certification} obtenue.`,
    S9_OFFRE_EMPLOI:     d => `YIRA Emploi: ${d.prenom}, ${d.employeur} recrute ${d.poste}. *7572# option 4`,
    S10_ENTRETIEN:       d => `YIRA: Entretien DEMAIN ${d.heure} chez ${d.employeur}. Bon courage ${d.prenom}!`,
    S11_SUIVI:           d => `YIRA Suivi J+${d.jours}: Bonjour ${d.prenom}! Toujours en poste chez ${d.employeur}? OUI/NON`,
  };

  async envoyer(telephone: string, type: string, data?: any): Promise<boolean> {
    const fn = this.tpl[type];
    if (!fn) { this.logger.warn(`Template inconnu: ${type}`); return false; }
    return this.envoyerBrut(telephone, fn(data || {}));
  }

  async envoyerBrut(telephone: string, message: string): Promise<boolean> {
    const key  = this.config.get('AT_API_KEY');
    const user = this.config.get('AT_USERNAME');
    if (!key || !user) {
      this.logger.warn(`[SMS SIM] ${telephone}: ${message.substring(0,60)}`);
      return true;
    }
    try {
      const body = new URLSearchParams({
        username: user, to: telephone,
        message: message.substring(0, 160),
        from: this.config.get('AT_SENDER_ID', 'YIRA-CI'),
      });
      const r = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: { apiKey: key, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: body.toString(),
      });
      if (!r.ok) throw new Error(`AT ${r.status}`);
      const res = await r.json();
      const ok = res?.SMSMessageData?.Recipients?.[0]?.status === 'Success';
      this.logger.log(`SMS ${ok?'OK':'FAIL'} → ${telephone.slice(-4)}`);
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
