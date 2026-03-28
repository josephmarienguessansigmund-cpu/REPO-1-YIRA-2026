import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// On utilise require car le SDK FedaPay n'a pas toujours de types TS parfaits
const FedaPay = require('fedapay');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private configService: ConfigService) {
    // On s'assure d'utiliser la clé SECRÈTE (sk_...)
    const secretKey = this.configService.get<string>('FEDAPAY_SECRET_KEY');
    FedaPay.FedaPay.setApiKey(secretKey);
    FedaPay.FedaPay.setEnvironment('sandbox'); // Gardez 'sandbox' pour vos tests actuels
  }

  async creerLienBilan(user: any, montant: number, niveau: string) {
    try {
      this.logger.log(`Demande FedaPay : ${user.email} | ${montant} FCFA`);

      const transaction = await FedaPay.Transaction.create({
        description: `Bilan NIE YIRA - Niveau ${niveau}`,
        amount: montant,
        currency: { iso: 'XOF' }, // Toujours XOF pour la Côte d'Ivoire
        callback_url: 'https://yira-api-production.up.railway.app/api/v1/payments/callback',
        customer: {
          firstname: user.nom || 'Client',
          lastname: 'YIRA',
          email: user.email,
          phone_number: {
            number: user.tel,
            country: 'ci' // Code pays CI pour FedaPay
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