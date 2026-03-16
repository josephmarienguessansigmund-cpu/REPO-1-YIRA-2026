export interface IEvaluationProvider {
  ouvrirSession(productCode?: string): Promise<{ assessment_id: number }>;
  enregistrerNom(assessment_id: number, prenom: string, nom: string): Promise<boolean>;
  enregistrerSignaletiques(assessment_id: number, signaletique: any): Promise<void>;
  lireQuestionnaire(assessment_id: number): Promise<{ nb_question: number; questions: any }>;
  soumettreReponses(assessment_id: number, reponses: number[]): Promise<boolean>;
  genererRapportPDF(assessment_id: number, email: string, nom_fichier: string): Promise<string>;
  recupererDonnees(assessment_id: number): Promise<any>;
  initialiserEvaluation(params: { prenom: string; nom: string; niveau: string; signaletique: any }): Promise<{ assessment_id: number; questionnaire: any }>;
}
