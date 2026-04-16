import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '../interfaces/payment-provider.interface';

// On utilise import au lieu de require pour aider TypeScript
const { FedaPay, Transaction } = require('fedapay');

@Injectable()
export class FedaPayProvider implements PaymentProvider {
  public readonly name = 'FEDAPAY';
  private readonly logger = new Logger(FedaPayProvider.name);

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('FEDAPAY_SECRET_KEY');
    if (secretKey) {
      FedaPay.setApiKey(secretKey);
      FedaPay.setEnvironment('sandbox'); // Passer à 'live' en production
    }
  }

  async generateLink(data: {
    amount: number;
    customer: {
      firstname: string;
      lastname: string;
      email: string;
      phone: string;
    };
    description: string;
  }): Promise<{ url: string; transactionId: string }> {
    try {
      const apiBaseUrl = 
        this.configService.get<string>('API_BASE_URL') || 
        'https://yira-api-production.up.railway.app';

      const transaction = await Transaction.create({
        description: data.description,
        amount: Math.round(data.amount),
        currency: { iso: 'XOF' },
        callback_url: `${apiBaseUrl}/api/v1/payments/callback`,
        customer: {
          firstname: data.customer.firstname,
          lastname: data.customer.lastname,
          email: data.customer.email,
          phone_number: {
            number: data.customer.phone,
            country: 'ci', // 'ci' en dur ici car c'est le format FedaPay
          },
        },
      });

      const token = await transaction.generateToken();
      return { 
        url: token.url, 
        transactionId: transaction.id.toString() 
      };
    } catch (error) {
      // On extrait le message de manière sécurisée pour TypeScript
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      
      this.logger.error(`Erreur FedaPay: ${message}`);
      throw error;
    }
  }
}