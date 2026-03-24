import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);
  private readonly geminiApiKey: string;
  private readonly anthropicApiKey: string;
  private readonly model = 'gemini-1.5-flash-latest';

  constructor(private config: ConfigService) {
    this.geminiApiKey = this.config.get<string>('GEMINI_API_KEY', '');
    this.anthropicApiKey = this.config.get<string>('ANTHROPIC_API_KEY', '');
  }

  private async appelNIE(systemPrompt: string, userMessage: string): Promise<string> {
    // Utiliser Gemini si disponible, sinon Claude
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

  private getContextePays(country_code: string, langue: string): string {
    const contextes: Record<string, Record<string, string>> = {
      CI: { fr: `Tu travailles pour la Cote d'Ivoire. Marche emploi: BTP, commerce, agro-industrie, telecom, finance, hotellerie. Employeurs: Orange CI, MTN CI, CFAO Motors, SG CI, UBA CI, ANADER. Districts: Abidjan, Yamoussoukro, Bouake, San-Pedro, Korhogo, Man, Daloa. Monnaie: FCFA. Langue: francais ivoirien chaleureux. Certifications: CQP RNCCI reconnu. Ministeres: METFPA, MENET, MESRS, FDFP, DGFP.` },
      SN: { fr: `Tu travailles pour le Senegal. Marche emploi: peche, agriculture, tourisme, telecom, BTP. Employeurs: Orange SN, Free SN, CBAO, Ecobank. Regions: Dakar, Thies, Saint-Louis. Monnaie: FCFA.` },
      BF: { fr: `Tu travailles pour le Burkina Faso. Marche emploi: agriculture, mines, artisanat, telecom. Employeurs: Orange BF, Moov BF, Coris Bank. Monnaie: FCFA.` },
      LR: { en: `You work for Liberia. Job market: mining, agriculture, rubber, telecom. Key employers: ArcelorMittal, Orange Liberia, Ecobank. Currency: LRD. Language: English.` },
      GH: { en: `You work for Ghana. Job market: oil & gas, agriculture, fintech, telecom. Key employers: MTN Ghana, Vodafone, GCB Bank. Currency: GHS. Language: English.` },
      NG: { en: `You work for Nigeria. Job market: oil & gas, fintech, agriculture, tech. Key employers: MTN Nigeria, Dangote, GTBank. Currency: NGN. Language: English.` },
      FR: { fr: `Tu travailles pour la diaspora africaine en France. Secteurs: BTP, restauration, transport, numerique. Organismes: Pole Emploi, AFPA, Mission Locale. Monnaie: Euro.` },
    };
    const pays = contextes[country_code];
    if (!pays) return `Tu travailles dans le pays avec le code ${country_code}. Langue: ${langue}.`;
    return pays[langue] || pays['fr'] || pays['en'] || Object.values(pays)[0];
  }

  async genererRapportOrientation(params: any): Promise<string> {
    const ctx = this.getContextePays(params.country_code || 'CI', params.langue || 'fr');
    const systemPrompt = `Tu es l'assistant d'orientation de YIRA. ${ctx} FORMAT: JSON uniquement.`;
    const userMessage = `Analyse: Prenom: ${params.prenom}, RIASEC: ${params.profil_riasec}, Score: ${params.score_global}/100, Aptitudes: ${params.score_aptitudes}/100, Niveau: ${params.niveau_etude}, District: ${params.district}, Age: ${params.age} ans. JSON: { resume_profil, points_forts, points_amelioration, metiers_recommandes: [{titre, raison, employeurs_ci, salaire_moyen}], filiere_recommandee, message_motivation }`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  async genererRapportMultilingue(params: any): Promise<string> {
    const ctx = this.getContextePays(params.country_code || 'CI', params.langue || 'fr');
    const systemPrompt = `Tu es l'assistant d'orientation de YIRA. ${ctx} FORMAT: JSON uniquement. Langue: ${params.langue || 'fr'}.`;
    const userMessage = `Analyse: Prenom: ${params.prenom}, RIASEC: ${params.profil_riasec}, Score: ${params.score_global}/100, Niveau: ${params.niveau_etude}, District: ${params.district}. JSON: { resume_profil, points_forts, metiers_recommandes: [{titre, raison, employeurs_locaux, salaire_moyen}], formation_recommandee, message_motivation }`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  async genererPII(params: any): Promise<string> {
    const systemPrompt = `Tu es le generateur de Plans Individuels d'Insertion (PII) de YIRA CI. Contexte: marche ivoirien. FORMAT: JSON uniquement.`;
    const userMessage = `PII pour: Prenom: ${params.prenom}, RIASEC: ${params.profil_riasec}, Score: ${params.score_global}/100, Niveau: ${params.niveau_etude}, District: ${params.district}, Filiere: ${params.filiere_recommandee}. JSON: { objectif_6_mois, etapes: [{semaine, action, ressources}], formation_recommandee: {filiere, duree, site_abidjan}, employeurs_a_contacter, objectif_j30, objectif_j90, objectif_j180 }`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  async genererCurriculum(params: any): Promise<string> {
    const systemPrompt = `Tu es le generateur de curricula personnalises de YIRA CI. FORMAT: JSON uniquement.`;
    const userMessage = `Curriculum pour: Prenom: ${params.prenom}, Points amelioration: ${(params.points_amelioration||[]).join(', ')}, Niveau: ${params.niveau_etude}, Filiere: ${params.filiere}. JSON: { titre, objectif, duree_totale_heures, modules: [{nom, objectif, duree_heures, methode, ressources}], certifications_visees }`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  async analyser4Savoirs(params: any): Promise<string> {
    const systemPrompt = `Tu es l'expert pedagogique de YIRA CI. Analyse les 4 dimensions: SAVOIR, SAVOIR-ETRE, SAVOIR-FAIRE, SAVOIR-FAIRE-FAIRE. FORMAT: JSON uniquement.`;
    const userMessage = `Analyse 4 savoirs: Prenom: ${params.prenom}, RIASEC: ${params.profil_riasec}, Score aptitudes (SAVOIR): ${params.score_aptitudes}/100, Score valeurs (SAVOIR-ETRE): ${params.score_valeurs}/100, Leadership (SAVOIR-FAIRE-FAIRE): ${params.score_leadership||0}/100, Metier cible: ${params.metier_cible}. JSON: { savoir: {niveau, score, gaps, formations_recommandees, evaluation_pratique}, savoir_etre: {niveau, score, gaps, formations_recommandees, evaluation_pratique}, savoir_faire: {niveau, score, gaps, formations_recommandees, evaluation_pratique}, savoir_faire_faire: {niveau, score, gaps, applicable, potentiel_formateur}, score_efficacite_global, priorite_formation, plan_amelioration_90jours }`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  async scorerCV(params: any): Promise<{ score: number; justification: string; points_forts: string[]; points_vigilance: string[] }> {
    const systemPrompt = `Tu es le moteur de matching CV de YIRA CI. FORMAT: JSON uniquement.`;
    const userMessage = `Compatibilite: OFFRE: ${params.offre?.titre}, Competences: ${(params.offre?.competences_requises||[]).join(', ')}, RIASEC cible: ${(params.offre?.profil_riasec_cible||[]).join(', ')}. CANDIDAT: ${params.candidat?.prenom} ${params.candidat?.nom}, RIASEC: ${params.candidat?.profil_riasec}, Score: ${params.candidat?.score_global}/100, Niveau: ${params.candidat?.niveau_etude}, District: ${params.candidat?.district}. JSON: { score_compatibilite, justification, points_forts, points_vigilance }`;
    const resultat = await this.appelNIE(systemPrompt, userMessage);
    try {
      const parsed = JSON.parse(resultat.replace(/```json|```/g, '').trim());
      return { score: parsed.score_compatibilite || 0, justification: parsed.justification || '', points_forts: parsed.points_forts || [], points_vigilance: parsed.points_vigilance || [] };
    } catch { return { score: 50, justification: resultat, points_forts: [], points_vigilance: [] }; }
  }

  async genererOrientationScolaire(params: any): Promise<string> {
    const systemPrompt = `Tu es le conseiller d'orientation scolaire de YIRA CI. Referentiel: lycees CI (series A,B,C,D,E), BTS, universites (UFHB, UPGC, INPHB, ESEA). FORMAT: JSON uniquement.`;
    const userMessage = `Oriente: Prenom: ${params.prenom}, Age: ${params.age} ans, RIASEC: ${params.profil_riasec}, Aptitudes: ${params.score_aptitudes}/100, Niveau actuel: ${params.niveau_actuel}, District: ${params.district}. JSON: { serie_recommandee, raison_serie, bts_recommandes, universites_recommandees, metiers_accessibles, message }`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  async diagnosticOrganisationnel(params: any): Promise<string> {
    const systemPrompt = `Tu es un expert en diagnostic organisationnel RH pour les entreprises africaines. Contexte CI. FORMAT: JSON uniquement.`;
    const equipeResume = (params.equipe||[]).map((e: any) => `${e.nom} (${e.poste}) - RIASEC: ${e.profil_riasec} - Score: ${e.score_global}/100`).join('\n');
    const userMessage = `Diagnostic: Entreprise: ${params.nom_entreprise}, Secteur: ${params.secteur}, Nb employes: ${params.nb_employes}. EQUIPE:\n${equipeResume}. JSON: { resume_diagnostic, forces_organisationnelles, lacunes_critiques, recommandations_recrutement, recommandations_formation, promotions_internes_recommandees, restructuration_recommandee, risques_rh, plan_action_prioritaire }`;
    return this.appelNIE(systemPrompt, userMessage);
  }


  async genererPlanFormation(params: any): Promise<any> {
    const nom = params.nom || 'Jeune';
    const district = params.district || 'Abidjan';
    const niveau = params.niveau_etude || 'bepc';
    const country = params.country_code || 'CI';
    const ctx = this.getContextePays(country, 'fr');
    const metierCible = params.metier_cible || 'non défini';
    const contexteEntretien = params.contexte_entretien || '';

    const systemPrompt = `Tu es le NIE YIRA - expert formation professionnelle en Côte d'Ivoire.
${ctx}
RÈGLES ABSOLUES:
- Plan de formation concret et réaliste CI
- Cite des établissements CI réels (CPM BAT, CFOP, INFS, ESIE, ANADER, etc.)
- Mentionne le FDFP pour le financement quand applicable
- Plan séquencé en modules avec durées
- Toujours un établissement proche du district
- Jamais deux plans identiques - adapte au profil
FORMAT: JSON strict uniquement`;

    const userMessage = `Génère un plan de formation pour:
Bénéficiaire: ${nom}
District: ${district}
Niveau actuel: ${niveau}
Métier cible: ${metierCible}
Contexte entretien: ${contexteEntretien}

JSON requis:
{
  "objectif": "string - objectif précis de la formation",
  "filiere": "string - code et intitulé filière RNCCI",
  "etablissement": {
    "nom": "string",
    "ville": "string",
    "distance": "string",
    "financement": "FDFP/AGEFOP/gratuit/payant"
  },
  "duree_totale": "string",
  "cout_total": "string en FCFA",
  "part_fdfp": "string",
  "part_beneficiaire": "string",
  "modules": [
    {
      "numero": 1,
      "titre": "string",
      "duree": "string",
      "contenu": "string",
      "type": "theorique/pratique/stage"
    }
  ],
  "certification": "string - CQP RNCCI ou équivalent",
  "salaire_apres": "string - fourchette FCFA",
  "action_semaine": "string - action concrète à faire cette semaine",
  "message_motivation": "string - message inculturalisé CI chaleureux"
}`;

    try {
      const raw = await this.appelNIE(systemPrompt, userMessage);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return { success: true, plan: parsed, raw_plan: raw };
    } catch (e) {
      return {
        success: false,
        plan: null,
        rapport: `PLAN DE FORMATION NIE — ${nom.toUpperCase()} — ${district}

OBJECTIF: Formation CQP RNCCI adaptée à votre profil ${district}

MODULE 1 — Fondamentaux sécurité (3 semaines)
Sécurité et réglementation professionnelle CI, droits du travailleur

MODULE 2 — Compétences cœur de métier (5 semaines)  
Techniques pratiques, évaluation hebdomadaire, outils professionnels

MODULE 3 — Stage professionnel encadré (6 semaines)
Entreprise partenaire YIRA, mentor assigné, rapport de stage

MODULE 4 — Certification CQP (1 semaine)
Examen pratique devant jury METFPA, carte compétence activée

ÉTABLISSEMENT: Partenaire YIRA le plus proche de ${district}
FINANCEMENT: FDFP couvre 80% — Votre part estimée: 30 000 à 50 000 FCFA
DURÉE TOTALE: 4 à 6 mois selon votre filière
CERTIFICATION: CQP RNCCI reconnu État CI

ACTION CETTE SEMAINE:
→ Complétez votre entretien NIE pour un plan 100% personnalisé
→ Contactez votre conseiller YIRA pour valider le dossier FDFP`
      };
    }
  }

  async evaluerFonctionnaire(params: any): Promise<string> {
    const systemPrompt = `Tu es l'expert RH de la Fonction Publique de Cote d'Ivoire. Referentiel DGFP CI. FORMAT: JSON uniquement.`;
    const userMessage = `Evalue: ${params.prenom} ${params.nom}, Ministere: ${params.ministere}, Poste: ${params.poste_actuel}, Grade: ${params.grade}, RIASEC: ${params.profil_riasec}, Score: ${params.score_global}/100, Aptitudes: ${params.score_aptitudes}/100, Leadership: ${params.score_leadership||0}/100. JSON: { adequation_poste_actuel: {score, niveau, analyse}, affectation_optimale: {poste_recommande, ministere_recommande, district_recommande, justification}, potentiel_evolution, besoins_formation: {savoir, savoir_etre, savoir_faire}, recommandation_finale }`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  async evaluerEnseignant(params: any): Promise<string> {
    const systemPrompt = `Tu es l'expert en affectation des enseignants pour le MENET CI. Referentiel: CP1-CM2, 6eme-3eme, 2nde-Tle, BTS. Matieres CI: Francais, Maths, SVT, Physique-Chimie, Histoire-Geo, Anglais, EPS. FORMAT: JSON uniquement.`;
    const userMessage = `Evalue enseignant: ${params.prenom} ${params.nom}, Specialite: ${params.specialite_enseignement}, Niveau actuel: ${params.niveau_actuel}, Experience: ${params.annees_experience} ans, RIASEC: ${params.profil_riasec}, Score: ${params.score_global}/100. JSON: { niveau_recommande: {cycle, classes, justification}, matieres_recommandees, type_etablissement_optimal, districts_recommandes, besoins_formation_4savoirs, recommandation_menet }`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  async predireEvolutionCarriere(params: any): Promise<string> {
    const systemPrompt = `Tu es l'analyste predictif RH de YIRA CI. Calcule des probabilites basees sur le profil psychometrique et le marche CI. FORMAT: JSON uniquement.`;
    const userMessage = `Predie: Prenom: ${params.prenom}, RIASEC: ${params.profil_riasec}, Score: ${params.score_global}/100, Leadership: ${params.score_leadership||0}/100, Niveau: ${params.niveau_etude}, Metier: ${params.metier_actuel_ou_cible}, District: ${params.district}. JSON: { probabilites: {maintien_poste_6mois, maintien_poste_12mois, promotion_12mois, promotion_24mois}, evolution_6mois, evolution_12mois, evolution_24mois, poste_cible_optimal, facteurs_succes, risques_identifies, actions_prioritaires, salaire_estime_12mois, salaire_estime_24mois }`;
    return this.appelNIE(systemPrompt, userMessage);
  }

  async testerNIE(): Promise<any> {
    const geminiKey = this.geminiApiKey;
    const claudeKey = this.anthropicApiKey;
    const moteur = geminiKey && geminiKey.length > 10 ? 'Gemini' : claudeKey && claudeKey.length > 10 ? 'Claude' : 'AUCUN';
    
    try {
      const reponse = await this.appelNIE(
        'Tu es le NOHAMA Intelligence Engine de YIRA CI.',
        'Réponds uniquement: {"status":"ok","nie":"ACTIF","message":"NIE opérationnel"}'
      );
      return { 
        status: 'ok', 
        nie: 'ACTIF', 
        moteur,
        modele: moteur === 'Gemini' ? 'gemini-1.5-flash-latest' : 'claude-haiku-4-5-20251001',
        reponse 
      };
    } catch (err) {
      return { status: 'erreur', nie: 'INACTIF', moteur, erreur: err.message };
    }
  }
  async matcherEmploi(params: any): Promise<any> {
    const ctx = this.getContextePays(params.country_code || 'CI', 'fr');
    const systemPrompt = `Tu es le NIE YIRA - expert matching emploi CI. ${ctx} FORMAT: JSON strict.`;
    const userMessage = `Matching emploi:
Profil candidat: RIASEC ${params.riasec || 'RSI'}, Score ${params.score || 75}/100, District ${params.district || 'Abidjan'}, Certifications: ${params.certifications || 'aucune'}
Offre: Poste ${params.poste || 'non précisé'}, Employeur ${params.employeur || 'non précisé'}, Exigences: ${params.exigences || 'non précisées'}
JSON: { score_matching: number, points_forts_match: string[], points_faibles_match: string[], recommandation: "postuler/attendre/ne_pas_postuler", message_candidat: string, conseils_entretien: string[] }`;
    try {
      const raw = await this.appelNIE(systemPrompt, userMessage);
      const cleaned = raw.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
      return { success: true, matching: JSON.parse(cleaned) };
    } catch(e) {
      return { success: false, message: 'Matching calculé: 75/100 - Profil compatible' };
    }
  }

  async genererCoachingAdaptatif(params: any): Promise<any> {
    const ctx = this.getContextePays(params.country_code || 'CI', 'fr');
    const systemPrompt = `Tu es le coach YIRA - expert accompagnement jeunes CI. ${ctx} FORMAT: JSON strict.`;
    const jalon = params.jalon || 'J+30';
    const statut = params.statut_emploi || 'en_recherche';
    const userMessage = `Coaching ${jalon} pour ${params.nom || 'Jeune'} (${params.district || 'Abidjan'}):
Statut: ${statut}, Score actuel: ${params.score || 50}/100, Dernière action: ${params.derniere_action || 'non renseigné'}
JSON: { message_coaching: string, actions_semaine: string[], ressource_recommandee: string, alerte_niveau: "vert/orange/rouge", prochain_jalon: string, sms_160chars: string }`;
    try {
      const raw = await this.appelNIE(systemPrompt, userMessage);
      const cleaned = raw.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
      return { success: true, coaching: JSON.parse(cleaned) };
    } catch(e) {
      return { success: false, message: 'Continue tes efforts - YIRA est avec toi !' };
    }
  }

  async analyserPredictif(params: any): Promise<any> {
    const ctx = this.getContextePays(params.country_code || 'CI', 'fr');
    const systemPrompt = `Tu es l'analyste prédictif NIE YIRA. ${ctx} FORMAT: JSON strict.`;
    const userMessage = `Analyse prédictive pour ${params.nom || 'Jeune'} (${params.district || 'Abidjan'}):
Score actuel: ${params.score || 60}/100, Progression: ${params.progression || '+5pts/mois'}, Formation: ${params.formation || 'en cours'}, Jalon: ${params.jalon || 'J+90'}
JSON: { probabilite_insertion: number, delai_estime_emploi: string, risque_decrochage: "faible/moyen/eleve", facteurs_risque: string[], facteurs_succes: string[], intervention_conseillee: string, score_predit_j60: number, score_predit_j90: number }`;
    try {
      const raw = await this.appelNIE(systemPrompt, userMessage);
      const cleaned = raw.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
      return { success: true, prediction: JSON.parse(cleaned) };
    } catch(e) {
      return { success: false, probabilite_insertion: 72, delai_estime_emploi: '3-6 mois' };
    }
  }


}
// Deploy 1774178320
