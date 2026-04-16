import { Controller, Get, Query } from '@nestjs/common';
import { FilieresService } from './filieres.service';

@Controller('filieres')
export class FilieresController {
  constructor(private readonly filieresService: FilieresService) {}

  @Get()
  findAll(@Query('pays') pays: string = 'CI') {
    return this.filieresService.findAll(pays);
  }
}