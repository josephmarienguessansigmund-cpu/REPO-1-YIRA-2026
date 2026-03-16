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
    this.baseUrl = this.config.get('API_URL', 'https://yira.ci');
  }

  private genererQRCodeUrl(code_yira: string): string {
    const url = `${this.baseUrl}/carte/${code_yira}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  }

  async creerCarte(beneficiaire_id: string): Promise<any> {
    const { data: benef } = await this.supabase.from('YiraBeneficiaire').select('*').eq('id', beneficiaire_id).single();
    if (!benef) throw new Error('Beneficiaire non trouve');
    const qr_code_url = this.genererQRCodeUrl(benef.code_yira);
    const { data: existing } = await this.supabase.from('YiraCarte').select('*').eq('beneficiaire_id', beneficiaire_id).single();
    if (existing) {
      const { data, error } = await this.supabase.from('YiraCarte').update({ qr_code_url, updated_at: new Date() }).eq('beneficiaire_id', beneficiaire_id).select().single();
      if (error) throw new Error(error.message); return data;
    }
    const { data, error } = await this.supabase.from('YiraCarte').insert({ beneficiaire_id, qr_code_url, statut: 'INACTIVE', certifications: [], country_code: benef.country_code || 'CI' }).select().single();
    if (error) throw new Error(error.message);
    this.logger.log(`Carte creee pour ${benef.code_yira}`);
    return data;
  }

  async activerCarte(beneficiaire_id: string): Promise<any> {
    const { data, error } = await this.supabase.from('YiraCarte').update({ statut: 'ACTIVE', date_activation: new Date(), updated_at: new Date() }).eq('beneficiaire_id', beneficiaire_id).select().single();
    if (error) throw new Error(error.message); return data;
  }

  async ajouterCertification(beneficiaire_id: string, certification: string): Promise<any> {
    const { data: carte } = await this.supabase.from('YiraCarte').select('certifications').eq('beneficiaire_id', beneficiaire_id).single();
    if (!carte) throw new Error('Carte non trouvee');
    const certifications = [...(carte.certifications || []), certification];
    const { data, error } = await this.supabase.from('YiraCarte').update({ certifications, updated_at: new Date() }).eq('beneficiaire_id', beneficiaire_id).select().single();
    if (error) throw new Error(error.message); return data;
  }

  async getProfilPublic(code_yira: string): Promise<any> {
    const { data: benef } = await this.supabase.from('YiraBeneficiaire').select('id, code_yira, nom, prenom, district, statut_parcours, country_code').eq('code_yira', code_yira).single();
    if (!benef) throw new Error('Profil non trouve');
    const { data: carte } = await this.supabase.from('YiraCarte').select('*').eq('beneficiaire_id', benef.id).single();
    const { data: evals } = await this.supabase.from('YiraEvaluation').select('profil_riasec, score_global, score_aptitudes').eq('beneficiaire_id', benef.id).eq('statut', 'TERMINE').order('created_at', { ascending: false }).limit(1);
    const { data: certifs } = await this.supabase.from('YiraCertification').select('type_certif, niveau, statut').eq('beneficiaire_id', benef.id).eq('statut', 'OBTENU');
    return {
      code_yira: benef.code_yira, nom: benef.nom, prenom: benef.prenom,
      district: benef.district, statut_parcours: benef.statut_parcours,
      carte_statut: carte?.statut || 'INACTIVE', date_activation: carte?.date_activation,
      profil_riasec: evals?.[0]?.profil_riasec || null, score_global: evals?.[0]?.score_global || null,
      certifications: certifs || [], verifie_nohama: carte?.statut === 'ACTIVE',
      url_verification: `${this.baseUrl}/carte/${code_yira}`, timestamp: new Date().toISOString(),
    };
  }

  async lierWallet(beneficiaire_id: string, wallet_numero: string): Promise<any> {
    const { data, error } = await this.supabase.from('YiraCarte').update({ wallet_numero, updated_at: new Date() }).eq('beneficiaire_id', beneficiaire_id).select().single();
    if (error) throw new Error(error.message); return data;
  }

  async getStatsCarte(country_code = 'CI'): Promise<any> {
    const [total, actives, wallet] = await Promise.all([
      this.supabase.from('YiraCarte').select('*', { count: 'exact', head: true }).eq('country_code', country_code),
      this.supabase.from('YiraCarte').select('*', { count: 'exact', head: true }).eq('statut', 'ACTIVE').eq('country_code', country_code),
      this.supabase.from('YiraCarte').select('*', { count: 'exact', head: true }).not('wallet_numero', 'is', null).eq('country_code', country_code),
    ]);
    return { total_cartes: total.count || 0, cartes_actives: actives.count || 0, cartes_avec_wallet: wallet.count || 0 };
  }
}
