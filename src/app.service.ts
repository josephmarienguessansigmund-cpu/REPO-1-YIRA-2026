import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'YIRA API - Plateforme Nationale CI';
  }
}
