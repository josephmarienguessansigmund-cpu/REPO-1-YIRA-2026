import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AffectationService } from './affectation.service';
import { AffectationController } from './affectation.controller';

@Module({
  imports: [ConfigModule],
  providers: [AffectationService],
  controllers: [AffectationController],
  exports: [AffectationService],
})
export class AffectationModule {}
