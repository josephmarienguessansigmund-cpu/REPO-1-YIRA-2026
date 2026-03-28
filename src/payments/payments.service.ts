import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Importation sécurisée du SDK FedaPay
const { FedaPay, Transaction } = require('fedapay');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('FEDAPAY_SECRET_KEY');
    
    if (secretKey) {
      FedaPay.setApiKey(secretKey);
      FedaPay.setEnvironment('sandbox'); // Gardez 'sandbox' pour vos tests
      this.logger.log('FedaPay configuré avec succès.');
    } else {
      this.logger.error('Variable FEDAPAY_SECRET_KEY introuvable sur Railway !');
    }
  }

  async creerLienBilan(user: any, montant: number, niveau: string) {
    try {
      // 1. Nettoyage radical des données (FedaPay rejette les caractères spéciaux)
      const cleanEmail = user.email.trim().toLowerCase();
      const cleanPhone = user.tel.replace(/\D/g, '').slice(-10); // Garde les 10 derniers chiffres
      
      // On remplace "N'Guessan" par "NGUESSAN" pour éviter le bug de l'apostrophe
      const cleanFirstName = "Joseph-Marie";
      const cleanLastName = "NGUESSAN";

      this.logger.log(`Génération lien pour : ${cleanEmail} | Montant : ${montant} XOF`);

      const transaction = await Transaction.create({
        description: `Bilan YIRA Niveau ${niveau}`,
        amount: Math.round(montant),
        currency: { iso: 'XOF' },
        callback_url: 'https://yira-api-production.up.railway.app/api/v1/payments/callback',
        customer: {
          firstname: cleanFirstName,
          lastname: cleanLastName,
          email: cleanEmail,
          phone_number: {
            number: cleanPhone,
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