import React, { useState } from 'react';
import {
  FileText,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileQuestion,
  HelpCircle,
  TrendingUp,
  Percent,
  Calendar,
  Building,
  ShieldCheck,
  Eye,
  Plus,
  ArrowRight,
  Filter,
  Check,
  AlertCircle,
  FolderTree,
  FileX
} from 'lucide-react';
import { ActeEngagement, Avenant, Chantier, CorpsDetat, Facture } from '../types/audit';
import { formatMoisFr, formatMontant, formatPourcentage } from '../utils/calculator';

interface CorpsDetatAuditProps {
  chantier: Chantier;
  corpsDetat: CorpsDetat;
  moisTraitement: string;
  onOpenParametrage: () => void;
  onViewFile: (fileInfo: { name: string; path: string; category: string; content?: string }) => void;
  onGenerateAuditReport: (corpsDetat: CorpsDetat, chantier: Chantier) => void;
  onAddFactureModal: (corpsDetatId: string) => void;
}

export const CorpsDetatAudit: React.FC<CorpsDetatAuditProps> = ({
  chantier,
  corpsDetat,
  moisTraitement,
  onOpenParametrage,
  onViewFile,
  onGenerateAuditReport,
  onAddFactureModal,
}) => {
  const { metrics, acteEngagement, factures, avenants } = corpsDetat;
  const [filterMode, setFilterMode] = useState<'mois' | 'toutes'>('mois');

  const isOverrun = metrics.statut === 'depassement';
  const isAlert = metrics.statut === 'alerte';
  const isLotAbsent = metrics.statut === 'lot_absent';
  const isFichierKO = metrics.statut === 'fichier_ko' || metrics.hasFichierKO;
  const isMissingAE = !isLotAbsent && (!acteEngagement || metrics.statut === 'manque_ae');
  const isSansFacture = metrics.statut === 'sans_facture' || metrics.statut === 'sans_facture_mois';
  const isNonVerifie = metrics.statut === 'non_verifie' || metrics.statut === 'anomalie' || corpsDetat.arborescenceValide === false;
  const isValide = metrics.statut === 'valide' || metrics.statut === 'conforme';

  // Séparation des factures du mois vs antérieures
  const facturesDuMois = factures.filter(
    f => f.dateEmission && f.dateEmission.startsWith(moisTraitement)
  );
  const facturesAnterieures = factures.filter(
    f => f.dateEmission && f.dateEmission < `${moisTraitement}-01`
  );

  // Liste des factures à afficher selon le filtre
  const displayedFactures = filterMode === 'mois' ? facturesDuMois : factures;

  // Tri chronologique
  const sortedFactures = [...displayedFactures].sort((a, b) =>
    (a.dateEmission || '').localeCompare(b.dateEmission || '')
  );

  let runningCumulHT = filterMode === 'mois' ? metrics.cumulAnterieurHT : 0;
  const facturesWithProgress = sortedFactures.map(f => {
    runningCumulHT += f.montantHT || 0;
    const pctOfBudget =
      metrics.budgetRevisHT > 0 ? (runningCumulHT / metrics.budgetRevisHT) * 100 : 0;
    const resteApresFacture = metrics.budgetRevisHT - runningCumulHT;
    return {
      ...f,
      cumulHT: runningCumulHT,
      pctOfBudget,
      resteApresFacture,
      isCurrentMonth: f.dateEmission?.startsWith(moisTraitement),
    };
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8 space-y-6">
      {/* 1. Fil d'Ariane & En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="hover:text-slate-700 cursor-pointer">{chantier.name}</span>
            <span aria-hidden="true">/</span>
            <span className="font-mono-numbers font-medium text-slate-700">{corpsDetat.code}</span>
            <span aria-hidden="true">/</span>
            <span className="text-slate-900 font-medium">Contrôle de Conformité</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900">
              <span>{corpsDetat.name}</span>
            </h1>
            <span className="font-mono-numbers text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">
              <span>{corpsDetat.code}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-1">
            <span className="flex items-center gap-1.5 font-medium text-slate-800">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>{corpsDetat.entreprise}</span>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>
              <span>Chantier : </span>
              <span className="font-medium text-slate-700">{chantier.name}</span>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>
              <span>Dossier : </span>
              <code className="text-slate-500 text-[11px]">{corpsDetat.folderPath}</code>
            </span>
          </div>
        </div>

        {/* Boutons d'action rapides */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onGenerateAuditReport(corpsDetat, chantier)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
            <span>Fiche d'Audit Formelle</span>
          </button>
          <button
            type="button"
            onClick={() => onAddFactureModal(corpsDetat.id)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une Facture</span>
          </button>
        </div>
      </div>

      {/* 2. Bandeau d'indication du mois de traitement */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-500">Mois de traitement actif : </span>
            <strong className="text-slate-900 capitalize font-mono-numbers">
              <span>{formatMoisFr(moisTraitement)}</span>
            </strong>
            <span className="text-slate-400 ml-2">
              <span>(Seules les factures créées en </span>
              <span className="capitalize font-medium text-slate-600">{formatMoisFr(moisTraitement)}</span>
              <span> sont auditées)</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenParametrage}
          className="text-xs font-medium text-slate-700 hover:text-slate-900 underline"
        >
          <span>Changer dans Paramétrage</span>
        </button>
      </div>

      {/* 3. Bandeau d'état et diagnostic de conformité */}
      <div
        className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
          isNonVerifie
            ? 'bg-slate-100 border-slate-300 text-slate-900'
            : isFichierKO
            ? 'bg-orange-50/80 border-orange-200 text-orange-900'
            : isOverrun
            ? 'bg-rose-50/80 border-rose-200 text-rose-900'
            : isLotAbsent
            ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
            : isMissingAE
            ? 'bg-purple-50/80 border-purple-200 text-purple-900'
            : isAlert
            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
            : isSansFacture
            ? 'bg-slate-100/90 border-slate-200 text-slate-800'
            : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
        }`}
      >
        <div className="flex items-start gap-3">
          {isNonVerifie ? (
            <HelpCircle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          ) : isFichierKO ? (
            <FileX className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          ) : isOverrun ? (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : isLotAbsent ? (
            <FolderTree className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          ) : isMissingAE ? (
            <FileQuestion className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          ) : isAlert ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : isSansFacture ? (
            <Receipt className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}

          <div>
            <h3 className="text-sm font-bold">
              {isNonVerifie ? (
                <span>ARBORESCENCE K.O. : Anomalie de découpage dans les dossiers du chantier</span>
              ) : isFichierKO ? (
                <span>FICHIER K.O. : Fichier présent mais impossible d'en extraire les informations</span>
              ) : isOverrun ? (
                <span>
                  <span>NON CONFORME : Dépassement budgétaire sur </span>
                  <span className="capitalize">{formatMoisFr(moisTraitement)}</span>
                </span>
              ) : isLotAbsent ? (
                <span>LOT ABSENT : Dossier artisan-lot absent de l'arborescence</span>
              ) : isMissingAE ? (
                <span>AE ABSENT : Dossier artisan-lot présent mais sans Acte d'Engagement</span>
              ) : isAlert ? (
                <span>
                  <span>ATTENTION : Consommation budgétaire critique (&gt; 90%) sur </span>
                  <span className="capitalize">{formatMoisFr(moisTraitement)}</span>
                </span>
              ) : isSansFacture ? (
                <span>SANS FACTURE CE MOIS : Aucun contrôle à faire</span>
              ) : (
                <span>
                  <span>LOT VALIDÉ : Conformité budgétaire stricte sur </span>
                  <span className="capitalize">{formatMoisFr(moisTraitement)}</span>
                </span>
              )}
            </h3>

            <p className="text-xs mt-1 leading-relaxed opacity-90">
              {isNonVerifie ? (
                <span>
                  L’arborescence de ce chantier ou de ce lot ne respecte pas les niveaux requis (Chantier &gt; 5 - corps d'état &gt; 3 - Marchés + Assurances &gt; [Phase optionnelle] &gt; Artisan-Lot). Le dossier est marqué en Arborescence K.O.
                </span>
              ) : isFichierKO ? (
                <span>
                  Un document (Acte d'engagement ou facture) présent dans ce lot n'a pu être analysé (scan image sans OCR, document verrouillé ou flux textuel vide). Aucun contrôle budgétaire automatique n'est exécuté pour ce lot.
                </span>
              ) : !metrics.controleEffectue ? (
                <span>
                  {metrics.motifNonControle || 'En l’absence d’acte d’engagement ou de facture, aucun rapprochement ni contrôle budgétaire n’est à effectuer.'}
                </span>
              ) : isOverrun ? (
                <span>
                  <span>Les factures traitées ce mois-ci (</span>
                  <span className="font-mono-numbers font-semibold">{formatMontant(metrics.montantMoisHT)}</span>
                  <span>) portent le cumul à </span>
                  <span className="font-mono-numbers font-semibold">{formatMontant(metrics.cumulTotalHT)} HT</span>
                  <span> et dépassent le budget révisé (</span>
                  <span className="font-mono-numbers font-semibold">{formatMontant(metrics.budgetRevisHT)} HT</span>
                  <span>) de +</span>
                  <span className="font-mono-numbers font-semibold">{formatMontant(Math.abs(metrics.ecartBudgetHT))} HT</span>
                  <span> (+</span>
                  <span className="font-mono-numbers">{(metrics.tauxConsommationPct - 100).toFixed(1)}%</span>
                  <span>). Les règlements excédentaires ne doivent pas être mandatés sans avenant signé préalable.</span>
                </span>
              ) : isAlert ? (
                <span>
                  <span>Avec </span>
                  <span className="font-mono-numbers font-semibold">{formatMontant(metrics.montantMoisHT)} HT</span>
                  <span> facturés ce mois-ci, le cumul atteint </span>
                  <span className="font-mono-numbers font-semibold">{metrics.tauxConsommationPct.toFixed(1)}%</span>
                  <span> du marché. Il ne reste que </span>
                  <span className="font-mono-numbers font-semibold">{formatMontant(metrics.ecartBudgetHT)} HT</span>
                  <span> avant le dépassement du forfait contractuel.</span>
                </span>
              ) : (
                <span>
                  <span className="font-mono-numbers font-semibold">{facturesDuMois.length}</span>
                  <span> facture(s) traitée(s) ce mois-ci pour </span>
                  <span className="font-mono-numbers font-semibold">{formatMontant(metrics.montantMoisHT)} HT</span>
                  <span>. Cumul total : </span>
                  <span className="font-mono-numbers font-semibold">{formatMontant(metrics.cumulTotalHT)} HT</span>
                  <span> (consommation de </span>
                  <span className="font-mono-numbers">{metrics.tauxConsommationPct.toFixed(1)}%</span>
                  <span> sur un budget révisé de </span>
                  <span className="font-mono-numbers">{formatMontant(metrics.budgetRevisHT)} HT</span>
                  <span>). Solde restant conforme : </span>
                  <span className="font-mono-numbers font-semibold">{formatMontant(metrics.ecartBudgetHT)} HT</span>
                  <span>.</span>
                </span>
              )}
            </p>

            {/* Anomalies précises */}
            {metrics.anomalies.length > 0 ? (
              <ul className="mt-2 text-xs space-y-1 list-disc list-inside">
                {metrics.anomalies.map((anom, idx) => (
                  <li key={`anom-${idx}`} className="font-medium">
                    <span>{anom}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-xs uppercase font-bold tracking-wider opacity-75">
            <span>{metrics.controleEffectue ? 'Consommation' : 'Contrôle'}</span>
          </div>
          <div className="text-xl font-bold font-mono-numbers mt-0.5">
            {!metrics.controleEffectue ? (
              <span>Aucun contrôle</span>
            ) : metrics.tauxConsommationPct > 900 ? (
              <span>N/A</span>
            ) : (
              <span>{metrics.tauxConsommationPct.toFixed(1)}%</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-mono-numbers mt-0.5">
            {metrics.controleEffectue ? (
              <span>
                <span>Facturé : </span>
                <span>{formatMontant(metrics.montantMoisHT, 0)}</span>
              </span>
            ) : metrics.statut === 'manque_ae' ? null : metrics.statut === 'non_verifie' ? (
              <span>(Arborescence K.O.)</span>
            ) : metrics.statut === 'fichier_ko' ? (
              <span>(Fichier K.O.)</span>
            ) : (
              <span>(Sans facture)</span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Strip des Indicateurs Financiers Clés (5 cartes au lieu de 6, retenue de garantie retirée) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200">
          <div className="text-[11px] text-slate-500 font-medium">Budget Initial (AE)</div>
          <div className="text-base font-bold text-slate-900 font-mono-numbers mt-1">
            <span>{formatMontant(metrics.budgetInitialHT)}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono-numbers">
            <span>TTC : </span>
            <span>{formatMontant(metrics.budgetInitialTTC)}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200">
          <div className="text-[11px] text-slate-500 font-medium">Avenants Validés</div>
          <div className="text-base font-bold text-slate-900 font-mono-numbers mt-1">
            <span>{metrics.totalAvenantsHT > 0 ? `+${formatMontant(metrics.totalAvenantsHT)}` : '0,00 €'}</span>
          </div>
          <div className="text-[10px] text-slate-400">
            <span className="font-mono-numbers">{avenants.length}</span>
            <span> avenant{avenants.length > 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200">
          <div className="text-[11px] text-slate-500 font-medium">Budget Révisé Total</div>
          <div className="text-base font-bold text-slate-900 font-mono-numbers mt-1">
            <span>{formatMontant(metrics.budgetRevisHT)}</span>
          </div>
          <div className="text-[10px] text-slate-400">Plafond contractuel HT</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 bg-amber-50/30">
          <div className="text-[11px] text-amber-800 font-semibold">
            <span>Facturé en </span>
            <span className="capitalize font-mono-numbers">{formatMoisFr(moisTraitement)}</span>
          </div>
          <div className="text-base font-bold font-mono-numbers text-slate-900 mt-1">
            <span>{formatMontant(metrics.montantMoisHT)}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono-numbers">
            <span>{facturesDuMois.length}</span>
            <span> facture(s) ce mois</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200">
          <div className="text-[11px] text-slate-500 font-medium">
            <span>{isOverrun ? 'Dépassement Budgétaire' : 'Solde Restant à Facturer'}</span>
          </div>
          <div
            className={`text-base font-bold font-mono-numbers mt-1 ${
              isOverrun ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            <span>{formatMontant(metrics.ecartBudgetHT)}</span>
          </div>
          <div className="text-[10px] text-slate-400">
            <span>Cumul : </span>
            <span className="font-mono-numbers">{formatMontant(metrics.cumulTotalHT, 0)}</span>
          </div>
        </div>
      </div>

      {/* 5. Comparateur Face-à-Face : Acte d'Engagement VS Factures du Mois */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panneau GAUCHE : L'Acte d'Engagement (Le Marché) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-800" />
                <h2 className="text-sm font-bold text-slate-900">
                  Acte d'Engagement (AE)
                </h2>
              </div>
              {acteEngagement ? (
                <button
                  type="button"
                  onClick={() =>
                    onViewFile({
                      name: acteEngagement.fileName,
                      path: acteEngagement.filePath,
                      category: "Acte d'Engagement",
                      content: acteEngagement.rawContent,
                    })
                  }
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspecter</span>
                </button>
              ) : null}
            </div>

            {acteEngagement ? (
              <div className="space-y-3.5 text-xs">
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <div className="text-[11px] text-slate-500 font-medium">Fichier source détecté</div>
                  <div className="font-mono text-xs text-slate-800 font-medium truncate mt-0.5" title={acteEngagement.fileName}>
                    <span>{acteEngagement.fileName}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5" title={acteEngagement.filePath}>
                    <span>{acteEngagement.filePath}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] text-slate-500">Entreprise Titulaire</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      <span>{acteEngagement.entrepriseTitulaire}</span>
                    </p>
                    {acteEngagement.siret ? (
                      <p className="text-[10px] text-slate-400 font-mono-numbers">
                        <span>SIRET: </span>
                        <span>{acteEngagement.siret}</span>
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Date de Signature</span>
                    <p className="font-semibold text-slate-900 font-mono-numbers mt-0.5">
                      <span>{acteEngagement.dateSignature}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-100">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Total T.T.C. (Article 2)</span>
                      {acteEngagement.isAiParsed ? (
                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                          Extrait certifié
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                          {acteEngagement.montantTTC === 0 ? 'Non extrait' : 'Manuel'}
                        </span>
                      )}
                    </div>
                    <p className={`text-base font-bold font-mono-numbers mt-0.5 ${acteEngagement.montantTTC === 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                      <span>{formatMontant(acteEngagement.montantTTC)}</span>
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono-numbers">
                      <span>Soit </span>
                      <span>{formatMontant(acteEngagement.montantHT)}</span>
                      <span> HT</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Taux de TVA appliqué</span>
                    <p className="text-base font-semibold text-slate-900 font-mono-numbers mt-0.5">
                      <span>{acteEngagement.tauxTVA}</span>
                      <span>%</span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono-numbers">
                      <span>Montant TVA : </span>
                      <span>{formatMontant(acteEngagement.montantTTC - acteEngagement.montantHT)}</span>
                    </span>
                  </div>
                </div>

                {acteEngagement.justification ? (
                  <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded text-[11px] text-emerald-900">
                    <span className="font-semibold">Source certifiée : </span>
                    <span>{acteEngagement.justification}</span>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-100">
                  <div>
                    <span className="text-[11px] text-slate-500">Retenue de Garantie</span>
                    <p className="font-medium text-slate-800 font-mono-numbers mt-0.5">
                      <span>{acteEngagement.retenueGarantiePct}</span>
                      <span>% (Loi 71-584)</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Pénalités de Retard</span>
                    <p className="font-medium text-slate-800 font-mono-numbers mt-0.5">
                      {acteEngagement.penalitesRetardJour ? (
                        <span>
                          <span>{formatMontant(acteEngagement.penalitesRetardJour)}</span>
                          <span> / jour</span>
                        </span>
                      ) : (
                        <span>Non renseigné</span>
                      )}
                    </p>
                  </div>
                </div>

                {acteEngagement.clausesParticulieres ? (
                  <div className="pt-2 border-t border-neutral-100">
                    <span className="text-[11px] text-slate-500">Clauses Particulières &amp; Dispositions</span>
                    <p className="text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2 rounded text-[11px]">
                      <span>{acteEngagement.clausesParticulieres}</span>
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="p-6 text-center bg-purple-50/50 border border-dashed border-purple-200 rounded-lg">
                <FileQuestion className="w-8 h-8 mx-auto text-purple-400 mb-2" />
                <h4 className="text-xs font-bold text-purple-900">
                  Aucun Acte d'engagement trouvé
                </h4>
                <p className="text-[11px] text-purple-700 mt-1 leading-relaxed">
                  L'arborescence ne contient pas de fichier identifié comme marché initial (ex: AE, Marché, Contrat, DPGF).
                </p>
              </div>
            )}
          </div>

          {/* Section Avenants */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">
                  <span>Avenants Validés </span>
                  <span className="font-mono-numbers">({avenants.length})</span>
                </h3>
              </div>
              <span className="text-xs font-mono-numbers font-semibold text-slate-900">
                <span>Total: +</span>
                <span>{formatMontant(metrics.totalAvenantsHT)}</span>
              </span>
            </div>

            {avenants.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                <span>Aucun avenant contractuel enregistré sur ce lot.</span>
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {avenants.map(av => (
                  <div
                    key={av.id}
                    className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{av.numero}</span>
                        <span className="text-[10px] text-slate-400 font-mono-numbers">{av.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        <span>{av.objet}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono-numbers font-bold text-slate-900">
                        <span>+{formatMontant(av.montantHT)}</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium">Validé</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panneau DROIT : Registre des Factures & Situations de Travaux */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 p-5 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-100 mb-4 gap-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-800" />
              <h2 className="text-sm font-bold text-slate-900">
                Factures traitées
              </h2>
            </div>

            {/* Toggle de filtrage : Seules factures du mois VS Tout */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('mois')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterMode === 'mois'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Mois </span>
                <span className="capitalize">{formatMoisFr(moisTraitement)} </span>
                <span className="font-mono-numbers">({facturesDuMois.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('toutes')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterMode === 'toutes'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Toutes </span>
                <span className="font-mono-numbers">({factures.length})</span>
              </button>
            </div>
          </div>

          {displayedFactures.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex-1 flex flex-col items-center justify-center">
              <Receipt className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">
                <span>Aucune facture émise en </span>
                <span className="capitalize font-medium text-slate-800">{formatMoisFr(moisTraitement)}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                <span>Aucun fichier facture ayant une date de ce mois n'a été trouvé.</span>
                {factures.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setFilterMode('toutes')}
                    className="block mx-auto mt-2 text-slate-800 font-semibold underline text-xs"
                  >
                    <span>Afficher les </span>
                    <span className="font-mono-numbers">{factures.length}</span>
                    <span> facture(s) des autres mois</span>
                  </button>
                ) : null}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-neutral-200 text-slate-500 font-medium bg-neutral-50/50">
                    <th className="py-2.5 px-3">Date &amp; Réf.</th>
                    <th className="py-2.5 px-3">Libellé / Situation</th>
                    <th className="py-2.5 px-3 text-right">Montant HT</th>
                    <th className="py-2.5 px-3 text-right">Cumul HT</th>
                    <th className="py-2.5 px-3 text-right">% Marché</th>
                    <th className="py-2.5 px-3 text-center">Fichier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {facturesWithProgress.map(f => {
                    const isRowBreaching = f.pctOfBudget > 100;

                    return (
                      <tr
                        key={f.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isRowBreaching
                            ? 'bg-rose-50/40'
                            : f.isCurrentMonth
                            ? 'bg-amber-50/20'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 font-mono-numbers">
                            <span>{f.numeroFacture}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono-numbers flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{f.dateEmission}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-slate-800 font-medium flex items-center gap-2">
                            <span>{f.situationNumero || 'Facture de travaux'}</span>
                            {f.isCurrentMonth ? (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-1.5 py-0.2 rounded">
                                Ce mois
                              </span>
                            ) : null}
                          </div>
                          {f.commentaires ? (
                            <div className="text-[10px] text-amber-700 mt-0.5">
                              <span>{f.commentaires}</span>
                            </div>
                          ) : null}
                          <div className="text-[10px] text-slate-400 font-mono-numbers mt-0.5">
                            <span>TVA </span>
                            <span>{f.tauxTVA}</span>
                            <span>% · TTC </span>
                            <span>{formatMontant(f.montantTTC)}</span>
                          </div>
                          {f.justification ? (
                            <div className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 border border-emerald-100 max-w-xs truncate" title={f.justification}>
                              <span>{f.justification}</span>
                            </div>
                          ) : null}
                        </td>

                        <td className="py-3 px-3 text-right font-mono-numbers font-semibold text-slate-900">
                          <span>{formatMontant(f.montantHT)}</span>
                          {f.montantHT === 0 ? (
                            <span className="block text-[9px] font-normal text-amber-600">Non extrait du flux</span>
                          ) : null}
                        </td>

                        <td className="py-3 px-3 text-right font-mono-numbers text-slate-700 font-medium">
                          <span>{formatMontant(f.cumulHT)}</span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono-numbers">
                          <span
                            className={`font-semibold ${
                              isRowBreaching
                                ? 'text-rose-600'
                                : f.pctOfBudget >= 90
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            <span>{metrics.budgetRevisHT > 0 ? `${f.pctOfBudget.toFixed(1)}%` : 'N/A'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              onViewFile({
                                name: f.fileName,
                                path: f.filePath,
                                category: 'Facture',
                                content: f.rawContent,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                            title="Inspecter le fichier source"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-neutral-300 font-bold bg-neutral-50/70">
                    <td className="py-3 px-3" colSpan={2}>
                      <span>Total Traité </span>
                      <span className="font-mono-numbers">({displayedFactures.length})</span>
                      <span> facture{displayedFactures.length > 1 ? 's' : ''}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers text-slate-900">
                      <span>
                        {formatMontant(
                          filterMode === 'mois' ? metrics.montantMoisHT : metrics.totalFactureHT
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers text-slate-900">
                      <span>{formatMontant(metrics.cumulTotalHT)}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers">
                      <span
                        className={
                          isOverrun
                            ? 'text-rose-600'
                            : isAlert
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }
                      >
                        <span>
                          {metrics.budgetRevisHT > 0
                            ? `${metrics.tauxConsommationPct.toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Note sur les retenues de garantie */}
          <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Retenue de garantie sur ce mois (5% HT) : </span>
              <strong className="text-slate-700 font-mono-numbers">
                <span>{formatMontant(metrics.retenueGarantieMoisHT)}</span>
              </strong>
              <span> (Cumulée : </span>
              <span className="font-mono-numbers font-medium text-slate-700">{formatMontant(metrics.totalRetenueGarantieHT)}</span>
              <span>)</span>
            </span>
            <span>Norme NF P 03-001</span>
          </div>
        </div>
      </div>
    </div>
  );
};
