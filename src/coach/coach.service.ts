import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';

// ── Types ─────────────────────────────────────────────────────
interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string; }
interface CoachParams {
  session_id: string;
  message: string;
  beneficiaire_id?: string;
  niveau?: 'N1' | 'N2' | 'N3';
  country_code?: string;
  profil?: {
    prenom?: string;
    riasec?: string;
    score?: number;
    district?: string;
    metier_cible?: string;
    filiere?: string;
    statut?: string;
  };
}

@Injectable()
export class CoachService {
  private readonly logger = new Logger(CoachService.name);
  private readonly supabase: SupabaseClient;
  private readonly anthropicKey: string;
  private readonly geminiKey: string;

  // ── Prompts système par niveau (Inculturation F02) ──────────
  private readonly SYSTEM_PROMPTS = {
    N1: `Tu es le Coach YIRA, un ami bienveillant qui aide les jeunes en Côte d'Ivoire à trouver leur voie.
RÈGLES ABSOLUES :
- Parle en français simple et chaleureux, comme un grand frère ou une grande sœur
- Utilise des exemples concrets du quotidien ivoirien (marché, quartier, famille)
- Phrases courtes. Mots simples. Jamais de jargon
- Toujours encourageant, jamais condescendant
- Si le jeune parle de détresse, oriente immédiatement vers un conseiller humain
- Termine toujours par une question ou une action concrète à faire cette semaine
- Maximum 3 paragraphes courts par réponse`,

    N2: `Tu es le Coach YIRA, expert en orientation professionnelle en Côte d'Ivoire.
RÈGLES ABSOLUES :
- Français professionnel standard de l'entreprise ivoirienne
- Références aux réalités du marché CI : FDFP, CQP RNCCI, Orange CI, MTN, BTP, agro-industrie
- Réponses structurées mais accessibles
- Toujours ancré dans le concret : filières, établissements, salaires, délais
- Si détresse : orienter vers conseiller NOHAMA certifié
- Termine par 2-3 actions prioritaires avec délais précis`,

    N3: `Tu es le NOHAMA Intelligence Engine (NIE), expert en développement de carrière et psychométrie appliquée.
RÈGLES ABSOLUES :
- Français académique et stratégique
- Références aux normes ISO, au PND 2026-2030, aux référentiels RIASEC
- Analyse croisée : RIASEC × aptitudes × valeurs × marché CI/CEDEAO
- Recommandations basées sur les données psychométriques SigmundTest®
- Si sujets sensibles : rediriger vers expert certifié Joseph-Marie N'GUESSAN
- Livrables clairs : PII, plan de carrière, objectifs SMART`,
  };

  // ── Contextes pays ────────────────────────────────────────────
  private readonly PAYS_CONTEXTES: Record<string, string> = {
    CI: "Côte d'Ivoire · Marché emploi: BTP, commerce, agro-industrie, telecom · FDFP · Orange CI, MTN CI · Abidjan, Bouaké",
    BF: "Burkina Faso · Marché emploi: agriculture, mines, artisanat, BTP · FDFP-BF · Orange BF, Moov BF · Ouagadougou, Bobo-Dioulasso",
    ML: "Mali · Marché emploi: agriculture, mines, BTP, commerce · FAFPA · Orange Mali · Bamako, Sikasso",
    SN: "Sénégal · Marché emploi: pêche, agriculture, tourisme, numérique · 3FPT · Orange SN, Free SN · Dakar, Thiès",
    NE: "Niger · Marché emploi: agriculture, élevage, mines, BTP · ANPE-Niger · Orange Niger · Niamey, Zinder",
    GN: "Guinée · Marché emploi: mines (bauxite), agriculture, pêche · AGUIPE · Orange GN · Conakry, Kankan",
    GH: "Ghana · Job market: oil & gas, cocoa, fintech, construction · COTVET · MTN Ghana · Accra, Kumasi",
  };

  constructor(private config: ConfigService) {
    this.anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY', '');
    this.geminiKey = this.config.get<string>('GEMINI_API_KEY', '');
    this.supabase = createClient(
      this.config.get<string>('SUPABASE_URL', ''),
      this.config.get<string>('SUPABASE_SERVICE_KEY', '')
    );
  }

  // ── F01 : Charger l'historique de la session ─────────────────
  async chargerHistorique(session_id: string, limit = 10): Promise<ChatMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('chat_history')
        .select('role, content')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error || !data) return [];
      return data.map(d => ({ role: d.role as 'user' | 'assistant', content: d.content }));
    } catch (e) {
      this.logger.error(`Erreur chargement historique: ${e.message}`);
      return [];
    }
  }

  // ── F01 : Sauvegarder un message ─────────────────────────────
  async sauvegarderMessage(params: {
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
    niveau?: string;
    country_code?: string;
    beneficiaire_id?: string;
    tokens?: number;
  }): Promise<void> {
    try {
      await this.supabase.from('chat_history').insert({
        session_id:      params.session_id,
        role:            params.role,
        content:         params.content,
        niveau:          params.niveau || 'N2',
        country_code:    params.country_code || 'CI',
        beneficiaire_id: params.beneficiaire_id || null,
        tokens_used:     params.tokens || 0,
        module:          'coach',
      });
    } catch (e) {
      this.logger.error(`Erreur sauvegarde message: ${e.message}`);
    }
  }

  // ── F04 : Modération de sécurité ─────────────────────────────
  private moderationCheck(message: string): { ok: boolean; raison?: string } {
    const msg = message.toLowerCase();
    const INTERDITS = [
      { mots: ['suicide','me tuer','mourir','plus envie de vivre'], raison: 'detresse' },
      { mots: ['bombe','arme','violence','tuer quelqu'], raison: 'violence' },
      { mots: ['politique','election','parti','president'], raison: 'politique' },
      { mots: ['sexe','pornographie','adulte'], raison: 'adulte' },
    ];
    for (const groupe of INTERDITS) {
      if (groupe.mots.some(m => msg.includes(m))) {
        return { ok: false, raison: groupe.raison };
      }
    }
    return { ok: true };
  }

  private getReponseModeree(raison: string, niveau: string): string {
    const repNiveau = niveau === 'N1'
      ? "Ce sujet dépasse ce que je peux gérer seul. Parle à ton conseiller YIRA — il est là pour t'aider vraiment. Appelle le 0700 00 00 00."
      : raison === 'detresse'
        ? "Je sens que tu traverses quelque chose de difficile. Mon rôle est l'orientation professionnelle, pas le soutien psychologique. Je t'invite à contacter immédiatement un conseiller NOHAMA ou le 0700 00 00 00."
        : "Ce sujet dépasse mon périmètre en tant que Coach YIRA. Revenons à ton projet professionnel — c'est là que je peux vraiment t'aider.";
    return repNiveau;
  }

  // ── Construire le system prompt complet ──────────────────────
  private buildSystemPrompt(params: CoachParams): string {
    const niveau = params.niveau || 'N2';
    const pays = params.country_code || 'CI';
    const basePrompt = this.SYSTEM_PROMPTS[niveau] || this.SYSTEM_PROMPTS.N2;
    const paysCtx = this.PAYS_CONTEXTES[pays] || this.PAYS_CONTEXTES.CI;

    let profilCtx = '';
    if (params.profil) {
      const p = params.profil;
      profilCtx = `
PROFIL DU BÉNÉFICIAIRE :
- Prénom : ${p.prenom || 'non renseigné'}
- Profil RIASEC : ${p.riasec || 'non évalué'}
- Score global NIE : ${p.score || '?'}/100
- District : ${p.district || 'non renseigné'}
- Métier cible : ${p.metier_cible || 'en cours de définition'}
- Filière : ${p.filiere || 'non choisie'}
- Statut : ${p.statut || 'en recherche'}
Tu connais ce profil. Utilise-le pour personnaliser tes réponses.`;
    }

    return `${basePrompt}
CONTEXTE GÉOGRAPHIQUE : ${paysCtx}${profilCtx}
RAPPEL : Tu es le Coach YIRA. Ne réponds qu'aux sujets liés à l'orientation, la formation et l'emploi.`;
  }

  // ── F02/F03/F06 : Appel IA avec contexte complet ─────────────
  async appelCoach(messages: ChatMessage[], systemPrompt: string): Promise<{ texte: string; tokens: number }> {
    // Limiter les tokens pour la latence (F06)
    const MAX_HIST = 6; // 3 échanges max en contexte
    const histLimite = messages.slice(-MAX_HIST);

    // Claude en priorité
    if (this.anthropicKey && this.anthropicKey.length > 10) {
      try {
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600, // Réponses concises (F06)
          system: systemPrompt,
          messages: histLimite,
        }, {
          headers: {
            'x-api-key': this.anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 8000, // 8s max (F06)
        });
        const texte = response.data.content[0].text;
        const tokens = response.data.usage?.output_tokens || 0;
        return { texte, tokens };
      } catch (e) {
        this.logger.warn(`Claude timeout, fallback Gemini: ${e.message}`);
      }
    }

    // Fallback Gemini
    if (this.geminiKey && this.geminiKey.length > 10) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${this.geminiKey}`;
      const conv = histLimite.map(m => `${m.role === 'user' ? 'Jeune' : 'Coach'}: ${m.content}`).join('\n');
      const response = await axios.post(url, {
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${conv}` }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
      }, { timeout: 8000 });
      return { texte: response.data.candidates[0].content.parts[0].text, tokens: 0 };
    }

    throw new Error('Aucun moteur IA disponible');
  }

  // ── MÉTHODE PRINCIPALE : chat() ───────────────────────────────
  async chat(params: CoachParams): Promise<{
    reponse: string;
    session_id: string;
    niveau: string;
    flag?: string;
  }> {
    const niveau = params.niveau || 'N2';

    // F04 — Modération
    const moderation = this.moderationCheck(params.message);
    if (!moderation.ok) {
      await this.sauvegarderMessage({
        session_id: params.session_id,
        role: 'user',
        content: params.message,
        niveau, country_code: params.country_code,
        beneficiaire_id: params.beneficiaire_id,
      });
      const repModeree = this.getReponseModeree(moderation.raison, niveau);
      await this.sauvegarderMessage({
        session_id: params.session_id,
        role: 'assistant',
        content: repModeree,
        niveau, country_code: params.country_code,
        beneficiaire_id: params.beneficiaire_id,
      });
      return {
        reponse: repModeree,
        session_id: params.session_id,
        niveau,
        flag: moderation.raison,
      };
    }

    // F01 — Charger historique
    const historique = await this.chargerHistorique(params.session_id, 10);

    // Ajouter le nouveau message
    historique.push({ role: 'user', content: params.message });

    // F01 — Sauvegarder message utilisateur
    await this.sauvegarderMessage({
      session_id: params.session_id,
      role: 'user',
      content: params.message,
      niveau, country_code: params.country_code,
      beneficiaire_id: params.beneficiaire_id,
    });

    // F02/F03 — Construire system prompt
    const systemPrompt = this.buildSystemPrompt(params);

    // F06 — Appel IA
    let texte: string;
    let tokens = 0;
    try {
      const result = await this.appelCoach(historique, systemPrompt);
      texte = result.texte;
      tokens = result.tokens;
    } catch (e) {
      this.logger.error(`Erreur IA Coach: ${e.message}`);
      texte = niveau === 'N1'
        ? "Excuse-moi, j'ai un petit problème technique. Réessaie dans quelques secondes ou contacte ton conseiller YIRA directement."
        : "Le service est temporairement indisponible. Veuillez réessayer dans un instant ou contacter directement votre conseiller NOHAMA.";
    }

    // F01 — Sauvegarder réponse
    await this.sauvegarderMessage({
      session_id: params.session_id,
      role: 'assistant',
      content: texte,
      niveau, country_code: params.country_code,
      beneficiaire_id: params.beneficiaire_id,
      tokens,
    });

    return { reponse: texte, session_id: params.session_id, niveau };
  }

  // ── F05 : Audit conseiller — lister les sessions ─────────────
  async listerSessions(filters: { country_code?: string; is_flagged?: boolean; limit?: number }) {
    try {
      let query = this.supabase
        .from('chat_history')
        .select('session_id, beneficiaire_id, country_code, niveau, is_flagged, created_at')
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50);

      if (filters.country_code) query = query.eq('country_code', filters.country_code);
      if (filters.is_flagged !== undefined) query = query.eq('is_flagged', filters.is_flagged);

      const { data } = await query;
      // Dédoublonner par session_id
      const sessions = [...new Map((data || []).map(d => [d.session_id, d])).values()];
      return { sessions, total: sessions.length };
    } catch (e) {
      return { sessions: [], total: 0 };
    }
  }

  // ── F05 : Lire une session complète ──────────────────────────
  async lireSession(session_id: string) {
    const { data } = await this.supabase
      .from('chat_history')
      .select('*')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });
    return { messages: data || [] };
  }

  // ── Supprimer une session (Droit à l'oubli RGPD) ────────────
  async supprimerSession(beneficiaire_id: string): Promise<{ supprime: number }> {
    const { data } = await this.supabase
      .from('chat_history')
      .delete()
      .eq('beneficiaire_id', beneficiaire_id)
      .select();
    return { supprime: (data || []).length };
  }

  // ── Stats pour le dashboard admin ────────────────────────────
  async getStats(country_code = 'CI') {
    const { data } = await this.supabase
      .from('chat_history')
      .select('role, niveau, is_flagged, tokens_used, created_at')
      .eq('country_code', country_code)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
    const msgs = data || [];
    const users = msgs.filter(m => m.role === 'user').length;
    const sessions = new Set(msgs.map((m: any) => m.session_id)).size;
    const flags = msgs.filter(m => m.is_flagged).length;
    const tokens = msgs.reduce((s, m) => s + (m.tokens_used || 0), 0);
    const n1 = msgs.filter(m => m.niveau === 'N1').length;
    const n2 = msgs.filter(m => m.niveau === 'N2').length;
    const n3 = msgs.filter(m => m.niveau === 'N3').length;
    return { messages_30j: users, tokens_30j: tokens, flags_30j: flags, niveaux: { N1: n1, N2: n2, N3: n3 } };
  }

  // ── Batch inculturation avec reprise sur erreur ──────────────
  async inculturerBatch(items: Array<{id: string; text: string}>, niveaux: string[]): Promise<{
    done: number; errors: number; skipped: number; results: any[];
  }> {
    let done = 0, errors = 0, skipped = 0;
    const results: any[] = [];

    for (const item of items) {
      for (const niveau of niveaux) {
        // Vérifier si déjà traité (reprise sans recommencer)
        try {
          const { data: exists } = await this.supabase
            .from('yira_inculturation_mapping')
            .select('adapted_text')
            .eq('sigmund_id', item.id)
            .eq('education_level', niveau)
            .single();

          if (exists?.adapted_text) {
            skipped++;
            continue; // Déjà fait — on passe
          }
        } catch { /* Non trouvé — continuer */ }

        // Générer avec retry 2 fois
        let success = false;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            // Appel direct Supabase + IA (même logique que inculturerQuestion)
            const systemPrompt = `Tu es l'Expert en Inculturation Psychométrique de Nohama Consulting CI. Adapte cet item pour un niveau ${niveau} en français ivoirien professionnel sans changer le sens psychologique. Réponds UNIQUEMENT par la phrase adaptée.`;
            const phraseAdaptee = await this.appelCoach(
              [{ role: 'user', content: `Adapte: "${item.text}"` }],
              systemPrompt
            ).then(r => r.texte);
            await this.supabase.from('yira_inculturation_mapping').upsert({
              sigmund_id: item.id, original_text: item.text,
              adapted_text: phraseAdaptee.trim(), education_level: niveau,
              is_expert_validated: false,
            }, { onConflict: 'sigmund_id,education_level' });
            done++;
            results.push({ id: item.id, niveau, status: 'ok' });
            success = true;
            break;
          } catch (e) {
            if (attempt === 2) {
              errors++;
              results.push({ id: item.id, niveau, status: 'error', error: e.message });
              this.logger.warn(`Batch erreur: ${item.id} (${niveau}) — ${e.message}`);
            } else {
              await new Promise(res => setTimeout(res, 1000)); // Attendre 1s avant retry
            }
          }
        }
      }
    }

    return { done, errors, skipped, results };
  }

  // ── Calcul scores RIASEC — service pur testable ──────────────
  static calculerScoresRIASEC(reponses: Array<{lettre: string; valeur: number}>): Record<string, number> {
    const scores: Record<string, number> = { R:0, I:0, A:0, S:0, E:0, C:0 };
    const counts: Record<string, number> = { R:0, I:0, A:0, S:0, E:0, C:0 };

    for (const r of reponses) {
      const l = r.lettre?.toUpperCase();
      if (l && l in scores) {
        // Validation bornes : score entre 0 et 100
        const valeur = Math.max(0, Math.min(100, r.valeur || 0));
        scores[l] += valeur;
        counts[l]++;
      }
    }

    // Normaliser : moyenne sur le nombre de réponses par lettre
    for (const l of Object.keys(scores)) {
      scores[l] = counts[l] > 0 ? Math.round(scores[l] / counts[l]) : 0;
    }

    return scores;
  }

  // ── Profil dominant depuis scores ───────────────────────────
  static getProfilDominant(scores: Record<string, number>): string {
    return Object.entries(scores)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 3)
      .map(([l]) => l)
      .join('');
  }

}
