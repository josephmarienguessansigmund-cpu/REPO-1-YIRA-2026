import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

const sessions: Record<string, any> = {};

@Injectable()
export class UssdService {
  private readonly logger = new Logger(UssdService.name);
  private supabase;

  constructor(private config: ConfigService) {
    this.supabase = createClient(this.config.get('SUPABASE_URL', ''), this.config.get('SUPABASE_SERVICE_KEY', ''));
  }

  async traiterSession(params: { sessionId: string; serviceCode: string; phoneNumber: string; text: string }): Promise<string> {
    const { sessionId, phoneNumber, text } = params;
    const etapes = text ? text.split('*') : [];
    const session = sessions[sessionId] || { etape: 0, data: {} };

    if (!text || text === '') {
      sessions[sessionId] = { etape: 1, data: {} };
      return `CON Bienvenue sur YIRA CI\nProgramme National Emploi\n\n1. Nouvelle inscription\n2. Reprendre evaluation\n3. Mon profil\n4. Quiz du jour\n5. Aide`;
    }

    if (etapes.length === 1) {
      const choix = etapes[0];
      if (choix === '1') {
        sessions[sessionId] = { etape: 2, data: { flux: 'inscription' } };
        return `CON Etape 1/4 - Inscription YIRA\n\nVotre prenom et nom ?\n(ex: Kouassi Yao)`;
      }
      if (choix === '2') {
        sessions[sessionId] = { etape: 2, data: { flux: 'reprise' } };
        return `CON Reprise evaluation\n\nEntrez votre code YIRA\n(ex: YIR-2026-12345)`;
      }
      if (choix === '3') return this.afficherProfil(phoneNumber);
      if (choix === '4') return this.afficherQuizDuJour();
      if (choix === '5') return `END Aide YIRA CI\n\nEmail: contact@yira.ci\nSite: yira.ci`;
      return `END Option invalide. Composez *7572# pour recommencer.`;
    }

    if (session.data?.flux === 'inscription') return this.traiterInscription(sessionId, etapes, session, phoneNumber);
    if (session.data?.flux === 'reprise') return this.traiterReprise(sessionId, etapes, phoneNumber);
    return `END Session expiree. Composez *7572# pour recommencer.`;
  }

  private async traiterInscription(sessionId: string, etapes: string[], session: any, phoneNumber: string): Promise<string> {
    if (etapes.length === 2) { sessions[sessionId].data.nom_complet = etapes[1]; return `CON Etape 2/4\n\nVotre date de naissance ?\n(ex: 15/04/2003)`; }
    if (etapes.length === 3) { sessions[sessionId].data.date_naissance = etapes[2]; return `CON Etape 3/4 - Niveau d etudes\n\n1. Sans diplome\n2. CEPE\n3. BEPC\n4. BAC\n5. BTS ou Licence`; }
    if (etapes.length === 4) {
      const niveaux: Record<string, string> = { '1': 'sans', '2': 'cepe', '3': 'bepc', '4': 'bac', '5': 'bts_licence' };
      sessions[sessionId].data.niveau_etude = niveaux[etapes[3]] || 'sans';
      return `CON Etape 4/4 - Votre district\n\n1. Abidjan\n2. Yamoussoukro\n3. Bouake\n4. San-Pedro\n5. Korhogo\n6. Autre`;
    }
    if (etapes.length === 5) {
      const districts: Record<string, string> = { '1': 'Abidjan', '2': 'Yamoussoukro', '3': 'Bouake', '4': 'San-Pedro', '5': 'Korhogo', '6': 'Autre' };
      const district = districts[etapes[4]] || 'Abidjan';
      const data = sessions[sessionId].data;
      try {
        const code_yira = `YIR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const nomPrenom = data.nom_complet.split(' ');
        await this.supabase.from('YiraBeneficiaire').insert({
          code_yira, nom: nomPrenom.slice(1).join(' ') || 'Inconnu', prenom: nomPrenom[0] || 'Inconnu',
          telephone: phoneNumber, date_naissance: this.parseDateCI(data.date_naissance),
          genre: 'nsp', niveau_etude: data.niveau_etude, district,
          statut_parcours: 'INSCRIT', consentement_rgpd: true, country_code: 'CI',
        });
        delete sessions[sessionId];
        return `END Inscription confirmee !\n\nBienvenue sur YIRA CI\nVotre code: ${code_yira}\n\nSMS envoye. Composez *7572# pour continuer.`;
      } catch (err) { return `END Erreur inscription. Reessayez avec *7572#`; }
    }
    return `END Session invalide.`;
  }

  private async traiterReprise(sessionId: string, etapes: string[], phoneNumber: string): Promise<string> {
    if (etapes.length === 2) {
      const { data } = await this.supabase.from('YiraBeneficiaire').select('*').eq('code_yira', etapes[1].toUpperCase()).single();
      if (!data) return `END Code YIRA invalide. Verifiez votre SMS et reessayez.`;
      delete sessions[sessionId];
      return `END Profil trouve !\n\nBonjour ${data.prenom} ${data.nom}\nCode: ${data.code_yira}\nStatut: ${data.statut_parcours}\n\nAllez sur yira.ci pour continuer.`;
    }
    return `END Session invalide.`;
  }

  private async afficherProfil(phoneNumber: string): Promise<string> {
    const { data } = await this.supabase.from('YiraBeneficiaire').select('*').eq('telephone', phoneNumber).single();
    if (!data) return `END Aucun profil trouve. Composez *7572# et choisissez 1 pour vous inscrire.`;
    return `END Mon profil YIRA\n\nNom: ${data.prenom} ${data.nom}\nCode: ${data.code_yira}\nDistrict: ${data.district}\nStatut: ${data.statut_parcours}`;
  }

  private async afficherQuizDuJour(): Promise<string> {
    const { data } = await this.supabase.from('YiraQuiz').select('*').eq('actif', true).eq('country_code', 'CI').limit(1).single();
    if (!data) return `END Pas de quiz disponible. Revenez demain !`;
    return `CON Quiz YIRA du jour\n\n${data.question}\n\n1. ${data.choix_a}\n2. ${data.choix_b}\n3. ${data.choix_c}\n4. ${data.choix_d}`;
  }

  private parseDateCI(dateStr: string): string {
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    } catch {}
    return new Date().toISOString().split('T')[0];
  }
}
