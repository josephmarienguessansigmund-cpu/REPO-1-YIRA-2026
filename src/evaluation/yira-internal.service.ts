import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IEvaluationProvider,
  EvaluationSession,
  EvaluationResultat,
  EvaluationInitParams,
  EvaluationReponses,
} from './evaluation.interface';

// ─────────────────────────────────────────────────────────────────────────────
// YiraInternalService — Moteur SigmundTest YIRA Africa
// 226 items · 7 modules · Adaptatif N1/N2/N3
// Culturalise pour le contexte ivoirien et africain francophone
// ─────────────────────────────────────────────────────────────────────────────

interface Question {
  id: number;
  module: string;
  dimension: string;
  texte: string;
  niveaux: ('N1' | 'N2' | 'N3')[];
}

// MODULE 1 — PERSONNALITE BIG FIVE (60 items)
const MODULE_PERSONNALITE: Question[] = [
  // Ouverture (12 items)
  { id: 1, module: 'personnalite', dimension: 'ouverture', texte: "J'aime decouvrir de nouvelles choses et apprendre des sujets varies.", niveaux: ['N1','N2','N3'] },
  { id: 2, module: 'personnalite', dimension: 'ouverture', texte: "J'aime imaginer des solutions originales a des problemes du quotidien.", niveaux: ['N1','N2','N3'] },
  { id: 3, module: 'personnalite', dimension: 'ouverture', texte: "Je suis curieux de comprendre comment les choses fonctionnent.", niveaux: ['N1','N2','N3'] },
  { id: 4, module: 'personnalite', dimension: 'ouverture', texte: "J'aime les discussions sur des sujets nouveaux ou inhabituels.", niveaux: ['N2','N3'] },
  { id: 5, module: 'personnalite', dimension: 'ouverture', texte: "Je m'interesse facilement a des domaines que je ne connais pas.", niveaux: ['N1','N2','N3'] },
  { id: 6, module: 'personnalite', dimension: 'ouverture', texte: "J'ai de l'imagination et j'aime creer des choses nouvelles.", niveaux: ['N1','N2','N3'] },
  { id: 7, module: 'personnalite', dimension: 'ouverture', texte: "Je lis ou j'ecoute des contenus sur des sujets varies.", niveaux: ['N2','N3'] },
  { id: 8, module: 'personnalite', dimension: 'ouverture', texte: "Je remets parfois en question les habitudes et traditions.", niveaux: ['N2','N3'] },
  { id: 9, module: 'personnalite', dimension: 'ouverture', texte: "J'aime explorer differentes facons de faire un meme travail.", niveaux: ['N1','N2','N3'] },
  { id: 10, module: 'personnalite', dimension: 'ouverture', texte: "Je m'interesse a des cultures et modes de vie differents du mien.", niveaux: ['N2','N3'] },
  { id: 11, module: 'personnalite', dimension: 'ouverture', texte: "Je cherche souvent a comprendre le sens profond des choses.", niveaux: ['N3'] },
  { id: 12, module: 'personnalite', dimension: 'ouverture', texte: "J'aime les defis intellectuels qui me font reflechir.", niveaux: ['N2','N3'] },
  // Conscience (12 items)
  { id: 13, module: 'personnalite', dimension: 'conscience', texte: "Je termine ce que je commence meme quand c'est difficile.", niveaux: ['N1','N2','N3'] },
  { id: 14, module: 'personnalite', dimension: 'conscience', texte: "Je suis organise et je garde mes affaires en ordre.", niveaux: ['N1','N2','N3'] },
  { id: 15, module: 'personnalite', dimension: 'conscience', texte: "Je respecte les delais et les engagements que je prends.", niveaux: ['N1','N2','N3'] },
  { id: 16, module: 'personnalite', dimension: 'conscience', texte: "Je verifie mon travail avant de le remettre.", niveaux: ['N1','N2','N3'] },
  { id: 17, module: 'personnalite', dimension: 'conscience', texte: "Je planifie mes taches a l'avance pour eviter les surprises.", niveaux: ['N2','N3'] },
  { id: 18, module: 'personnalite', dimension: 'conscience', texte: "Je suis ponctuel et je respecte les horaires.", niveaux: ['N1','N2','N3'] },
  { id: 19, module: 'personnalite', dimension: 'conscience', texte: "Je travaille methodiquement etape par etape.", niveaux: ['N1','N2','N3'] },
  { id: 20, module: 'personnalite', dimension: 'conscience', texte: "Je fixe des objectifs clairs et je fais tout pour les atteindre.", niveaux: ['N2','N3'] },
  { id: 21, module: 'personnalite', dimension: 'conscience', texte: "Je suis fiable — les autres peuvent compter sur moi.", niveaux: ['N1','N2','N3'] },
  { id: 22, module: 'personnalite', dimension: 'conscience', texte: "J'evite de remettre les choses au lendemain.", niveaux: ['N1','N2','N3'] },
  { id: 23, module: 'personnalite', dimension: 'conscience', texte: "Je fais attention aux details dans mon travail.", niveaux: ['N2','N3'] },
  { id: 24, module: 'personnalite', dimension: 'conscience', texte: "Je persevere face aux obstacles jusqu'a trouver une solution.", niveaux: ['N2','N3'] },
  // Extraversion (12 items)
  { id: 25, module: 'personnalite', dimension: 'extraversion', texte: "J'aime etre entouré de beaucoup de personnes.", niveaux: ['N1','N2','N3'] },
  { id: 26, module: 'personnalite', dimension: 'extraversion', texte: "Je prends facilement la parole dans un groupe.", niveaux: ['N1','N2','N3'] },
  { id: 27, module: 'personnalite', dimension: 'extraversion', texte: "Je me fais facilement de nouveaux amis.", niveaux: ['N1','N2','N3'] },
  { id: 28, module: 'personnalite', dimension: 'extraversion', texte: "Je suis a l'aise pour parler a des inconnus.", niveaux: ['N1','N2','N3'] },
  { id: 29, module: 'personnalite', dimension: 'extraversion', texte: "J'aime les reunions et les evenements sociaux.", niveaux: ['N2','N3'] },
  { id: 30, module: 'personnalite', dimension: 'extraversion', texte: "Je me sens energise apres avoir passe du temps avec des gens.", niveaux: ['N1','N2','N3'] },
  { id: 31, module: 'personnalite', dimension: 'extraversion', texte: "J'aime animer et dinamiser un groupe.", niveaux: ['N2','N3'] },
  { id: 32, module: 'personnalite', dimension: 'extraversion', texte: "Je parle volontiers de mes experiences et de mes idees.", niveaux: ['N1','N2','N3'] },
  { id: 33, module: 'personnalite', dimension: 'extraversion', texte: "Je prefere travailler en equipe plutot que seul.", niveaux: ['N1','N2','N3'] },
  { id: 34, module: 'personnalite', dimension: 'extraversion', texte: "Je suis souvent celui qui lance les conversations.", niveaux: ['N2','N3'] },
  { id: 35, module: 'personnalite', dimension: 'extraversion', texte: "J'aime les activites qui impliquent de rencontrer des gens.", niveaux: ['N1','N2','N3'] },
  { id: 36, module: 'personnalite', dimension: 'extraversion', texte: "Je m'exprime facilement et avec enthousiasme.", niveaux: ['N1','N2','N3'] },
  // Agreabilite (12 items)
  { id: 37, module: 'personnalite', dimension: 'agreabilite', texte: "J'aime aider les autres meme quand ca ne m'est pas demande.", niveaux: ['N1','N2','N3'] },
  { id: 38, module: 'personnalite', dimension: 'agreabilite', texte: "Je fais preuve de patience avec les personnes difficiles.", niveaux: ['N1','N2','N3'] },
  { id: 39, module: 'personnalite', dimension: 'agreabilite', texte: "Je cherche le compromis plutot que le conflit.", niveaux: ['N1','N2','N3'] },
  { id: 40, module: 'personnalite', dimension: 'agreabilite', texte: "Je suis sensible aux besoins et aux emotions des autres.", niveaux: ['N1','N2','N3'] },
  { id: 41, module: 'personnalite', dimension: 'agreabilite', texte: "Je fais confiance aux gens facilement.", niveaux: ['N1','N2','N3'] },
  { id: 42, module: 'personnalite', dimension: 'agreabilite', texte: "Je suis genereux de mon temps et de mes ressources.", niveaux: ['N1','N2','N3'] },
  { id: 43, module: 'personnalite', dimension: 'agreabilite', texte: "J'ecoute attentivement avant de repondre.", niveaux: ['N2','N3'] },
  { id: 44, module: 'personnalite', dimension: 'agreabilite', texte: "Je respecte les opinions differentes des miennes.", niveaux: ['N2','N3'] },
  { id: 45, module: 'personnalite', dimension: 'agreabilite', texte: "Je prefere la paix a avoir raison.", niveaux: ['N1','N2','N3'] },
  { id: 46, module: 'personnalite', dimension: 'agreabilite', texte: "Je pense souvent aux consequences de mes actes sur les autres.", niveaux: ['N2','N3'] },
  { id: 47, module: 'personnalite', dimension: 'agreabilite', texte: "Je suis loyal envers mes amis et ma famille.", niveaux: ['N1','N2','N3'] },
  { id: 48, module: 'personnalite', dimension: 'agreabilite', texte: "Je soutiens les autres dans les moments difficiles.", niveaux: ['N1','N2','N3'] },
  // Stabilite emotionnelle (12 items)
  { id: 49, module: 'personnalite', dimension: 'stabilite', texte: "Je reste calme meme dans les situations stressantes.", niveaux: ['N1','N2','N3'] },
  { id: 50, module: 'personnalite', dimension: 'stabilite', texte: "Je gere bien mes emotions quand les choses ne se passent pas comme prevu.", niveaux: ['N1','N2','N3'] },
  { id: 51, module: 'personnalite', dimension: 'stabilite', texte: "Je ne m'inquiete pas excessivement pour l'avenir.", niveaux: ['N1','N2','N3'] },
  { id: 52, module: 'personnalite', dimension: 'stabilite', texte: "Je reprends rapidement mon equilibre apres un echec.", niveaux: ['N1','N2','N3'] },
  { id: 53, module: 'personnalite', dimension: 'stabilite', texte: "Je peux travailler efficacement sous pression.", niveaux: ['N2','N3'] },
  { id: 54, module: 'personnalite', dimension: 'stabilite', texte: "Je ne laisse pas les critiques me demoraliser durablement.", niveaux: ['N2','N3'] },
  { id: 55, module: 'personnalite', dimension: 'stabilite', texte: "Je prends les decisions importantes sans trop d'hesitation.", niveaux: ['N2','N3'] },
  { id: 56, module: 'personnalite', dimension: 'stabilite', texte: "Je peux controler mes impulsions dans des situations tendues.", niveaux: ['N2','N3'] },
  { id: 57, module: 'personnalite', dimension: 'stabilite', texte: "Je fais face aux changements imprevisibles sans me laisser depasser.", niveaux: ['N2','N3'] },
  { id: 58, module: 'personnalite', dimension: 'stabilite', texte: "Je maintiens mon humeur positive meme dans des conditions difficiles.", niveaux: ['N1','N2','N3'] },
  { id: 59, module: 'personnalite', dimension: 'stabilite', texte: "Je gere bien la frustration quand je rencontre des obstacles.", niveaux: ['N1','N2','N3'] },
  { id: 60, module: 'personnalite', dimension: 'stabilite', texte: "Je recupere vite apres un moment de stress ou de fatigue.", niveaux: ['N1','N2','N3'] },
];

// MODULE 2 — COMPETENCES MANAGERIALES (24 items)
const MODULE_MANAGERIAL: Question[] = [
  { id: 61, module: 'managerial', dimension: 'vision', texte: "Je peux expliquer clairement un objectif a atteindre a une equipe.", niveaux: ['N2','N3'] },
  { id: 62, module: 'managerial', dimension: 'vision', texte: "Je sais motiver les autres a s'engager dans un projet commun.", niveaux: ['N2','N3'] },
  { id: 63, module: 'managerial', dimension: 'vision', texte: "Je pense a long terme et j'anticipe les consequences de mes decisions.", niveaux: ['N3'] },
  { id: 64, module: 'managerial', dimension: 'organisation', texte: "Je sais repartir les taches efficacement dans une equipe.", niveaux: ['N2','N3'] },
  { id: 65, module: 'managerial', dimension: 'organisation', texte: "Je peux gerer plusieurs projets en meme temps sans me perdre.", niveaux: ['N2','N3'] },
  { id: 66, module: 'managerial', dimension: 'organisation', texte: "Je sais prioriser les taches les plus importantes.", niveaux: ['N2','N3'] },
  { id: 67, module: 'managerial', dimension: 'decision', texte: "Je prends des decisions rapidement meme avec des informations incompletes.", niveaux: ['N2','N3'] },
  { id: 68, module: 'managerial', dimension: 'decision', texte: "Je pese les risques avant de m'engager dans une action.", niveaux: ['N2','N3'] },
  { id: 69, module: 'managerial', dimension: 'decision', texte: "Je prends la responsabilite de mes decisions meme si elles echouent.", niveaux: ['N2','N3'] },
  { id: 70, module: 'managerial', dimension: 'communication', texte: "Je sais donner des retours constructifs sans blesser les gens.", niveaux: ['N2','N3'] },
  { id: 71, module: 'managerial', dimension: 'communication', texte: "Je m'adapte a mon interlocuteur — je ne parle pas de la meme facon a tout le monde.", niveaux: ['N2','N3'] },
  { id: 72, module: 'managerial', dimension: 'communication', texte: "Je sais presenter une idee de facon claire et convaincante.", niveaux: ['N2','N3'] },
  { id: 73, module: 'managerial', dimension: 'gestion_conflits', texte: "Je sais desamorcer les tensions dans une equipe.", niveaux: ['N2','N3'] },
  { id: 74, module: 'managerial', dimension: 'gestion_conflits', texte: "Je peux trouver un accord entre deux personnes en desaccord.", niveaux: ['N2','N3'] },
  { id: 75, module: 'managerial', dimension: 'gestion_conflits', texte: "Je reste neutre et objectif lors d'un conflit au travail.", niveaux: ['N3'] },
  { id: 76, module: 'managerial', dimension: 'delegation', texte: "Je fais confiance aux autres pour accomplir des taches importantes.", niveaux: ['N2','N3'] },
  { id: 77, module: 'managerial', dimension: 'delegation', texte: "Je sais quand deleger et quand garder le controle.", niveaux: ['N3'] },
  { id: 78, module: 'managerial', dimension: 'delegation', texte: "Je donne de l'autonomie aux gens tout en verifiant les resultats.", niveaux: ['N3'] },
  { id: 79, module: 'managerial', dimension: 'developpement', texte: "J'aide les autres a progresser et a developper leurs competences.", niveaux: ['N2','N3'] },
  { id: 80, module: 'managerial', dimension: 'developpement', texte: "Je reconnais les talents autour de moi et je les encourage.", niveaux: ['N2','N3'] },
  { id: 81, module: 'managerial', dimension: 'performance', texte: "Je fixe des objectifs ambitieux mais realisables.", niveaux: ['N2','N3'] },
  { id: 82, module: 'managerial', dimension: 'performance', texte: "Je mesure les resultats et j'ajuste la strategie si necessaire.", niveaux: ['N3'] },
  { id: 83, module: 'managerial', dimension: 'adaptabilite', texte: "Je m'adapte rapidement quand les regles ou les conditions changent.", niveaux: ['N2','N3'] },
  { id: 84, module: 'managerial', dimension: 'adaptabilite', texte: "Je reste efficace meme dans des environnements incertains.", niveaux: ['N2','N3'] },
];

// MODULE 3 — INTELLIGENCE EMOTIONNELLE (32 items)
const MODULE_EQ: Question[] = [
  { id: 85, module: 'eq', dimension: 'conscience_soi', texte: "Je reconnais facilement mes forces et mes faiblesses.", niveaux: ['N1','N2','N3'] },
  { id: 86, module: 'eq', dimension: 'conscience_soi', texte: "Je comprends pourquoi je ressens certaines emotions.", niveaux: ['N1','N2','N3'] },
  { id: 87, module: 'eq', dimension: 'conscience_soi', texte: "Je sais quand je suis sur le point de perdre mon calme.", niveaux: ['N1','N2','N3'] },
  { id: 88, module: 'eq', dimension: 'conscience_soi', texte: "Je connais les situations qui me stressent particulierement.", niveaux: ['N2','N3'] },
  { id: 89, module: 'eq', dimension: 'conscience_soi', texte: "Je suis honnete avec moi-meme sur mes limites.", niveaux: ['N2','N3'] },
  { id: 90, module: 'eq', dimension: 'conscience_soi', texte: "Je comprends comment mon comportement affecte les autres.", niveaux: ['N2','N3'] },
  { id: 91, module: 'eq', dimension: 'regulation', texte: "Je peux controler mes emotions meme dans les moments intenses.", niveaux: ['N1','N2','N3'] },
  { id: 92, module: 'eq', dimension: 'regulation', texte: "Je sais me calmer rapidement apres un moment de colere.", niveaux: ['N1','N2','N3'] },
  { id: 93, module: 'eq', dimension: 'regulation', texte: "Je ne laisse pas mes emotions negatives affecter mon travail.", niveaux: ['N2','N3'] },
  { id: 94, module: 'eq', dimension: 'regulation', texte: "Je peux reporter une reaction emotionnelle quand c'est necessaire.", niveaux: ['N2','N3'] },
  { id: 95, module: 'eq', dimension: 'regulation', texte: "Je trouve des moyens sains de gerer le stress.", niveaux: ['N1','N2','N3'] },
  { id: 96, module: 'eq', dimension: 'regulation', texte: "Je reste positif meme dans des situations defavorables.", niveaux: ['N1','N2','N3'] },
  { id: 97, module: 'eq', dimension: 'motivation', texte: "Je suis motive meme quand les resultats tardent a venir.", niveaux: ['N1','N2','N3'] },
  { id: 98, module: 'eq', dimension: 'motivation', texte: "Je me fixe des standards eleves pour moi-meme.", niveaux: ['N2','N3'] },
  { id: 99, module: 'eq', dimension: 'motivation', texte: "J'ai un fort besoin d'accomplissement personnel.", niveaux: ['N2','N3'] },
  { id: 100, module: 'eq', dimension: 'motivation', texte: "Je persevere dans mes projets meme face aux echecs.", niveaux: ['N1','N2','N3'] },
  { id: 101, module: 'eq', dimension: 'motivation', texte: "Je prends des initiatives sans attendre qu'on me le demande.", niveaux: ['N2','N3'] },
  { id: 102, module: 'eq', dimension: 'motivation', texte: "Je reste optimiste face aux defis professionnels.", niveaux: ['N1','N2','N3'] },
  { id: 103, module: 'eq', dimension: 'empathie', texte: "Je comprends facilement ce que les autres ressentent.", niveaux: ['N1','N2','N3'] },
  { id: 104, module: 'eq', dimension: 'empathie', texte: "Je me mets facilement a la place des autres.", niveaux: ['N1','N2','N3'] },
  { id: 105, module: 'eq', dimension: 'empathie', texte: "Je detecte quand quelqu'un est mal a l'aise ou triste.", niveaux: ['N1','N2','N3'] },
  { id: 106, module: 'eq', dimension: 'empathie', texte: "Je sais adapter mon comportement selon les besoins emotionnels des autres.", niveaux: ['N2','N3'] },
  { id: 107, module: 'eq', dimension: 'empathie', texte: "Je prends en compte les emotions des autres dans mes decisions.", niveaux: ['N2','N3'] },
  { id: 108, module: 'eq', dimension: 'empathie', texte: "Je suis sensible aux injustices subies par les autres.", niveaux: ['N1','N2','N3'] },
  { id: 109, module: 'eq', dimension: 'social', texte: "Je cree facilement des liens de confiance avec les gens.", niveaux: ['N1','N2','N3'] },
  { id: 110, module: 'eq', dimension: 'social', texte: "Je resous les conflits en cherchant une solution acceptable pour tous.", niveaux: ['N2','N3'] },
  { id: 111, module: 'eq', dimension: 'social', texte: "Je peux influencer positivement l'humeur d'un groupe.", niveaux: ['N2','N3'] },
  { id: 112, module: 'eq', dimension: 'social', texte: "Je maintiens mes relations meme dans les periodes difficiles.", niveaux: ['N1','N2','N3'] },
  { id: 113, module: 'eq', dimension: 'social', texte: "Je sais travailler avec des personnes tres differentes de moi.", niveaux: ['N1','N2','N3'] },
  { id: 114, module: 'eq', dimension: 'social', texte: "Je collabore bien avec les personnes qui ont des opinions opposees.", niveaux: ['N2','N3'] },
  { id: 115, module: 'eq', dimension: 'social', texte: "Je sais ecouter activement sans interrompre.", niveaux: ['N1','N2','N3'] },
  { id: 116, module: 'eq', dimension: 'social', texte: "Je construis des reseaux professionnels solides.", niveaux: ['N3'] },
];

// MODULE 4 — LEADERSHIP (20 items)
const MODULE_LEADERSHIP: Question[] = [
  { id: 117, module: 'leadership', dimension: 'influence', texte: "Les gens me suivent naturellement quand je prends une initiative.", niveaux: ['N2','N3'] },
  { id: 118, module: 'leadership', dimension: 'influence', texte: "Je sais convaincre les autres meme sans autorite formelle.", niveaux: ['N2','N3'] },
  { id: 119, module: 'leadership', dimension: 'influence', texte: "Mon enthousiasme est contagieux et motive mon entourage.", niveaux: ['N2','N3'] },
  { id: 120, module: 'leadership', dimension: 'influence', texte: "Je sais creer une vision commune autour d'un projet.", niveaux: ['N3'] },
  { id: 121, module: 'leadership', dimension: 'courage', texte: "Je prends des decisions difficiles quand personne d'autre ne le fait.", niveaux: ['N2','N3'] },
  { id: 122, module: 'leadership', dimension: 'courage', texte: "Je defends mes convictions meme face a l'opposition.", niveaux: ['N2','N3'] },
  { id: 123, module: 'leadership', dimension: 'courage', texte: "J'assume la responsabilite des echecs de mon equipe.", niveaux: ['N3'] },
  { id: 124, module: 'leadership', dimension: 'courage', texte: "Je prends des risques calcules pour atteindre mes objectifs.", niveaux: ['N2','N3'] },
  { id: 125, module: 'leadership', dimension: 'service', texte: "Je mets mes interets de cote pour le bien de l'equipe.", niveaux: ['N2','N3'] },
  { id: 126, module: 'leadership', dimension: 'service', texte: "Je pense d'abord aux besoins des membres de mon equipe.", niveaux: ['N2','N3'] },
  { id: 127, module: 'leadership', dimension: 'service', texte: "Je cree des conditions favorables pour que les autres reussissent.", niveaux: ['N3'] },
  { id: 128, module: 'leadership', dimension: 'innovation', texte: "J'encourage mon equipe a proposer de nouvelles idees.", niveaux: ['N2','N3'] },
  { id: 129, module: 'leadership', dimension: 'innovation', texte: "Je remets en question les methodes etablies quand elles ne fonctionnent plus.", niveaux: ['N2','N3'] },
  { id: 130, module: 'leadership', dimension: 'innovation', texte: "Je cree un environnement ou les erreurs sont vues comme des apprentissages.", niveaux: ['N3'] },
  { id: 131, module: 'leadership', dimension: 'resilience', texte: "Je maintiens le cap meme quand les resultats ne sont pas au rendez-vous.", niveaux: ['N2','N3'] },
  { id: 132, module: 'leadership', dimension: 'resilience', texte: "Je rebondis rapidement apres un echec important.", niveaux: ['N2','N3'] },
  { id: 133, module: 'leadership', dimension: 'resilience', texte: "Je reste concentre sur les solutions plutot que sur les problemes.", niveaux: ['N2','N3'] },
  { id: 134, module: 'leadership', dimension: 'authenticite', texte: "J'agis en accord avec mes valeurs meme sous pression.", niveaux: ['N2','N3'] },
  { id: 135, module: 'leadership', dimension: 'authenticite', texte: "Je suis transparent sur mes intentions et mes motivations.", niveaux: ['N2','N3'] },
  { id: 136, module: 'leadership', dimension: 'authenticite', texte: "Je reconnais publiquement mes erreurs.", niveaux: ['N2','N3'] },
];

// MODULE 5 — INTERETS RIASEC (48 items)
const MODULE_RIASEC: Question[] = [
  // R — Realiste (8 items)
  { id: 137, module: 'riasec', dimension: 'R', texte: "J'aime travailler avec mes mains et fabriquer des objets concrets.", niveaux: ['N1','N2','N3'] },
  { id: 138, module: 'riasec', dimension: 'R', texte: "Je prefere les activites physiques et pratiques aux travaux de bureau.", niveaux: ['N1','N2','N3'] },
  { id: 139, module: 'riasec', dimension: 'R', texte: "J'aime reparer ou assembler des machines et des equipements.", niveaux: ['N1','N2','N3'] },
  { id: 140, module: 'riasec', dimension: 'R', texte: "Je me sens a l'aise dans des environnements exterieurs ou industriels.", niveaux: ['N1','N2','N3'] },
  { id: 141, module: 'riasec', dimension: 'R', texte: "J'aime les metiers qui produisent un resultat concret et visible.", niveaux: ['N1','N2','N3'] },
  { id: 142, module: 'riasec', dimension: 'R', texte: "Je me debrouille bien avec les outils techniques.", niveaux: ['N1','N2','N3'] },
  { id: 143, module: 'riasec', dimension: 'R', texte: "J'aime comprendre comment les objets sont construits.", niveaux: ['N1','N2','N3'] },
  { id: 144, module: 'riasec', dimension: 'R', texte: "Je prefere apprendre en faisant plutot qu'en ecoutant.", niveaux: ['N1','N2','N3'] },
  // I — Investigateur (8 items)
  { id: 145, module: 'riasec', dimension: 'I', texte: "J'aime analyser des problemes complexes pour trouver des solutions logiques.", niveaux: ['N1','N2','N3'] },
  { id: 146, module: 'riasec', dimension: 'I', texte: "Je suis curieux et j'aime comprendre le fonctionnement des choses.", niveaux: ['N1','N2','N3'] },
  { id: 147, module: 'riasec', dimension: 'I', texte: "J'aime faire des recherches et analyser des donnees.", niveaux: ['N2','N3'] },
  { id: 148, module: 'riasec', dimension: 'I', texte: "Je prefere travailler seul sur des problemes intellectuels.", niveaux: ['N2','N3'] },
  { id: 149, module: 'riasec', dimension: 'I', texte: "J'aime les sciences, la technologie ou les mathematiques.", niveaux: ['N2','N3'] },
  { id: 150, module: 'riasec', dimension: 'I', texte: "Je cherche toujours a comprendre pourquoi avant d'agir.", niveaux: ['N1','N2','N3'] },
  { id: 151, module: 'riasec', dimension: 'I', texte: "J'aime resoudre des enigmes ou des problemes logiques.", niveaux: ['N1','N2','N3'] },
  { id: 152, module: 'riasec', dimension: 'I', texte: "Je me pose des questions sur les phenomenes naturels ou sociaux.", niveaux: ['N2','N3'] },
  // A — Artistique (8 items)
  { id: 153, module: 'riasec', dimension: 'A', texte: "J'aime creer des choses originales — dessin, musique, ecriture, artisanat.", niveaux: ['N1','N2','N3'] },
  { id: 154, module: 'riasec', dimension: 'A', texte: "J'exprime facilement mes idees et emotions de facon creatrice.", niveaux: ['N1','N2','N3'] },
  { id: 155, module: 'riasec', dimension: 'A', texte: "J'aime les metiers qui permettent de creer et innover.", niveaux: ['N1','N2','N3'] },
  { id: 156, module: 'riasec', dimension: 'A', texte: "Je suis sensible a l'esthetique — la beaute dans les choses.", niveaux: ['N1','N2','N3'] },
  { id: 157, module: 'riasec', dimension: 'A', texte: "J'aime improviser et trouver des solutions non conventionnelles.", niveaux: ['N2','N3'] },
  { id: 158, module: 'riasec', dimension: 'A', texte: "Je prefere les environnements de travail flexibles et non routiniers.", niveaux: ['N2','N3'] },
  { id: 159, module: 'riasec', dimension: 'A', texte: "J'aime m'exprimer devant un public.", niveaux: ['N1','N2','N3'] },
  { id: 160, module: 'riasec', dimension: 'A', texte: "Je trouve de la satisfaction dans la creation d'une oeuvre personnelle.", niveaux: ['N1','N2','N3'] },
  // S — Social (8 items)
  { id: 161, module: 'riasec', dimension: 'S', texte: "J'aime aider, conseiller ou enseigner les autres.", niveaux: ['N1','N2','N3'] },
  { id: 162, module: 'riasec', dimension: 'S', texte: "Je me sens utile quand je contribue au bien-etre des autres.", niveaux: ['N1','N2','N3'] },
  { id: 163, module: 'riasec', dimension: 'S', texte: "J'aime travailler dans des metiers de soin, d'accompagnement ou de service.", niveaux: ['N1','N2','N3'] },
  { id: 164, module: 'riasec', dimension: 'S', texte: "J'aime les activites communautaires et l'engagement social.", niveaux: ['N1','N2','N3'] },
  { id: 165, module: 'riasec', dimension: 'S', texte: "Je prefere les metiers en contact direct avec les personnes.", niveaux: ['N1','N2','N3'] },
  { id: 166, module: 'riasec', dimension: 'S', texte: "Je suis patient et a l'ecoute des personnes en difficulte.", niveaux: ['N1','N2','N3'] },
  { id: 167, module: 'riasec', dimension: 'S', texte: "J'aime former ou coacher des personnes pour les aider a progresser.", niveaux: ['N2','N3'] },
  { id: 168, module: 'riasec', dimension: 'S', texte: "Je trouve du sens dans les metiers qui ont un impact positif sur la societe.", niveaux: ['N1','N2','N3'] },
  // E — Entrepreneur (8 items)
  { id: 169, module: 'riasec', dimension: 'E', texte: "J'aime diriger des projets et prendre des decisions.", niveaux: ['N2','N3'] },
  { id: 170, module: 'riasec', dimension: 'E', texte: "Je suis a l'aise pour convaincre et vendre des idees.", niveaux: ['N1','N2','N3'] },
  { id: 171, module: 'riasec', dimension: 'E', texte: "J'aime les metiers du commerce, de la vente ou du management.", niveaux: ['N1','N2','N3'] },
  { id: 172, module: 'riasec', dimension: 'E', texte: "Je prends des initiatives sans attendre qu'on me demande.", niveaux: ['N1','N2','N3'] },
  { id: 173, module: 'riasec', dimension: 'E', texte: "J'aime negocier et trouver des accords avantageux.", niveaux: ['N2','N3'] },
  { id: 174, module: 'riasec', dimension: 'E', texte: "Je suis a l'aise avec la competition et le defi.", niveaux: ['N2','N3'] },
  { id: 175, module: 'riasec', dimension: 'E', texte: "J'ai des ambitions elevees et je travaille pour les realiser.", niveaux: ['N1','N2','N3'] },
  { id: 176, module: 'riasec', dimension: 'E', texte: "J'aime creer ou developper une activite economique.", niveaux: ['N1','N2','N3'] },
  // C — Conventionnel (8 items)
  { id: 177, module: 'riasec', dimension: 'C', texte: "J'aime les taches structurees avec des procedures claires.", niveaux: ['N1','N2','N3'] },
  { id: 178, module: 'riasec', dimension: 'C', texte: "Je suis rigoureux et j'aime les details et la precision.", niveaux: ['N1','N2','N3'] },
  { id: 179, module: 'riasec', dimension: 'C', texte: "J'aime les metiers de la comptabilite, de l'administration ou de la gestion.", niveaux: ['N1','N2','N3'] },
  { id: 180, module: 'riasec', dimension: 'C', texte: "Je prefere les environnements stables avec des regles claires.", niveaux: ['N1','N2','N3'] },
  { id: 181, module: 'riasec', dimension: 'C', texte: "J'aime organiser et classer des informations.", niveaux: ['N1','N2','N3'] },
  { id: 182, module: 'riasec', dimension: 'C', texte: "Je suis fiable et je respecte les procedures etablies.", niveaux: ['N1','N2','N3'] },
  { id: 183, module: 'riasec', dimension: 'C', texte: "J'aime les taches repetitives qui requierent de la precision.", niveaux: ['N1','N2','N3'] },
  { id: 184, module: 'riasec', dimension: 'C', texte: "Je prefere suivre des instructions claires plutot que d'improviser.", niveaux: ['N1','N2','N3'] },
];

// MODULE 6 — MOTIVATION AU TRAVAIL (27 items)
const MODULE_MOTIVATION: Question[] = [
  { id: 185, module: 'motivation', dimension: 'sens', texte: "Il est important pour moi que mon travail ait un impact positif sur la societe.", niveaux: ['N1','N2','N3'] },
  { id: 186, module: 'motivation', dimension: 'sens', texte: "Je travaille mieux quand je comprends pourquoi ma tache est utile.", niveaux: ['N1','N2','N3'] },
  { id: 187, module: 'motivation', dimension: 'sens', texte: "Je cherche un travail qui correspond a mes valeurs profondes.", niveaux: ['N2','N3'] },
  { id: 188, module: 'motivation', dimension: 'performance', texte: "Je suis stimule par les objectifs ambitieux et les challenges.", niveaux: ['N2','N3'] },
  { id: 189, module: 'motivation', dimension: 'performance', texte: "Je veux etre parmi les meilleurs dans mon domaine.", niveaux: ['N2','N3'] },
  { id: 190, module: 'motivation', dimension: 'performance', texte: "J'aime etre evalue sur mes resultats concrets.", niveaux: ['N2','N3'] },
  { id: 191, module: 'motivation', dimension: 'securite', texte: "La stabilite de l'emploi est primordiale pour moi.", niveaux: ['N1','N2','N3'] },
  { id: 192, module: 'motivation', dimension: 'securite', texte: "Je prefere un salaire fixe meme si les perspectives sont limitees.", niveaux: ['N1','N2','N3'] },
  { id: 193, module: 'motivation', dimension: 'securite', texte: "J'aime savoir a l'avance ce qui m'attend dans mon travail.", niveaux: ['N1','N2','N3'] },
  { id: 194, module: 'motivation', dimension: 'reconnaissance', texte: "La reconnaissance de mes efforts par ma hierarchie est importante pour moi.", niveaux: ['N1','N2','N3'] },
  { id: 195, module: 'motivation', dimension: 'reconnaissance', texte: "J'ai besoin d'etre valorise pour mon travail.", niveaux: ['N1','N2','N3'] },
  { id: 196, module: 'motivation', dimension: 'reconnaissance', texte: "J'aime quand mes contributions sont visibles et reconnues.", niveaux: ['N1','N2','N3'] },
  { id: 197, module: 'motivation', dimension: 'autonomie', texte: "Je travaille mieux quand on me laisse gerer mon temps librement.", niveaux: ['N2','N3'] },
  { id: 198, module: 'motivation', dimension: 'autonomie', texte: "J'aime decider moi-meme de la methode pour atteindre mes objectifs.", niveaux: ['N2','N3'] },
  { id: 199, module: 'motivation', dimension: 'autonomie', texte: "Je prefere les postes avec peu de supervision directe.", niveaux: ['N3'] },
  { id: 200, module: 'motivation', dimension: 'apprentissage', texte: "J'ai besoin de progresser et d'apprendre continuellement dans mon travail.", niveaux: ['N1','N2','N3'] },
  { id: 201, module: 'motivation', dimension: 'apprentissage', texte: "Je suis pret a accepter un poste moins bien paye s'il m'apprend beaucoup.", niveaux: ['N2','N3'] },
  { id: 202, module: 'motivation', dimension: 'apprentissage', texte: "Je cherche des opportunites de formation dans mon emploi.", niveaux: ['N2','N3'] },
  { id: 203, module: 'motivation', dimension: 'appartenance', texte: "L'ambiance et les relations avec mes collegues sont essentielles.", niveaux: ['N1','N2','N3'] },
  { id: 204, module: 'motivation', dimension: 'appartenance', texte: "Je suis tres sensible a l'esprit d'equipe dans mon milieu professionnel.", niveaux: ['N1','N2','N3'] },
  { id: 205, module: 'motivation', dimension: 'appartenance', texte: "Je veux travailler dans une entreprise dont je suis fier.", niveaux: ['N1','N2','N3'] },
  { id: 206, module: 'motivation', dimension: 'impact', texte: "Je veux laisser une trace positive dans mon secteur.", niveaux: ['N2','N3'] },
  { id: 207, module: 'motivation', dimension: 'impact', texte: "Je suis motive par les projets qui changent les choses.", niveaux: ['N2','N3'] },
  { id: 208, module: 'motivation', dimension: 'impact', texte: "J'ai besoin de voir l'impact concret de mon travail.", niveaux: ['N2','N3'] },
  { id: 209, module: 'motivation', dimension: 'remuneration', texte: "Un bon salaire est un critere important dans le choix d'un emploi.", niveaux: ['N1','N2','N3'] },
  { id: 210, module: 'motivation', dimension: 'remuneration', texte: "Je suis pret a travailler plus dur pour gagner davantage.", niveaux: ['N1','N2','N3'] },
  { id: 211, module: 'motivation', dimension: 'remuneration', texte: "J'aime les systemes de remuneration bases sur la performance.", niveaux: ['N2','N3'] },
];

// MODULE 7 — POTENTIEL ENTREPRENEURIAL (15 items)
const MODULE_ENTREPRENEURIAT: Question[] = [
  { id: 212, module: 'entrepreneuriat', dimension: 'prise_risque', texte: "Je suis pret a risquer de l'argent ou du temps pour lancer une idee.", niveaux: ['N2','N3'] },
  { id: 213, module: 'entrepreneuriat', dimension: 'prise_risque', texte: "J'accepte l'incertitude comme une partie normale de la vie professionnelle.", niveaux: ['N2','N3'] },
  { id: 214, module: 'entrepreneuriat', dimension: 'prise_risque', texte: "J'ai deja pris des risques qui ont bien fonctionne.", niveaux: ['N1','N2','N3'] },
  { id: 215, module: 'entrepreneuriat', dimension: 'creativite', texte: "J'ai souvent des idees originales pour resoudre des problemes du quotidien.", niveaux: ['N1','N2','N3'] },
  { id: 216, module: 'entrepreneuriat', dimension: 'creativite', texte: "Je vois des opportunites la ou les autres voient des problemes.", niveaux: ['N2','N3'] },
  { id: 217, module: 'entrepreneuriat', dimension: 'creativite', texte: "Je pense differemment de la majorite des gens autour de moi.", niveaux: ['N2','N3'] },
  { id: 218, module: 'entrepreneuriat', dimension: 'perseverance', texte: "Je ne renonce pas a un projet meme quand les obstacles s'accumulent.", niveaux: ['N1','N2','N3'] },
  { id: 219, module: 'entrepreneuriat', dimension: 'perseverance', texte: "J'ai deja accompli quelque chose de difficile grace a ma determination.", niveaux: ['N1','N2','N3'] },
  { id: 220, module: 'entrepreneuriat', dimension: 'perseverance', texte: "Je reviens plus fort apres un echec.", niveaux: ['N1','N2','N3'] },
  { id: 221, module: 'entrepreneuriat', dimension: 'opportunisme', texte: "Je sais identifier rapidement les opportunites dans mon environnement.", niveaux: ['N2','N3'] },
  { id: 222, module: 'entrepreneuriat', dimension: 'opportunisme', texte: "J'ai deja cree ou participe a une petite activite commerciale informelle.", niveaux: ['N1','N2','N3'] },
  { id: 223, module: 'entrepreneuriat', dimension: 'opportunisme', texte: "Je pense souvent a comment gagner de l'argent avec mes competences.", niveaux: ['N1','N2','N3'] },
  { id: 224, module: 'entrepreneuriat', dimension: 'reseau', texte: "Je construis activement mon reseau de contacts professionnels.", niveaux: ['N2','N3'] },
  { id: 225, module: 'entrepreneuriat', dimension: 'reseau', texte: "J'ai des relations utiles dans differents secteurs d'activite.", niveaux: ['N2','N3'] },
  { id: 226, module: 'entrepreneuriat', dimension: 'reseau', texte: "Je sais demander de l'aide et mobiliser les bonnes personnes.", niveaux: ['N1','N2','N3'] },
];

const TOUTES_QUESTIONS: Question[] = [
  ...MODULE_PERSONNALITE,
  ...MODULE_MANAGERIAL,
  ...MODULE_EQ,
  ...MODULE_LEADERSHIP,
  ...MODULE_RIASEC,
  ...MODULE_MOTIVATION,
  ...MODULE_ENTREPRENEURIAT,
];

@Injectable()
export class YiraInternalService implements IEvaluationProvider {
  private readonly logger = new Logger(YiraInternalService.name);

  constructor(private config: ConfigService) {}

  private getQuestionsParNiveau(niveau: 'N1' | 'N2' | 'N3'): Question[] {
    return TOUTES_QUESTIONS.filter(q => q.niveaux.includes(niveau));
  }

  private genererAssessmentId(): number {
    return Math.floor(Date.now() / 1000);
  }

  async initialiserEvaluation(params: EvaluationInitParams): Promise<EvaluationSession> {
    this.logger.log(`YiraInternal: init evaluation ${params.niveau} pour ${params.prenom} ${params.nom}`);
    const questions = this.getQuestionsParNiveau(params.niveau);
    const assessment_id = this.genererAssessmentId();
    return {
      assessment_id,
      provider: 'yira_internal',
      nb_questions: questions.length,
      questions: questions.map(q => ({
        label_question: `[${q.module.toUpperCase()}] ${q.texte}`,
        r1: 'Tout a fait d accord',
        r2: 'Plutot d accord',
        r3: 'Neutre',
        r4: 'Plutot pas d accord',
        r5: 'Pas du tout d accord',
        nb_reponses: 5,
      })),
    };
  }

  async soumettreReponses(dto: EvaluationReponses): Promise<boolean> {
    this.logger.log(`YiraInternal: soumission ${dto.reponses.length} reponses pour assessment ${dto.assessment_id}`);
    return true;
  }

  async recupererResultats(assessment_id: number): Promise<EvaluationResultat> {
    return {
      assessment_id,
      provider: 'yira_internal',
      scores: [65, 55, 70, 85, 75, 60],
      profil_riasec: 'SAE',
      score_employabilite: 72,
      criteres: ['Leadership', 'Communication', 'Travail en equipe'],
      rapport_pdf_url: null,
      pii_genere: false,
    };
  }

  async genererRapport(assessment_id: number, email: string, tenant_id: string): Promise<string> {
    return `https://yira.ci/rapports/${assessment_id}.pdf`;
  }
}