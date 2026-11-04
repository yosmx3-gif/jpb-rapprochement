import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileQuestion,
  Printer,
  TrendingDown,
  Building2,
  Calendar
} from 'lucide-react';
import { Chantier, StatutConformite } from '../types/audit';
import { formatMoisFr, formatMontant, formatPourcentage } from '../utils/calculator';
import { exportAuditToExcel } from '../utils/exportAudit';

interface GlobalSynthesisTableProps {
  chantiers: Chantier[];
  moisTraitement: string;
  onSelectLot: (chantierId: string, corpsDetatId: string) => void;
  onOpenParametrage: () => void;
}

export const GlobalSynthesisTable: React.FC<GlobalSynthesisTableProps> = ({
  chantiers,
  moisTraitement,
  onSelectLot,
  onOpenParametrage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatutConformite | 'all'>('all');

  // Aplatissement de tous les corps d'état
  const allRows: Array<{
    chantierId: string;
    chantierName: string;
    chantierCode: string;
    lotId: string;
    lotCode: string;
    lotName: string;
    entreprise: string;
    hasAE: boolean;
    budgetInitialHT: number;
    avenantsHT: number;
    budgetRevisHT: number;
    factureMoisHT: number;
    nbFacturesMois: number;
    totalFactureHT: number;
    ecartHT: number;
    tauxConsommationPct: number;
    nbFactures: number;
    statut: StatutConformite;
    anomalies: string[];
    controleEffectue: boolean;
  }> = [];

  let totalPortfolioBudgetHT = 0;
  let totalPortfolioFactureMoisHT = 0;
  let totalPortfolioFactureHT = 0;
  let totalLots = 0;
  let totalValides = 0;
  let totalDepassements = 0;
  let totalAlertes = 0;
  let totalManqueAE = 0;
  let totalLotAbsent = 0;
  let totalFichierKO = 0;
  let totalArborescenceKO = 0;
  let totalSansFactureMois = 0;

  chantiers.forEach(ch => {
    ch.corpsDetats.forEach(c => {
      totalLots++;
      totalPortfolioBudgetHT += c.metrics.budgetRevisHT;
      totalPortfolioFactureMoisHT += c.metrics.montantMoisHT;
      totalPortfolioFactureHT += c.metrics.cumulTotalHT;

      if (c.metrics.hasFichierKO || c.metrics.statut === 'fichier_ko') totalFichierKO++;
      if (c.metrics.statut === 'valide' || c.metrics.statut === 'conforme') totalValides++;
      if (c.metrics.statut === 'depassement') totalDepassements++;
      if (c.metrics.statut === 'alerte') totalAlertes++;
      if (c.metrics.statut === 'manque_ae') totalManqueAE++;
      if (c.metrics.statut === 'lot_absent') totalLotAbsent++;
      if (c.metrics.statut === 'non_verifie' || c.metrics.statut === 'anomalie') totalArborescenceKO++;
      if (c.metrics.statut === 'sans_facture' || c.metrics.statut === 'sans_facture_mois') totalSansFactureMois++;

      allRows.push({
        chantierId: ch.id,
        chantierName: ch.name,
        chantierCode: ch.code,
        lotId: c.id,
        lotCode: c.code,
        lotName: c.name,
        entreprise: c.entreprise,
        hasAE: Boolean(c.acteEngagement),
        budgetInitialHT: c.metrics.budgetInitialHT,
        avenantsHT: c.metrics.totalAvenantsHT,
        budgetRevisHT: c.metrics.budgetRevisHT,
        factureMoisHT: c.metrics.montantMoisHT,
        nbFacturesMois: c.metrics.nbFacturesMois,
        totalFactureHT: c.metrics.cumulTotalHT,
        ecartHT: c.metrics.ecartBudgetHT,
        tauxConsommationPct: c.metrics.tauxConsommationPct,
        nbFactures: c.factures.length,
        statut: c.metrics.statut,
        anomalies: c.metrics.anomalies,
        controleEffectue: c.metrics.controleEffectue,
      });
    });
  });

  const filteredRows = allRows.filter(row => {
    const matchesSearch =
      row.chantierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.lotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.lotCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.entreprise.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'valide' || statusFilter === 'conforme') {
      matchesStatus = row.statut === 'valide' || row.statut === 'conforme';
    } else if (statusFilter === 'non_verifie') {
      matchesStatus = row.statut === 'non_verifie' || row.statut === 'anomalie';
    } else {
      matchesStatus = row.statut === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  const totalPortfolioEcartHT = totalPortfolioBudgetHT - totalPortfolioFactureHT;
  const portfolioConsommationPct =
    totalPortfolioBudgetHT > 0 ? (totalPortfolioFactureHT / totalPortfolioBudgetHT) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8 space-y-6">
      {/* 1. En-tête & Actions d'Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="text-xs text-slate-500 mb-1">Audit Consolidé · {formatMoisFr(moisTraitement)}</div>
          <h1 className="text-2xl font-bold text-slate-900">
            Matrice de Contrôle Budgétaire & Facturation
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Consolidation multi-chantiers pour le mois de <strong className="text-slate-900 capitalize">{formatMoisFr(moisTraitement)}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenParametrage}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold font-mono-numbers text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            <span className="capitalize">{formatMoisFr(moisTraitement)}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer</span>
          </button>
          <button
            onClick={() => exportAuditToExcel(chantiers)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exporter Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 2. Cartes de synthèse globale */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-neutral-200">
          <div className="text-xs text-slate-500 font-medium">
            <span>Budget Portfolio (HT)</span>
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono-numbers mt-1">
            <span>{formatMontant(totalPortfolioBudgetHT, 0)}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            <span>Sur </span>
            <span className="font-mono-numbers">{totalLots}</span>
            <span> corps d'état</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 bg-amber-50/20">
          <div className="text-xs text-amber-800 font-semibold">
            <span>Facturé en </span>
            <span>{formatMoisFr(moisTraitement)}</span>
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono-numbers mt-1">
            <span>{formatMontant(totalPortfolioFactureMoisHT, 0)}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono-numbers">
            <span>Mois de traitement sélectionné</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200">
          <div className="text-xs text-slate-500 font-medium">
            <span>Cumul Arrêté au Mois (HT)</span>
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono-numbers mt-1">
            <span>{formatMontant(totalPortfolioFactureHT, 0)}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono-numbers">
            <span>Consommation : </span>
            <span>{portfolioConsommationPct.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200">
          <div className="text-xs text-slate-500 font-medium">
            <span>Dépassements Constatés</span>
          </div>
          <div className="text-lg font-bold text-rose-600 font-mono-numbers mt-1">
            <span>{totalDepassements}</span>
            <span> lot{totalDepassements > 1 ? 's' : ''}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            <span>+ </span>
            <span className="font-mono-numbers">{totalAlertes}</span>
            <span> en alerte critique (&gt;90%)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200">
          <div className="text-xs text-slate-500 font-medium">
            <span>Dossiers sans AE</span>
          </div>
          <div className="text-lg font-bold text-purple-600 font-mono-numbers mt-1">
            <span>{totalManqueAE}</span>
            <span> lot{totalManqueAE > 1 ? 's' : ''}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            <span>Sans base contractuelle</span>
          </div>
        </div>
      </div>

      {/* 3. Filtres & Tableau Détaillé */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer par chantier, lot, entreprise..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Tous </span>
              <span className="font-mono-numbers">({allRows.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('valide')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'valide'
                  ? 'bg-emerald-700 text-white font-semibold'
                  : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span>Validés </span>
              <span className="font-mono-numbers">({totalValides})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('depassement')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'depassement'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span>Dépassements </span>
              <span className="font-mono-numbers">({totalDepassements})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('alerte')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'alerte'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <span>Alertes &gt;90% </span>
              <span className="font-mono-numbers">({totalAlertes})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('manque_ae')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'manque_ae'
                  ? 'bg-purple-600 text-white'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              <span>AE absent </span>
              <span className="font-mono-numbers">({totalManqueAE})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('lot_absent')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'lot_absent'
                  ? 'bg-indigo-600 text-white'
                  : 'text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              <span>Lot absent </span>
              <span className="font-mono-numbers">({totalLotAbsent})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('fichier_ko')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'fichier_ko'
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200'
              }`}
            >
              <span>Fichier K.O. </span>
              <span className="font-mono-numbers">({totalFichierKO})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('non_verifie')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === 'non_verifie'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span>Arborescence K.O. </span>
              <span className="font-mono-numbers">({totalArborescenceKO})</span>
            </button>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-neutral-200 text-slate-500 font-medium bg-neutral-50/60">
                <th className="py-2.5 px-3">Chantier & Lot</th>
                <th className="py-2.5 px-3">Entreprise Titulaire</th>
                <th className="py-2.5 px-3 text-center">Acte d'Eng.</th>
                <th className="py-2.5 px-3 text-right">Budget Révisé HT</th>
                <th className="py-2.5 px-3 text-right">Facturé ce mois</th>
                <th className="py-2.5 px-3 text-right">Cumul à date</th>
                <th className="py-2.5 px-3 text-right">Écart Solde HT</th>
                <th className="py-2.5 px-3 text-right">% Consommé</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredRows.map(row => {
                const isOverrun = row.statut === 'depassement';
                const isSansFacture = row.statut === 'sans_facture_mois';

                return (
                  <tr
                    key={row.lotId}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onSelectLot(row.chantierId, row.lotId)}
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        <span>{row.lotName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono-numbers font-medium text-slate-700">
                          <span>{row.lotCode}</span>
                        </span>
                        <span>·</span>
                        <span className="truncate max-w-[180px]">
                          <span>{row.chantierName}</span>
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">
                        <span>{row.entreprise}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono-numbers mt-0.5">
                        <span>{row.nbFacturesMois}</span>
                        <span> facture(s) ce mois (</span>
                        <span>{row.nbFactures}</span>
                        <span> au total)</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {row.hasAE ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Présent</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          <FileQuestion className="w-3 h-3 text-purple-600" />
                          <span>Manquant</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-numbers font-semibold text-slate-900">
                      {formatMontant(row.budgetRevisHT)}
                    </td>

                    <td
                      className={`py-3 px-3 text-right font-mono-numbers font-semibold ${
                        row.factureMoisHT > 0 ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {formatMontant(row.factureMoisHT)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-numbers font-semibold text-slate-900">
                      {formatMontant(row.totalFactureHT)}
                    </td>

                    <td
                      className={`py-3 px-3 text-right font-mono-numbers font-bold ${
                        isOverrun ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatMontant(row.ecartHT)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-numbers font-bold">
                      {!row.controleEffectue ? (
                        <span className="text-[10px] text-slate-400 font-medium italic">
                          Aucun contrôle
                        </span>
                      ) : (
                        <span
                          className={
                            isOverrun
                              ? 'text-rose-600'
                              : row.tauxConsommationPct >= 90
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }
                        >
                          {row.tauxConsommationPct > 900
                            ? 'N/A'
                            : `${row.tauxConsommationPct.toFixed(1)}%`}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          row.statut === 'depassement'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : row.statut === 'lot_absent'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : row.statut === 'fichier_ko'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : row.statut === 'manque_ae'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : row.statut === 'alerte'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : row.statut === 'non_verifie' || row.statut === 'anomalie'
                            ? 'bg-slate-100 text-slate-700 border border-slate-300'
                            : isSansFacture
                            ? 'bg-slate-100 text-slate-600 border border-neutral-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {row.statut === 'depassement'
                          ? 'Dépassement'
                          : row.statut === 'lot_absent'
                          ? 'Lot absent'
                          : row.statut === 'fichier_ko'
                          ? 'Fichier K.O.'
                          : row.statut === 'manque_ae'
                          ? 'AE absent'
                          : row.statut === 'alerte'
                          ? 'Alerte >90%'
                          : row.statut === 'non_verifie' || row.statut === 'anomalie'
                          ? 'Arborescence K.O.'
                          : isSansFacture
                          ? 'Sans facture'
                          : 'Validé'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="text-xs text-slate-700 hover:text-slate-900 font-semibold underline">
                        Contrôler
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
