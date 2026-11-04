import * as XLSX from 'xlsx';
import { Chantier } from '../types/audit';

export function exportAuditToExcel(chantiers: Chantier[], fileName: string = 'Rapport_Audit_Conformite_Chantiers.xlsx') {
  const wb = XLSX.utils.book_new();

  // 1. Feuille Synthèse des Chantiers
  const syntheseData = chantiers.map(ch => ({
    'Code Chantier': ch.code,
    'Nom du Chantier': ch.name,
    'Maître d’Ouvrage': ch.maitreOuvrage,
    'Lieu': ch.lieu,
    'Nombre de Lots': ch.metrics.nbCorpsDetat,
    'Budget Initial HT (€)': ch.metrics.totalBudgetInitialHT,
    'Total Avenants HT (€)': ch.metrics.totalAvenantsHT,
    'Budget Révisé HT (€)': ch.metrics.totalBudgetRevisHT,
    'Facturé sur le Mois HT (€)': ch.metrics.totalFactureMoisHT,
    'Nb Factures du Mois': ch.metrics.nbFacturesMois,
    'Total Facturé Cumulé HT (€)': ch.metrics.totalFactureHT,
    'Écart Budgétaire HT (€)': ch.metrics.ecartGlobalHT,
    'Taux de Consommation (%)': (ch.metrics.tauxConsommationPct).toFixed(1) + '%',
    'Nb Dépassements': ch.metrics.nbDepassements,
    'Nb Alertes': ch.metrics.nbAlertes,
    'Lots sans AE': ch.metrics.nbManqueAE,
    'Statut Global': ch.metrics.statutGlobal.toUpperCase(),
  }));
  const wsSynthese = XLSX.utils.json_to_sheet(syntheseData);
  XLSX.utils.book_append_sheet(wb, wsSynthese, 'Synthèse Chantiers');

  // 2. Feuille Détail Corps d'État (Comparatif Acte d'engagement vs Factures)
  const detailCorpsData: Record<string, string | number>[] = [];
  chantiers.forEach(ch => {
    ch.corpsDetats.forEach(c => {
      detailCorpsData.push({
        'Chantier': ch.name,
        'Code Lot': c.code,
        'Corps d’État': c.name,
        'Entreprise Titulaire': c.entreprise,
        'Acte Engagement Présent': c.acteEngagement ? 'OUI' : 'NON (MANQUANT)',
        'Budget Initial HT (€)': c.metrics.budgetInitialHT,
        'Total Avenants HT (€)': c.metrics.totalAvenantsHT,
        'Budget Contractuel Révisé HT (€)': c.metrics.budgetRevisHT,
        'Facturé sur le Mois HT (€)': c.metrics.montantMoisHT,
        'Facturé sur le Mois TTC (€)': c.metrics.montantMoisTTC,
        'Nb Factures du Mois': c.metrics.nbFacturesMois,
        'Total Facturé Cumulé HT (€)': c.metrics.totalFactureHT,
        'Total Facturé Cumulé TTC (€)': c.metrics.totalFactureTTC,
        'Écart Solde HT (€)': c.metrics.ecartBudgetHT,
        'Taux Consommation': c.metrics.tauxConsommationPct.toFixed(1) + '%',
        'Retenue Garantie 5% (€)': c.metrics.totalRetenueGarantieHT,
        'Statut Conformité': c.metrics.statut.toUpperCase(),
        'Nombre Anomalies': c.metrics.anomalies.length,
        'Anomalies / Alertes': c.metrics.anomalies.join(' | ') || 'Aucune anomalie',
      });
    });
  });
  const wsCorps = XLSX.utils.json_to_sheet(detailCorpsData);
  XLSX.utils.book_append_sheet(wb, wsCorps, 'Contrôle Lots & Budget');

  // 3. Feuille Liste des Factures
  const facturesData: Record<string, string | number>[] = [];
  chantiers.forEach(ch => {
    ch.corpsDetats.forEach(c => {
      c.factures.forEach(f => {
        facturesData.push({
          'Chantier': ch.name,
          'Corps d’État': c.name,
          'Entreprise': c.entreprise,
          'N° Facture': f.numeroFacture,
          'Libellé / Situation': f.situationNumero || 'Situation',
          'Date Émission': f.dateEmission,
          'Montant HT (€)': f.montantHT,
          'Taux TVA (%)': f.tauxTVA + '%',
          'Montant TTC (€)': f.montantTTC,
          'Retenue de Garantie HT (€)': f.retenueGarantieHT || f.montantHT * 0.05,
          'Statut Paiement': f.statutPaiement,
          'Fichier Source': f.fileName,
          'Commentaires': f.commentaires || '',
        });
      });
    });
  });
  const wsFactures = XLSX.utils.json_to_sheet(facturesData);
  XLSX.utils.book_append_sheet(wb, wsFactures, 'Détail Factures');

  // Téléchargement du fichier Excel
  XLSX.writeFile(wb, fileName);
}
