import React from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, FileQuestion, Building, Calendar } from 'lucide-react';
import { Chantier, CorpsDetat } from '../types/audit';
import { formatMontant, formatPourcentage } from '../utils/calculator';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  chantier: Chantier | null;
  corpsDetat: CorpsDetat | null;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  isOpen,
  onClose,
  chantier,
  corpsDetat,
}) => {
  if (!isOpen || !chantier || !corpsDetat) return null;

  const { metrics, acteEngagement, factures, avenants } = corpsDetat;
  const isOverrun = metrics.statut === 'depassement';
  const isMissingAE = !acteEngagement;
  const isAlert = metrics.statut === 'alerte';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        {/* En-tête modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-slate-800" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Fiche d'Audit &amp; Visa de Contrôle Financier
              </h3>
              <p className="text-[11px] text-slate-500">
                <span>Conformité contractuelle · </span>
                <span className="font-mono-numbers">{corpsDetat.code}</span>
                <span> - </span>
                <span className="inline-block font-medium">{corpsDetat.name}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer Fiche</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps du rapport */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Bloc d'identification officiel */}
          <div className="border border-neutral-200 rounded-xl p-4 bg-slate-50/60 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">Opération / Chantier</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                <span className="block">{chantier.name}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                <span>MOA : </span>
                <span className="inline-block font-medium">{chantier.maitreOuvrage}</span>
              </p>
              <p className="text-[11px] text-slate-500">
                <span>Lieu : </span>
                <span className="inline-block">{chantier.lieu}</span>
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">Corps d'État Audité</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                <span className="font-mono-numbers">{corpsDetat.code}</span>
                <span> · </span>
                <span>{corpsDetat.name}</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                <span>Titulaire : </span>
                <span className="inline-block font-medium">{corpsDetat.entreprise}</span>
              </p>
              <p className="text-[11px] text-slate-500">
                <span>Date de l'audit : </span>
                <span className="inline-block font-mono-numbers">{new Date().toLocaleDateString('fr-FR')}</span>
              </p>
            </div>
          </div>

          {/* Avis & Décision de Contrôle */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isOverrun
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : isMissingAE
                ? 'bg-purple-50 border-purple-200 text-purple-900'
                : isAlert
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            {isOverrun ? (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : isMissingAE ? (
              <FileQuestion className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            ) : isAlert ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="font-bold text-sm">
                <span>Décision du Contrôle de Gestion : </span>
                <span className="inline-block">
                  {isOverrun
                    ? 'VISA SUSPENDU (Dépassement du marché sans avenant)'
                    : isMissingAE
                    ? 'VISA BLOQUÉ (Acte d’engagement manquant)'
                    : isAlert
                    ? 'VISA ACCORDÉ AVEC RÉSERVE (Seuil de vigilance 90%)'
                    : 'VISA ACCORDÉ (Facturation conforme au marché)'}
                </span>
              </h4>
              <p className="text-xs mt-1 leading-relaxed">
                {isOverrun ? (
                  <span>
                    <span>Dépassement constaté de +</span>
                    <span className="font-mono-numbers font-semibold">{formatMontant(Math.abs(metrics.ecartBudgetHT))} HT</span>
                    <span> (+</span>
                    <span className="font-mono-numbers">{(metrics.tauxConsommationPct - 100).toFixed(1)}%</span>
                    <span>). Recommandation formelle : Bloquer le mandatement de la dernière situation jusqu'à signature d'un Avenant régularisant les travaux modificatifs ou émission d'un Ordre de Service valant accord de prix.</span>
                  </span>
                ) : isMissingAE ? (
                  <span>
                    <span>Aucun Acte d'Engagement contractuel n'a été fourni dans le dossier du lot. Les </span>
                    <span className="font-mono-numbers font-semibold">{factures.length}</span>
                    <span> factures enregistrées ne disposent d'aucun plafond juridique validé.</span>
                  </span>
                ) : isAlert ? (
                  <span>
                    <span>Le cumul facturé atteint </span>
                    <span className="font-mono-numbers font-semibold">{metrics.tauxConsommationPct.toFixed(1)}%</span>
                    <span> du budget. Tout nouveau travail modificatif devra faire l'objet d'un avenant sous peine de blocage comptable.</span>
                  </span>
                ) : (
                  <span>
                    <span>Le cumul des factures (</span>
                    <span className="font-mono-numbers font-semibold">{formatMontant(metrics.totalFactureHT)} HT</span>
                    <span>) respecte scrupuleusement le plafond du marché révisé (</span>
                    <span className="font-mono-numbers font-semibold">{formatMontant(metrics.budgetRevisHT)} HT</span>
                    <span>).</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Synthèse Chiffrée */}
          <div className="space-y-2">
            <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Décomposition Financière
            </h5>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-neutral-200 rounded-lg overflow-hidden">
                <thead className="bg-neutral-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Poste budgétaire</th>
                    <th className="py-2.5 px-3 text-right">Montant HT</th>
                    <th className="py-2.5 px-3 text-right">TVA</th>
                    <th className="py-2.5 px-3 text-right">Montant TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono-numbers">
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">
                      Marché Initial (Acte d'engagement)
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">
                      <span className="block">{formatMontant(metrics.budgetInitialHT)}</span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      <span>{metrics.tauxTVA}%</span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="block">{formatMontant(metrics.budgetInitialTTC)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">
                      <span>Avenants approuvés </span>
                      <span className="font-mono-numbers">({avenants.length})</span>
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                      <span>+{formatMontant(metrics.totalAvenantsHT)}</span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      <span>{metrics.tauxTVA}%</span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span>+{formatMontant(metrics.totalAvenantsHT * (1 + metrics.tauxTVA / 100))}</span>
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="py-2.5 px-3 font-sans text-slate-900">
                      Plafond Contractuel Révisé
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900">
                      <span className="block">{formatMontant(metrics.budgetRevisHT)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      <span>{metrics.tauxTVA}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900">
                      <span className="block">{formatMontant(metrics.budgetRevisTTC)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-800">
                      <span>Cumul des Factures &amp; Situations </span>
                      <span className="font-mono-numbers">({factures.length})</span>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        isOverrun ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      <span className="block">{formatMontant(metrics.totalFactureHT)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">-</td>
                    <td className="py-2.5 px-3 text-right text-slate-900">
                      <span className="block">{formatMontant(metrics.totalFactureTTC)}</span>
                    </td>
                  </tr>
                  <tr
                    className={`font-bold ${
                      isOverrun ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans">
                      <span>{isOverrun ? 'Dépassement Budgétaire Net' : 'Solde Disponible Restant'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="block">{formatMontant(metrics.ecartBudgetHT)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">-</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="block">{formatMontant(metrics.ecartBudgetHT * (1 + metrics.tauxTVA / 100))}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Retenue légale */}
          <div className="p-3 bg-neutral-50 rounded-lg text-slate-600 text-[11px] flex items-center justify-between">
            <span>
              <strong>Retenue de garantie légale (5% HT) : </strong>
              <span>Montant théorique consigné ou sous caution = </span>
              <strong className="font-mono-numbers text-slate-800 font-semibold">{formatMontant(metrics.totalRetenueGarantieHT)} HT</strong>
              <span>.</span>
            </span>
            <span>Réf. Loi 71-584</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-200 bg-neutral-50/50">
          <span className="text-[11px] text-slate-400">
            Document généré par AuditBTP · Certifié conforme aux données de l'arborescence
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
