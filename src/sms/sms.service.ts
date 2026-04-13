$sms = @'
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
    S3_TEST_COMMENCE: d => `YIRA: Test SigmundTest demarre pour ${d.prenom}. ${d.nb_questions} questions. Duree: ${d.duree_min} min.`,
    S4_TEST_TERMINE: d => `YIRA: Test termine ${d.prenom}! Score: ${d.score}/100. Profil: ${d.profil_riasec}. Rapport: yira-ci.com`,
    S5_RESULTAT: d => `YIRA Filiere ${d.filiere}: ${d.prenom}, oriente(e) vers ${d.famille_metier}. Delai: ${d.delai}. Conseiller: ${d.conseiller_tel}`,
    S6_AFFECTATION: d => `YIRA: ${d.prenom}, affecte(e) a ${d.etablissement}. Debut: ${d.date_debut}. Tel: ${d.tel_etab}`,
    S7_DEBUT_FORMATION: d => `YIRA: Rappel! Formation DEMAIN a ${d.heure} chez ${d.etablissement}. Apportez votre piece d'identite.`,
    S8_CERTIFICATION: d => `YIRA FELICITATIONS ${d.prenom}! Vous avez obtenu votre ${d.certification} le ${d.date}. yira-ci.com/carte`,
    S9_OFFRE_EMPLOI: d => `YIRA Emploi: ${d.prenom}, ${d.employeur} recherche ${d.poste}. Salaire: ${d.salaire} FCFA. Postulez: *7572# option 4`,
    S10_ENTRETIEN: d => `YIRA: Entretien DEMAIN ${d.heure} chez ${d.employeur}. Adresse: ${d.adresse}. Bon courage ${d.prenom}!`,
    S11_SUIVI: d => `YIRA Suivi J+${d.jours}: Bonjour ${d.prenom}! Etes-vous toujours en poste chez ${d.employeur}? Repondez OUI ou NON au ${d.tel}`,
  };

  async envoyer(telephone: string, type: string, data: any): Promise<boolean> {
    const fn = this.templates[type];
    if (!fn) { this.logger.warn(`Template SMS inconnu: ${type}`); return false; }
    return this.envoyerBrut(telephone, fn(data));
  }

  async envoyerBulk(nums: string[], type: string, data: any): Promise<{total:number;succes:number;echecs:number}> {
    const fn = this.templates[type]; if (!fn) return {total:nums.length,succes:0,echecs:nums.length};
    const message = fn(data);
    const batch = nums.slice(0,100).join(',');
    try {
      const r = await this.appelAT(batch, message);
      const recs = r?.SMSMessageData?.Recipients || [];
      const s = recs.filter((x:any)=>x.status==='Success').length;
      return {total:nums.length,succes:s,echecs:nums.length-s};
    } catch { return {total:nums.length,succes:0,echecs:nums.length}; }
  }

  async envoyerBrut(telephone: string, message: string): Promise<boolean> {
    const key = this.config.get('AT_API_KEY'); const user = this.config.get('AT_USERNAME');
    if (!key || !user) { this.logger.warn(`[SMS SIMULE] ${telephone}: ${message.substring(0,60)}`); return true; }
    try {
      const r = await this.appelAT(telephone, message);
      const ok = r?.SMSMessageData?.Recipients?.[0]?.status === 'Success';
      this.logger.log(`SMS ${ok?'OK':'FAIL'} → ${telephone.slice(-4)}`);
      return ok;
    } catch (e:any) { this.logger.error(`SMS error: ${e.message}`); return false; }
  }

  private async appelAT(to: string, message: string): Promise<any> {
    const body = new URLSearchParams({ username: this.config.get('AT_USERNAME'), to, message: message.substring(0,160), from: this.config.get('AT_SENDER_ID','YIRA-CI') });
    const r = await fetch('https://api.africastalking.com/version1/messaging', { method:'POST', headers:{ apiKey:this.config.get('AT_API_KEY'), 'Content-Type':'application/x-www-form-urlencoded', Accept:'application/json' }, body:body.toString() });
    if (!r.ok) throw new Error(`AT API ${r.status}`);
    return r.json();
  }
}

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}
  @Post('test') @HttpCode(200)
  async test(@Body() b: any) { return { succes: await this.smsService.envoyerBrut(b.telephone, b.message) }; }
  @Post('envoyer') @HttpCode(200)
  async envoyer(@Body() b: any) { return { succes: await this.smsService.envoyer(b.telephone, b.type, b.data) }; }
  @Post('inscription') @HttpCode(200)
  async inscription(@Body() b: any) {
    const [s1,s2] = await Promise.all([
      this.smsService.envoyer(b.telephone,'S1_BIENVENUE',{prenom:b.prenom}),
      this.smsService.envoyer(b.telephone,'S2_CODE_YIRA',{code_yira:b.code_yira}),
    ]);
    return {s1,s2};
  }
}
'@

[System.IO.File]::WriteAllText("$PWD\src\sms\sms.service.ts", $sms, [System.Text.Encoding]::UTF8)
Write-Host "sms.service.ts OK"