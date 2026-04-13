$ussd = @'
import { Injectable, Logger } from '@nestjs/common';
import { Controller, Post, Body, HttpCode, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

function CON(m: string): string { return `CON ${m}`; }
function END(m: string): string { return `END ${m}`; }

@Injectable()
export class UssdService {
  private readonly logger = new Logger(UssdService.name);
  private supabase: SupabaseClient;
  private sessionCache = new Map<string, any>();

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.get('SUPABASE_URL'),
      this.config.get('SUPABASE_SERVICE_KEY'),
    );
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
      if (!['1','2','3','4'].includes(nav[3])) return CON('Choix invalide.\n\n1. Sans diplome/CEPE\n2. BEPC/CAP\n3. BAC\n4. BTS/Licence+');
      return CON('Votre district :\n\n1. Abidjan\n2. Bouake\n3. Yamoussoukro\n4. San-Pedro\n5. Daloa\n6. Autre');
    }
    if (n === 5) {
      const niveaux: any = { '1': { label: 'CEPE', eval: 'N1' }, '2': { label: 'BEPC', eval: 'N1' }, '3': { label: 'BAC', eval: 'N2' }, '4': { label: 'BTS', eval: 'N3' } };
      const districts: any = { '1': 'Abidjan', '2': 'Bouake', '3': 'Yamoussoukro', '4': 'San-Pedro', '5': 'Daloa', '6': 'Autre' };
      const niveau = niveaux[nav[3]]; const district = districts[nav[4]];
      if (!niveau || !district) return END('Erreur de saisie. Recommencez avec *7572#');
      const codeYira = this.genererCode(district);
      try {
        await this.supabase.from('YiraBeneficiaire').insert({ id: crypto.randomUUID(), prenom: this.cap(nav[1]), nom: this.cap(nav[2]), telephone, district, niveau_etude: niveau.label.toLowerCase(), country_code: 'CI', code_yira: codeYira, statut_parcours: 'INSCRIT', type_profile: 'jeune', canal_inscription: 'ussd', consentement_rgpd: false, updated_at: new Date().toISOString() });
        this.sessionCache.set(sessionId, { data: { code_yira: codeYira, niveau_eval: niveau.eval, prenom: nav[1] }, expires_at: new Date(Date.now() + 180_000).toISOString() });
        this.envoyerSMS(telephone, `YIRA: Bienvenue ${this.cap(nav[1])}! Votre code: ${codeYira}. Composez *7572# pour votre test. yira-ci.com`).catch(() => {});
        return CON(`Inscription reussie !\n\nVotre code YIRA :\n${codeYira}\n\n1. Commencer mon test maintenant\n2. Quitter (code envoye par SMS)`);
      } catch (e: any) {
        if (e.message?.includes('duplicate')) return END('Ce numero est deja inscrit.\nComposez *7572# > Reprendre mon test');
        return END('Erreur inscription. Reessayez dans 5 min.');
      }
    }
    if (n === 6) {
      if (nav[5] === '2') return END('A bientot sur YIRA !\nVotre code a ete envoye par SMS.\nRecomposez *7572# pour continuer.');
      const s = this.sessionCache.get(sessionId);
      if (s) return await this.demarrerEval(sessionId, telephone, s.data.code_yira, s.data.niveau_eval);
    }
    return this.afficherQuestion(sessionId);
  }

  private async menuReprendre(sessionId: string, telephone: string, nav: string[]): Promise<string> {
    if (nav.length === 1) return CON('Entrez votre code YIRA :\n(ex: Y-CI-ABJ-2026-123456)');
    const { data } = await this.supabase.from('YiraBeneficiaire').select('prenom,niveau_etude').eq('code_yira', nav[1].toUpperCase()).single();
    if (!data) return CON('Code YIRA invalide.\nVerifiez et reessayez :\n\nEntrez votre code YIRA :');
    const niv = data.niveau_etude?.includes('bts') ? 'N3' : data.niveau_etude?.includes('bac') ? 'N2' : 'N1';
    return CON(`Bonjour ${data.prenom} !\n\n1. Demarrer une nouvelle evaluation\n2. Quitter`);
  }

  private async menuProfil(telephone: string): Promise<string> {
    const { data } = await this.supabase.from('YiraBeneficiaire').select('prenom,nom,code_yira,statut_parcours').eq('telephone', telephone).single();
    if (!data) return END('Aucun profil trouve.\nInscrivez-vous avec *7572#');
    const { data: r } = await this.supabase.from('yira_evaluation').select('score_global,profil_riasec,filiere_recommandee').eq('code_yira', data.code_yira).eq('statut', 'termine').order('created_at', { ascending: false }).limit(1).single();
    let msg = `Mon profil YIRA\n\nNom: ${data.prenom} ${data.nom}\nCode: ${data.code_yira}\nStatut: ${data.statut_parcours}`;
    if (r) msg += `\n\nDernier test:\nScore: ${r.score_global}/100\nProfil: ${r.profil_riasec}\nFiliere: ${r.filiere_recommandee}`;
    return END(msg.substring(0, 182));
  }

  private async demarrerEval(sessionId: string, telephone: string, codeYira: string, niveauEval: string): Promise<string> {
    const questions = [
      { id: 101, texte: "Tu aimes apprendre des choses nouvelles ?" },
      { id: 111, texte: "Tu finis ce que tu commences meme si c'est dur ?" },
      { id: 121, texte: "Tu te sens bien quand tu es entouré de gens ?" },
      { id: 131, texte: "Tu aides les autres sans qu'on te le demande ?" },
      { id: 141, texte: "Tu restes calme quand les choses vont mal ?" },
      { id: 201, texte: "Tu connais bien tes forces et faiblesses ?" },
      { id: 211, texte: "Tu peux controler ta colere dans les moments durs ?" },
      { id: 221, texte: "Tu comprends ce que les autres ressentent ?" },
      { id: 301, texte: "Tu aimes travailler avec tes mains et construire ?" },
      { id: 331, texte: "Tu aimes aider, soigner ou enseigner les autres ?" },
    ];
    const assessmentId = Math.floor(Date.now() / 1000);
    await this.supabase.from('yira_evaluation').insert({ assessment_id: assessmentId, code_yira: codeYira, niveau: niveauEval, parcours: 'professionnel', statut: 'en_cours', canal: 'ussd', tenant_id: 'CI' });
    this.sessionCache.set(sessionId, { data: { code_yira: codeYira, assessment_id: assessmentId, questions, index: 0, reponses: [] }, expires_at: new Date(Date.now() + 1_800_000).toISOString() });
    return this.afficherQuestion(sessionId);
  }

  private afficherQuestion(sessionId: string): string {
    const s = this.sessionCache.get(sessionId);
    if (!s) return END('Session expiree. Recommencez avec *7572#');
    const { questions, index } = s.data;
    if (index >= questions.length) return END('Toutes les questions ont ete repondues.');
    const q = questions[index];
    return CON(`Q${index+1}/${questions.length}: ${q.texte.substring(0,80)}\n\n1. Oui completement\n2. Plutot oui\n3. Un peu\n4. Plutot non\n5. Non pas du tout`);
  }

  private genererCode(district: string): string {
    const c: any = { 'Abidjan':'ABJ','Bouake':'BKE','Yamoussoukro':'YMK','San-Pedro':'SNP','Daloa':'DLA','Autre':'AUT' };
    return `Y-CI-${c[district]||'AUT'}-${new Date().getFullYear()}-${Math.floor(100000+Math.random()*900000)}`;
  }

  private cap(s: string): string { return s?.charAt(0).toUpperCase() + s?.slice(1).toLowerCase(); }

  private async envoyerSMS(tel: string, msg: string): Promise<void> {
    const key = this.config.get('AT_API_KEY'); const user = this.config.get('AT_USERNAME');
    if (!key || !user) { this.logger.warn(`[SMS] ${tel}: ${msg}`); return; }
    const body = new URLSearchParams({ username: user, to: tel, message: msg.substring(0,160), from: this.config.get('AT_SENDER_ID','YIRA-CI') });
    await fetch('https://api.africastalking.com/version1/messaging', { method: 'POST', headers: { apiKey: key, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: body.toString() });
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
'@

[System.IO.File]::WriteAllText("$PWD\src\ussd\ussd.service.ts", $ussd, [System.Text.Encoding]::UTF8)
Write-Host "ussd.service.ts OK"