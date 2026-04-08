import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

export interface ProfilOrientation {
  beneficiaire_id: string;
  nom: string;
  prenom: string;
  telephone: string;
  riasec_dominant: string;
  niveau_etude: string;
  diplome_entree: string;
  district: string;
  ville: string;
  country_code: string;
  code_yira: string;
}

@Injectable()
export class AffectationService {
  private readonly logger = new Logger(AffectationService.name);
  private readonly supabase;

  private readonly RIASEC_FAMILLES: Record<string, string[]> = {
    R: ['Bâtiment & Construction', 'Technique & Mécanique'],
    I: ['Santé & Social', 'Technologie & Numérique'],
    A: ['Art & Créativité', 'Communication & Médias'],
    S: ['Éducation & Formation', 'Santé & Social'],
    E: ['Commerce & Gestion', 'Management & Leadership'],
    C: ['Comptabilité & Finance', 'Administration & Secrétariat'],
  };

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.get('SUPABASE_URL'),
      this.config.get('SUPABASE_SERVICE_KEY'),
    );
  }

  async affecterBeneficiaire(profil: ProfilOrientation) {
    this.logger.log(`Affectation ? ${profil.prenom} ${profil.nom} · RIASEC: ${profil.riasec_dominant}`);
    const famille = this.getFamilleMetiers(profil.riasec_dominant);
    const etablissements = await this.chercherEtablissements(famille, profil.ville, profil.country_code);
    const scores = this.scorerEtablissements(etablissements, profil, famille);
    const top3 = scores.slice(0, 3);
    let notifications = 0;
    for (const etab of top3) {
      if (etab.etablissement?.partenaire_yira) {
        await this.notifierEtablissement(etab.etablissement, profil);
        notifications++;
      }
    }
    await this.supabase.from('YiraParcours').insert({
      beneficiaire_id: profil.beneficiaire_id,
      filiere: famille,
      niveau: profil.niveau_etude,
      statut: 'EN_ATTENTE',
      country_code: profil.country_code,
    });
    return { etablissements_recommandes: top3, famille_metiers: famille, notifications_envoyees: notifications };
  }

  async chercherEtablissementsPublic(famille: string, country_code: string) {
    const { data } = await this.supabase
      .from('YiraEtablissement')
      .select('*')
      .eq('country_code', country_code)
      .eq('statut', 'ACTIF');
    return data ?? [];
  }

  private getFamilleMetiers(riasec: string): string {
    const dominant = riasec.charAt(0).toUpperCase();
    return this.RIASEC_FAMILLES[dominant]?.[0] ?? 'Commerce & Gestion';
  }

  private async chercherEtablissements(famille: string, ville: string, country_code: string) {
    const { data } = await this.supabase
      .from('YiraEtablissement')
      .select('*')
      .eq('country_code', country_code)
      .eq('statut', 'ACTIF')
      .limit(20);
    return data ?? [];
  }

  private scorerEtablissements(etablissements: any[], profil: ProfilOrientation, famille: string) {
    return etablissements.map(etab => {
      let score = 0;
      if (etab.partenaire_yira) score += 40;
      if (etab.ville?.toLowerCase() === profil.ville?.toLowerCase()) score += 30;
      if (etab.telephone) score += 10;
      return { etablissement: etab, score_compatibilite: Math.min(score, 100), filiere_disponible: famille };
    }).sort((a, b) => b.score_compatibilite - a.score_compatibilite);
  }

  private async notifierEtablissement(etab: any, profil: ProfilOrientation) {
    await this.supabase.from('YiraSmsLog').insert({
      beneficiaire_id: profil.beneficiaire_id,
      type_sms: 'AFFECTATION_ETAB',
      telephone: etab.telephone || 'N/A',
      contenu: `YIRA: Candidat ${profil.code_yira} recommandé pour votre établissement. Contact: nohama@yira.ci`,
      statut: 'EN_ATTENTE',
      country_code: profil.country_code,
    });
  }
}
