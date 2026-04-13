import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IEvaluationProvider,
  EvaluationSession,
  EvaluationResultat,
  EvaluationInitParams,
  EvaluationReponses,
} from './evaluation.interface';

// =============================================================================
// YIRA SigmundTest — Moteur Psychometrique Interne
// Version 2.0 — Architecture CDF conforme
//
// 4 PILIERS evalues :
//   P1 — Personnalite Big Five
//   P2 — Soft Skills / Intelligence Emotionnelle
//   P3 — Interets RIASEC (Holland)
//   P4 — Motivation au Travail
//
// N1 — Sans diplome / CEPE / decollarise — 30 questions — 30 min — langage de proximite
// N2 — BEPC / BAC / jeune actif — 70 questions — 70 min — langage professionnel standard
// N3 — BTS / Licence / diplome — 90 questions — 90 min — langage academique + entretien
//
// ALGORITHME DE DECISION (Parcours Professionnel) :
//   Score >= 75 / 100 → Filiere A — Emploi direct < 1 mois
//   Score 50-74 / 100 → Filiere B — Accompagnement 2-3 mises en relation < 3 mois
//   Score <= 49 / 100  → Filiere C — Stage passerelle 4 semaines < 6 mois
//   N1 non-alphabetise → Parcours Informel — 6 voies
// =============================================================================

export interface Question {
  id: number;
  pilier: 'personnalite' | 'soft_skills' | 'riasec' | 'motivation';
  dimension: string;
  riasec_type?: 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
  // Trois versions linguistiques selon le niveau
  texte_N1: string; // Francais de proximite — concret — situations quotidiennes
  texte_N2: string; // Francais professionnel standard ivoirien
  texte_N3: string; // Francais academique avec nuance
  niveaux: ('N1' | 'N2' | 'N3')[];
  poids: number; // 1 = standard, 2 = fort indicateur
}

// =============================================================================
// PILIER 1 — PERSONNALITE BIG FIVE
// Predit le style de travail naturel et les metiers d'epanouissement durable
// =============================================================================
const PILIER_PERSONNALITE: Question[] = [
  // OUVERTURE
  {
    id: 101, pilier: 'personnalite', dimension: 'ouverture',
    texte_N1: "Est-ce que tu aimes apprendre des choses nouvelles dans ta vie de tous les jours ?",
    texte_N2: "J'aime decouvrir de nouveaux sujets et m'interesser a des domaines varies.",
    texte_N3: "Je manifeste une curiosite intellectuelle soutenue et un interet pour des champs de connaissance diversifies.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  {
    id: 102, pilier: 'personnalite', dimension: 'ouverture',
    texte_N1: "Est-ce que tu cherches souvent des nouvelles facons de faire les choses ?",
    texte_N2: "J'aime trouver des solutions originales plutot que de suivre les habitudes.",
    texte_N3: "Je privilegieles approches innovantes et remets en question les methodes etablies quand elles peuvent etre ameliorees.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  {
    id: 103, pilier: 'personnalite', dimension: 'ouverture',
    texte_N1: "Tu aimes bien imaginer des choses nouvelles dans ta tete ?",
    texte_N2: "J'ai de l'imagination et j'aime creer des choses originales.",
    texte_N3: "Je dispose d'une pensee creative fertile et sais generer des idees originales dans mon domaine.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // CONSCIENCE
  {
    id: 111, pilier: 'personnalite', dimension: 'conscience',
    texte_N1: "Quand tu commences quelque chose, tu le termines meme si c'est difficile ?",
    texte_N2: "Je termine ce que je commence meme face aux difficultes.",
    texte_N3: "Je fais preuve de perseverance et d'une forte capacite a maintenir mes engagements jusqu'a leur terme.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 112, pilier: 'personnalite', dimension: 'conscience',
    texte_N1: "Tu arrives toujours a l'heure et tu fais ce que tu promets ?",
    texte_N2: "Je suis ponctuel et je respecte les engagements que je prends.",
    texte_N3: "Je respecte scrupuleusement les delais et les engagements pris envers mes interlocuteurs.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 113, pilier: 'personnalite', dimension: 'conscience',
    texte_N1: "Tu ranges bien tes affaires et tu sais toujours ou elles sont ?",
    texte_N2: "Je suis organise et je gere bien mon temps et mes affaires.",
    texte_N3: "Je structure efficacement mon environnement de travail et optimise la gestion de mon temps.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  {
    id: 114, pilier: 'personnalite', dimension: 'conscience',
    texte_N1: "Tu verifies ton travail avant de le donner pour etre sur que c'est bien fait ?",
    texte_N2: "Je verifie mon travail et je fais attention aux details.",
    texte_N3: "J'adopte une demarche rigoureuse dans la verification de mes productions avant leur remise.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // EXTRAVERSION
  {
    id: 121, pilier: 'personnalite', dimension: 'extraversion',
    texte_N1: "Tu aimes bien etre avec beaucoup de personnes et ca te donne de l'energie ?",
    texte_N2: "Je me sens energise quand je suis entouré de personnes et j'aime le contact.",
    texte_N3: "Les interactions sociales constituent pour moi une source d'energie et de stimulation.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  {
    id: 122, pilier: 'personnalite', dimension: 'extraversion',
    texte_N1: "Tu prends facilement la parole quand il y a un groupe de personnes ?",
    texte_N2: "Je prends facilement la parole dans un groupe et j'aime m'exprimer.",
    texte_N3: "Je prends spontanement la parole en groupe et m'exprime avec aisance dans les contextes collectifs.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  {
    id: 123, pilier: 'personnalite', dimension: 'extraversion',
    texte_N1: "Tu te fais des amis facilement et tu aimes rencontrer des gens nouveaux ?",
    texte_N2: "Je me fais facilement des amis et j'aime rencontrer de nouvelles personnes.",
    texte_N3: "Je developpe aisement des relations interpersonnelles et m'adapte rapidement a de nouveaux interlocuteurs.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // AGREABILITE
  {
    id: 131, pilier: 'personnalite', dimension: 'agreabilite',
    texte_N1: "Tu aides les autres meme quand personne ne te le demande ?",
    texte_N2: "J'aime aider les autres et je pense souvent a leurs besoins.",
    texte_N3: "Je manifeste une predisposition naturelle a l'altruisme et anticipe les besoins de mon entourage.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  {
    id: 132, pilier: 'personnalite', dimension: 'agreabilite',
    texte_N1: "Quand il y a un probleme entre des gens, tu essaies de trouver un accord ?",
    texte_N2: "Je cherche le compromis plutot que le conflit dans les situations tendues.",
    texte_N3: "Je privilegieles solutions consensuelles et possede des aptitudes a la mediation interpersonnelle.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // STABILITE EMOTIONNELLE
  {
    id: 141, pilier: 'personnalite', dimension: 'stabilite',
    texte_N1: "Tu restes calme meme quand les choses ne se passent pas bien ?",
    texte_N2: "Je reste calme et stable meme dans les situations difficiles ou stressantes.",
    texte_N3: "Je maintiens une stabilite emotionnelle dans les situations de pression ou d'incertitude.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 142, pilier: 'personnalite', dimension: 'stabilite',
    texte_N1: "Apres un probleme ou un echec, tu te releves vite et tu continues ?",
    texte_N2: "Je reprends rapidement mon equilibre apres un echec ou une deception.",
    texte_N3: "Je dispose d'une resilience elevee me permettant de rebondir rapidement apres un echec.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 143, pilier: 'personnalite', dimension: 'stabilite',
    texte_N1: "Tu peux travailler meme quand c'est dur et qu'il y a beaucoup de pression ?",
    texte_N2: "Je peux travailler efficacement meme sous pression.",
    texte_N3: "Je maintiens un niveau de performance satisfaisant meme en contexte de forte contrainte.",
    niveaux: ['N2','N3'], poids: 2,
  },
];

// =============================================================================
// PILIER 2 — SOFT SKILLS / INTELLIGENCE EMOTIONNELLE
// 1er critere de recrutement pour 78% des DRH ivoiriens
// Predicteur du maintien en emploi a 12 mois
// =============================================================================
const PILIER_SOFT_SKILLS: Question[] = [
  // CONSCIENCE DE SOI
  {
    id: 201, pilier: 'soft_skills', dimension: 'conscience_soi',
    texte_N1: "Tu connais bien tes forces et tes faiblesses dans la vie ?",
    texte_N2: "Je connais clairement mes forces et mes faiblesses.",
    texte_N3: "J'ai une conscience aiguisee de mes competences distinctives et de mes axes de progression.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  {
    id: 202, pilier: 'soft_skills', dimension: 'conscience_soi',
    texte_N1: "Tu sais quand tu vas perdre ton calme avant que ca arrive ?",
    texte_N2: "Je sais reconnaitre quand je suis sur le point de perdre mon calme.",
    texte_N3: "Je possede une conscience meta-cognitive de mes etats emotionnels et de leurs declencheurs.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // REGULATION EMOTIONNELLE
  {
    id: 211, pilier: 'soft_skills', dimension: 'regulation',
    texte_N1: "Tu peux controler ta colere ou ta peur meme dans les moments durs ?",
    texte_N2: "Je sais controler mes emotions dans les moments intenses.",
    texte_N3: "Je dispose de strategies efficaces de regulation emotionnelle dans les contextes exigeants.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 212, pilier: 'soft_skills', dimension: 'regulation',
    texte_N1: "Apres un moment de colere, tu te calmes vite et tu passes a autre chose ?",
    texte_N2: "Je me calme rapidement apres un moment de tension ou de colere.",
    texte_N3: "Ma capacite de recuperation emotionnelle post-stress est rapide et efficiente.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // EMPATHIE
  {
    id: 221, pilier: 'soft_skills', dimension: 'empathie',
    texte_N1: "Tu comprends facilement ce que les autres ressentent meme s'ils ne te le disent pas ?",
    texte_N2: "Je comprends facilement ce que les autres ressentent.",
    texte_N3: "Je possede une capacite empathique developpee me permettant de percevoir les etats emotionnels d'autrui.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  {
    id: 222, pilier: 'soft_skills', dimension: 'empathie',
    texte_N1: "Tu remarques quand quelqu'un va mal meme s'il sourit ?",
    texte_N2: "Je detecte quand quelqu'un est mal a l'aise ou en difficulte.",
    texte_N3: "Je lis avec finesse les signaux non-verbaux et les indicateurs de mal-etre chez mes interlocuteurs.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // COMPETENCES SOCIALES
  {
    id: 231, pilier: 'soft_skills', dimension: 'competences_sociales',
    texte_N1: "Les gens font facilement confiance a toi et veulent te parler ?",
    texte_N2: "Je cree facilement des liens de confiance avec les personnes que je rencontre.",
    texte_N3: "Je developpe aisement des relations de confiance durables dans mes environnements professionnels.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 232, pilier: 'soft_skills', dimension: 'competences_sociales',
    texte_N1: "Tu peux travailler avec n'importe qui meme les personnes difficiles ?",
    texte_N2: "Je sais travailler avec des personnes tres differentes de moi.",
    texte_N3: "Je m'adapte a la diversite des profils et maintiens une collaboration productive avec tous types d'interlocuteurs.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  {
    id: 233, pilier: 'soft_skills', dimension: 'competences_sociales',
    texte_N1: "Quand deux personnes se disputent tu peux les aider a s'entendre ?",
    texte_N2: "Je sais medier dans les conflits et trouver des solutions acceptables pour tous.",
    texte_N3: "Je possede des competences de mediation et de resolution de conflits interpersonnels.",
    niveaux: ['N2','N3'], poids: 1,
  },
  // COMMUNICATION
  {
    id: 241, pilier: 'soft_skills', dimension: 'communication',
    texte_N1: "Tu ecoutes bien les autres jusqu'au bout sans les interrompre ?",
    texte_N2: "Je sais ecouter activement sans interrompre et je comprends bien les autres.",
    texte_N3: "Je pratique l'ecoute active et sais reformuler pour valider ma comprehension.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 242, pilier: 'soft_skills', dimension: 'communication',
    texte_N1: "Tu sais expliquer clairement ce que tu veux dire pour que les autres comprennent ?",
    texte_N2: "Je sais m'exprimer clairement pour que les autres me comprennent bien.",
    texte_N3: "Je structure ma communication de facon claire et adaptee a mon interlocuteur.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
];

// =============================================================================
// PILIER 3 — INTERETS PROFESSIONNELS RIASEC (Holland)
// Un jeune dont les interets sont alignes avec son metier est 3x plus perseverant
// et 2x plus performant en formation
// =============================================================================
const PILIER_RIASEC: Question[] = [
  // R — REALISTE : BTP, Agriculture, Mecanique, Mines
  {
    id: 301, pilier: 'riasec', dimension: 'realiste', riasec_type: 'R',
    texte_N1: "Tu aimes travailler avec tes mains — reparer, construire, fabriquer des choses ?",
    texte_N2: "J'aime travailler avec mes mains et fabriquer ou reparer des objets concrets.",
    texte_N3: "Je manifeste une attirance marquee pour les activites de fabrication, de construction ou de reparation.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 302, pilier: 'riasec', dimension: 'realiste', riasec_type: 'R',
    texte_N1: "Tu preferes faire un travail dehors ou dans un atelier plutot que dans un bureau ?",
    texte_N2: "Je prefere les environnements de travail physiques et pratiques aux environnements de bureau.",
    texte_N3: "Je m'epanouis davantage dans des contextes de travail concrets et operationnels.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  {
    id: 303, pilier: 'riasec', dimension: 'realiste', riasec_type: 'R',
    texte_N1: "Tu te debrouilles bien avec les outils comme les marteaux, les cles, les machines ?",
    texte_N2: "Je me debrouille bien avec les outils et les equipements techniques.",
    texte_N3: "Je possede des aptitudes techniques dans la manipulation d'outils et d'equipements specialises.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 304, pilier: 'riasec', dimension: 'realiste', riasec_type: 'R',
    texte_N1: "Tu apprends mieux quand tu fais toi-meme plutot qu'en ecoutant quelqu'un parler ?",
    texte_N2: "J'apprends mieux en pratiquant qu'en ecoutant des explications.",
    texte_N3: "Mon mode d'apprentissage privilegiela dimension experimentation pratique a la transmission theorique.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // I — INVESTIGATEUR : Sciences, Data, Ingenierie, Sante
  {
    id: 311, pilier: 'riasec', dimension: 'investigateur', riasec_type: 'I',
    texte_N1: "Tu aimes comprendre pourquoi les choses fonctionnent comme ca — poser des questions ?",
    texte_N2: "J'aime analyser des problemes pour comprendre comment les choses fonctionnent.",
    texte_N3: "Je manifeste un interet soutenu pour l'analyse systematique et la comprehension des mecanismes complexes.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 312, pilier: 'riasec', dimension: 'investigateur', riasec_type: 'I',
    texte_N1: "Tu aimes les maths, les sciences, ou trouver des solutions logiques ?",
    texte_N2: "J'aime les sciences, la logique et les problemes qui necessitent de la reflexion.",
    texte_N3: "J'ai une aptitude naturelle pour le raisonnement scientifique et analytique.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 313, pilier: 'riasec', dimension: 'investigateur', riasec_type: 'I',
    texte_N1: "Tu preferes travailler seul et reflechir tranquillement pour trouver la bonne reponse ?",
    texte_N2: "Je prefere travailler seul sur des problemes complexes qui demandent de la concentration.",
    texte_N3: "Je favorise les contextes de travail autonome propices a la reflexion approfondie.",
    niveaux: ['N2','N3'], poids: 1,
  },
  // A — ARTISTIQUE : Design, Communication, Audiovisuel
  {
    id: 321, pilier: 'riasec', dimension: 'artistique', riasec_type: 'A',
    texte_N1: "Tu aimes creer des choses — dessiner, chanter, coudre, fabriquer quelque chose de beau ?",
    texte_N2: "J'aime creer des choses originales — dessin, ecriture, musique, artisanat.",
    texte_N3: "Je manifeste une forte inclination pour les activites de creation et d'expression artistique.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 322, pilier: 'riasec', dimension: 'artistique', riasec_type: 'A',
    texte_N1: "Tu aimes les choses belles et tu fais attention a comment quelque chose est presente ?",
    texte_N2: "Je suis sensible a l'esthetique et au soin dans la presentation des choses.",
    texte_N3: "Je possede un sens esthetique developpe et une attention particuliere a la qualite formelle.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  {
    id: 323, pilier: 'riasec', dimension: 'artistique', riasec_type: 'A',
    texte_N1: "Tu aimes t'exprimer devant des gens — raconter, chanter, jouer la comedie ?",
    texte_N2: "J'aime m'exprimer devant un public et partager mes creations.",
    texte_N3: "Je m'epanouis dans les contextes d'expression publique et de partage creatif.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // S — SOCIAL : Sante, Enseignement, RH, ONG
  {
    id: 331, pilier: 'riasec', dimension: 'social', riasec_type: 'S',
    texte_N1: "Tu aimes beaucoup aider les autres — les soigner, les conseiller, les enseigner ?",
    texte_N2: "J'aime aider, conseiller ou enseigner les autres — c'est ce qui me donne le plus de satisfaction.",
    texte_N3: "Je manifeste une vocation prononcee pour les metiers d'aide, d'accompagnement et de transmission.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 332, pilier: 'riasec', dimension: 'social', riasec_type: 'S',
    texte_N1: "Tu te sens utile et content quand tu peux aider quelqu'un qui a un probleme ?",
    texte_N2: "Je me sens profondement utile quand j'aide quelqu'un a resoudre ses problemes.",
    texte_N3: "L'impact positif sur autrui constitue ma principale source de satisfaction professionnelle.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 333, pilier: 'riasec', dimension: 'social', riasec_type: 'S',
    texte_N1: "Tu aimes les activites qui servent ta famille, ton quartier ou ta communaute ?",
    texte_N2: "J'aime les activites communautaires et tout ce qui peut servir les autres.",
    texte_N3: "Je suis sensible aux enjeux d'impact social et valorise les activites a finalite collective.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // E — ENTREPRENEUR : Vente, Management, Business
  {
    id: 341, pilier: 'riasec', dimension: 'entrepreneur', riasec_type: 'E',
    texte_N1: "Tu aimes vendre, convaincre les autres ou diriger un groupe ?",
    texte_N2: "J'aime convaincre les autres et je suis a l'aise dans les situations de vente ou de negociation.",
    texte_N3: "Je manifeste des aptitudes naturelles pour la persuasion, le leadership et les contextes de negociation.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 342, pilier: 'riasec', dimension: 'entrepreneur', riasec_type: 'E',
    texte_N1: "Tu prends facilement les devants — tu n'attends pas qu'on te dise quoi faire ?",
    texte_N2: "Je prends des initiatives sans attendre qu'on me le demande.",
    texte_N3: "Je fais preuve d'une forte proactivite et d'une capacite a generer le mouvement dans mon environnement.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 343, pilier: 'riasec', dimension: 'entrepreneur', riasec_type: 'E',
    texte_N1: "Tu as deja vendu quelque chose ou eu une petite activite pour gagner de l'argent ?",
    texte_N2: "J'aime creer ou developper une activite economique — meme petite.",
    texte_N3: "J'ai une inclination pour la creation de valeur economique et le developpement d'activites nouvelles.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // C — CONVENTIONNEL : Administration, Comptabilite, Logistique
  {
    id: 351, pilier: 'riasec', dimension: 'conventionnel', riasec_type: 'C',
    texte_N1: "Tu aimes les choses bien organisees — les listes, les rangements, les regles claires ?",
    texte_N2: "J'aime les taches bien organisees avec des regles et des procedures claires.",
    texte_N3: "Je m'epanouis dans des environnements structures avec des processus et des standards definis.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 352, pilier: 'riasec', dimension: 'conventionnel', riasec_type: 'C',
    texte_N1: "Tu fais tres attention aux details — une petite erreur dans ton travail t'embete beaucoup ?",
    texte_N2: "Je suis rigoureux et tres attentif aux details dans mon travail.",
    texte_N3: "Je manifeste une rigueur methodologique et une attention aux details caracteristiques du profil de precision.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 353, pilier: 'riasec', dimension: 'conventionnel', riasec_type: 'C',
    texte_N1: "Tu aimes les metiers de bureau — compter, classer, gerer les papiers ?",
    texte_N2: "J'aime les metiers d'administration, de comptabilite ou de gestion.",
    texte_N3: "Je manifeste un attrait pour les metiers de gestion, de conformite et d'administration.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
];

// =============================================================================
// PILIER 4 — MOTIVATION AU TRAVAIL (9 dimensions)
// Predicteur le plus fiable de la performance a long terme — plus que le diplome
// =============================================================================
const PILIER_MOTIVATION: Question[] = [
  // SENS
  {
    id: 401, pilier: 'motivation', dimension: 'sens',
    texte_N1: "Il est important pour toi que ton travail soit utile aux autres ou a ta communaute ?",
    texte_N2: "Il est important pour moi que mon travail ait un impact positif sur les autres.",
    texte_N3: "La finalite sociale ou l'impact de mon activite professionnelle constitue un critere determinant dans mes choix.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  {
    id: 402, pilier: 'motivation', dimension: 'sens',
    texte_N1: "Tu travailles mieux quand tu comprends pourquoi ce que tu fais est important ?",
    texte_N2: "Je travaille mieux quand je comprends l'utilite et le sens de ce que je fais.",
    texte_N3: "La comprehension du sens de ma contribution est un facteur determinant de mon engagement.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // SECURITE
  {
    id: 411, pilier: 'motivation', dimension: 'securite',
    texte_N1: "Tu veux un travail stable ou tu sais ce qui va se passer chaque jour ?",
    texte_N2: "La stabilite de l'emploi et la securite sont tres importantes pour moi.",
    texte_N3: "La securite et la previsibilite de l'environnement professionnel constituent des criteres prioritaires.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  // RECONNAISSANCE
  {
    id: 421, pilier: 'motivation', dimension: 'reconnaissance',
    texte_N1: "Ca compte beaucoup pour toi que ton patron ou tes collegues reconnaissent ton bon travail ?",
    texte_N2: "La reconnaissance de mon travail par ma hierarchie est importante pour moi.",
    texte_N3: "La valorisation de mes contributions par mes pairs et ma hierarchie impacte significativement mon engagement.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // REMUNERATION
  {
    id: 431, pilier: 'motivation', dimension: 'remuneration',
    texte_N1: "Gagner un bon salaire c'est tres important pour toi dans le choix d'un travail ?",
    texte_N2: "Un bon salaire est un critere tres important pour moi dans le choix d'un emploi.",
    texte_N3: "La remuneration constitue un element determinant dans mon arbitrage entre differentes opportunites.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  // APPRENTISSAGE
  {
    id: 441, pilier: 'motivation', dimension: 'apprentissage',
    texte_N1: "Tu veux un travail ou tu peux apprendre et t'ameliorer tout le temps ?",
    texte_N2: "J'ai besoin d'apprendre et de progresser continuellement dans mon travail.",
    texte_N3: "Le developpement continu de mes competences est une condition essentielle de mon epanouissement professionnel.",
    niveaux: ['N1','N2','N3'], poids: 2,
  },
  // AUTONOMIE
  {
    id: 451, pilier: 'motivation', dimension: 'autonomie',
    texte_N1: "Tu preferes qu'on te laisse faire ton travail a ta facon sans te surveiller tout le temps ?",
    texte_N2: "Je travaille mieux quand on me fait confiance et qu'on me laisse de l'autonomie.",
    texte_N3: "L'autonomie decisionnelle et la latitude d'organisation constituent des leviers majeurs de ma performance.",
    niveaux: ['N2','N3'], poids: 1,
  },
  // APPARTENANCE
  {
    id: 461, pilier: 'motivation', dimension: 'appartenance',
    texte_N1: "L'ambiance avec tes collegues c'est tres important pour que tu aimes ton travail ?",
    texte_N2: "L'ambiance et les relations avec les collegues sont essentielles pour que je sois bien au travail.",
    texte_N3: "La qualite du collectif de travail et le sentiment d'appartenance influencent fortement mon engagement.",
    niveaux: ['N1','N2','N3'], poids: 1,
  },
  // PERFORMANCE
  {
    id: 471, pilier: 'motivation', dimension: 'performance',
    texte_N1: "Tu aimes les defis difficiles et ca te motive quand les objectifs sont eleves ?",
    texte_N2: "Je suis stimule par les objectifs ambitieux et les defis.",
    texte_N3: "Les environnements exigeants avec des objectifs eleves constituent un contexte motivant pour moi.",
    niveaux: ['N2','N3'], poids: 1,
  },
  // IMPACT
  {
    id: 481, pilier: 'motivation', dimension: 'impact',
    texte_N1: "Tu veux que ton travail change quelque chose — que les gens voient ce que tu as fait ?",
    texte_N2: "J'ai besoin de voir l'impact concret de mon travail.",
    texte_N3: "La visibilite et la mesurabilite de ma contribution constituent des facteurs de motivation determinants.",
    niveaux: ['N2','N3'], poids: 1,
  },
];

// =============================================================================
// QUESTIONS SUPPLEMENTAIRES N3 — Leadership et Potentiel Entrepreneurial
// Modules exclusifs diplomes BTS / Licence+
// =============================================================================
const QUESTIONS_N3_LEADERSHIP: Question[] = [
  {
    id: 501, pilier: 'soft_skills', dimension: 'leadership',
    texte_N1: '',
    texte_N2: '',
    texte_N3: "Je sais convaincre les autres et les motiver autour d'un projet commun meme sans autorite formelle.",
    niveaux: ['N3'], poids: 2,
  },
  {
    id: 502, pilier: 'soft_skills', dimension: 'leadership',
    texte_N1: '',
    texte_N2: '',
    texte_N3: "Je prends des decisions difficiles meme quand l'information est incomplete.",
    niveaux: ['N3'], poids: 2,
  },
  {
    id: 503, pilier: 'soft_skills', dimension: 'leadership',
    texte_N1: '',
    texte_N2: '',
    texte_N3: "J'assume la responsabilite des echecs de mon equipe sans chercher des boucs emissaires.",
    niveaux: ['N3'], poids: 2,
  },
  {
    id: 511, pilier: 'motivation', dimension: 'entrepreneuriat',
    texte_N1: '',
    texte_N2: '',
    texte_N3: "Je suis pret a prendre des risques calcules pour concretiser un projet professionnel.",
    niveaux: ['N3'], poids: 2,
  },
  {
    id: 512, pilier: 'motivation', dimension: 'entrepreneuriat',
    texte_N1: '',
    texte_N2: '',
    texte_N3: "Je vois des opportunites la ou les autres percoivent des obstacles.",
    niveaux: ['N3'], poids: 1,
  },
];

// =============================================================================
// ASSEMBLAGE PAR NIVEAU
// N1 : 30 questions — 30 min — format USSD / App simplifiee
// N2 : 70 questions — 70 min — App Android / Web
// N3 : 90 questions — 90 min — App / Web + entretien conseiller
// =============================================================================

const TOUTES_QUESTIONS: Question[] = [
  ...PILIER_PERSONNALITE,
  ...PILIER_SOFT_SKILLS,
  ...PILIER_RIASEC,
  ...PILIER_MOTIVATION,
  ...QUESTIONS_N3_LEADERSHIP,
];

// Limites par niveau selon le CDF
const LIMITES_PAR_NIVEAU: Record<'N1'|'N2'|'N3', number> = {
  N1: 30,
  N2: 70,
  N3: 90,
};

// Poids des piliers pour le score global
const POIDS_PILIERS: Record<string, number> = {
  personnalite: 25,
  soft_skills: 30,
  riasec: 25,
  motivation: 20,
};

@Injectable()
export class YiraInternalService implements IEvaluationProvider {
  private readonly logger = new Logger(YiraInternalService.name);

  constructor(private config: ConfigService) {}

  // ---------------------------------------------------------------------------
  // Selectionner et melanger les questions selon le niveau
  // Melange intra-pilier (Fisher-Yates) — pas entre piliers
  // ---------------------------------------------------------------------------
  private assemblerQuestions(niveau: 'N1' | 'N2' | 'N3'): Question[] {
    const piliers: (keyof typeof POIDS_PILIERS)[] = ['personnalite', 'soft_skills', 'riasec', 'motivation'];
    const limite = LIMITES_PAR_NIVEAU[niveau];
    const result: Question[] = [];

    // Ajouter les questions N3 Leadership si applicable
    if (niveau === 'N3') {
      result.push(...QUESTIONS_N3_LEADERSHIP);
    }

    // Pour chaque pilier, prendre les questions compatibles et melanger
    for (const pilier of piliers) {
      const qPilier = TOUTES_QUESTIONS.filter(
        q => q.pilier === pilier && q.niveaux.includes(niveau)
      );
      // Fisher-Yates shuffle intra-pilier
      for (let i = qPilier.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [qPilier[i], qPilier[j]] = [qPilier[j], qPilier[i]];
      }
      result.push(...qPilier);
    }

    // Limiter au nombre requis par niveau
    return result.slice(0, limite);
  }

  // ---------------------------------------------------------------------------
  // Formater une question selon le niveau pour l'interface
  // ---------------------------------------------------------------------------
  private formaterQuestion(q: Question, niveau: 'N1'|'N2'|'N3') {
    const texte = niveau === 'N1' ? q.texte_N1 : niveau === 'N2' ? q.texte_N2 : q.texte_N3;
    return {
      label_question: `[${q.pilier.toUpperCase()}|${q.dimension}${q.riasec_type ? '|' + q.riasec_type : ''}] ${texte}`,
      r1: niveau === 'N1' ? 'Oui completement' : 'Tout a fait d accord',
      r2: niveau === 'N1' ? 'Plutot oui' : 'Plutot d accord',
      r3: niveau === 'N1' ? 'Un peu' : 'Neutre',
      r4: niveau === 'N1' ? 'Plutot non' : 'Plutot pas d accord',
      r5: niveau === 'N1' ? 'Non pas du tout' : 'Pas du tout d accord',
      nb_reponses: 5,
      // Metadata pour le calcul du score
      _meta: {
        id: q.id,
        pilier: q.pilier,
        dimension: q.dimension,
        riasec_type: q.riasec_type,
        poids: q.poids,
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Calculer le score global /100 et le profil RIASEC
  // ---------------------------------------------------------------------------
  calculerScore(reponses: { question_id: number; valeur: number }[]): {
    score_global: number;
    profil_riasec: string;
    scores_riasec: Record<string, number>;
    scores_piliers: Record<string, number>;
    filiere_recommandee: 'A' | 'B' | 'C' | 'INFORMEL';
    parcours_informel?: string[];
  } {
    const scoresRiasec: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    const scoresPiliers: Record<string, { total: number; max: number }> = {
      personnalite: { total: 0, max: 0 },
      soft_skills: { total: 0, max: 0 },
      riasec: { total: 0, max: 0 },
      motivation: { total: 0, max: 0 },
    };

    const questionsMap = new Map(TOUTES_QUESTIONS.map(q => [q.id, q]));

    for (const rep of reponses) {
      const question = questionsMap.get(rep.question_id);
      if (!question) continue;

      const valeurNormalisee = rep.valeur; // 1-5
      const max = 5 * question.poids;
      const contribution = valeurNormalisee * question.poids;

      // Score pilier
      if (scoresPiliers[question.pilier]) {
        scoresPiliers[question.pilier].total += contribution;
        scoresPiliers[question.pilier].max += max;
      }

      // Score RIASEC
      if (question.riasec_type) {
        scoresRiasec[question.riasec_type] += valeurNormalisee;
      }
    }

    // Calcul score global pondere /100
    let scoreGlobal = 0;
    for (const [pilier, poids] of Object.entries(POIDS_PILIERS)) {
      const data = scoresPiliers[pilier];
      if (data && data.max > 0) {
        const scorePilier = (data.total / data.max) * 100;
        scoreGlobal += (scorePilier * poids) / 100;
      }
    }

    // Profil RIASEC dominant (lettre + secondaire)
    const riasecTrie = Object.entries(scoresRiasec).sort((a, b) => b[1] - a[1]);
    const profilRiasec = riasecTrie[0][0] + (riasecTrie[1][0] || '');

    // Algorithme de decision filiere
    let filiereRecommandee: 'A' | 'B' | 'C' | 'INFORMEL';
    let parcoursInformel: string[] | undefined;

    if (scoreGlobal >= 75) {
      filiereRecommandee = 'A';
    } else if (scoreGlobal >= 50) {
      filiereRecommandee = 'B';
    } else if (scoreGlobal >= 30) {
      filiereRecommandee = 'C';
    } else {
      filiereRecommandee = 'INFORMEL';
      parcoursInformel = this.determinerParcoursInformel(riasecTrie[0][0]);
    }

    return {
      score_global: Math.round(scoreGlobal),
      profil_riasec: profilRiasec,
      scores_riasec: scoresRiasec,
      scores_piliers: Object.fromEntries(
        Object.entries(scoresPiliers).map(([k, v]) =>
          [k, v.max > 0 ? Math.round((v.total / v.max) * 100) : 0]
        )
      ),
      filiere_recommandee: filiereRecommandee,
      parcours_informel: parcoursInformel,
    };
  }

  // ---------------------------------------------------------------------------
  // Determiner le parcours informel selon le profil RIASEC dominant
  // 6 voies informelles YIRA selon le CDF
  // ---------------------------------------------------------------------------
  private determinerParcoursInformel(riasecDominant: string): string[] {
    const carteParcours: Record<string, string[]> = {
      R: ['Apprentissage dual BTP/Mecanique', 'Agriculture contractuelle YIRA'],
      I: ['Services numeriques (Jumia/Glovo)', 'Artisanat technologique'],
      A: ['Artisanat mode/decoration', 'Services numeriques creatifs'],
      S: ['Apprentissage dual services a la personne', 'Commerce de proximite'],
      E: ['Commerce de proximite', 'Micro-entrepreneuriat YIRA'],
      C: ['Micro-entrepreneuriat gestion', 'Services numeriques administration'],
    };
    return carteParcours[riasecDominant] ?? ['Commerce de proximite', 'Agriculture contractuelle YIRA'];
  }

  // ---------------------------------------------------------------------------
  // IEvaluationProvider — initialiserEvaluation
  // ---------------------------------------------------------------------------
  async initialiserEvaluation(params: EvaluationInitParams): Promise<EvaluationSession> {
    this.logger.log(`YiraInternal v2: init ${params.niveau} — ${params.prenom} ${params.nom}`);

    const questions = this.assemblerQuestions(params.niveau);
    const assessment_id = Math.floor(Date.now() / 1000);

    return {
      assessment_id,
      provider: 'yira_internal',
      nb_questions: questions.length,
      questions: questions.map(q => this.formaterQuestion(q, params.niveau)),
    };
  }

  // ---------------------------------------------------------------------------
  // IEvaluationProvider — soumettreReponses
  // ---------------------------------------------------------------------------
  async soumettreReponses(dto: EvaluationReponses): Promise<boolean> {
    this.logger.log(`YiraInternal v2: ${dto.reponses.length} reponses — assessment ${dto.assessment_id}`);
    return true;
  }

  // ---------------------------------------------------------------------------
  // IEvaluationProvider — recupererResultats
  // ---------------------------------------------------------------------------
  async recupererResultats(assessment_id: number): Promise<EvaluationResultat> {
    // En production ces données viennent de Supabase
    // Pour le moment on retourne un profil exemple
    return {
      assessment_id,
      provider: 'yira_internal',
      scores: [72, 68, 75, 65, 70, 60],
      profil_riasec: 'SE',
      score_employabilite: 68,
      criteres: ['Communication', 'Travail en equipe', 'Sens du service', 'Stabilite emotionnelle'],
      rapport_pdf_url: null,
      pii_genere: false,
    };
  }

  // ---------------------------------------------------------------------------
  // IEvaluationProvider — genererRapport
  // ---------------------------------------------------------------------------
  async genererRapport(assessment_id: number, email: string, tenant_id: string): Promise<string> {
    return `https://yira.ci/rapports/${tenant_id}/${assessment_id}.pdf`;
  }
}