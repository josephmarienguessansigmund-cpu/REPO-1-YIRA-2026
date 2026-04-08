import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IaService } from './ia.service';
import { IaController } from './ia.controller';
@Module({ imports: [ConfigModule], providers: [IaService], controllers: [IaController], exports: [IaService] })
export class IaModule {}
