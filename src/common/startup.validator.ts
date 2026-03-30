import { Logger } from '@nestjs/common';

const logger = new Logger('StartupValidator');

interface EnvVar {
  key: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  { key: 'SUPABASE_URL',         required: true,  description: 'URL Supabase (données jeunes)' },
  { key: 'SUPABASE_SERVICE_KEY', required: true,  description: 'Clé service Supabase' },
  { key: 'JWT_SECRET',           required: true,  description: 'Secret JWT authentification' },
  { key: 'ANTHROPIC_API_KEY',    required: false, description: 'Clé Claude Haiku (NIE-Coach)' },
  { key: 'GEMINI_API_KEY',       required: false, description: 'Clé Gemini (fallback IA)' },
  { key: 'AT_API_KEY',    required: false, description: 'Africa\'s Talking — clé API SMS' },
  { key: 'AT_USERNAME',   required: false, description: 'Africa\'s Talking — nom de compte (ex: YIRA)' },
  { key: 'AT_SENDER_ID',  required: false, description: 'Africa\'s Talking — Sender ID approuvé (ex: YIRA-CI)' },
  { key: 'FEDAPAY_SECRET_KEY',   required: false, description: 'FedaPay paiements' },
];

export function validateStartup(): void {
  let hasError = false;
  const warnings: string[] = [];

  for (const env of ENV_VARS) {
    const val = process.env[env.key];
    if (!val || val.trim() === '') {
      if (env.required) {
        logger.error(`❌ CRITIQUE — Variable manquante: ${env.key} (${env.description})`);
        hasError = true;
      } else {
        warnings.push(`⚠️  ${env.key} non configuré — ${env.description} désactivé`);
      }
    } else {
      logger.log(`✅ ${env.key} configuré`);
    }
  }

  warnings.forEach(w => logger.warn(w));

  if (hasError) {
    logger.error('🚨 Démarrage annulé — variables critiques manquantes');
    process.exit(1);
  }

  logger.log('✅ Validation démarrage OK — YIRA API prête');
}
