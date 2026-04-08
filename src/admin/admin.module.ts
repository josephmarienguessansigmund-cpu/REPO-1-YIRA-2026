import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
@Module({ imports: [ConfigModule], providers: [AdminService], controllers: [AdminController], exports: [AdminService] })
export class AdminModule {}
