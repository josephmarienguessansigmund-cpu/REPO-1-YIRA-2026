import { Controller, Post, Body, HttpCode, Res } from '@nestjs/common';
import { Response } from 'express';
import { UssdService } from './ussd.service';

@Controller('ussd')
export class UssdController {
  constructor(private readonly ussdService: UssdService) {}

  @Post()
  @HttpCode(200)
  async handle(@Body() body: any, @Res() res: Response) {
    const rep = await this.ussdService.handle({
      sessionId: body.sessionId,
      phoneNumber: body.phoneNumber,
      text: body.text || '',
    });
    res.set('Content-Type', 'text/plain');
    res.send(rep);
  }
}
