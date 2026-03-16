import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
  @Get('dashboard') async dashboard(@Query('country_code') cc = 'CI') { return this.adminService.getDashboardStats(cc); }
  @Get('metiers') async listerMetiers(@Query('country_code') cc = 'CI') { return this.adminService.listerMetiers(cc); }
  @Post('metiers') async ajouterMetier(@Body() dto: any) { return this.adminService.ajouterMetier(dto); }
  @Put('metiers/:id') async modifierMetier(@Param('id') id: string, @Body() dto: any) { return this.adminService.modifierMetier(id, dto); }
  @Get('filieres') async listerFilieres(@Query('country_code') cc = 'CI') { return this.adminService.listerFilieres(cc); }
  @Post('filieres') async ajouterFiliere(@Body() dto: any) { return this.adminService.ajouterFiliere(dto); }
  @Get('etablissements') async listerEtablissements(@Query('country_code') cc = 'CI', @Query('district') d?: string) { return this.adminService.listerEtablissements(cc, d); }
  @Post('etablissements') async ajouterEtablissement(@Body() dto: any) { return this.adminService.ajouterEtablissement(dto); }
  @Get('partenaires') async listerPartenaires(@Query('country_code') cc = 'CI', @Query('type') t?: string) { return this.adminService.listerPartenaires(cc, t); }
  @Post('partenaires') async ajouterPartenaire(@Body() dto: any) { return this.adminService.ajouterPartenaire(dto); }
  @Get('fonctionnaires') async listerFonctionnaires(@Query('ministere') m?: string, @Query('country_code') cc = 'CI') { return this.adminService.listerFonctionnaires(m, cc); }
  @Post('fonctionnaires') async ajouterFonctionnaire(@Body() dto: any) { return this.adminService.ajouterFonctionnaire(dto); }
  @Get('quiz') async listerQuiz(@Query('country_code') cc = 'CI', @Query('categorie') cat?: string) { return this.adminService.listerQuiz(cc, cat); }
  @Post('quiz') async ajouterQuiz(@Body() dto: any) { return this.adminService.ajouterQuiz(dto); }
  @Post('contenus') async ajouterContenu(@Body() dto: any) { return this.adminService.ajouterContenu(dto); }
}
