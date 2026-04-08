import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { SmsService } from '../sms/sms.service';

// Sessions USSD en mémoire (Redis en Phase 1)
const SESSIONS: Map<string, any> = new Map();

@Controller('ussd')
export class UssdController {
  constructor(private sms: SmsService) {}

  @Post()
  async handleUSSD(
    @Body() body: { sessionId: string; serviceCode: string; phoneNumber: string; text: string },
    @Res() res: Response,
  ) {
    const { sessionId, phoneNumber, text } = body;
    const inputs = text.split('*');
    const etape  = inputs.length;
    const dernier = inputs[inputs.length - 1];

    let reponse = '';
    let continuer = true;

    // ── MENU PRINCIPAL ──────────────────────────────────────
    if (text === '') {
      reponse =
        'CON Bienvenue sur YIRA CI\n' +
        '1. M\'inscrire gratuitement\n' +
        '2. Acceder a mon espace\n' +
        '3. Quiz du jour (+points)\n' +
        '4. Mes resultats\n' +
        '5. Contacter mon conseiller';

    // ── INSCRIPTION ─────────────────────────────────────────
    } else if (inputs[0] === '1') {
      if (etape === 1) {
        reponse = 'CON Inscription YIRA\nEntrez votre prenom:';
      } else if (etape === 2) {
        SESSIONS.set(sessionId, { prenom: dernier, etape: 'nom' });
        reponse = 'CON Entrez votre nom de famille:';
      } else if (etape === 3) {
        const s = SESSIONS.get(sessionId) || {};
        s.nom = dernier;
        SESSIONS.set(sessionId, s);
        reponse = 'CON Niveau d\'etudes:\n1. Sans diplome\n2. CEPE\n3. BEPC\n4. BAC\n5. BTS/Licence';
      } else if (etape === 4) {
        const s = SESSIONS.get(sessionId) || {};
        const niveaux = ['', 'sans', 'cepe', 'bepc', 'bac', 'bts_licence'];
        s.niveau = niveaux[parseInt(dernier)] || 'bepc';
        SESSIONS.set(sessionId, s);
        reponse = 'CON District:\n1. Abidjan\n2. Bouake\n3. Yamoussoukro\n4. San-Pedro\n5. Autre';
      } else if (etape === 5) {
        const s = SESSIONS.get(sessionId) || {};
        const districts = ['', 'Abidjan', 'Bouake', 'Yamoussoukro', 'San-Pedro', 'Autre'];
        s.district = districts[parseInt(dernier)] || 'Abidjan';
        s.telephone = phoneNumber;

        // Générer code YIRA
        const code = 'YIR-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
        s.codeYira = code;
        SESSIONS.set(sessionId, s);

        // Envoyer SMS confirmation
        await this.sms.envoyerCodeYira(phoneNumber, s.prenom, code);

        reponse = 'END Inscription reussie !\nBonjour ' + s.prenom + ' !\nCode YIRA: ' + code + '\nSMS envoye. Accedez a:\norientations.yira-ci.com';
        continuer = false;
      }

    // ── CONNEXION ────────────────────────────────────────────
    } else if (inputs[0] === '2') {
      if (etape === 1) {
        reponse = 'CON Entrez votre code YIRA\n(ex: YIR-2026-12345):';
      } else if (etape === 2) {
        const otp = this.sms.genererOTP();
        SESSIONS.set(sessionId, { codeYira: dernier, otp });
        await this.sms.envoyer(phoneNumber, `YIRA-CI: Code connexion: ${otp}. Valable 5 min.`);
        reponse = 'CON Code OTP envoye par SMS.\nEntrez le code:';
      } else if (etape === 3) {
        const s = SESSIONS.get(sessionId) || {};
        if (dernier === s.otp) {
          reponse = 'CON Connexion reussie !\nBonjour !\n\n1. Mon profil\n2. Mon evaluation\n3. Mes resultats\n4. Quitter';
        } else {
          reponse = 'END Code incorrect.\nReessayez ou allez sur:\norientations.yira-ci.com';
          continuer = false;
        }
      }

    // ── QUIZ DU JOUR ─────────────────────────────────────────
    } else if (inputs[0] === '3') {
      if (etape === 1) {
        reponse =
          'CON Quiz YIRA du jour\n' +
          'Que signifie FDFP ?\n' +
          '1. Fonds Dev Formation Prof\n' +
          '2. Fond Dep Formation Pro\n' +
          '3. Fonds Dir Formation Pro\n' +
          '4. Je ne sais pas';
      } else if (etape === 2) {
        if (dernier === '1') {
          reponse = 'END Bravo ! +15 points YIRA\nFDFP = Fonds de Developpement de la Formation Professionnelle.\nVos points sont credites.\norientations.yira-ci.com';
        } else {
          reponse = 'END Dommage ! La bonne reponse:\nFDFP = Fonds de Developpement de la Formation Professionnelle.\nReessayez demain.\n+0 points';
        }
        continuer = false;
      }

    // ── MES RÉSULTATS ────────────────────────────────────────
    } else if (inputs[0] === '4') {
      reponse = 'END Vos resultats YIRA\nProfil: En attente evaluation\nScore: -/100\n\nPassez votre evaluation sur:\norientations.yira-ci.com\nou revenez apres evaluation.';
      continuer = false;

    // ── CONTACTER CONSEILLER ─────────────────────────────────
    } else if (inputs[0] === '5') {
      await this.sms.envoyer(phoneNumber,
        'YIRA-CI: Votre demande de contact a ete transmise a votre conseiller. Il vous contactera dans les 24h.'
      );
      reponse = 'END Demande envoyee !\nVotre conseiller vous contactera sous 24h.\nSMS de confirmation envoye.';
      continuer = false;

    } else {
      reponse = 'END Option invalide.\nComposez *7572# pour recommencer.';
      continuer = false;
    }

    if (!continuer && !reponse.startsWith('END')) {
      reponse = reponse.replace('CON ', 'END ');
    }

    res.set('Content-Type', 'text/plain');
    return res.send(reponse);
  }
}
