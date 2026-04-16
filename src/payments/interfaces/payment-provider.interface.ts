export interface PaymentProvider {
  name: string;
  generateLink(data: {
    amount: number;
    customer: {
      firstname: string;
      lastname: string;
      email: string;
      phone: string;
    };
    description: string;
  }): Promise<{ url: string; transactionId: string }>;
}