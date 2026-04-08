import { Controller, Post, Body, Get, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { IaService } from './ia.service';
import { checkRateLimit } from '../common/rate-limiter';

@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @Get()
  healthCheck() {
    return { status: 'Moteur IA YIRA opérationnel', nie: 'ACTIF' };
  }

  @Get('sante')
  async sante() {
    return await this.iaService.testerNIE();
  }

  // Rate limit 10 req/min sur toutes les routes IA génératives
  private checkIaRateLimit(req: Request, route: string): void {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
    const rl = checkRateLimit(`ia:${route}:${ip}`, 10, 60_000);
    if (!rl.allowed) {
      throw new HttpException(
        `Quota IA atteint. Attendez ${rl.retryAfter}s.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }

  @Post('inculturer')
  async inculturer(@Body() body: any, @Req() req: Request) {
    this.checkIaRateLimit(req, 'inculturer');
    if (!body?.sigmundId || !body?.originalText || !body?.niveau) {
      throw new HttpException('sigmundId, originalText et niveau requis', HttpStatus.BAD_REQUEST);
    }
    return await this.iaService.inculturerQuestion(
      body.sigmundId, body.originalText, body.niveau
    );
  }

  @Post('rapport')
  async rapport(@Body() body: any, @Req() req: Request) {
    this.checkIaRateLimit(req, 'rapport');
    try {
      const raw = await this.iaService.genererRapportOrientation(body);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try { return JSON.parse(cleaned); } catch { return { rapport: raw }; }
    } catch (e) {
      throw new HttpException(
        `NIE indisponible: ${e.message}`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  @Post('orientation')
  async orientation(@Body() body: any, @Req() req: Request) {
    this.checkIaRateLimit(req, 'orientation');
    try {
      const raw = await this.iaService.genererOrientationScolaire(body);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try { return JSON.parse(cleaned); } catch { return { orientation: raw }; }
    } catch (e) {
      throw new HttpException(`NIE orientation: ${e.message}`, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Post('pii')
  async pii(@Body() body: any, @Req() req: Request) {
    this.checkIaRateLimit(req, 'pii');
    try {
      const raw = await this.iaService.genererPII(body);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try { return JSON.parse(cleaned); } catch { return { pii: raw }; }
    } catch (e) {
      throw new HttpException(`NIE PII: ${e.message}`, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Post('coaching')
  async coaching(@Body() body: any, @Req() req: Request) {
    this.checkIaRateLimit(req, 'coaching');
    return await this.iaService.genererCoachingAdaptatif(body);
  }

  @Post('matching')
  async matching(@Body() body: any, @Req() req: Request) {
    this.checkIaRateLimit(req, 'matching');
    return await this.iaService.matcherEmploi(body);
  }

  @Post('fonctionnaire')
  async fonctionnaire(@Body() body: any, @Req() req: Request) {
    this.checkIaRateLimit(req, 'fonctionnaire');
    try {
      const raw = await this.iaService.evaluerFonctionnaire(body);
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      try { return JSON.parse(cleaned); } catch { return { evaluation: raw }; }
    } catch (e) {
      throw new HttpException(`NIE fonctionnaire: ${e.message}`, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Post('formation')
  async formation(@Body() body: any, @Req() req: Request) {
    this.checkIaRateLimit(req, 'formation');
    return await this.iaService.genererPlanFormation(body);
  }

  @Post('predictif')
  async predictif(@Body() body: any, @Req() req: Request) {
    this.checkIaRateLimit(req, 'predictif');
    return await this.iaService.analyserPredictif(body);
  }
}
