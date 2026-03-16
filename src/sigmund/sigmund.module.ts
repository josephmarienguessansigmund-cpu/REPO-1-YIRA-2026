import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SigmundService } from './sigmund.service';
import { SigmundController } from './sigmund.controller';

@Module({
  imports: [ConfigModule],
  providers: [SigmundService],
  controllers: [SigmundController],
  exports: [SigmundService],
})
export class SigmundModule {}
