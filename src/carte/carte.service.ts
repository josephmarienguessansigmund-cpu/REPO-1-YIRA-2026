import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class CarteService {
  private readonly logger = new Logger(CarteService.name);
  private supabase;
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.get('SUPABASE_URL', ''),
      this.config.get('SUPABASE_SERVICE_KEY', '')
    );
    this.baseUrl = this.config.get('API_URL', 'https://yira-api-production.up.railway.app');
  }

  private genererQRCodeUrl(codeYira: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(codeYira)}`;
  }

  async debugBeneficiaires(): Promise<any> {
    const { data, error } = await this.supabase
      .from('YiraBeneficiaire')
      .select('*')
      .limit(3);
    return { data, error, supabase_url: this.config.get('SUPABASE_URL', 'NON DEFINI') };
  }

  async getProfilPublic(codeYira: string): Promise<any> {
    this.logger.log(`Recherche profil pour: ${codeYira}`);

    const { data: tous } = await this.supabase
      .from('YiraBeneficiaire')
      .select('id, codeYira, nom, prenom')
      .limit(5);

    this.logger.log(`Tous les bénéficiaires: ${JSON.stringify(tous)}`);

    const benef = tous?.find((b: any) => b.codeYira === codeYira);

    if (!benef) {
      this.logger.warn(`Profil ${codeYira} non trouvé parmi: ${JSON.stringify(tous?.map((b:any) => b.codeYira))}`);
      throw new NotFoundException(`Profil ${codeYira} non trouvé`);
    }

    const { data: carte } = await this.supabase
      .from('YiraCarte')
      .select('*')
      .eq('beneficiaireId', benef.id)
      .maybeSingle();

    return {
      code_yira: benef.codeYira,
      nom: benef.nom,
      prenom: benef.prenom,
      district: benef.district,
      statut_parcours: benef.statutParcours,
      carte_statut: carte?.statut || 'ACTIVE',
      score_global: null,
      profil_riasec: null,
      certifications: [],
      verifie_nohama: false,
      qr_code_url: this.genererQRCodeUrl(codeYira),
      url_verification: `${this.baseUrl}/api/v1/carte/${codeYira}`,
      timestamp: new Date().toISOString(),
    };
  }

  async creerCarte(beneficiaire_id: string): Promise<any> {
    const { data: benef } = await this.supabase
      .from('YiraBeneficiaire')
      .select('*')
      .eq('id', beneficiaire_id)
      .maybeSingle();
    if (!benef) throw new NotFoundException('Beneficiaire non trouve');
    const { data, error } = await this.supabase
      .from('YiraCarte')
      .insert({
        beneficiaireId: beneficiaire_id,
        qrCodeUrl: this.genererQRCodeUrl(benef.codeYira),
        statut: 'ACTIVE',
        certifications: [],
        country_code: benef.country_code || 'CI',
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async activerCarte(id: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('YiraCarte')
      .update({ statut: 'ACTIVE', updatedAt: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async ajouterCertification(id: string, certification: string): Promise<any> {
    const { data: carte } = await this.supabase
      .from('YiraCarte').select('certifications').eq('id', id).maybeSingle();
    if (!carte) throw new NotFoundException('Carte non trouvee');
    const certifications = [...(carte.certifications || []), certification];
    const { data, error } = await this.supabase
      .from('YiraCarte').update({ certifications, updatedAt: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async lierWallet(id: string, wallet_numero: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('YiraCarte')
      .update({ walletNumero: wallet_numero, updatedAt: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  async getStatsCarte(country_code = 'CI'): Promise<any> {
    const { count: total } = await this.supabase
      .from('YiraCarte').select('*', { count: 'exact', head: true }).eq('country_code', country_code);
    return { total_cartes: total || 0 };
  }
}
