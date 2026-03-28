import { Injectable, Logger } from '@nestjs/common';
// @ts-ignore
const { FedaPay, Transaction } = require('fedapay');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor() {
    FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY);
    FedaPay.setEnvironment('sandbox'); // Passer à 'live' pour la mise en production officielle
  }

  /**
   * Génère un lien de paiement personnalisé
   * @param userData Infos du jeune (Nom, Email, Tel)
   * @param montant Le prix choisi (ex: 2000, 5000, 10000)
   * @param niveau Le niveau d'inculturation (N1, N2, N3) pour la description
   */
  async creerLienBilan(
    userData: { nom: string; email: string; tel: string }, 
    montant: number, 
    niveau: string = 'N2'
  ) {
    try {
      this.logger.log(`Création lien FedaPay pour ${userData.nom} - Niveau ${niveau} - Montant: ${montant} FCFA`);

      const transaction = await Transaction.create({
        description: `Bilan NIE YIRA - Niveau ${niveau} - ${userData.nom}`,
        amount: montant, // Le montant est désormais flexible
        currency: { iso: 'XOF' },
        callback_url: 'https://orientations.yira-ci.com/dashboard',
        customer: {
          firstname: userData.nom,
          email: userData.email,
          phone_number: { number: userData.tel, country: 'CI' }
        }
      });

      const token = await transaction.generateToken();
      return { 
        url: token.url,
        transactionId: transaction.id // Utile pour le suivi dans Supabase
      };
    } catch (error) {
      this.logger.error(`Erreur FedaPay : ${error.message}`);
      throw error;
    }
  }
}
