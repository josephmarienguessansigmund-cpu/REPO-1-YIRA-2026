import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaysService } from './pays.service';
import { PaysController } from './pays.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PaysController],
  providers: [PaysService],
  exports: [PaysService],
})
export class PaysModule {}