import React from 'react';
import {
  Building2,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileQuestion,
  Receipt,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  HardHat
} from 'lucide-react';
import { Chantier, CorpsDetat } from '../types/audit';
import { formatMoisFr, formatMontant } from '../utils/calculator';

interface ChantierOverviewProps {
  chantier: Chantier;
  moisTraitement: string;
  onSelectCorpsDetat: (corpsDetatId: string) => void;
  onOpenParametrage: () => void;
}

export const ChantierOverview: React.FC<ChantierOverviewProps> = ({
  chantier,
  moisTraitement,
  onSelectCorpsDetat,
  onOpenParametrage,
}) => {
  const { metrics, corpsDetats } = chantier;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8 space-y-6">
      {/* 1. En-tête Chantier */}
      <div className="pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Arborescence</span>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-slate-900">{chantier.name}</span>
          <span aria-hidden="true">/</span>
          <span>Vue d'Ensemble</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                <span className="block">{chantier.name}</span>
              </h1>
              <span className="font-mono-numbers text-xs bg-slate-900 text-amber-400 font-bold px-2 py-0.5 rounded">
                <span className="block">{chantier.code}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-2">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>MOA : </span>
                <strong className="text-slate-800">
                  <span className="inline-block">{chantier.maitreOuvrage}</span>
                </strong>
              </span>
              {chantier.maitreOeuvre ? (
                <>
                  <span className="text-slate-300">·</span>
                  <span>
                    <span>MOE : </span>
                    <span className="inline-block font-medium">{chantier.maitreOeuvre}</span>
                  </span>
                </>
              ) : null}
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="inline-block">{chantier.lieu}</span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Démarrage : </span>
                <span className="inline-block font-mono-numbers">{chantier.dateDebut}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenParametrage}
              className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-slate-700 hover:text-slate-900 font-medium"
            >
              <span>Mois : </span>
              <strong className="capitalize">
                <span className="inline-block font-mono-numbers">{formatMoisFr(moisTraitement)}</span>
              </strong>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Indicateurs Clés Consolidés */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200">
          <div className="text-xs text-slate-500 font-medium">Budget Global Marchés (HT)</div>
          <div className="text-xl font-bold text-slate-900 font-mono-numbers mt-1">
            <span className="block">{formatMontant(metrics.totalBudgetRevisHT)}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            <span>Initial : </span>
            <span className="inline-block font-mono-numbers">{formatMontant(metrics.totalBudgetInitialHT)}</span>
            <span> + Avenants : </span>
            <span className="inline-block font-mono-numbers">{formatMontant(metrics.totalAvenantsHT)}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 bg-amber-50/20">
          <div className="text-xs text-amber-800 font-semibold">
            <span>Facturé en </span>
            <span className="capitalize inline-block font-mono-numbers">{formatMoisFr(moisTraitement)}</span>
            <span> (HT)</span>
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono-numbers mt-1">
            <span className="block">{formatMontant(metrics.totalFactureMoisHT)}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono-numbers">
            <span className="inline-block">{metrics.nbFacturesMois}</span>
            <span> facture(s) émises ce mois</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200">
          <div className="text-xs text-slate-500 font-medium">Cumul Arrêté au Mois (HT)</div>
          <div className="text-xl font-bold text-slate-900 font-mono-numbers mt-1">
            <span className="block">{formatMontant(metrics.totalFactureHT)}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono-numbers">
            <span>Consommation : </span>
            <span className="inline-block font-medium">{metrics.tauxConsommationPct.toFixed(1)}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200">
          <div className="text-xs text-slate-500 font-medium">
            <span>{metrics.ecartGlobalHT < 0 ? 'Dépassement Net Total' : 'Solde Disponible Restant'}</span>
          </div>
          <div
            className={`text-xl font-bold font-mono-numbers mt-1 ${
              metrics.ecartGlobalHT < 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            <span className="block">{formatMontant(metrics.ecartGlobalHT)}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                metrics.nbDepassements > 0
                  ? 'bg-rose-500'
                  : metrics.nbAlertes > 0
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
            <span>
              {metrics.nbDepassements > 0 ? (
                <>
                  <span className="inline-block font-mono-numbers">{metrics.nbDepassements}</span>
                  <span> lot(s) en dépassement</span>
                </>
              ) : (
                <span>Conformité globale maîtrisée</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Synthèse des Lots / Corps d'État */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            <span>Lots &amp; Corps d'État </span>
            <span className="font-mono-numbers">({corpsDetats.length})</span>
          </h2>
          <span className="text-xs text-slate-500">
            <span>Cliquez sur un lot pour ouvrir la comparaison détaillée Factures vs AE</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {corpsDetats.map(corps => {
            const hasAE = Boolean(corps.acteEngagement);
            const isOverrun = corps.metrics.statut === 'depassement';
            const isAlert = corps.metrics.statut === 'alerte';
            const isSansFacture = corps.metrics.statut === 'sans_facture_mois';

            return (
              <div
                key={corps.id}
                onClick={() => onSelectCorpsDetat(corps.id)}
                className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono-numbers text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      <span className="block">{corps.code}</span>
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        isOverrun
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : corps.metrics.statut === 'lot_absent'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : corps.metrics.statut === 'fichier_ko' || corps.metrics.hasFichierKO
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : !hasAE
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : isAlert
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : corps.metrics.statut === 'non_verifie' || corps.metrics.statut === 'anomalie'
                          ? 'bg-slate-100 text-slate-700 border border-slate-300'
                          : isSansFacture
                          ? 'bg-slate-100 text-slate-600 border border-neutral-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isOverrun ? (
                        <span className="block">Dépassement</span>
                      ) : corps.metrics.statut === 'lot_absent' ? (
                        <span className="block">Lot absent</span>
                      ) : corps.metrics.statut === 'fichier_ko' || corps.metrics.hasFichierKO ? (
                        <span className="block">Fichier K.O.</span>
                      ) : !hasAE ? (
                        <span className="block">AE absent</span>
                      ) : isAlert ? (
                        <span className="block">Alerte &gt;90%</span>
                      ) : corps.metrics.statut === 'non_verifie' || corps.metrics.statut === 'anomalie' ? (
                        <span className="block">Arborescence K.O.</span>
                      ) : isSansFacture ? (
                        <span className="block">Sans facture</span>
                      ) : (
                        <span className="block">Validé</span>
                      )}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-800 line-clamp-1">
                    <span className="block">{corps.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                    <span className="block">{corps.entreprise}</span>
                  </p>

                  {/* Chiffres */}
                  <div className="grid grid-cols-2 gap-2 my-4 pt-3 border-t border-neutral-100 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Budget Révisé</span>
                      <p className="font-semibold text-slate-900 font-mono-numbers mt-0.5">
                        <span className="block">{formatMontant(corps.metrics.budgetRevisHT)}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">
                        <span>Facturé en </span>
                        <span className="capitalize">{formatMoisFr(moisTraitement)}</span>
                      </span>
                      <p
                        className={`font-semibold font-mono-numbers mt-0.5 ${
                          corps.metrics.montantMoisHT > 0 ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        <span className="block">{formatMontant(corps.metrics.montantMoisHT)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Petite barre de progression ou statut non contrôlé */}
                  {corps.metrics.controleEffectue ? (
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${
                          isOverrun
                            ? 'bg-rose-600'
                            : isAlert
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                        style={{
                          width: `${Math.min(corps.metrics.tauxConsommationPct, 100)}%`,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic mb-2 py-0.5">
                      <span>Aucun contrôle (</span>
                      <span className="inline-block font-medium">
                        {corps.metrics.statut === 'manque_ae'
                          ? 'AE absent'
                          : corps.metrics.statut === 'non_verifie'
                          ? 'Arborescence K.O.'
                          : corps.metrics.statut === 'fichier_ko'
                          ? 'Fichier K.O.'
                          : 'Sans facture'}
                      </span>
                      <span>)</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-mono-numbers text-[11px]">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    <span className="inline-block">{corps.metrics.nbFacturesMois}</span>
                    <span> facture(s) ce mois</span>
                  </span>

                  <span className="flex items-center gap-1 text-slate-900 font-medium group-hover:translate-x-0.5 transition-transform">
                    <span>Vérifier</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
