import { Injectable, Logger } from '@nestjs/common';
// @ts-ignore
const { FedaPay, Transaction } = require('fedapay');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor() {
    FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY);
    FedaPay.setEnvironment('sandbox'); 
  }

  async creerLienBilan(userData: { nom: string; email: string; tel: string }) {
    try {
      const transaction = await Transaction.create({
        description: 'Achat Bilan NIE - YIRA',
        amount: 5000, // Le montant pour Nohama Consulting est fixé ici
        currency: { iso: 'XOF' },
        callback_url: 'https://orientations.yira-ci.com/dashboard',
        customer: {
          firstname: userData.nom,
          email: userData.email,
          phone_number: { number: userData.tel, country: 'CI' }
        }
      });

      const token = await transaction.generateToken();
      return { url: token.url };
    } catch (error) {
      this.logger.error(`Erreur FedaPay: ${error.message}`);
      throw error;
    }
  }
}
