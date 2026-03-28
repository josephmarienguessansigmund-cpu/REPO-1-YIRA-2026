import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createClient, SupabaseClient } from '@supabase/supabase-client'; // Ajout de l'import Supabase

@Injectable()
export class IaService {
  private readonly logger = new Logger(IaService.name);
  private readonly geminiApiKey: string;
  private readonly anthropicApiKey: string;
  private readonly supabase: SupabaseClient; // Instance Supabase

  constructor(private config: ConfigService) {
    this.geminiApiKey = this.config.get<string>('GEMINI_API_KEY', '');
    this.anthropicApiKey = this.config.get<string>('ANTHROPIC_API_KEY', '');
    
    // Initialisation du client Supabase pour le coffre-fort d'inculturation
    this.supabase = createClient(
      this.config.get<string>('SUPABASE_URL', ''),
      this.config.get<string>('SUPABASE_ANON_KEY', '')
    );
  }

  /**
   * LE MOTEUR D'INCULTURATION PSYCHOMÉTRIQUE
   * Cette méthode vérifie le cache Supabase avant d'appeler l'IA.
   */
  async inculturerQuestion(sigmundId: string, originalText: string, niveau: string): Promise<string> {
    try {
      // 1. Chercher dans le coffre-fort Nohama
      const { data: dejaExiste } = await this.supabase
        .from('yira_inculturation_mapping')
        .select('adapted_text')
        .eq('sigmund_id', sigmundId)
        .eq('education_level', niveau)
        .single();

      if (dejaExiste?.adapted_text) {
        this.logger.log(`Inculturation trouvée en cache pour: ${sigmundId}`);
        return dejaExiste.adapted_text;
      }

      // 2. Si inconnu, on génère l'adaptation avec l'IA
      this.logger.log(`Génération d'une nouvelle inculturation pour: ${sigmundId} (${niveau})`);
      
      const systemPrompt = `Tu es l'expert en inculturation psychométrique de Nohama Consulting. 
      Ta mission est d'adapter un item de test Sigmund pour un jeune Ivoirien de niveau ${niveau}.
      RÈGLE D'OR: Garde le sens psychologique exact mais utilise des mots simples et concrets.
      Ne réponds que par la phrase adaptée, sans commentaires.`;

      const userMessage = `Adapte cette phrase : "${originalText}"`;
      
      const phraseAdaptee = await this.appelNIE(systemPrompt, userMessage);

      // 3. Sauvegarder dans le trésor Nohama pour les prochains jeunes
      await this.supabase
        .from('yira_inculturation_mapping')
        .insert({
          sigmund_id: sigmundId,
          original_text: originalText,
          adapted_text: phraseAdaptee.trim(),
          education_level: niveau,
          is_expert_validated: false
        });

      return phraseAdaptee.trim();
    } catch (error) {
      this.logger.error(`Erreur d'inculturation : ${error.message}`);
      return originalText; // Sécurité : on renvoie l'original si l'IA ou la DB échoue
    }
  }

  // --- Vos méthodes existantes (appelNIE, appelGemini, appelClaude, etc.) ---
  
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
        generationConfig: { maxOutputTokens: 1000, temperature: 0.3 } // Température basse pour la précision
      }, { headers: { 'content-type': 'application/json' } });
      return response.data.candidates[0].content.parts[0].text;
    } catch (err) {
      throw new Error(`NIE Gemini indisponible: ${err.message}`);
    }
  }

  private async appelClaude(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-haiku-4-5-20251001', max_tokens: 1000,
        system: systemPrompt, messages: [{ role: 'user', content: userMessage }],
      }, { headers: { 'x-api-key': this.anthropicApiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } });
      return response.data.content[0].text;
    } catch (err) {
      throw new Error(`NIE Claude indisponible: ${err.message}`);
    }
  }

  // ... (Garder le reste de vos méthodes : getContextePays, genererRapportOrientation, etc.)
}
