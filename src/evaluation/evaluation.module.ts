import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EvaluationController } from './evaluation.controller';
import { SigmundService } from './sigmund.service';
import { YiraInternalService } from './yira-internal.service';
import { EVALUATION_PROVIDER } from './evaluation.interface';

// ─────────────────────────────────────────────────────────────────────────────
// EvaluationModule
//
// Le provider actif est contrôlé par la variable d'environnement :
//   EVALUATION_PROVIDER=sigmund        → SigmundService (défaut Phase 0)
//   EVALUATION_PROVIDER=yira_internal  → YiraInternalService (Phase 2+)
//
// Pour basculer : changer .env + redémarrer. Zéro modification de code.
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [ConfigModule],
  controllers: [EvaluationController],
  providers: [
    SigmundService,
    YiraInternalService,

    // Factory provider — injecte le bon service selon .env
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
        return sigmund; // défaut : SigmundTest
      },
      inject: [ConfigService, SigmundService, YiraInternalService],
    },
  ],
  exports: [EVALUATION_PROVIDER, SigmundService],
})
export class EvaluationModule {}