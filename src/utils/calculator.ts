import { ActeEngagement, Avenant, Chantier, ChantierMetrics, CorpsDetat, CorpsDetatMetrics, Facture, StatutConformite } from '../types/audit';

export function computeCorpsDetatMetrics(
  acte: ActeEngagement | null,
  factures: Facture[],
  avenants: Avenant[] = [],
  moisTraitement?: string, // format YYYY-MM (e.g. "2026-10")
  arborescenceValide: boolean = true,
  isLotAbsent: boolean = false
): CorpsDetatMetrics {
  const anomalies: string[] = [];
  const validAvenants = avenants.filter(a => a.statut === 'valide');
  const totalAvenantsHT = validAvenants.reduce((acc, a) => acc + (a.montantHT || 0), 0);

  const budgetInitialHT = acte ? acte.montantHT : 0;
  const tauxTVA = acte ? acte.tauxTVA : 20;
  const budgetInitialTTC = acte ? acte.montantTTC : 0;

  const budgetRevisHT = budgetInitialHT + totalAvenantsHT;
  const budgetRevisTTC = budgetRevisHT * (1 + tauxTVA / 100);

  // Filtrage selon le mois de traitement
  let facturesMois: Facture[] = [];
  let facturesAnterieures: Facture[] = [];

  if (moisTraitement) {
    facturesMois = factures.filter(f => f.dateEmission && f.dateEmission.startsWith(moisTraitement));
    facturesAnterieures = factures.filter(
      f => f.dateEmission && f.dateEmission < `${moisTraitement}-01`
    );
  } else {
    facturesMois = [...factures];
    facturesAnterieures = [];
  }

  const montantMoisHT = facturesMois.reduce((acc, f) => acc + (f.montantHT || 0), 0);
  const montantMoisTTC = facturesMois.reduce((acc, f) => acc + (f.montantTTC || 0), 0);
  const cumulAnterieurHT = facturesAnterieures.reduce((acc, f) => acc + (f.montantHT || 0), 0);
  const cumulTotalHT = cumulAnterieurHT + montantMoisHT;
  const totalFactureHT = factures.reduce((acc, f) => acc + (f.montantHT || 0), 0);
  const totalFactureTTC = factures.reduce((acc, f) => acc + (f.montantTTC || 0), 0);

  // Écart par rapport au budget contractuel révisé
  const ecartBudgetHT = budgetRevisHT - cumulTotalHT;
  const tauxConsommationPct = budgetRevisHT > 0 ? (cumulTotalHT / budgetRevisHT) * 100 : (cumulTotalHT > 0 ? 999 : 0);

  // Retenue de garantie : suppression demandée par le client (0% par défaut)
  const retenuePct = 0;
  const retenueGarantieMoisHT = 0;
  const totalRetenueGarantieHT = 0;

  // Détection des fichiers non analysés / non extractibles (Fichier K.O.)
  let nbFichiersKO = 0;
  if (acte && !acte.isAiParsed && acte.montantHT === 0) {
    nbFichiersKO++;
  }
  factures.forEach(f => {
    if (!f.isAiParsed && f.montantHT === 0) {
      nbFichiersKO++;
    }
  });
  const hasFichierKO = nbFichiersKO > 0;

  // RÈGLE MÉTIER STRICTE :
  // 1) Détection anomalie arborescence -> "non vérifié" (Arborescence K.O.)
  // 2) Absence de sous-dossier artisan-lot -> "lot_absent"
  // 3) Fichier non extractible -> "fichier_ko" si bloquant, sinon manque_ae
  // 4) Absence d'acte d'engagement OU absence de facture : aucun contrôle n'est à faire !
  // 5) Présence de l'un et de l'autre -> Contrôle de conformité budgétaire
  let statut: StatutConformite = 'valide';
  let controleEffectue = false;
  let motifNonControle: string | undefined = undefined;

  if (!arborescenceValide) {
    statut = 'non_verifie';
    controleEffectue = false;
    motifNonControle = "Anomalie d'arborescence : dossier 5 - corps d'état / 3 - marchés et assurances non conforme ou non vérifié.";
    anomalies.push("Arborescence non conforme : branche ignorée ou incomplète.");
  } else if (isLotAbsent) {
    statut = 'lot_absent';
    controleEffectue = false;
    motifNonControle = "Aucun contrôle à faire : Dossier artisan-lot absent de l'arborescence (aucun sous-dossier de lot créé).";
    anomalies.push("Dossier artisan-lot non créé dans l'arborescence.");
  } else if (hasFichierKO && (!acte || acte.montantHT === 0) && factures.length === 0) {
    statut = 'fichier_ko';
    controleEffectue = false;
    motifNonControle = "Fichier K.O. : Le document présent dans le dossier n'a pas pu être extrait ou analysé (scan image sans OCR ou flux illisible).";
    anomalies.push("Fichier non extractible / illisible détecté dans le lot.");
  } else if (!acte || acte.montantHT === 0) {
    statut = 'manque_ae';
    controleEffectue = false;
    motifNonControle = !acte
      ? "Aucun contrôle budgétaire à faire : Absence d'acte d'engagement contractuel."
      : "Contrôle budgétaire suspendu : l'acte d'engagement est présent mais aucun montant HT n'a pu être extrait du document.";
    anomalies.push(
      !acte
        ? "Absence d'acte d'engagement : aucun contrôle budgétaire de rapprochement n'est réalisé."
        : `Montant contractuel HT non détecté dans le document (« ${acte.fileName} »).`
    );
  } else if (factures.length === 0) {
    statut = 'sans_facture';
    controleEffectue = false;
    motifNonControle = "Aucun contrôle à faire : Aucune facture enregistrée pour ce lot.";
  } else if (moisTraitement && facturesMois.length === 0) {
    statut = 'sans_facture_mois';
    controleEffectue = false;
    motifNonControle = `Aucun contrôle à faire : Aucune facture émise sur le mois de traitement (${formatMoisFr(moisTraitement)}).`;
  } else {
    // Acte d'engagement ET factures du mois sont tous les deux présents : le contrôle est opéré !
    controleEffectue = true;

    // Vérification de conformité TVA
    facturesMois.forEach(f => {
      if (Math.abs(f.tauxTVA - tauxTVA) > 0.1) {
        anomalies.push(
          `Écart de TVA sur la facture ${f.numeroFacture} (${f.tauxTVA}% au lieu de ${tauxTVA}% stipulé dans l'AE).`
        );
      }
    });

    // Détection dépassement budgétaire
    if (cumulTotalHT > budgetRevisHT) {
      statut = 'depassement';
      const depassement = Math.abs(ecartBudgetHT);
      anomalies.push(
        `Dépassement du budget contractuel de +${formatMontant(depassement)} HT (+${(tauxConsommationPct - 100).toFixed(1)}%). Facturé ce mois : ${formatMontant(montantMoisHT)} HT.`
      );
    } else if (tauxConsommationPct >= 90) {
      statut = 'alerte';
      anomalies.push(
        `Consommation budgétaire critique : ${tauxConsommationPct.toFixed(1)}% du marché engagé (reste ${formatMontant(ecartBudgetHT)} HT).`
      );
    } else {
      statut = 'valide';
    }

    // Détection doublon factures
    const seenNumbers = new Set<string>();
    facturesMois.forEach(f => {
      const cleanNum = f.numeroFacture.trim().toLowerCase();
      if (seenNumbers.has(cleanNum) && cleanNum !== '') {
        anomalies.push(`Numéro de facture en doublon détecté ce mois-ci : "${f.numeroFacture}".`);
      }
      seenNumbers.add(cleanNum);
    });
  }

  return {
    budgetInitialHT,
    budgetInitialTTC,
    totalAvenantsHT,
    budgetRevisHT,
    budgetRevisTTC,
    montantMoisHT,
    montantMoisTTC,
    nbFacturesMois: facturesMois.length,
    cumulAnterieurHT,
    cumulTotalHT,
    totalFactureHT,
    totalFactureTTC,
    tauxTVA,
    ecartBudgetHT,
    tauxConsommationPct,
    retenueGarantieMoisHT,
    totalRetenueGarantieHT,
    statut,
    anomalies,
    controleEffectue,
    motifNonControle,
    hasFichierKO,
    nbFichiersKO,
  };
}

export function computeChantierMetrics(corpsDetats: CorpsDetat[]): ChantierMetrics {
  let totalBudgetInitialHT = 0;
  let totalAvenantsHT = 0;
  let totalBudgetRevisHT = 0;
  let totalFactureMoisHT = 0;
  let totalFactureHT = 0;
  let nbFacturesMois = 0;
  let nbFacturesTotal = 0;
  let nbValides = 0;
  let nbDepassements = 0;
  let nbAlertes = 0;
  let nbManqueAE = 0;
  let nbLotAbsent = 0;
  let nbSansFacture = 0;
  let nbSansFactureMois = 0;
  let nbNonVerifies = 0;
  let nbFichierKO = 0;

  corpsDetats.forEach(c => {
    totalBudgetInitialHT += c.metrics.budgetInitialHT;
    totalAvenantsHT += c.metrics.totalAvenantsHT;
    totalBudgetRevisHT += c.metrics.budgetRevisHT;
    totalFactureMoisHT += c.metrics.montantMoisHT;
    totalFactureHT += c.metrics.cumulTotalHT;
    nbFacturesMois += c.metrics.nbFacturesMois;
    nbFacturesTotal += c.factures.length;

    if (c.metrics.hasFichierKO || c.metrics.statut === 'fichier_ko') nbFichierKO++;
    if (c.metrics.statut === 'valide' || c.metrics.statut === 'conforme') nbValides++;
    if (c.metrics.statut === 'depassement') nbDepassements++;
    if (c.metrics.statut === 'alerte') nbAlertes++;
    if (c.metrics.statut === 'manque_ae') nbManqueAE++;
    if (c.metrics.statut === 'lot_absent') nbLotAbsent++;
    if (c.metrics.statut === 'sans_facture') nbSansFacture++;
    if (c.metrics.statut === 'sans_facture_mois') nbSansFactureMois++;
    if (c.metrics.statut === 'non_verifie' || c.metrics.statut === 'anomalie') nbNonVerifies++;
  });

  const ecartGlobalHT = totalBudgetRevisHT - totalFactureHT;
  const tauxConsommationPct = totalBudgetRevisHT > 0 ? (totalFactureHT / totalBudgetRevisHT) * 100 : 0;

  let statutGlobal: StatutConformite = 'valide';
  if (nbDepassements > 0) {
    statutGlobal = 'depassement';
  } else if (nbNonVerifies > 0) {
    statutGlobal = 'non_verifie';
  } else if (nbFichierKO > 0) {
    statutGlobal = 'fichier_ko';
  } else if (nbLotAbsent > 0) {
    statutGlobal = 'lot_absent';
  } else if (nbManqueAE > 0) {
    statutGlobal = 'manque_ae';
  } else if (nbAlertes > 0) {
    statutGlobal = 'alerte';
  } else if (nbSansFactureMois + nbSansFacture === corpsDetats.length && corpsDetats.length > 0) {
    statutGlobal = 'sans_facture_mois';
  }

  return {
    totalBudgetInitialHT,
    totalAvenantsHT,
    totalBudgetRevisHT,
    totalFactureMoisHT,
    totalFactureHT,
    ecartGlobalHT,
    tauxConsommationPct,
    nbCorpsDetat: corpsDetats.length,
    nbFacturesMois,
    nbFacturesTotal,
    nbValides,
    nbDepassements,
    nbAlertes,
    nbManqueAE,
    nbLotAbsent,
    nbSansFacture,
    nbSansFactureMois,
    nbNonVerifies,
    nbFichierKO,
    statutGlobal,
  };
}

export function formatMontant(val: number, decimals: number = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatPourcentage(val: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(val / 100);
}

export function formatMoisFr(yearMonth: string): string {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function recomputeChantiersWithMonth(
  chantiers: Chantier[],
  moisTraitement: string
): Chantier[] {
  return chantiers.map(ch => {
    const updatedCorps = ch.corpsDetats.map(c => {
      const isLotAbsent = c.metrics.statut === 'lot_absent';
      const updatedMetrics = computeCorpsDetatMetrics(
        c.acteEngagement,
        c.factures,
        c.avenants,
        moisTraitement,
        c.arborescenceValide ?? true,
        isLotAbsent
      );
      return {
        ...c,
        metrics: updatedMetrics,
      };
    });
    return {
      ...ch,
      corpsDetats: updatedCorps,
      metrics: computeChantierMetrics(updatedCorps),
    };
  });
}
