import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Importation spécifique pour éviter les erreurs de structure
const { FedaPay, Transaction } = require('fedapay');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('FEDAPAY_SECRET_KEY');
    
    if (!secretKey) {
      this.logger.error("ATTENTION : La variable FEDAPAY_SECRET_KEY est vide sur Railway !");
    }

    FedaPay.setApiKey(secretKey);
    FedaPay.setEnvironment('sandbox');
  }

  async creerLienBilan(user: any, montant: number, niveau: string) {
    try {
      this.logger.log(`Tentative FedaPay pour : ${user.email}`);

      const transaction = await Transaction.create({
        description: `Bilan YIRA - ${niveau} - ${user.nom}`,
        amount: montant,
        currency: { iso: 'XOF' },
        callback_url: 'https://yira-api-production.up.railway.app/api/v1/payments/callback',
        customer: {
          firstname: user.nom.split(' ')[0] || 'Client',
          lastname: user.nom.split(' ')[1] || 'YIRA',
          email: user.email.trim(),
          phone_number: {
            number: user.tel.replace(/\s+/g, ''), // Enlève les espaces du téléphone
            country: 'ci'
          }
        }
      });

      const token = await transaction.generateToken();
      this.logger.log(`Lien généré avec succès : ${token.url}`);
      return { url: token.url };

    } catch (error) {
      this.logger.error(`Erreur fatale FedaPay : ${error.message}`);
      throw error;
    }
  }
}