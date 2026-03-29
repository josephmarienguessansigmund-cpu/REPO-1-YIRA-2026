import { Controller, Post, Get, Delete, Body, Param, Query } from '@nestjs/common';
import { CoachService } from './coach.service';

@Controller('coach')
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  // ── POST /api/v1/coach/chat ───────────────────────────────────
  // Message au NIE-Coach avec mémoire contextuelle
  @Post('chat')
  async chat(@Body() body: {
    session_id: string;
    message: string;
    beneficiaire_id?: string;
    niveau?: 'N1' | 'N2' | 'N3';
    country_code?: string;
    profil?: any;
  }) {
    if (!body.session_id || !body.message) {
      return { error: 'session_id et message sont obligatoires' };
    }
    return await this.coachService.chat(body);
  }

  // ── GET /api/v1/coach/historique/:session_id ─────────────────
  // Charger l'historique d'une session
  @Get('historique/:session_id')
  async historique(@Param('session_id') session_id: string) {
    return await this.coachService.lireSession(session_id);
  }

  // ── GET /api/v1/coach/sessions ───────────────────────────────
  // Audit conseiller — liste des sessions
  @Get('sessions')
  async sessions(
    @Query('country_code') country_code?: string,
    @Query('flagged') flagged?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.coachService.listerSessions({
      country_code,
      is_flagged: flagged === 'true' ? true : undefined,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  // ── GET /api/v1/coach/stats ──────────────────────────────────
  // Stats dashboard admin
  @Get('stats')
  async stats(@Query('country_code') country_code = 'CI') {
    return await this.coachService.getStats(country_code);
  }

  // ── DELETE /api/v1/coach/oubli/:beneficiaire_id ──────────────
  // Droit à l'oubli RGPD — supprimer toutes les conversations
  @Delete('oubli/:beneficiaire_id')
  async droitOubli(@Param('beneficiaire_id') beneficiaire_id: string) {
    return await this.coachService.supprimerSession(beneficiaire_id);
  }

  // ── GET /api/v1/coach/sante ──────────────────────────────────
  @Get('sante')
  sante() {
    return { status: 'NIE-Coach opérationnel', version: '1.0', modules: ['F01','F02','F03','F04','F05','F06'] };
  }
}
