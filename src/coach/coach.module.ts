import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoachService } from './coach.service';
import { CoachController } from './coach.controller';

@Module({
  imports: [ConfigModule],
  providers: [CoachService],
  controllers: [CoachController],
  exports: [CoachService],
})
export class CoachModule {}
