import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Importation robuste du SDK
const fedapay = require('fedapay');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('FEDAPAY_SECRET_KEY');
    fedapay.FedaPay.setApiKey(secretKey);
    fedapay.FedaPay.setEnvironment('sandbox');
  }

  async creerLienBilan(user: any, montant: number, niveau: string) {
    try {
      // 1. On s'assure que le montant est un entier pur
      const montantFinal = Math.round(montant);

      // 2. Nettoyage radical du téléphone (on ne garde que les 10 derniers chiffres)
      // On enlève tout ce qui n'est pas chiffre et on prend les 10 derniers
      const rawPhone = user.tel.replace(/\D/g, '');
      const cleanPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;

      this.logger.log(`Envoi FedaPay : ${user.email} | Tel: ${cleanPhone} | Prix: ${montantFinal}`);

      const transaction = await fedapay.Transaction.create({
        description: `Bilan YIRA ${niveau}`,
        amount: montantFinal,
        currency: { iso: 'XOF' },
        callback_url: 'https://yira-api-production.up.railway.app/api/v1/payments/callback',
        customer: {
          firstname: "Joseph-Marie", 
          lastname: "NGUESSAN", // On enlève l'apostrophe ici pour le test
          email: user.email.trim().toLowerCase(),
          phone_number: {
            number: cleanPhone,
            country: 'ci' // 'ci' en minuscules est souvent mieux supporté par leur SDK
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