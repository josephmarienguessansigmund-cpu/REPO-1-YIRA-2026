import { Injectable, Logger } from '@nestjs/common';
import { Controller, Post, Body, HttpCode, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SmsService } from '../sms/sms.service';

function CON(m: string): string { return `CON ${m}`; }
function END(m: string): string { return `END ${m}`; }

@Injectable()
export class UssdService {
  private readonly logger = new Logger(UssdService.name);
  private supabase: SupabaseClient;
  private sessionCache = new Map<string, any>();

  constructor(private config: ConfigService, private sms: SmsService) {
    this.supabase = createClient(this.config.get('SUPABASE_URL'), this.config.get('SUPABASE_SERVICE_KEY'));
    setInterval(() => {
      const now = new Date();
      for (const [k, s] of this.sessionCache.entries()) {
        if (new Date(s.expires_at) < now) this.sessionCache.delete(k);
      }
    }, 120_000);
  }

  async traiterRequete(req: any): Promise<string> {
    const { sessionId, phoneNumber, text } = req;
    this.logger.log(`USSD: ${phoneNumber} | text="${text}"`);
    const nav = text ? text.split('*') : [];
    try {
      if (!text) return CON('Bienvenue sur YIRA Africa\nVotre avenir commence ici\n\n1. M\'inscrire\n2. Reprendre mon test\n3. Mon profil\n0. Quitter');
      const c0 = nav[0];
      if (c0 === '1') return await this.menuInscription(sessionId, phoneNumber, nav);
      if (c0 === '2') return await this.menuReprendre(sessionId, phoneNumber, nav);
      if (c0 === '3') return await this.menuProfil(phoneNumber);
      if (c0 === '0') return END('Merci d\'utiliser YIRA Africa.\nA bientot !');
      return END('Option invalide. Composez a nouveau *7572#');
    } catch (e: any) {
      this.logger.error(`USSD Error: ${e.message}`);
      return END('Service momentanement indisponible.\nReessayez dans quelques minutes.');
    }
  }

  private async menuInscription(sessionId: string, telephone: string, nav: string[]): Promise<string> {
    const n = nav.length;
    if (n === 1) return CON('Inscription YIRA\n\nEntrez votre PRENOM :');
    if (n === 2) return nav[1]?.length < 2 ? CON('Prenom invalide.\nEntrez votre PRENOM :') : CON(`Bonjour ${nav[1]} !\n\nEntrez votre NOM de famille :`);
    if (n === 3) return CON('Votre niveau d\'etudes :\n\n1. Sans diplome / CEPE\n2. BEPC / CAP\n3. BAC\n4. BTS / Licence et plus');
    if (n === 4) {
      if (!['1','2','3','4'].includes(nav[3])) return CON('Choix invalide.\n\n1. CEPE\n2. BEPC/CAP\n3. BAC\n4. BTS/Licence+');
      return CON('Votre district :\n\n1. Abidjan\n2. Bouake\n3. Yamoussoukro\n4. San-Pedro\n5. Daloa\n6. Autre');
    }
    if (n === 5) {
      const niveaux: any = { '1': { label: 'CEPE', eval: 'N1' }, '2': { label: 'BEPC', eval: 'N1' }, '3': { label: 'BAC', eval: 'N2' }, '4': { label: 'BTS', eval: 'N3' } };
      const districts: any = { '1': 'Abidjan', '2': 'Bouake', '3': 'Yamoussoukro', '4': 'San-Pedro', '5': 'Daloa', '6': 'Autre' };
      const niveau = niveaux[nav[3]]; const district = districts[nav[4]];
      if (!niveau || !district) return END('Erreur de saisie. Recommencez avec *7572#');
      const codeYira = `Y-CI-${district.substring(0,3).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(100000+Math.random()*900000)}`;
      try {
        await this.supabase.from('YiraBeneficiaire').insert({
          id: crypto.randomUUID(), prenom: nav[1], nom: nav[2], telephone, district,
          niveau_etude: niveau.label.toLowerCase(), country_code: 'CI', code_yira: codeYira,
          statut_parcours: 'INSCRIT', type_profile: 'jeune', canal_inscription: 'ussd',
          consentement_rgpd: false, updated_at: new Date().toISOString()
        });
        this.sessionCache.set(sessionId, { data: { code_yira: codeYira, niveau_eval: niveau.eval, prenom: nav[1] }, expires_at: new Date(Date.now() + 180_000).toISOString() });
        this.sms.envoyer(telephone, 'S1_BIENVENUE', { prenom: nav[1] }).catch(() => {});
        this.sms.envoyer(telephone, 'S2_CODE_YIRA', { code_yira: codeYira }).catch(() => {});
        return CON(`Inscription reussie !\n\nVotre code YIRA :\n${codeYira}\n\n1. Commencer mon test\n2. Quitter (code envoye par SMS)`);
      } catch (e: any) {
        if (e.message?.includes('duplicate')) return END('Ce numero est deja inscrit.\nComposez *7572# > Reprendre');
        return END('Erreur inscription. Reessayez dans 5 min.');
      }
    }
    if (n === 6 && nav[5] === '2') return END('A bientot sur YIRA !\nVotre code a ete envoye par SMS.');
    return CON('Test bientot disponible.\nSuivez vos SMS pour la suite.');
  }

  private async menuReprendre(sessionId: string, telephone: string, nav: string[]): Promise<string> {
    if (nav.length === 1) return CON('Entrez votre code YIRA :\n(ex: Y-CI-ABJ-2026-123456)');
    const { data } = await this.supabase.from('YiraBeneficiaire').select('prenom,niveau_etude').eq('code_yira', nav[1].toUpperCase()).single();
    if (!data) return CON('Code YIRA invalide.\nVerifiez et reessayez :\n\nEntrez votre code YIRA :');
    return CON(`Bonjour ${data.prenom} !\n\n1. Demarrer une evaluation\n2. Quitter`);
  }

  private async menuProfil(telephone: string): Promise<string> {
    const { data } = await this.supabase.from('YiraBeneficiaire').select('prenom,nom,code_yira,statut_parcours').eq('telephone', telephone).single();
    if (!data) return END('Aucun profil trouve.\nInscrivez-vous avec *7572#');
    return END(`Mon profil YIRA\n\nNom: ${data.prenom} ${data.nom}\nCode: ${data.code_yira}\nStatut: ${data.statut_parcours}`);
  }
}

@Controller('ussd')
export class UssdController {
  constructor(private readonly ussdService: UssdService) {}

  @Post()
  @HttpCode(200)
  async handle(@Body() body: any, @Res() res: Response) {
    const rep = await this.ussdService.traiterRequete({ sessionId: body.sessionId, phoneNumber: body.phoneNumber, networkCode: body.networkCode, serviceCode: body.serviceCode, text: body.text || '' });
    res.set('Content-Type', 'text/plain');
    res.send(rep);
  }
}
