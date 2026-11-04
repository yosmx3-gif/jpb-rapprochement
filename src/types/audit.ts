export type StatutConformite =
  | 'valide'
  | 'conforme'
  | 'alerte'
  | 'depassement'
  | 'manque_ae'
  | 'lot_absent'
  | 'sans_facture'
  | 'sans_facture_mois'
  | 'non_verifie'
  | 'fichier_ko'
  | 'anomalie';

export interface ActeEngagement {
  id: string;
  fileName: string;
  filePath: string;
  entrepriseTitulaire: string;
  siret?: string;
  dateSignature: string;
  montantHT: number;
  tauxTVA: number; // e.g. 20 ou 10 ou 5.5
  montantTTC: number;
  dureeMois?: number;
  retenueGarantiePct: number; // 0 si désactivé
  penalitesRetardJour?: number;
  clausesParticulieres?: string;
  rawContent?: string;
  isAiParsed?: boolean;
  justification?: string;
}

export interface Facture {
  id: string;
  fileName: string;
  filePath: string;
  numeroFacture: string;
  situationNumero?: string; // e.g. "Situation N°1", "Acompte 2"
  dateEmission: string;
  dateEcheance?: string;
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  retenueGarantieHT?: number;
  compteProrataHT?: number;
  statutPaiement: 'validee' | 'en_attente' | 'litige' | 'payee';
  commentaires?: string;
  rawContent?: string;
  isAiParsed?: boolean;
  justification?: string;
}

export interface Avenant {
  id: string;
  numero: string;
  date: string;
  objet: string;
  montantHT: number;
  impactDelaiJours?: number;
  statut: 'valide' | 'en_cours' | 'refuse';
}

export interface CorpsDetatMetrics {
  budgetInitialHT: number;
  budgetInitialTTC: number;
  totalAvenantsHT: number;
  budgetRevisHT: number;
  budgetRevisTTC: number;
  // Métriques du mois de traitement
  montantMoisHT: number;
  montantMoisTTC: number;
  nbFacturesMois: number;
  cumulAnterieurHT: number;
  cumulTotalHT: number;
  totalFactureHT: number;
  totalFactureTTC: number;
  tauxTVA: number;
  ecartBudgetHT: number; // budgetRevisHT - cumulTotalHT
  tauxConsommationPct: number;
  retenueGarantieMoisHT: number;
  totalRetenueGarantieHT: number;
  statut: StatutConformite;
  anomalies: string[];
  controleEffectue: boolean; // false si absence d'AE, absence de facture ou non vérifié
  motifNonControle?: string; // Explication claire du motif d'absence de contrôle
  hasFichierKO?: boolean; // true si un fichier du lot n'a pas pu être extrait / analysé
  nbFichiersKO?: number;
}

export interface CorpsDetat {
  id: string;
  chantierId: string;
  code: string; // e.g. "LOT-01", "LOT-03" ou nom de l'artisan
  name: string; // e.g. "Gros Œuvre / Béton Armé", "Plomberie & Chauffage"
  folderPath: string; // ex: "Chantiers en cours/Projet A/5 - corps d'état/3 - marchés et assurances/Phase 1/Lot 01"
  entreprise: string;
  phase?: string; // ex: "Phase 1", "Phase 2" (optionnel)
  arborescenceValide?: boolean; // false si rupture arborescence (Arborescence K.O.)
  acteEngagement: ActeEngagement | null;
  factures: Facture[];
  avenants: Avenant[];
  metrics: CorpsDetatMetrics;
}

export interface ChantierMetrics {
  totalBudgetInitialHT: number;
  totalAvenantsHT: number;
  totalBudgetRevisHT: number;
  totalFactureMoisHT: number;
  totalFactureHT: number;
  ecartGlobalHT: number;
  tauxConsommationPct: number;
  nbCorpsDetat: number;
  nbFacturesMois: number;
  nbFacturesTotal: number;
  nbValides: number;
  nbDepassements: number;
  nbAlertes: number;
  nbManqueAE: number;
  nbLotAbsent: number;
  nbSansFacture: number;
  nbSansFactureMois: number;
  nbNonVerifies: number;
  nbFichierKO?: number;
  statutGlobal: StatutConformite;
}

export interface Chantier {
  id: string;
  code: string;
  name: string;
  folderPath: string;
  maitreOuvrage: string;
  maitreOeuvre?: string;
  lieu: string;
  dateDebut: string;
  dateLivraisonPrevue: string;
  corpsDetats: CorpsDetat[];
  metrics: ChantierMetrics;
  hasArborescenceAnomaly?: boolean;
}

export interface ArborescenceDossier {
  rootFolderName: string;
  lastImportDate: string;
  chantiers: Chantier[];
}
