import { Controller, Post, Body, Get } from '@nestjs/common';
import { IaService } from './ia.service';

@Controller('ia') // Ceci crée le préfixe /api/v1/ia
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @Get()
  healthCheck() {
    return { status: "Moteur IA YIRA opérationnel" };
  }

  @Post('inculturer') // Ceci crée la route /api/v1/ia/inculturer
  async inculturer(@Body() body: { sigmundId: string, originalText: string, niveau: string }) {
    return await this.iaService.inculturerQuestion(body.sigmundId, body.originalText, body.niveau);
  }
}