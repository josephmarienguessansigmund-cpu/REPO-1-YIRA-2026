import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private at: any;
  private sms: any;
  private readonly senderId: string;
  private readonly modeSimule: boolean;

  constructor(private config: ConfigService) {
    const apiKey   = this.config.get<string>('AT_API_KEY', '');
    const username = this.config.get<string>('AT_USERNAME', 'sandbox');
    this.senderId  = this.config.get<string>('AT_SENDER_ID', 'YIRA-CI');

    // Si pas de clé → mode simulé (Phase 0)
    this.modeSimule = !apiKey || apiKey === 'SIMULE';

    if (!this.modeSimule) {
      const AfricasTalking = require('africastalking');
      this.at  = AfricasTalking({ apiKey, username });
      this.sms = this.at.SMS;
    }
  }

  // ── Envoi générique ──────────────────────────────────────────
  async envoyer(telephone: string, message: string): Promise<boolean> {
    const tel = this.normaliserTel(telephone);
    if (!tel) { this.logger.warn(`Téléphone invalide: ${telephone}`); return false; }

    if (this.modeSimule) {
      this.logger.log(`[SIMULE] SMS → ${tel}: ${message}`);
      return true;
    }

    try {
      const result = await this.sms.send({
        to: [tel],
        message,
        from: this.senderId,
      });
      this.logger.log(`SMS envoyé → ${tel}: ${JSON.stringify(result)}`);
      return true;
    } catch (e) {
      this.logger.error(`Erreur SMS → ${tel}: ${e.message}`);
      return false;
    }
  }

  // ── SMS prédéfinis YIRA ──────────────────────────────────────

  async envoyerCodeYira(tel: string, prenom: string, codeYira: string) {
    return this.envoyer(tel,
      `YIRA-CI: Bienvenue ${prenom} ! Votre code YIRA est ${codeYira}. Conservez-le precieusement. Commencez votre evaluation sur orientations.yira-ci.com`
    );
  }

  async envoyerOTP(tel: string, otp: string) {
    return this.envoyer(tel,
      `YIRA-CI: Votre code de connexion est ${otp}. Valable 5 minutes. Ne le partagez avec personne.`
    );
  }

  async envoyerSP1Parents(telParent: string, prenomEnfant: string, lienSuivi: string) {
    return this.envoyer(telParent,
      `YIRA-CI: Votre enfant ${prenomEnfant} vient de s'inscrire sur le programme YIRA d'orientation professionnelle. Suivez son parcours: ${lienSuivi}`
    );
  }

  async envoyerSP2Parents(telParent: string, prenomEnfant: string) {
    return this.envoyer(telParent,
      `YIRA-CI: ${prenomEnfant} a termine son evaluation psychometrique. Repondez OUI pour valider son Plan d'Insertion. Repondez NON pour plus d'infos.`
    );
  }

  async envoyerSP3Formation(telParent: string, prenomEnfant: string, nomEtab: string) {
    return this.envoyer(telParent,
      `YIRA-CI: ${prenomEnfant} commence sa formation a ${nomEtab}. Planning disponible sur votre lien de suivi. Merci de votre confiance.`
    );
  }

  async envoyerSP4Inactivite(telParent: string, prenomEnfant: string) {
    return this.envoyer(telParent,
      `YIRA-CI: ${prenomEnfant} n'a pas participe depuis 5 jours. Votre soutien et vos encouragements sont precieux pour sa reussite.`
    );
  }

  async envoyerSP5Insertion(telParent: string, prenomEnfant: string, poste: string, entreprise: string) {
    return this.envoyer(telParent,
      `YIRA-CI: Felicitations ! ${prenomEnfant} a ete recrute(e) comme ${poste} chez ${entreprise}. Merci de votre confiance en YIRA.`
    );
  }

  async envoyerAlerteConseiller(telConseiller: string, prenomBenef: string, alerte: string) {
    return this.envoyer(telConseiller,
      `YIRA-CI [ALERTE]: ${prenomBenef} - ${alerte}. Veuillez le/la contacter rapidement.`
    );
  }

  async envoyerRappelQuiz(tel: string, prenom: string) {
    return this.envoyer(tel,
      `YIRA-CI: Bonjour ${prenom} ! Le quiz du jour vous attend. Gagnez vos points: orientations.yira-ci.com ou *7572#`
    );
  }

  // ── USSD Réponse courte ──────────────────────────────────────
  async envoyerResultatUSSD(tel: string, prenom: string, profil: string, score: number) {
    return this.envoyer(tel,
      `YIRA-CI: ${prenom}, votre profil RIASEC est ${profil} (score ${score}/100). Votre rapport complet est disponible sur orientations.yira-ci.com`
    );
  }

  // ── Utilitaire ───────────────────────────────────────────────
  private normaliserTel(tel: string): string | null {
    if (!tel) return null;
    let t = tel.replace(/\s/g, '').replace(/^00/, '+');
    if (t.startsWith('0')) t = '+225' + t.slice(1);
    if (!t.startsWith('+')) t = '+225' + t;
    return t.length >= 12 ? t : null;
  }

  // ── Générer OTP ──────────────────────────────────────────────
  genererOTP(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  estModeSimule(): boolean {
    return this.modeSimule;
  }
}
