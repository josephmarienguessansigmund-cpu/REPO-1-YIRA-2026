import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MessagerieService } from './messagerie.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantId } from '../tenant/tenant.decorator';

@UseGuards(JwtAuthGuard)
@Controller('messagerie')
export class MessagerieController {
  constructor(private readonly messagerieService: MessagerieService) {}

  @Get('conversations')
  async mesConversations(@Request() req, @TenantId() country_code: string) {
    return this.messagerieService.getConversations(req.user.id, req.user.role);
  }

  @Get(':conversation_id/messages')
  async messages(@Param('conversation_id') id: string, @Request() req) {
    return this.messagerieService.getMessages(id, req.user.id);
  }

  @Post(':conversation_id/envoyer')
  async envoyer(
    @Param('conversation_id') id: string,
    @Body() body: { contenu: string; type_message?: string },
    @Request() req,
    @TenantId() country_code: string,
  ) {
    return this.messagerieService.envoyerMessage({
      conversation_id: id,
      expediteur_id: req.user.id,
      expediteur_type: req.user.role,
      contenu: body.contenu,
      type_message: body.type_message,
      country_code,
    });
  }

  @Post(':conversation_id/interet')
  async interet(
    @Param('conversation_id') id: string,
    @Request() req,
    @TenantId() country_code: string,
  ) {
    return this.messagerieService.manifesterInteret({
      conversation_id: id,
      drh_id: req.user.id,
      country_code,
    });
  }

  @Post(':conversation_id/decision')
  async decision(
    @Param('conversation_id') id: string,
    @Body() body: { decision: 'acceptee' | 'refusee'; motif?: string },
    @Request() req,
    @TenantId() country_code: string,
  ) {
    return this.messagerieService.enregistrerDecision({
      conversation_id: id,
      decision: body.decision,
      acteur_id: req.user.id,
      acteur_type: req.user.role,
      motif: body.motif,
      country_code,
    });
  }
}
