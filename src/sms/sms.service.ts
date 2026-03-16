import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private supabase;
  private readonly atApiKey: string;
  private readonly atUsername: string;
  private readonly shortcode: string;

  constructor(private config: ConfigService) {
    this.supabase = createClient(this.config.get('SUPABASE_URL', ''), this.config.get('SUPABASE_SERVICE_KEY', ''));
    this.atApiKey = this.config.get('AT_API_KEY', '');
    this.atUsername = this.config.get('AT_USERNAME', 'sandbox');
    this.shortcode = this.config.get('AT_SMS_SHORTCODE', 'YIRA-CI');
  }

  async envoyerSMS(telephone: string, message: string): Promise<boolean> {
    try {
      const url = this.atUsername === 'sandbox'
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';
      await axios.post(url, null, { params: { username: this.atUsername, to: telephone, message, from: this.shortcode }, headers: { apiKey: this.atApiKey, Accept: 'application/json' } });
      return true;
    } catch (err) { this.logger.error(`SMS erreur: ${err.message}`); return false; }
  }

  async loggerSMS(params: { beneficiaire_id: string; type_sms: string; telephone: string; contenu: string; statut: string }): Promise<void> {
    await this.supabase.from('YiraSmsLog').insert({ ...params, country_code: 'CI' });
  }

  async envoyerS1Inscription(p: { beneficiaire_id: string; prenom: string; telephone: string; code_yira: string }): Promise<void> {
    const message = `YIRA-CI: Bonjour ${p.prenom}! Inscription confirmee. Code: ${p.code_yira}. Composez *7572# ou yira.ci pour votre evaluation.`;
    const statut = await this.envoyerSMS(p.telephone, message) ? 'ENVOYE' : 'ECHEC';
    await this.loggerSMS({ beneficiaire_id: p.beneficiaire_id, type_sms: 'S1_INSCRIPTION', telephone: p.telephone, contenu: message, statut });
  }

  async envoyerS2Code(p: { beneficiaire_id: string; prenom: string; telephone: string; code_yira: string }): Promise<void> {
    const message = `YIRA-CI: ${p.prenom}, votre code evaluation: ${p.code_yira}. Gardez-le. *7572#>2 pour reprendre.`;
    const statut = await this.envoyerSMS(p.telephone, message) ? 'ENVOYE' : 'ECHEC';
    await this.loggerSMS({ beneficiaire_id: p.beneficiaire_id, type_sms: 'S2_CODE', telephone: p.telephone, contenu: message, statut });
  }

  async envoyerS3EvalTerminee(p: { beneficiaire_id: string; prenom: string; telephone: string }): Promise<void> {
    const message = `YIRA-CI: Bravo ${p.prenom}! Evaluation terminee. Votre rapport est pret. Un conseiller vous contacte sous 48h.`;
    const statut = await this.envoyerSMS(p.telephone, message) ? 'ENVOYE' : 'ECHEC';
    await this.loggerSMS({ beneficiaire_id: p.beneficiaire_id, type_sms: 'S3_EVAL_TERMINEE', telephone: p.telephone, contenu: message, statut });
  }

  async envoyerS7ResultatCQP(p: { beneficiaire_id: string; prenom: string; telephone: string; filiere: string; code_yira: string }): Promise<void> {
    const message = `YIRA-CI: Felicitations ${p.prenom}! CQP ${p.filiere} obtenu. Certificat: yira.ci/cert/${p.code_yira}`;
    const statut = await this.envoyerSMS(p.telephone, message) ? 'ENVOYE' : 'ECHEC';
    await this.loggerSMS({ beneficiaire_id: p.beneficiaire_id, type_sms: 'S7_CQP', telephone: p.telephone, contenu: message, statut });
  }

  async envoyerS8Embauche(p: { beneficiaire_id: string; prenom: string; telephone: string; employeur: string; poste: string }): Promise<void> {
    const message = `YIRA-CI: ${p.prenom}, embauche confirme chez ${p.employeur}! Poste: ${p.poste}. Felicitations!`;
    const statut = await this.envoyerSMS(p.telephone, message) ? 'ENVOYE' : 'ECHEC';
    await this.loggerSMS({ beneficiaire_id: p.beneficiaire_id, type_sms: 'S8_EMBAUCHE', telephone: p.telephone, contenu: message, statut });
  }

  async envoyerS9Suivi7(p: { beneficiaire_id: string; prenom: string; telephone: string; employeur: string }): Promise<void> {
    const message = `YIRA-CI: ${p.prenom}, 1ere semaine chez ${p.employeur}. Comment ca se passe? Repondez: 1=Tres bien 2=Difficultes 3=J ai quitte`;
    const statut = await this.envoyerSMS(p.telephone, message) ? 'ENVOYE' : 'ECHEC';
    await this.loggerSMS({ beneficiaire_id: p.beneficiaire_id, type_sms: 'S9_SUIVI_J7', telephone: p.telephone, contenu: message, statut });
  }

  async envoyerS11Annuel(p: { beneficiaire_id: string; prenom: string; telephone: string; code_yira: string }): Promise<void> {
    const message = `YIRA-CI: ${p.prenom}, 1 an dans YIRA! Bilan: yira.ci/profil/${p.code_yira}`;
    const statut = await this.envoyerSMS(p.telephone, message) ? 'ENVOYE' : 'ECHEC';
    await this.loggerSMS({ beneficiaire_id: p.beneficiaire_id, type_sms: 'S11_ANNUEL', telephone: p.telephone, contenu: message, statut });
  }
}
