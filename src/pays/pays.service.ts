import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// YiraPays — Interface
// =============================================================================
export interface YiraPays {
  code: string;
  nom: string;
  nom_local: string;
  devise: string;
  symbole_devise: string;
  ussd_code: string;
  sms_shortcode: string;
  langue_defaut: string;
  langues_dispo: string[];
  operateurs: string[];
  agregateur_sms: string;
  fuseau_horaire: string;
  cors_origin: string;
  domaine_plateforme: string;
  ministere_tutelle: string;
  certification_cqp: string;
  districts: { code: string; nom: string }[];
  statut: 'actif' | 'pilote' | 'inactif';
  phase: string;
}

// =============================================================================
// PaysService — Chargement dynamique depuis Supabase
// Aucun pays n'est codé en dur
// Pour ajouter un pays : INSERT dans yira_pays dans Supabase
// =============================================================================
@Injectable()
export class PaysService implements OnModuleInit {
  private readonly logger = new Logger(PaysService.name);
  private supabase: SupabaseClient;
  private cache: Map<string, YiraPays> = new Map();
  private dernierChargement: Date | null = null;
  private readonly TTL_MINUTES = 60; // Refresh cache toutes les 60 minutes

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.get<string>('SUPABASE_URL'),
      this.config.get<string>('SUPABASE_SERVICE_KEY'),
    );
  }

  // ---------------------------------------------------------------------------
  // Chargement initial au démarrage du serveur
  // ---------------------------------------------------------------------------
  async onModuleInit() {
    await this.chargerPays();
  }

  // ---------------------------------------------------------------------------
  // Charger tous les pays actifs depuis Supabase
  // ---------------------------------------------------------------------------
  async chargerPays(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('yira_pays')
        .select('*')
        .in('statut', ['actif', 'pilote'])
        .order('code');

      if (error) throw error;

      this.cache.clear();
      for (const pays of data ?? []) {
        this.cache.set(pays.code, pays as YiraPays);
      }

      this.dernierChargement = new Date();
      const codes = Array.from(this.cache.keys()).join(', ');
      this.logger.log(`✅ ${this.cache.size} pays chargés depuis Supabase : ${codes}`);
    } catch (err) {
      this.logger.error(`❌ Erreur chargement pays : ${err.message}`);
      // Si Supabase indisponible au démarrage, charger les pays de secours
      this.chargerPaysFallback();
    }
  }

  // ---------------------------------------------------------------------------
  // Fallback minimal si Supabase indisponible au démarrage
  // Ces données sont uniquement pour éviter un crash — pas des données de prod
  // ---------------------------------------------------------------------------
  private chargerPaysFallback(): void {
    this.logger.warn('⚠️ Chargement fallback pays — Supabase indisponible');
    const fallback: Partial<YiraPays>[] = [
      { code: 'CI', nom: 'Côte d\'Ivoire', devise: 'XOF', statut: 'actif', langue_defaut: 'fr', fuseau_horaire: 'Africa/Abidjan' },
    ];
    for (const p of fallback) {
      this.cache.set(p.code, p as YiraPays);
    }
  }

  // ---------------------------------------------------------------------------
  // Rafraîchir le cache si TTL expiré
  // ---------------------------------------------------------------------------
  private async rafraichirSiNecessaire(): Promise<void> {
    if (!this.dernierChargement) {
      await this.chargerPays();
      return;
    }
    const minutesEcoulees = (Date.now() - this.dernierChargement.getTime()) / 60000;
    if (minutesEcoulees > this.TTL_MINUTES) {
      await this.chargerPays();
    }
  }

  // ---------------------------------------------------------------------------
  // Récupérer un pays par code
  // ---------------------------------------------------------------------------
  async getPays(code: string): Promise<YiraPays | null> {
    await this.rafraichirSiNecessaire();
    return this.cache.get(code.toUpperCase()) ?? null;
  }

  // ---------------------------------------------------------------------------
  // Récupérer tous les pays actifs
  // ---------------------------------------------------------------------------
  async getTousPays(): Promise<YiraPays[]> {
    await this.rafraichirSiNecessaire();
    return Array.from(this.cache.values());
  }

  // ---------------------------------------------------------------------------
  // Récupérer les pays actifs (statut = actif uniquement)
  // ---------------------------------------------------------------------------
  async getPaysActifs(): Promise<YiraPays[]> {
    await this.rafraichirSiNecessaire();
    return Array.from(this.cache.values()).filter(p => p.statut === 'actif');
  }

  // ---------------------------------------------------------------------------
  // Récupérer les codes CORS de tous les pays
  // Utilisé par main.ts pour configurer CORS dynamiquement
  // ---------------------------------------------------------------------------
  async getCorsOrigins(): Promise<(string | RegExp)[]> {
    await this.chargerPays();
    const origins: (string | RegExp)[] = [
      'http://localhost:3000',
      'http://localhost:3001',
      /\.vercel\.app$/,
      /\.railway\.app$/,
      /\.github\.io$/,
    ];
    for (const pays of this.cache.values()) {
      if (pays.cors_origin) {
        origins.push(pays.cors_origin);
        origins.push(`https://www.${pays.cors_origin.replace('https://', '')}`);
      }
    }
    return origins;
  }

  // ---------------------------------------------------------------------------
  // Récupérer les districts d'un pays
  // ---------------------------------------------------------------------------
  async getDistricts(codePays: string): Promise<{ code: string; nom: string }[]> {
    const pays = await this.getPays(codePays);
    return pays?.districts ?? [];
  }

  // ---------------------------------------------------------------------------
  // Vérifier si un code pays est valide
  // ---------------------------------------------------------------------------
  async estPaysValide(code: string): Promise<boolean> {
    const pays = await this.getPays(code);
    return pays !== null;
  }

  // ---------------------------------------------------------------------------
  // Générer un code YIRA pour un pays/district/année
  // Format : Y-[PAYS]-[DISTRICT]-[ANNEE]-[6CHIFFRES]
  // ---------------------------------------------------------------------------
  async genererCodeYira(codePays: string, nomDistrict: string): Promise<string> {
    const pays = await this.getPays(codePays);
    const annee = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);

    let codeDistrict = 'AUT';
    if (pays?.districts) {
      const district = pays.districts.find(
        d => d.nom.toLowerCase().includes(nomDistrict.toLowerCase()) ||
             d.code.toLowerCase() === nomDistrict.toLowerCase()
      );
      if (district) codeDistrict = district.code;
    }

    return `Y-${codePays.toUpperCase()}-${codeDistrict}-${annee}-${random}`;
  }

  // ---------------------------------------------------------------------------
  // Endpoint info pays — pour le frontend
  // ---------------------------------------------------------------------------
  async getInfoPays(code: string) {
    const pays = await this.getPays(code);
    if (!pays) return null;
    return {
      code: pays.code,
      nom: pays.nom,
      devise: pays.devise,
      symbole_devise: pays.symbole_devise,
      langue_defaut: pays.langue_defaut,
      langues_dispo: pays.langues_dispo,
      ussd_code: pays.ussd_code,
      operateurs: pays.operateurs,
      districts: pays.districts,
      certification_cqp: pays.certification_cqp,
      statut: pays.statut,
    };
  }

  // ---------------------------------------------------------------------------
  // Forcer le rechargement du cache (endpoint admin)
  // ---------------------------------------------------------------------------
  async forcerRechargement(): Promise<{ nb_pays: number; codes: string[] }> {
    await this.chargerPays();
    return {
      nb_pays: this.cache.size,
      codes: Array.from(this.cache.keys()),
    };
  }
}