import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagerieService } from './messagerie.service';
import { MessagerieController } from './messagerie.controller';

@Module({
  imports: [ConfigModule],
  providers: [MessagerieService],
  controllers: [MessagerieController],
  exports: [MessagerieService],
})
export class MessagerieModule {}
