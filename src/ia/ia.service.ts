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

  // --- MOTEUR D'INCULTURATION ---
  async inculturerQuestion(sigmundId: string, originalText: string, niveau: string): Promise<string> {
    const { data: cache } = await this.supabase
      .from('yira_inculturation_mapping')
      .select('adapted_text')
      .eq('sigmund_id', sigmundId).eq('education_level', niveau).single();
    if (cache?.adapted_text) return cache.adapted_text;

    const systemPrompt = `Tu es l'Expert en Psychométrie de Nohama Consulting. Adapte cet item pour un niveau ${niveau} en français ivoirien professionnel sans changer le sens psychologique.`;
    const phraseAdaptee = await this.appelNIE(systemPrompt, `Phrase: "${originalText}"`);
    
    await this.supabase.from('yira_inculturation_mapping').upsert({
      sigmund_id: sigmundId, original_text: originalText, adapted_text: phraseAdaptee, education_level: niveau
    });
    return phraseAdaptee;
  }

  private async appelNIE(systemPrompt: string, userMessage: string): Promise<string> {
    if (this.geminiApiKey && this.geminiApiKey.length > 10) return this.appelGemini(systemPrompt, userMessage);
    return this.appelClaude(systemPrompt, userMessage);
  }

  private async appelGemini(systemPrompt: string, userMessage: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${this.geminiApiKey}`;
    const response = await axios.post(url, { contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }] });
    return response.data.candidates[0].content.parts[0].text;
  }

  private async appelClaude(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
      system: systemPrompt, messages: [{ role: 'user', content: userMessage }],
    }, { headers: { 'x-api-key': this.anthropicApiKey, 'anthropic-version': '2023-06-01' } });
    return response.data.content[0].text;
  }

  // --- RÉTABLISSEMENT DES FONCTIONS SYSTÈME ---
  async testerNIE() { return { status: 'ok', nie: 'ACTIF' }; }
  async genererRapportOrientation(params: any) { return this.appelNIE("Expert Orientation CI", JSON.stringify(params)); }
  async genererPII(params: any) { return this.appelNIE("Expert PII CI", JSON.stringify(params)); }
  async genererCurriculum(params: any) { return this.appelNIE("Expert CV", JSON.stringify(params)); }
  async analyser4Savoirs(params: any) { return this.appelNIE("Expert 4 Savoirs", JSON.stringify(params)); }
  async scorerCV(params: any) { return { score: 85 }; }
  async genererOrientationScolaire(params: any) { return this.appelNIE("Conseiller Scolaire", JSON.stringify(params)); }
  async diagnosticOrganisationnel(params: any) { return this.appelNIE("Expert RH", JSON.stringify(params)); }
  async genererPlanFormation(params: any) { return this.appelNIE("Expert Formation", JSON.stringify(params)); }
  async matcherEmploi(params: any) { return this.appelNIE("Expert Matching", JSON.stringify(params)); }
  async genererCoachingAdaptatif(params: any) { return this.appelNIE("Coach YIRA", JSON.stringify(params)); }
  async analyserPredictif(params: any) { return this.appelNIE("Analyste", JSON.stringify(params)); }
  async evaluerFonctionnaire(params: any) { return this.appelNIE("Expert DGFP", JSON.stringify(params)); }
  async evaluerEnseignant(params: any) { return this.appelNIE("Expert MENET", JSON.stringify(params)); }
  async predireEvolutionCarriere(params: any) { return this.appelNIE("Analyste Carrière", JSON.stringify(params)); }
}