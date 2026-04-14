import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SmsService } from '../sms/sms.service';

function CON(m: string) { return `CON ${m}`; }
function END(m: string) { return `END ${m}`; }

@Injectable()
export class UssdService {
  private readonly logger = new Logger(UssdService.name);
  private sb: SupabaseClient;
  private cache = new Map<string, any>();

  constructor(private cfg: ConfigService, private sms: SmsService) {
    this.sb = createClient(this.cfg.get('SUPABASE_URL'), this.cfg.get('SUPABASE_SERVICE_KEY'));
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) if (v.exp < now) this.cache.delete(k);
    }, 120_000);
  }

  async handle(req: { sessionId: string; phoneNumber: string; text: string }): Promise<string> {
    const { sessionId, phoneNumber, text } = req;
    const nav = text ? text.split('*') : [];
    try {
      if (!text) return CON('Bienvenue sur YIRA Africa\nVotre avenir commence ici\n\n1. M\'inscrire\n2. Reprendre mon test\n3. Mon profil\n0. Quitter');
      const c = nav[0];
      if (c === '1') return this.inscription(sessionId, phoneNumber, nav);
      if (c === '2') return this.reprendre(phoneNumber, nav);
      if (c === '3') return this.profil(phoneNumber);
      if (c === '0') return END('Merci d\'utiliser YIRA Africa. A bientot!');
      return END('Option invalide. Composez *7572#');
    } catch (e: any) {
      this.logger.error(`USSD: ${e.message}`);
      return END('Service indisponible. Reessayez dans 5 min.');
    }
  }

  private async inscription(sid: string, tel: string, nav: string[]): Promise<string> {
    const n = nav.length;
    if (n === 1) return CON('Inscription YIRA\n\nEntrez votre PRENOM :');
    if (n === 2) return nav[1]?.length < 2 ? CON('Prenom invalide.\nEntrez votre PRENOM :') : CON(`Bonjour ${nav[1]} !\n\nEntrez votre NOM :`);
    if (n === 3) return CON('Niveau d\'etudes :\n\n1. Sans diplome/CEPE\n2. BEPC/CAP\n3. BAC\n4. BTS/Licence+');
    if (n === 4) {
      if (!['1','2','3','4'].includes(nav[3])) return CON('Choix invalide.\n\n1.CEPE 2.BEPC 3.BAC 4.BTS');
      return CON('Votre district :\n\n1.Abidjan 2.Bouake\n3.Yamoussoukro 4.San-Pedro\n5.Daloa 6.Autre');
    }
    if (n === 5) {
      const niv: any = {'1':'CEPE','2':'BEPC','3':'BAC','4':'BTS'};
      const dis: any = {'1':'Abidjan','2':'Bouake','3':'Yamoussoukro','4':'San-Pedro','5':'Daloa','6':'Autre'};
      const district = dis[nav[4]]; const niveau = niv[nav[3]];
      if (!district || !niveau) return END('Erreur saisie. Recommencez *7572#');
      const pfx: any = {'Abidjan':'ABJ','Bouake':'BKE','Yamoussoukro':'YMK','San-Pedro':'SNP','Daloa':'DLA','Autre':'AUT'};
      const code = `Y-CI-${pfx[district]}-${new Date().getFullYear()}-${Math.floor(100000+Math.random()*900000)}`;
      try {
        await this.sb.from('YiraBeneficiaire').insert({
          id: crypto.randomUUID(), prenom: nav[1], nom: nav[2], telephone: tel,
          district, niveau_etude: niveau.toLowerCase(), country_code: 'CI', code_yira: code,
          statut_parcours: 'INSCRIT', type_profile: 'jeune', canal_inscription: 'ussd',
          consentement_rgpd: false, updated_at: new Date().toISOString(),
        });
        this.cache.set(sid, { code, prenom: nav[1], exp: Date.now() + 180_000 });
        this.sms.envoyer(tel, 'S1_BIENVENUE', { prenom: nav[1] }).catch(() => {});
        this.sms.envoyer(tel, 'S2_CODE_YIRA', { code_yira: code }).catch(() => {});
        return CON(`Inscription OK!\nCode YIRA: ${code}\n\n1. Commencer test\n2. Quitter (SMS envoye)`);
      } catch (e: any) {
        if (e.message?.includes('duplicate')) return END('Numero deja inscrit.\n*7572# > Reprendre');
        return END('Erreur. Reessayez dans 5 min.');
      }
    }
    if (n === 6 && nav[5] === '2') return END('A bientot! Code envoye par SMS.\nRecomposez *7572#');
    return END('Merci. Suivez vos SMS pour la suite.');
  }

  private async reprendre(tel: string, nav: string[]): Promise<string> {
    if (nav.length === 1) return CON('Entrez votre code YIRA:\n(ex: Y-CI-ABJ-2026-123456)');
    const { data } = await this.sb.from('YiraBeneficiaire').select('prenom').eq('code_yira', nav[1].toUpperCase()).single();
    if (!data) return CON('Code invalide. Reessayez:\n\nEntrez votre code YIRA:');
    return CON(`Bonjour ${data.prenom} !\n\n1. Nouvelle evaluation\n2. Quitter`);
  }

  private async profil(tel: string): Promise<string> {
    const { data } = await this.sb.from('YiraBeneficiaire').select('prenom,nom,code_yira,statut_parcours').eq('telephone', tel).single();
    if (!data) return END('Aucun profil.\nInscrivez-vous: *7572#');
    return END(`Profil YIRA\n\n${data.prenom} ${data.nom}\nCode: ${data.code_yira}\nStatut: ${data.statut_parcours}`);
  }
}
