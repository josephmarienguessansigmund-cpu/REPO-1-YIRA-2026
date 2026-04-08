import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class MessagerieService {
  private readonly logger = new Logger(MessagerieService.name);
  private readonly supabase;

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.get('SUPABASE_URL'),
      this.config.get('SUPABASE_SERVICE_KEY'),
    );
  }

  async creerConversationMatching(params: {
    candidat_id: string;
    drh_id: string;
    offre_id: string;
    score_matching: number;
    conseiller_id?: string;
    country_code: string;
  }) {
    this.logger.log(`Nouvelle conversation ? candidat ${params.candidat_id} ? DRH ${params.drh_id}`);
    const { data, error } = await this.supabase
      .from('YiraConversation')
      .insert({
        candidat_id: params.candidat_id,
        drh_id: params.drh_id,
        offre_id: params.offre_id,
        conseiller_id: params.conseiller_id,
        score_matching: params.score_matching,
        statut: 'en_attente',
        anonymisee: true,
        country_code: params.country_code,
      })
      .select()
      .single();
    if (error) throw new Error(`Erreur création conversation: ${error.message}`);
    await this.envoyerPasseport(data.id, params.candidat_id);
    return data;
  }

  async envoyerMessage(params: {
    conversation_id: string;
    expediteur_id: string;
    expediteur_type: string;
    contenu: string;
    type_message?: string;
    country_code: string;
  }) {
    const conv = await this.getConversation(params.conversation_id);
    if (!conv) throw new NotFoundException('Conversation introuvable');
    const { data, error } = await this.supabase
      .from('YiraMessage')
      .insert({
        conversation_id: params.conversation_id,
        expediteur_id: params.expediteur_id,
        expediteur_type: params.expediteur_type,
        contenu: params.contenu,
        type_message: params.type_message ?? 'texte',
        lu: false,
        country_code: params.country_code,
      })
      .select()
      .single();
    if (error) throw new Error(`Erreur envoi message: ${error.message}`);
    await this.notifierDestinataire(conv, params.expediteur_type);
    return data;
  }

  async manifesterInteret(params: {
    conversation_id: string;
    drh_id: string;
    country_code: string;
  }) {
    const conv = await this.getConversation(params.conversation_id);
    if (!conv) throw new NotFoundException('Conversation introuvable');
    if (conv.drh_id !== params.drh_id) throw new ForbiddenException('Accès refusé');
    await this.supabase
      .from('YiraConversation')
      .update({ statut: 'active', anonymisee: false })
      .eq('id', params.conversation_id);
    await this.supabase.from('YiraSmsLog').insert({
      beneficiaire_id: conv.candidat_id,
      type_sms: 'MATCHING_INTERET',
      telephone: 'via_profil',
      contenu: 'YIRA: Un employeur est intéressé par votre profil ! Votre conseiller vous contacte sous 24h.',
      statut: 'EN_ATTENTE',
      country_code: params.country_code,
    });
    return { candidat_revele: true, message: 'Profil complet débloqué. Le conseiller YIRA coordonne la mise en relation.' };
  }

  async enregistrerDecision(params: {
    conversation_id: string;
    decision: 'acceptee' | 'refusee';
    acteur_id: string;
    acteur_type: string;
    motif?: string;
    country_code: string;
  }) {
    await this.supabase
      .from('YiraConversation')
      .update({ statut: params.decision })
      .eq('id', params.conversation_id);
    await this.envoyerMessage({
      conversation_id: params.conversation_id,
      expediteur_id: params.acteur_id,
      expediteur_type: params.acteur_type,
      contenu: params.decision === 'acceptee'
        ? `Candidature acceptée${params.motif ? ` — ${params.motif}` : ''}. Le contrat sera préparé sous 48h.`
        : `Candidature non retenue${params.motif ? ` — ${params.motif}` : ''}. Le candidat sera réorienté.`,
      type_message: 'decision',
      country_code: params.country_code,
    });
    this.logger.log(`Décision ? ${params.decision} · conversation ${params.conversation_id}`);
  }

  async getMessages(conversation_id: string, utilisateur_id: string) {
    await this.supabase
      .from('YiraMessage')
      .update({ lu: true })
      .eq('conversation_id', conversation_id)
      .neq('expediteur_id', utilisateur_id);
    const { data } = await this.supabase
      .from('YiraMessage')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });
    return data ?? [];
  }

  async getConversations(utilisateur_id: string, role: string) {
    const colonne = role === 'candidat' ? 'candidat_id' : role === 'drh' ? 'drh_id' : 'conseiller_id';
    const { data } = await this.supabase
      .from('YiraConversation')
      .select('*')
      .eq(colonne, utilisateur_id)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  private async getConversation(id: string) {
    const { data } = await this.supabase
      .from('YiraConversation')
      .select('*')
      .eq('id', id)
      .single();
    return data;
  }

  private async envoyerPasseport(conversation_id: string, candidat_id: string) {
    const { data: eval_ } = await this.supabase
      .from('YiraEvaluation')
      .select('profil_riasec, score_global, niveau')
      .eq('beneficiaire_id', candidat_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    await this.supabase.from('YiraMessage').insert({
      conversation_id,
      expediteur_id: 'YIRA_SYSTEM',
      expediteur_type: 'conseiller',
      contenu: JSON.stringify({
        code_candidat: `CAND-${candidat_id.slice(-4).toUpperCase()}`,
        niveau: eval_?.niveau ?? 'N2',
        score_employabilite: eval_?.score_global ?? 0,
        profil_riasec: eval_?.profil_riasec ?? 'N/A',
        disponibilite: 'Immédiate',
      }),
      type_message: 'document',
      lu: false,
      country_code: 'CI',
    });
  }

  private async notifierDestinataire(conv: any, expediteur_type: string) {
    const destinataire_id = expediteur_type === 'drh' ? conv.candidat_id : conv.drh_id;
    await this.supabase.from('YiraSmsLog').insert({
      beneficiaire_id: destinataire_id,
      type_sms: 'NOUVEAU_MESSAGE',
      telephone: 'via_profil',
      contenu: 'YIRA: Vous avez un nouveau message. Connectez-vous sur yira.ci/messagerie',
      statut: 'EN_ATTENTE',
      country_code: conv.country_code,
    });
  }
}
