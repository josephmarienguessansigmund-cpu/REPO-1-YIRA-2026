// Dans src/payments/payments.controller.ts

@Post('generer-lien')
async genererLien(@Body() body: any) {
  const { user, education_level } = body;

  // LOGIQUE DE PRIX NOHAMA CONSULTING
  let montant = 5000; // Prix par défaut (N2)
  
  if (education_level === 'N1') montant = 2000;  // Prix Social / Insertion
  if (education_level === 'N3') montant = 10000; // Prix Expert / Cadre

  // On appelle votre nouveau service dynamique
  return await this.paymentsService.creerLienBilan(user, montant, education_level);
}
