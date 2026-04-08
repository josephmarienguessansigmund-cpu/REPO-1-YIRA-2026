import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import {
  IEvaluationProvider,
  EvaluationSession,
  EvaluationResultat,
  EvaluationInitParams,
  EvaluationReponses,
} from './evaluation.interface';

// ─────────────────────────────────────────────────────────────────────────────
// SigmundService — implémente IEvaluationProvider via l'API SOAP SigmundTest
// CLIENT ID : 8937-6771-8414-4521 · Product code : 25 · Langue : fr
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SigmundService implements IEvaluationProvider {
  private readonly logger = new Logger(SigmundService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly productCode: string;
  private readonly langue = 'fr';

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get('SIGMUND_BASE_URL', 'http://www.webservicesigmundtest.sigmundtest.com');
    this.clientId = this.config.get('SIGMUND_CLIENT_ID', '8937-6771-8414-4521');
    this.productCode = this.config.get('SIGMUND_PRODUCT_CODE', '25');
  }

  // ── IEvaluationProvider : initialiserEvaluation ──────────────────────────

  async initialiserEvaluation(params: EvaluationInitParams): Promise<EvaluationSession> {
    const productCode = this.getProductCodeParNiveau(params.niveau);

    // WS1 — Ouvrir session
    const session = await this.ws1_ouvrirSession(productCode);
    const { assessment_id } = session;

    // WS2 — Enregistrer nom
    await this.ws2_enregistrerNom(assessment_id, params.prenom, params.nom);

    // WS3 — Enregistrer signalétiques (mappées auto depuis profil YIRA)
    await this.ws3_enregistrerSignaletiques(assessment_id, params.signaletique);

    // WS4 READ — Récupérer le questionnaire
    const questionnaire = await this.ws4_lireQuestionnaire(assessment_id);

    this.logger.log(`Sigmund session ouverte → assessment_id=${assessment_id} · ${questionnaire.nb_question} questions`);

    return {
      assessment_id,
      provider: 'sigmund',
      nb_questions: questionnaire.nb_question,
      questions: questionnaire.questions,
    };
  }

  // ── IEvaluationProvider : soumettreReponses ───────────────────────────────

  async soumettreReponses(data: EvaluationReponses): Promise<boolean> {
    const repStr = data.reponses.join(',');
    const raw = await this.callSoap('sigmundtest_4_write_question_1_to_x', [
      this.clientId,
      String(data.assessment_id),
      repStr,
    ]);
    const d = raw?.sigmund_data2;
    const isEnd = Array.isArray(d?.string)
      ? d.string.includes('END')
      : d?.string === 'END';
    this.logger.log(`Réponses soumises → assessment ${data.assessment_id} → END: ${isEnd}`);
    return isEnd;
  }

  // ── IEvaluationProvider : recupererResultats ──────────────────────────────

  async recupererResultats(assessment_id: number): Promise<EvaluationResultat> {
    const raw = await this.callSoap('sigmundtest_6_assessement2data', [
      this.clientId,
      this.productCode,
      String(assessment_id),
    ]);
    const data = raw?.sigmund_candidat;
    if (!data || (data.mssg && data.mssg !== 'ok')) {
      throw new HttpException(`WS6 erreur: ${data?.mssg}`, 400);
    }

    const scores: number[] = this.parseIntArray(data.scores?.int);
    const criteres: string[] = this.parseStringArray(data.critere?.string);
    const profil_riasec = criteres[0] ?? '';
    const score_employabilite = scores[0] ?? 0;

    return {
      assessment_id,
      provider: 'sigmund',
      scores,
      profil_riasec,
      score_employabilite,
      criteres,
      pii_genere: false,
    };
  }

  // ── IEvaluationProvider : genererRapport ──────────────────────────────────

  async genererRapport(
    assessment_id: number,
    email_dest: string,
    tenant_id: string,
  ): Promise<string> {
    const nom_fichier = `yira-${tenant_id}-${assessment_id}`;
    const raw = await this.callSoap('sigmundtest_5_assessement2file_v4', [
      this.clientId,
      String(assessment_id),
      'YIRA',
      'PDF',
      '0',
      'sigmundtest.com',
      'contact@yira.ci',
      email_dest,
      'Votre rapport YIRA-SigmundTest',
      'Félicitations ! Votre évaluation est terminée.',
      nom_fichier,
    ]);
    const data = raw?.sigmund_data2;
    if (data?.erreur_bool === 'true') {
      throw new HttpException(`WS5 erreur PDF: ${data.erreur}`, 400);
    }
    return Array.isArray(data?.string) ? data.string[0] : data?.string ?? '';
  }

  // ── Méthodes SOAP internes ────────────────────────────────────────────────

  private async callSoap(endpoint: string, params: string[]): Promise<any> {
    const paramStr = params.map((p) => `"${p}"`).join(',');
    const url = `${this.baseUrl}/${endpoint}(${paramStr})`;
    try {
      const response = await axios.get(url, { timeout: 15000 });
      return parseStringPromise(response.data, { explicitArray: false, ignoreAttrs: true });
    } catch (err) {
      this.logger.error(`SOAP erreur ${endpoint}: ${err.message}`);
      throw new HttpException(`SigmundTest indisponible: ${err.message}`, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private async ws1_ouvrirSession(productCode: string): Promise<{ assessment_id: number }> {
    const raw = await this.callSoap('sigmundtest_1_setup_quick_test', [this.clientId, productCode, this.langue]);
    const data = raw?.sigmund_data2;
    if (!data || data.erreur_bool === 'true') throw new HttpException(`WS1 erreur: ${data?.erreur}`, 400);
    const assessment_id = parseInt(Array.isArray(data.value_integer?.int) ? data.value_integer.int[0] : data.value_integer?.int ?? '0', 10);
    return { assessment_id };
  }

  private async ws2_enregistrerNom(assessment_id: number, prenom: string, nom: string): Promise<void> {
    await this.callSoap('sigmundtest_2_register_name', [this.clientId, String(assessment_id), prenom, nom]);
  }

  private async ws3_enregistrerSignaletiques(assessment_id: number, sig: any): Promise<void> {
    const mappings: [number, number][] = [
      [1, { homme: 1, femme: 2, nsp: 3 }[sig.genre] ?? 3],
      [2, this.mapAge(sig.date_naissance)],
      [3, this.mapExperience(sig.annees_experience)],
      [4, { sans: 1, cepe: 2, cap: 3, bepc: 4, bac: 5, bts_licence: 6, bac4: 7, master: 8, doctorat: 9 }[sig.niveau_etude] ?? 1],
      [5, { litteraire: 1, artistique: 2, sciences_sociales: 3, scientifique: 4, economique: 5, management: 6, technique: 7, sportive: 8, autre: 9 }[sig.type_formation] ?? 9],
      [6, { cadre_dirigeant: 1, ingenieur_cadre: 2, maitrise: 3, technicien: 4, employe: 5, ouvrier: 6, etudiant: 7, autre: 8, neet: 8 }[sig.statut] ?? 8],
    ];
    for (const [no, val] of mappings) {
      await this.callSoap('sigmundtest_3_register_signal_no', [this.clientId, String(assessment_id), String(no), String(val)]);
    }
  }

  private async ws4_lireQuestionnaire(assessment_id: number): Promise<any> {
    const raw = await this.callSoap('sigmundtest_4_read_question_1_to_x', [this.clientId, String(assessment_id)]);
    const data = raw?.sigmund_data3 ?? raw?.sigmund_data2;
    const nb_question = parseInt(data?.nb_question ?? '0', 10);
    const rawQ = Array.isArray(data?.label_question) ? data.label_question : [data?.label_question];
    const questions = Array.from({ length: nb_question }, (_, i) => ({
      label_question: rawQ[i] ?? '',
      r1: (Array.isArray(data?.r1) ? data.r1[i] : data?.r1) ?? '',
      r2: (Array.isArray(data?.r2) ? data.r2[i] : data?.r2) ?? '',
      r3: (Array.isArray(data?.r3) ? data.r3[i] : data?.r3) ?? '',
      r4: (Array.isArray(data?.r4) ? data.r4[i] : data?.r4) ?? '',
      r5: (Array.isArray(data?.r5) ? data.r5[i] : data?.r5) ?? null,
      r6: (Array.isArray(data?.r6) ? data.r6[i] : data?.r6) ?? null,
      nb_reponses: parseInt((Array.isArray(data?.value_nb_rep) ? data.value_nb_rep[i] : data?.value_nb_rep) ?? '4', 10),
    }));
    return { nb_question, questions };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private mapAge(date_naissance: Date): number {
    const age = new Date().getFullYear() - new Date(date_naissance).getFullYear();
    if (age < 20) return 1; if (age <= 25) return 2; if (age <= 30) return 3;
    if (age <= 35) return 4; if (age <= 40) return 5; if (age <= 50) return 6;
    if (age <= 60) return 7; return 8;
  }

  private mapExperience(annees: number): number {
    if (annees === 0) return 1; if (annees === 1) return 2; if (annees <= 3) return 3;
    if (annees <= 5) return 4; if (annees <= 10) return 5; if (annees <= 20) return 6; return 7;
  }

  private getProductCodeParNiveau(niveau: 'N1' | 'N2' | 'N3'): string {
    return this.config.get(`SIGMUND_PRODUCT_CODE_${niveau}`, this.productCode);
  }

  private parseIntArray(val: any): number[] {
    if (!val) return []; if (Array.isArray(val)) return val.map(Number); return [Number(val)];
  }

  private parseStringArray(val: any): string[] {
    if (!val) return []; if (Array.isArray(val)) return val; return [String(val)];
  }
}