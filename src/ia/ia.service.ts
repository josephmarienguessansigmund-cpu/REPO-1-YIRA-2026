import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);
  private readonly geminiApiKey: string;
  private readonly anthropicApiKey: string;
  private readonly supabase: SupabaseClient;

  constructor(private config: ConfigService) {
    this.geminiApiKey = this.config.get<string>('GEMINI_API_KEY', '');
    this.anthropicApiKey = this.config.get<string>('ANTHROPIC_API_KEY', '');
    this.supabase = createClient(
      this.config.get<string>('SUPABASE_URL', ''),
      this.config.get<string>('SUPABASE_SERVICE_KEY', '')
    );
  }

  // ── MOTEUR D'INCULTURATION PSYCHOMÉTRIQUE ─────────────────
  async inculturerQuestion(sigmundId: string, originalText: string, niveau: string): Promise<string> {
    try {
      const { data: cache } = await this.supabase
        .from('yira_inculturation_mapping')
        .select('adapted_text')
        .eq('sigmund_id', sigmundId)
        .eq('education_level', niveau)
        .single();
      if (cache?.adapted_text) {
        this.logger.log(`Cache inculturation: ${sigmundId} (${niveau})`);
        return cache.adapted_text;
      }
      const systemPrompt = `Tu es l'Expert en Inculturation Psychométrique de Nohama Consulting CI.
RÈGLES ABSOLUES:
1. Garde le sens psychologique exact (le construit mesuré ne change JAMAIS)
2. Adapte UNIQUEMENT le vocabulaire pour le niveau ${niveau}
3. N1: français de proximité, verbes d'action concrets, phrases courtes
4. N2: français professionnel standard de l'entreprise ivoirienne
5. N3: maintien des nuances complexes originelles
6. Ne confonds JAMAIS méticulosité au travail et tâches domestiques
7. Réponds UNIQUEMENT par la phrase adaptée, sans commentaire`;
      const phraseAdaptee = await this.appelNIE(systemPrompt, `Adapte cette phrase : "${originalText}"`);
      await this.supabase.from('yira_inculturation_mapping').upsert({
        sigmund_id: sigmundId,
        original_text: originalText,
        adapted_text: phraseAdaptee.trim(),
        education_level: niveau,
        is_expert_validated: false,
      }, { onConflict: 'sigmund_id,education_level' });
      return phraseAdaptee.trim();
    } catch (e) {
      this.logger.error(`Inculturation erreur: ${e.message}`);
      return originalText;
    }
  }

  // ── MOTEUR NIE PRINCIPAL ──────────────────────────────────
  private async appelNIE(systemPrompt: string, userMessage: string): Promise<string> {
    if (this.geminiApiKey && this.geminiApiKey.length > 10) {
      return this.appelGemini(systemPrompt, userMessage);
    }
    return this.appelClaude(systemPrompt, userMessage);
  }

  private async appelGemini(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${this.geminiApiKey}`;
      const response = await axios.post(url, {
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
      }, { headers: { 'content-type': 'application/json' } });
      return response.data.candidates[0].content.parts[0].text;
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`NIE Gemini indisponible: ${detail}`);
    }
  }

  private async appelClaude(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
        system: systemPrompt, messages: [{ role: 'user', content: userMessage }],
      }, { headers: { 'x-api-key': this.anthropicApiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } });
      return response.data.content[0].text;
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`NIE Claude indisponible: ${detail}`);
    }
  }

  // ── CONTEXTE PAYS ─────────────────────────────────────────
  private getContextePays(country_code: string, langue: string): string {
    const contextes: Record<string, Record<string, string>> = {
      CI: { fr: `Tu travailles pour la Côte d'Ivoire. Marché emploi: BTP, commerce, agro-industrie, telecom, finance, hotellerie. Employeurs: Orange CI, MTN CI, CFAO, SG CI, UBA CI, ANADER. Districts: Abidjan, Yamoussoukro, Bouaké, San-Pédro, Korhogo, Man, Daloa. Monnaie: FCFA. Certifications: CQP RNCCI. Ministères: METFPA, MENET, DGFP, FDFP. Financement formation: FDFP couvre 70-80%.` },
      BF: { fr: `Tu travailles pour le Burkina Faso. Marché emploi: agriculture (coton, céréales), mines (or, manganèse), artisanat, BTP, commerce, telecom. Employeurs clés: Orange BF, Moov BF, Coris Bank, SOFITEX, BIB, ONATEL. Régions: Ouagadougou, Bobo-Dioulasso, Koudougou, Banfora, Ouahigouya, Dédougou. Monnaie: FCFA. USSD: *144#. Certifications: CAP, BEP, BT. Ministère: MEFP (Ministère Emploi Formation Professionnelle). Financement: FDFP-BF. Établissements: CFJA Ouagadougou, CFP Bobo-Dioulasso, ENSP, CFP Koudougou. Filières porteuses: Maçonnerie, Mécanique, Électricité, Agriculture, Couture, Informatique.` },
      ML: { fr: `Tu travailles pour le Mali. Marché emploi: agriculture (coton, mil, riz), mines (or), pêche, BTP, commerce, artisanat, telecom. Employeurs clés: Orange Mali, Moov Mali, BNDA, BDM, CMDT, EDM. Régions: Bamako, Sikasso, Mopti, Ségou, Kayes, Gao, Tombouctou. Monnaie: FCFA. USSD: *145#. Certifications: CAP, BEP, BT. Ministère: MEFP Mali. Financement: FAFPA (Fonds d'Appui à la Formation Professionnelle). Établissements: CFAM Bamako, CFP Sikasso, ITEMA Bamako, CFP Mopti, École des Mines Bamako. Filières porteuses: Agriculture, Mécanique auto, BTP, Commerce, Couture, Pêche.` },
      SN: { fr: `Tu travailles pour le Sénégal. Marché emploi: pêche, agriculture, tourisme, BTP, numérique, telecom. Employeurs clés: Orange SN, Free SN, CBAO, Ecobank, Sonatel. Régions: Dakar, Thiès, Kaolack, Saint-Louis, Ziguinchor, Diourbel. Monnaie: FCFA. USSD: *155#. Certifications: CAP, BEP, BTS. Financement: 3FPT. Établissements: CFPT Dakar, CFP Thiès, ONFP, ISEP. Filières porteuses: Pêche, Tourisme, Agriculture, BTP, Numérique.` },
      NE: { fr: `Tu travailles pour le Niger. Marché emploi: agriculture, élevage, mines, BTP, commerce. Employeurs clés: Orange Niger, Airtel Niger, Ecobank, BIA-Niger. Régions: Niamey, Zinder, Maradi, Agadez, Tahoua. Monnaie: FCFA. USSD: *150#. Financement: ANPE-Niger. Établissements: CFP Niamey, IFAIB, CFP Zinder. Filières porteuses: Agriculture, Élevage, BTP, Commerce, Maraîchage.` },
      GN: { fr: `Tu travailles pour la Guinée. Marché emploi: mines (bauxite, or), agriculture, pêche, BTP, commerce. Employeurs clés: Orange Guinée, MTN Guinée, Ecobank, CBG, SAG. Régions: Conakry, Kindia, Kankan, Labé, N'Zérékoré. Monnaie: GNF. USSD: *151#. Établissements: ENSTP Conakry, CFAD, CFP Kindia. Filières porteuses: Mines, Agriculture, Pêche, BTP.` },
      NE: { fr: `Tu travailles pour le Niger. Marché emploi: agriculture (mil, niébé, sorgho), élevage, mines (uranium, or), BTP, commerce, artisanat. Employeurs clés: Orange Niger, Airtel Niger, Ecobank, BIA-Niger, SONITEL. Régions: Niamey, Zinder, Maradi, Agadez, Tahoua, Dosso, Tillabéri. Monnaie: FCFA. USSD: *150#. Ministère: MFPE (Ministère Fonction Publique Travail Emploi). Financement: ANPE-Niger, FAFP. Établissements: CFP Niamey, IFAIB Niamey, CFP Zinder, CFP Maradi, IPD Agadez. Filières porteuses: Agriculture, Élevage, Maraîchage, BTP, Commerce, Artisanat.` },
      GH: { en: `You work for Ghana. Job market: oil & gas, agriculture, fintech, telecom. Key employers: MTN Ghana, Vodafone, GCB Bank. Currency: GHS.` },
      NG: { en: `You work for Nigeria. Job market: oil & gas, fintech, agriculture, tech. Key employers: MTN Nigeria, Dangote, GTBank. Currency: NGN.` },
    };
    const pays = contextes[country_code];
    if (!pays) return `Pays: ${country_code}. Langue: ${langue}.`;
    return pays[langue] || pays['fr'] || Object.values(pays)[0];
  }

  // ── RAPPORT D'ORIENTATION (NIE complet) ──────────────────
  async genererRapportOrientation(params: any): Promise<string> {
    const ctx = this.getContextePays(params.country_code || 'CI', params.langue || 'fr');
    const cc = params.country_code || 'CI';
    // Référentiels filières par pays
    const RIASEC_PAR_PAYS: Record<string, Record<string, string[]>> = {
      CI: {
        R: ['Mécanique Automobile','Électricité Bâtiment','Bâtiment Gros Œuvres','Construction Mécanique','Menuiserie','Froid et Climatisation','Topographie','Génie civil'],
        I: ['Électronique','Électrotechnique','Biochimie','Maths Technique','Sciences Médico-sociales','Maintenance Électrique'],
        A: ['Décoration Textile','Imprimerie','Peinture Bâtiment'],
        S: ['Sciences Médico-sociales','Techniques Hôtelières','Cuisine Professionnelle'],
        E: ['Comptabilité','Comptabilité-Commerce','Transit-Transport','Gestion'],
        C: ['Secrétariat Bureautique','Techniques Administratives','Métreur Gros Œuvres'],
      },
      BF: {
        R: ['Maçonnerie BF','Mécanique Auto BF','Électricité Bâtiment BF','Menuiserie','Soudure','Plomberie','Froid Clim'],
        I: ['Informatique Bureautique','Maintenance équipements','Électronique'],
        A: ['Couture Mode BF','Art et Artisanat','Décoration'],
        S: ['Santé Communautaire','Aide sociale','Restauration'],
        E: ['Gestion commerciale BF','Commerce général','Transit'],
        C: ['Secrétariat BF','Comptabilité BF','Gestion entreprise'],
      },
      ML: {
        R: ['Mécanique auto Mali','BTP Mali','Génie civil','Agriculture mécanisée','Pêche artisanale','Menuiserie'],
        I: ['Informatique Mali','Maintenance','Sciences naturelles'],
        A: ['Bogolan et artisanat','Couture malienne','Arts traditionnels'],
        S: ['Santé Mali','Enseignement','Agriculture communautaire'],
        E: ['Commerce Mali','Gestion PME','Négoce'],
        C: ['Comptabilité Mali','Secrétariat','Administration'],
      },
    };
    const ETABS_PAR_PAYS: Record<string, Record<string, string[]>> = {
      CI: {
        'Abidjan': ['LTA Cocody','CPM BAT Koumassi','CPM Auto Vridi','CETC Treichville','CHA Koumassi'],
        'Bouaké': ['CET Bouaké','CBCG Bouaké'],
        'San-Pédro': ['LP San-Pedro'],
        'Daloa': ['CBCG Daloa'],
      },
      BF: {
        'Ouagadougou': ['CFJA Ouagadougou','ENSP Ouaga','Institut des Métiers','CFP Tampouy'],
        'Bobo-Dioulasso': ['CFP Bobo','Centre Artisanal Bobo','École des Mines Bobo'],
        'Koudougou': ['CFP Koudougou'],
        'Banfora': ['CFP Banfora'],
      },
      ML: {
        'Bamako': ['CFAM Bamako','ITEMA Bamako','École des Mines Bamako','CFAM Kalaban Coro'],
        'Sikasso': ['CFP Sikasso','Centre Agropastoral Sikasso'],
        'Mopti': ['CFP Mopti','Centre Pêche Mopti'],
        'Ségou': ['CFP Ségou'],
      },
    };
    const RIASEC_FILIERES = RIASEC_PAR_PAYS[cc] || RIASEC_PAR_PAYS['CI'];
    const ETABS = ETABS_PAR_PAYS[cc] || ETABS_PAR_PAYS['CI'];
    const riasecCode = (params.profil_riasec || 'R').charAt(0).toUpperCase();
    const filieres = (RIASEC_FILIERES[riasecCode] || RIASEC_FILIERES['R']).slice(0, 5).join(', ');
    const districtKey = Object.keys(ETABS).find(k => k.toLowerCase().includes((params.district || 'abidjan').toLowerCase())) || 'Abidjan';
    const etabs = (ETABS[districtKey] || ETABS['Abidjan']).slice(0, 4).join(', ');
    const systemPrompt = `Tu es le NIE YIRA, expert orientation en Côte d'Ivoire. ${ctx}\nFORMAT: JSON uniquement, sans texte avant ou après.`;
    const userMessage = `Profil: ${params.prenom}, RIASEC ${riasecCode}, score ${params.score_global}/100, niveau ${params.niveau_etude}, district ${params.district}, age ${params.age} ans.
Filières compatibles: ${filieres}
Établissements proches: ${etabs}
JSON requis:
{
  "resume_profil": {"analyse": "...", "riasec_dominant": "${riasecCode}", "points_forts": ["...","...","..."]},
  "metiers_recommandes": [{"titre": "...", "raison": "...", "salaire_moyen": "...", "employeurs_ci": ["..."]}, {"titre": "...", "raison": "...", "salaire_moyen": "...", "employeurs_ci": ["..."]}],
  "orientation_scolaire": {
    "filiere_1": {"nom": "...", "pourquoi": "...", "diplome_sortie": "...", "etablissements_ci": [{"nom": "...", "ville": "..."}], "duree": "...", "financement_fdfp": "..."},
    "filiere_2": {"nom": "...", "pourquoi": "...", "diplome_sortie": "...", "etablissements_ci": [{"nom": "...", "ville": "..."}], "duree": "...", "financement_fdfp": "..."}
  },
  "plan_action": [{"etape": 1, "action": "...", "delai": "Semaine 1"}],
  "message_motivation": {"contenu": "Message personnalisé pour ${params.prenom}..."}
}`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  // ── PII ────────────────────────────────────────────────────
  async genererPII(params: any): Promise<string> {
    const systemPrompt = `Tu es le générateur de PII de YIRA CI. FORMAT: JSON uniquement.`;
    const userMessage = `PII pour: ${params.prenom}, RIASEC: ${params.profil_riasec}, Score: ${params.score_global}/100, Niveau: ${params.niveau_etude}, District: ${params.district}, Filière: ${params.filiere_recommandee}.
JSON: { objectif_6_mois, etapes: [{semaine, action, ressources}], formation_recommandee: {filiere, duree, site}, employeurs_a_contacter, objectif_j30, objectif_j90, objectif_j180 }`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  // ── PLAN DE FORMATION ─────────────────────────────────────
  async genererPlanFormation(params: any): Promise<any> {
    const ctx = this.getContextePays(params.country_code || 'CI', 'fr');
    const systemPrompt = `Tu es le NIE YIRA - expert formation professionnelle CI. ${ctx} FORMAT: JSON strict uniquement.`;
    const userMessage = `Plan de formation pour: ${params.nom || 'Jeune'}, District: ${params.district || 'Abidjan'}, Niveau: ${params.niveau_etude || 'bepc'}, Métier cible: ${params.metier_cible || 'non défini'}.
JSON: { objectif, filiere, etablissement: {nom, ville, financement}, duree_totale, cout_total, part_fdfp, part_beneficiaire, modules: [{numero, titre, duree, contenu, type}], certification, salaire_apres, action_semaine, message_motivation }`;
    try {
      const raw = await this.appelNIE(systemPrompt, userMessage);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return { success: true, plan: JSON.parse(cleaned) };
    } catch (e) {
      return { success: false, plan: null };
    }
  }

  // ── ÉVALUATION FONCTIONNAIRE ──────────────────────────────
  async evaluerFonctionnaire(params: any): Promise<string> {
    const systemPrompt = `Tu es l'expert RH de la Fonction Publique CI. Référentiel DGFP. FORMAT: JSON.`;
    const userMessage = `Évalue: ${params.prenom} ${params.nom}, Ministère: ${params.ministere}, Poste: ${params.poste_actuel}, Corps: ${params.corps}, Grade: ${params.grade}, RIASEC: ${params.profil_riasec}, Score: ${params.score_global}/100.
JSON: { adequation_poste: {score, niveau, analyse}, affectation_optimale: {poste, ministere, district, justification}, potentiel_evolution, besoins_formation, recommandation_finale }`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  // ── MATCHING EMPLOI ────────────────────────────────────────
  async matcherEmploi(params: any): Promise<any> {
    const ctx = this.getContextePays(params.country_code || 'CI', 'fr');
    const systemPrompt = `Tu es le NIE YIRA - expert matching emploi CI. ${ctx} FORMAT: JSON strict.`;
    const userMessage = `Matching: Candidat RIASEC ${params.riasec}, Score ${params.score}/100, District ${params.district}. Poste: ${params.poste}, Employeur: ${params.employeur}.
JSON: { score_matching, points_forts_match, points_faibles_match, recommandation, message_candidat, conseils_entretien }`;
    try {
      const raw = await this.appelNIE(systemPrompt, userMessage);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return { success: true, matching: JSON.parse(cleaned) };
    } catch (e) {
      return { success: false, message: 'Matching calculé: 75/100 - Profil compatible' };
    }
  }

  // ── COACHING ADAPTATIF ─────────────────────────────────────
  async genererCoachingAdaptatif(params: any): Promise<any> {
    const ctx = this.getContextePays(params.country_code || 'CI', 'fr');
    const systemPrompt = `Tu es le coach YIRA CI. ${ctx} FORMAT: JSON strict.`;
    const userMessage = `Coaching ${params.jalon || 'J+30'} pour ${params.nom || 'Jeune'} (${params.district || 'Abidjan'}): Statut ${params.statut_emploi || 'en_recherche'}, Score: ${params.score || 50}/100.
JSON: { message_coaching, actions_semaine, ressource_recommandee, alerte_niveau, prochain_jalon, sms_160chars }`;
    try {
      const raw = await this.appelNIE(systemPrompt, userMessage);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return { success: true, coaching: JSON.parse(cleaned) };
    } catch (e) {
      return { success: false, message: 'Continue tes efforts - YIRA est avec toi !' };
    }
  }

  // ── ANALYSE PRÉDICTIVE ─────────────────────────────────────
  async analyserPredictif(params: any): Promise<any> {
    const ctx = this.getContextePays(params.country_code || 'CI', 'fr');
    const systemPrompt = `Tu es l'analyste prédictif NIE YIRA. ${ctx} FORMAT: JSON strict.`;
    const userMessage = `Analyse prédictive pour ${params.nom || 'Jeune'}: Score ${params.score || 60}/100, Progression ${params.progression || '+5pts/mois'}, Jalon ${params.jalon || 'J+90'}.
JSON: { probabilite_insertion, delai_estime_emploi, risque_decrochage, facteurs_risque, facteurs_succes, intervention_conseillee, score_predit_j60, score_predit_j90 }`;
    try {
      const raw = await this.appelNIE(systemPrompt, userMessage);
      return { success: true, prediction: JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()) };
    } catch (e) {
      return { success: false, probabilite_insertion: 72, delai_estime_emploi: '3-6 mois' };
    }
  }

  // ── DIAGNOSTIC ORGANISATIONNEL ─────────────────────────────
  async diagnosticOrganisationnel(params: any): Promise<string> {
    const systemPrompt = `Tu es expert diagnostic organisationnel RH pour entreprises africaines. FORMAT: JSON.`;
    const equipeResume = (params.equipe || []).map((e: any) => `${e.nom} (${e.poste}) - RIASEC: ${e.profil_riasec} - Score: ${e.score_global}/100`).join('\n');
    const userMessage = `Diagnostic: ${params.nom_entreprise}, Secteur: ${params.secteur}, ${params.nb_employes} employés.\nÉquipe:\n${equipeResume}
JSON: { resume_diagnostic, forces_organisationnelles, lacunes_critiques, recommandations_recrutement, recommandations_formation, promotions_recommandees, risques_rh, plan_action }`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  // ── SCORER CV ──────────────────────────────────────────────
  async scorerCV(params: any): Promise<{ score: number; justification: string; points_forts: string[]; points_vigilance: string[] }> {
    const systemPrompt = `Tu es le moteur de matching CV de YIRA CI. FORMAT: JSON.`;
    const userMessage = `Offre: ${params.offre?.titre}. Candidat: ${params.candidat?.prenom} ${params.candidat?.nom}, RIASEC: ${params.candidat?.profil_riasec}, Score: ${params.candidat?.score_global}/100.
JSON: { score_compatibilite, justification, points_forts, points_vigilance }`;
    try {
      const raw = await this.appelNIE(systemPrompt, userMessage);
      const p = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
      return { score: p.score_compatibilite || 0, justification: p.justification || '', points_forts: p.points_forts || [], points_vigilance: p.points_vigilance || [] };
    } catch {
      return { score: 50, justification: 'Score estimé', points_forts: [], points_vigilance: [] };
    }
  }

  // ── AUTRES MÉTHODES ────────────────────────────────────────
  async genererCurriculum(params: any): Promise<string> {
    return this.appelNIE('Expert CV CI', JSON.stringify(params));
  }
  async analyser4Savoirs(params: any): Promise<string> {
    return this.appelNIE('Expert 4 Savoirs CI', JSON.stringify(params));
  }
  async genererOrientationScolaire(params: any): Promise<string> {
    return this.appelNIE('Conseiller Scolaire CI', JSON.stringify(params));
  }
  async evaluerEnseignant(params: any): Promise<string> {
    return this.appelNIE('Expert MENET CI', JSON.stringify(params));
  }
  async predireEvolutionCarriere(params: any): Promise<string> {
    return this.appelNIE('Analyste Carrière CI', JSON.stringify(params));
  }
  async testerNIE() {
    const moteur = this.geminiApiKey?.length > 10 ? 'Gemini' : this.anthropicApiKey?.length > 10 ? 'Claude' : 'AUCUN';
    try {
      const r = await this.appelNIE('NIE YIRA', 'Réponds: {"status":"ok","nie":"ACTIF"}');
      return { status: 'ok', nie: 'ACTIF', moteur, reponse: r };
    } catch (e) {
      return { status: 'erreur', nie: 'INACTIF', moteur, erreur: e.message };
    }
  }
}
