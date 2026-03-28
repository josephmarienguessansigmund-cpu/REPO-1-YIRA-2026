import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Importation sécurisée du SDK
const FedaPay = require('fedapay').FedaPay;
const Transaction = require('fedapay').Transaction;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('FEDAPAY_SECRET_KEY');
    
    if (secretKey) {
      this.logger.log(`Clé FedaPay configurée (commence par : ${secretKey.substring(0, 7)})`);
      FedaPay.setApiKey(secretKey);
      FedaPay.setEnvironment('sandbox'); // Garder sandbox pour les tests
    } else {
      this.logger.error("ALERTE : La variable FEDAPAY_SECRET_KEY est manquante sur Railway !");
    }
  }

  async creerLienBilan(user: any, montant: number, niveau: string) {
    try {
      this.logger.log(`Création transaction pour : ${user.email}`);

      const transaction = await Transaction.create({
        description: `Bilan YIRA ${niveau}`,
        amount: montant,
        currency: { iso: 'XOF' },
        callback_url: 'https://yira-api-production.up.railway.app/api/v1/payments/callback',
        customer: {
          firstname: user.nom || 'Joseph',
          lastname: 'N\'Guessan',
          email: user.email.trim(),
          // Format simplifié pour éviter les erreurs de validation
          phone_number: {
            number: user.tel.replace(/\s+/g, ''), // Supprime les espaces
            country: 'ci'
          }
        }
      });

      const token = await transaction.generateToken();
      return { url: token.url };

    } catch (error) {
      this.logger.error(`Erreur FedaPay : ${error.message}`);
      throw error;
    }
  }
}