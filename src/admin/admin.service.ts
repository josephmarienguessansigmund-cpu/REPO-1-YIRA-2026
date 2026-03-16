import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private supabase;
  constructor(private config: ConfigService) {
    this.supabase = createClient(this.config.get('SUPABASE_URL', ''), this.config.get('SUPABASE_SERVICE_KEY', ''));
  }

  async listerMetiers(country_code = 'CI') {
    const { data, error } = await this.supabase.from('YiraReferentielMetier').select('*').eq('country_code', country_code).order('secteur');
    if (error) throw new Error(error.message); return data;
  }
  async ajouterMetier(dto: any) {
    const { data, error } = await this.supabase.from('YiraReferentielMetier').insert(dto).select().single();
    if (error) throw new Error(error.message); return data;
  }
  async modifierMetier(id: string, dto: any) {
    const { data, error } = await this.supabase.from('YiraReferentielMetier').update({ ...dto, updated_at: new Date() }).eq('id', id).select().single();
    if (error) throw new Error(error.message); return data;
  }

  async listerFilieres(country_code = 'CI') {
    const { data, error } = await this.supabase.from('YiraReferentielFiliere').select('*').eq('country_code', country_code).order('type_filiere');
    if (error) throw new Error(error.message); return data;
  }
  async ajouterFiliere(dto: any) {
    const { data, error } = await this.supabase.from('YiraReferentielFiliere').insert(dto).select().single();
    if (error) throw new Error(error.message); return data;
  }

  async listerEtablissements(country_code = 'CI', district?: string) {
    let query = this.supabase.from('YiraEtablissement').select('*').eq('country_code', country_code).order('nom');
    if (district) query = query.eq('district', district);
    const { data, error } = await query; if (error) throw new Error(error.message); return data;
  }
  async ajouterEtablissement(dto: any) {
    const { data, error } = await this.supabase.from('YiraEtablissement').insert(dto).select().single();
    if (error) throw new Error(error.message); return data;
  }

  async listerPartenaires(country_code = 'CI', type?: string) {
    let query = this.supabase.from('YiraPartenaire').select('*').eq('country_code', country_code).order('nom');
    if (type) query = query.eq('type_partenaire', type);
    const { data, error } = await query; if (error) throw new Error(error.message); return data;
  }
  async ajouterPartenaire(dto: any) {
    const { data, error } = await this.supabase.from('YiraPartenaire').insert(dto).select().single();
    if (error) throw new Error(error.message); return data;
  }

  async listerFonctionnaires(ministere?: string, country_code = 'CI') {
    let query = this.supabase.from('YiraFonctionnaire').select('*').eq('country_code', country_code).order('nom');
    if (ministere) query = query.eq('ministere', ministere);
    const { data, error } = await query; if (error) throw new Error(error.message); return data;
  }
  async ajouterFonctionnaire(dto: any) {
    const { data, error } = await this.supabase.from('YiraFonctionnaire').insert(dto).select().single();
    if (error) throw new Error(error.message); return data;
  }

  async listerQuiz(country_code = 'CI', categorie?: string) {
    let query = this.supabase.from('YiraQuiz').select('*').eq('country_code', country_code).order('categorie');
    if (categorie) query = query.eq('categorie', categorie);
    const { data, error } = await query; if (error) throw new Error(error.message); return data;
  }
  async ajouterQuiz(dto: any) {
    const { data, error } = await this.supabase.from('YiraQuiz').insert(dto).select().single();
    if (error) throw new Error(error.message); return data;
  }

  async ajouterContenu(dto: any) {
    const { data, error } = await this.supabase.from('YiraContenuDidactique').insert(dto).select().single();
    if (error) throw new Error(error.message); return data;
  }

  async getDashboardStats(country_code = 'CI') {
    const [b, e, c, i, p, o] = await Promise.all([
      this.supabase.from('YiraBeneficiaire').select('*', { count: 'exact', head: true }).eq('country_code', country_code),
      this.supabase.from('YiraEvaluation').select('*', { count: 'exact', head: true }).eq('country_code', country_code),
      this.supabase.from('YiraCertification').select('*', { count: 'exact', head: true }).eq('country_code', country_code),
      this.supabase.from('YiraInsertion').select('*', { count: 'exact', head: true }).eq('country_code', country_code),
      this.supabase.from('YiraPartenaire').select('*', { count: 'exact', head: true }).eq('country_code', country_code),
      this.supabase.from('YiraOffreEmploi').select('*', { count: 'exact', head: true }).eq('country_code', country_code),
    ]);
    return { country_code, timestamp: new Date().toISOString(), kpis: { nb_beneficiaires: b.count || 0, nb_evaluations: e.count || 0, nb_certifications: c.count || 0, nb_insertions: i.count || 0, nb_partenaires: p.count || 0, nb_offres: o.count || 0 } };
  }
}
