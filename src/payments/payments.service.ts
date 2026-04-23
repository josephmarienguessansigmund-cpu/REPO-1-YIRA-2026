import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FedaPayProvider } from './providers/fedapay.provider';
// import { PaystackProvider } from './providers/paystack.provider'; // Futur !

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private fedapay: FedaPayProvider,
    // private paystack: PaystackProvider
  ) {}

  async creerLienBilan(user: any, montant: number, niveau: string, pays: string = 'CI') {
    // 1. On choisit le provider dynamiquement
    let provider = this.fedapay; 
    
    if (pays === 'NG') {
        // provider = this.paystack; // Simple comme bonjour à switcher
    }

    // 2. On génère le lien via le provider choisi
    const result = await provider.generateLink({
      amount: montant,
      description: `Bilan YIRA Niveau ${niveau}`,
      customer: {
        firstname: "Joseph-Marie",
        lastname: "NGUESSAN",
        email: user.email.trim().toLowerCase(),
        phone: user.tel.replace(/\D/g, '').slice(-10)
      }
    });

    // 3. ON ENREGISTRE DANS LA DB SÉCURISÉE (Via ton PrismaService)
    await this.prisma.yiraPayment.create({
      data: {
        beneficiaire_id: user.id,
        montant: montant,
        reference: result.transactionId,
        provider: provider.name,
        country_code: pays
      }
    });

    return { url: result.url };
  }
}