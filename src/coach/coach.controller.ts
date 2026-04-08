import {
  Controller, Post, Get, Delete,
  Body, Param, Query, Req, HttpException, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { CoachService } from './coach.service';
import { checkRateLimit } from '../common/rate-limiter';

@Controller('coach')
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  // ── POST /api/v1/coach/chat ─────────────────────────────────
  // Rate limit : 20 messages / minute / IP (protège quota Claude)
  @Post('chat')
  async chat(@Body() body: any, @Req() req: Request) {
    // Validation minimale
    if (!body?.session_id || !body?.message) {
      throw new HttpException(
        'session_id et message sont obligatoires',
        HttpStatus.BAD_REQUEST
      );
    }
    if (typeof body.message !== 'string' || body.message.trim().length === 0) {
      throw new HttpException('Message vide', HttpStatus.BAD_REQUEST);
    }
    if (body.message.length > 2000) {
      throw new HttpException('Message trop long (max 2000 caractères)', HttpStatus.BAD_REQUEST);
    }

    // Rate limiting par IP
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
    const rl = checkRateLimit(`coach:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      throw new HttpException(
        `Trop de messages. Attendez ${rl.retryAfter} secondes.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return await this.coachService.chat({
      session_id:      body.session_id,
      message:         body.message.trim(),
      beneficiaire_id: body.beneficiaire_id,
      niveau:          body.niveau || 'N2',
      country_code:    body.country_code || 'CI',
      profil:          body.profil || {},
    });
  }

  // ── GET /api/v1/coach/historique/:session_id ────────────────
  @Get('historique/:session_id')
  async historique(@Param('session_id') session_id: string) {
    if (!session_id || session_id.length < 5) {
      throw new HttpException('session_id invalide', HttpStatus.BAD_REQUEST);
    }
    return await this.coachService.lireSession(session_id);
  }

  // ── GET /api/v1/coach/sessions ──────────────────────────────
  @Get('sessions')
  async sessions(
    @Query('country_code') country_code?: string,
    @Query('flagged') flagged?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = Math.min(parseInt(limit || '50') || 50, 200);
    return await this.coachService.listerSessions({
      country_code,
      is_flagged: flagged === 'true' ? true : undefined,
      limit: limitNum,
    });
  }

  // ── GET /api/v1/coach/stats ─────────────────────────────────
  @Get('stats')
  async stats(@Query('country_code') country_code = 'CI') {
    return await this.coachService.getStats(country_code);
  }

  // ── DELETE /api/v1/coach/oubli/:beneficiaire_id ─────────────
  // Droit à l'oubli RGPD
  @Delete('oubli/:beneficiaire_id')
  async droitOubli(@Param('beneficiaire_id') beneficiaire_id: string) {
    if (!beneficiaire_id || beneficiaire_id.length < 10) {
      throw new HttpException('beneficiaire_id invalide', HttpStatus.BAD_REQUEST);
    }
    return await this.coachService.supprimerSession(beneficiaire_id);
  }

  // ── GET /api/v1/coach/sante ─────────────────────────────────
  @Get('sante')
  sante() {
    return {
      status:  'NIE-Coach opérationnel',
      version: '1.1',
      modules: ['F01','F02','F03','F04','F05','F06'],
      rateLimit: '20 msg/min/IP',
    };
  }
}
