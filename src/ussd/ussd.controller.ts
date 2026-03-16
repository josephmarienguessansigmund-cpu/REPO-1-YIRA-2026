import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { UssdService } from './ussd.service';
@Controller('ussd')
export class UssdController {
  constructor(private readonly ussdService: UssdService) {}
  @Post('session')
  async session(@Body() body: { sessionId: string; serviceCode: string; phoneNumber: string; text: string }, @Res() res: Response) {
    const reponse = await this.ussdService.traiterSession({ sessionId: body.sessionId, serviceCode: body.serviceCode, phoneNumber: body.phoneNumber, text: body.text || '' });
    res.set('Content-Type', 'text/plain');
    res.send(reponse);
  }
}
