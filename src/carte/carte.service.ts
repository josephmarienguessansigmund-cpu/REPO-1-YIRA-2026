import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class CarteService {
  private readonly logger = new Logger(CarteService.name);
  private supabase;
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.supabase = createClient(this.config.get('SUPABASE_URL', ''), this.config.get('SUPABASE_SERVICE_KEY', ''));
    this.baseUrl = this.config.get('API_URL', 'https://yira-api-production.up.railway.app');
  }

  private genererQRCodeUrl(codeYira: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${this.baseUrl}/api/v1/carte/${codeYira}`)}`;
  }

  async getProfilPublic(codeYira: string): Promise<any> {
    try {
      // Chercher le bénéficiaire avec la bonne colonne codeYira
      const { data: benef, error: benefError } = await this.supabase
        .from('YiraBeneficiaire')
        .select('id, "codeYira", nom, prenom, district, "statutParcours", country_code')
        .eq('codeYira', codeYira)
        .single();

      if (benefError || !benef) {
        throw new Error('Profil non trouve: ' + (benefError?.message || 'inconnu'));
      }

      // Chercher la carte
      const { data: carte } = await this.supabase
        .from('YiraCarte')
        .select('*')
        .eq('beneficiaireId', benef.id)
        .single();

      return {
        code_yira: benef.codeYira,
        nom: benef.nom,
        prenom: benef.prenom,
        district: benef.district,
        statut_parcours: benef.statutParcours,
        carte_statut: carte?.statut || 'ACTIVE',
        profil_riasec: null,
        score_global: carte?.scoreGlobal || null,
        certifications: [],
        verifie_nohama: false,
        qr_code_url: this.genererQRCodeUrl(codeYira),
        url_verification: `${this.baseUrl}/api/v1/carte/${codeYira}`,
        timestamp: new Date().toISOString(),
      };
    } catch (e) {
      this.logger.error('Erreur getProfilPublic: ' + e.message);
      throw e;
    }
  }

  async creerCarte(beneficiaire_id: string): Promise<any> {
    const { data: benef } = await this.supabase.from('YiraBeneficiaire').select('*').eq('id', beneficiaire_id).single();
    if (!benef) throw new Error('Beneficiaire non trouve');
    const qrCodeUrl = this.genererQRCodeUrl(benef.codeYira);
    const { data, error } = await this.supabase.from('YiraCarte').insert({
      id: crypto.randomUUID(),
      beneficiaireId: beneficiaire_id,
      qrCodeUrl,
      statut: 'ACTIVE',
      certifications: [],
      country_code: benef.country_code || 'CI',
      updatedAt: new Date(),
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async getStatsCarte(country_code = 'CI'): Promise<any> {
    const { count: total } = await this.supabase.from('YiraCarte').select('*', { count: 'exact', head: true }).eq('country_code', country_code);
    return { total_cartes: total || 0, cartes_actives: total || 0 };
  }
}
