import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CarteService } from './carte.service';
import { CarteController } from './carte.controller';
@Module({ imports: [ConfigModule], providers: [CarteService], controllers: [CarteController], exports: [CarteService] })
export class CarteModule {}
