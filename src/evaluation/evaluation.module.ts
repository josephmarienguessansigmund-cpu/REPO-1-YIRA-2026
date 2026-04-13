import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EvaluationController } from './evaluation.controller';
import { SigmundService } from './sigmund.service';
import { YiraInternalService } from './yira-internal.service';
import { EVALUATION_PROVIDER } from './evaluation.interface';

@Module({
  imports: [ConfigModule],
  controllers: [EvaluationController],
  providers: [
    SigmundService,
    YiraInternalService,
    {
      provide: EVALUATION_PROVIDER,
      useFactory: (
        config: ConfigService,
        sigmund: SigmundService,
        yiraInternal: YiraInternalService,
      ) => {
        const provider = config.get<string>('EVALUATION_PROVIDER', 'sigmund');
        if (provider === 'yira_internal') {
          return yiraInternal;
        }
        return sigmund;
      },
      inject: [ConfigService, SigmundService, YiraInternalService],
    },
  ],
  exports: [EVALUATION_PROVIDER, SigmundService, YiraInternalService],
})
export class EvaluationModule {}