import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

@Injectable()
export class SigmundService {
  private readonly logger = new Logger(SigmundService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly productCode: string;
  private readonly langue = 'fr';

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>('SIGMUND_BASE_URL', 'http://www.webservicesigmundtest.sigmundtest.com');
    this.clientId = this.config.get<string>('SIGMUND_CLIENT_ID', '8937-6771-8414-4521');
    this.productCode = this.config.get<string>('SIGMUND_PRODUCT_CODE', '25');
  }

  private async callSoap(endpoint: string, params: string[]): Promise<any> {
    const paramStr = params.map((p) => `"${p}"`).join(',');
    const url = `${this.baseUrl}/${endpoint}(${paramStr})`;
    try {
      const response = await axios.get(url, { timeout: 15000 });
      return await parseStringPromise(response.data, { explicitArray: false, ignoreAttrs: true });
    } catch (err) {
      this.logger.error(`SOAP erreur ${endpoint}: ${err.message}`);
      throw new HttpException(`SigmundTest indisponible: ${err.message}`, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async ouvrirSession(productCode?: string): Promise<{ assessment_id: number }> {
    const code = productCode ?? this.productCode;
    const raw = await this.callSoap('sigmundtest_1_setup_quick_test', [this.clientId, code, this.langue]);
    const data = raw?.sigmund_data2;
    if (!data || data.erreur_bool === 'true') throw new HttpException(`WS1 erreur`, 400);
    const assessment_id = parseInt(Array.isArray(data.value_integer?.int) ? data.value_integer.int[0] : data.value_integer?.int ?? '0', 10);
    return { assessment_id };
  }

  async enregistrerNom(assessment_id: number, prenom: string, nom: string): Promise<boolean> {
    const raw = await this.callSoap('sigmundtest_2_register_name', [this.clientId, String(assessment_id), prenom, nom]);
    return raw?.sigmund_data2?.erreur_bool !== 'true';
  }

  async enregistrerSignaletiques(assessment_id: number, signaletique: any): Promise<void> {
    const mappings = this.mapperSignaletiques(signaletique);
    for (const [signal_no, signal_value] of mappings) {
      await this.callSoap('sigmundtest_3_register_signal_no', [this.clientId, String(assessment_id), String(signal_no), String(signal_value)]);
    }
  }

  async lireQuestionnaire(assessment_id: number): Promise<any> {
    const raw = await this.callSoap('sigmundtest_4_read_question_1_to_x', [this.clientId, String(assessment_id)]);
    const data = raw?.sigmund_data3 ?? raw?.sigmund_data2;
    if (!data || data.erreur_bool === 'true') throw new HttpException(`WS4 erreur`, 400);
    return { nb_question: parseInt(data.nb_question ?? '0', 10), questions: data };
  }

  async soumettreReponses(assessment_id: number, reponses: number[]): Promise<boolean> {
    const raw = await this.callSoap('sigmundtest_4_write_question_1_to_x', [this.clientId, String(assessment_id), reponses.join(',')]);
    const data = raw?.sigmund_data2;
    return data?.string === 'END' || data?.label_string === 'END';
  }

  async genererRapportPDF(assessment_id: number, email: string, nom_fichier: string): Promise<string> {
    const raw = await this.callSoap('sigmundtest_5_assessement2file_v4', [
      this.clientId, String(assessment_id), 'YIRA', 'PDF', '0',
      'sigmundtest.com', 'contact@yira.ci', email,
      'Votre rapport YIRA', 'Evaluation terminee', nom_fichier,
    ]);
    const data = raw?.sigmund_data2;
    if (data?.erreur_bool === 'true') throw new HttpException(`WS5 erreur`, 400);
    return Array.isArray(data?.string) ? data.string[0] : data?.string ?? '';
  }

  async recupererDonnees(assessment_id: number): Promise<any> {
    const raw = await this.callSoap('sigmundtest_6_assessement2data', [this.clientId, this.productCode, String(assessment_id)]);
    return raw?.sigmund_candidat;
  }

  async initialiserEvaluation(params: { prenom: string; nom: string; niveau: string; signaletique: any }): Promise<{ assessment_id: number; questionnaire: any }> {
    const { assessment_id } = await this.ouvrirSession();
    await this.enregistrerNom(assessment_id, params.prenom, params.nom);
    await this.enregistrerSignaletiques(assessment_id, params.signaletique);
    const questionnaire = await this.lireQuestionnaire(assessment_id);
    return { assessment_id, questionnaire };
  }

  private mapperSignaletiques(s: any): [number, number][] {
    return [
      [1, { homme: 1, femme: 2, nsp: 3 }[s.genre] ?? 3],
      [2, this.mapAge(s.date_naissance)],
      [3, this.mapExperience(s.annees_experience ?? 0)],
      [4, { sans: 1, cepe: 2, cap: 3, bepc: 4, bac: 5, bts_licence: 6, master: 8, doctorat: 9 }[s.niveau_etude] ?? 1],
    ];
  }

  private mapAge(date_naissance: Date): number {
    const age = new Date().getFullYear() - new Date(date_naissance).getFullYear();
    if (age < 20) return 1; if (age <= 25) return 2; if (age <= 30) return 3;
    if (age <= 35) return 4; if (age <= 40) return 5; if (age <= 50) return 6; return 7;
  }

  private mapExperience(annees: number): number {
    if (annees === 0) return 1; if (annees === 1) return 2; if (annees <= 3) return 3;
    if (annees <= 5) return 4; if (annees <= 10) return 5; return 6;
  }
}
