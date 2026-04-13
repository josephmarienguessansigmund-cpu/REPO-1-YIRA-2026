import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaysService } from './pays.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('pays')
export class PaysController {
  constructor(private readonly paysService: PaysService) {}

  @Get()
  async listerPays() {
    const pays = await this.paysService.getPaysActifs();
    return { success: true, data: pays, total: pays.length };
  }

  @UseGuards(JwtAuthGuard)
  @Get('tous')
  async listerTousPays() {
    const pays = await this.paysService.getTousPays();
    return { success: true, data: pays, total: pays.length };
  }

  @Get(':code')
  async getPays(@Param('code') code: string) {
    const pays = await this.paysService.getInfoPays(code.toUpperCase());
    if (!pays) return { success: false, message: `Pays ${code} introuvable` };
    return { success: true, data: pays };
  }

  @Get(':code/districts')
  async getDistricts(@Param('code') code: string) {
    const districts = await this.paysService.getDistricts(code.toUpperCase());
    return { success: true, data: districts, total: districts.length };
  }

  @UseGuards(JwtAuthGuard)
  @Post('cache/recharger')
  async rechargerCache() {
    const result = await this.paysService.forcerRechargement();
    return { success: true, ...result };
  }
}