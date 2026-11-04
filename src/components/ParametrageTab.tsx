import React from 'react';
import {
  Calendar,
  Building2,
  Layers,
  RefreshCw,
  Check,
  ChevronRight,
  FolderTree
} from 'lucide-react';
import { Chantier } from '../types/audit';
import { formatMoisFr, formatMontant } from '../utils/calculator';
import { GoogleDriveFolderSelector } from './GoogleDriveFolderSelector';

interface ParametrageTabProps {
  moisTraitement: string;
  onMoisTraitementChange: (newMonth: string) => void;
  chantiers: Chantier[];
  onChantiersImported: (chantiers: Chantier[]) => void;
  onResetDemo: () => void;
  onSelectLot: (chantierId: string, corpsDetatId: string) => void;
}

export const ParametrageTab: React.FC<ParametrageTabProps> = ({
  moisTraitement,
  onMoisTraitementChange,
  chantiers,
  onChantiersImported,
  onResetDemo,
  onSelectLot,
}) => {
  // Recherche de tous les mois présents dans les factures pour proposer des raccourcis
  const monthsInDataset = Array.from(
    new Set(
      chantiers.flatMap(ch =>
        ch.corpsDetats.flatMap(c =>
          c.factures
            .map(f => f.dateEmission?.slice(0, 7))
            .filter(Boolean) as string[]
        )
      )
    )
  ).sort().reverse();

  // Statistiques pour le mois sélectionné
  let facturesCountMois = 0;
  let totalFactureMois = 0;
  let corpsWithInvoices = 0;

  chantiers.forEach(ch => {
    ch.corpsDetats.forEach(c => {
      const facturesDuMois = c.factures.filter(
        f => f.dateEmission && f.dateEmission.startsWith(moisTraitement)
      );
      if (facturesDuMois.length > 0) {
        corpsWithInvoices++;
        facturesCountMois += facturesDuMois.length;
        totalFactureMois += facturesDuMois.reduce((acc, f) => acc + (f.montantHT || 0), 0);
      }
    });
  });

  const currentMonthISO = new Date().toISOString().slice(0, 7);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8 space-y-6">
      {/* 1. En-tête Paramétrage */}
      <div className="pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <span>Application</span>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-slate-900">Paramétrage &amp; Dossiers</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                Paramétrage &amp; Sélection de l'Arborescence
              </h1>
              <span className="font-mono-numbers text-xs bg-slate-900 text-amber-400 font-semibold px-2.5 py-0.5 rounded">
                <span>Mois actif : </span>
                <span>{formatMoisFr(moisTraitement)}</span>
              </span>
              {chantiers.some(c => c.folderPath?.includes('Google Drive') || c.id !== 'c1') ? (
                <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2.5 py-0.5 rounded flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dossier Drive actif (Mémorisé après actualisation)</span>
                </span>
              ) : (
                <span className="text-xs bg-slate-200 text-slate-700 font-medium px-2.5 py-0.5 rounded">
                  <span>Exemple Démo (« Résidence Le Belvédère »)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Définissez le dossier racine Google Drive à parcourir et le mois de traitement comptable. Seules les factures ayant une date de création de ce mois sont auditées et rapprochées des Actes d'Engagement.
            </p>
          </div>

          <button
            type="button"
            onClick={onResetDemo}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recharger Exemple BTP</span>
          </button>
        </div>
      </div>

      {/* 2. SECTION 1 : MOIS DE TRAITEMENT */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-slate-800" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                1. Mois de Traitement des Factures
              </h2>
              <p className="text-[11px] text-slate-500">
                Filtre chronologique strict : seules les factures créées / émises ce mois sont prises en compte
              </p>
            </div>
          </div>

          {moisTraitement === currentMonthISO ? (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Mois en cours (Par défaut)</span>
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Sélectionner le mois à auditer :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={moisTraitement}
                onChange={e => e.target.value && onMoisTraitementChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-mono-numbers font-semibold bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <button
                type="button"
                onClick={() => onMoisTraitementChange(currentMonthISO)}
                title="Revenir au mois en cours"
                className="px-3 py-2.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-lg whitespace-nowrap transition-colors"
              >
                <span>Mois actuel</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              <span>Format attendu : Année-Mois (ex : </span>
              <span className="font-mono-numbers">{currentMonthISO}</span>
              <span>)</span>
            </p>
          </div>

          {/* Statistiques d'impact du mois */}
          <div className="md:col-span-7 grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-neutral-200">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Factures ce mois</span>
              <p className="text-lg font-bold font-mono-numbers text-slate-900 mt-0.5">
                <span>{facturesCountMois}</span>
              </p>
              <span className="text-[10px] text-slate-400">
                <span>sur </span>
                <span className="font-mono-numbers font-medium text-slate-600">{corpsWithInvoices}</span>
                <span> corps d’état</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Montant HT traité</span>
              <p className="text-lg font-bold font-mono-numbers text-slate-900 mt-0.5">
                <span>{formatMontant(totalFactureMois, 0)}</span>
              </p>
              <span className="text-[10px] text-slate-400">
                <span>Émis en </span>
                <span className="capitalize">{formatMoisFr(moisTraitement)}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Période active</span>
              <p className="text-xs font-bold text-slate-800 capitalize mt-1.5 truncate">
                <span>{formatMoisFr(moisTraitement)}</span>
              </p>
              <span className="text-[10px] text-slate-400">Prêt pour l'audit</span>
            </div>
          </div>
        </div>

        {/* Raccourcis vers les mois avec des factures dans l'arborescence */}
        {monthsInDataset.length > 0 ? (
          <div className="pt-2 border-t border-neutral-100">
            <span className="text-[11px] text-slate-500 font-medium mr-2">
              Mois détectés dans vos dossiers :
            </span>
            <div className="inline-flex flex-wrap gap-1.5 mt-1">
              {monthsInDataset.map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => onMoisTraitementChange(m)}
                  className={`px-2 py-1 text-[11px] font-mono-numbers font-medium rounded transition-colors ${
                    moisTraitement === m
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{formatMoisFr(m)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* 3. SECTION 2 : SÉLECTION DU DOSSIER GOOGLE DRIVE (DONT DOSSIERS PARTAGÉS) UNIQUEMENT */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <FolderTree className="w-5 h-5 text-slate-800" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                2. Sélection du Dossier Google Drive (y compris dossiers partagés)
              </h2>
              <p className="text-[11px] text-slate-500">
                Sélectionnez exclusivement votre dossier racine sur Google Drive (Mon Drive, Dossiers partagés ou Drives d'équipe).
              </p>
            </div>
          </div>
        </div>

        {/* Schéma de l'arborescence obligatoire (4 ou 5 niveaux - jamais de niveau 6) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
          <div className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
            <span>Arborescence BTP traitée (4 ou 5 niveaux selon découpage en phase · jamais de niveau 6) :</span>
          </div>
          <div className="font-mono text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-neutral-200 space-y-1">
            <div>📁 <strong>[Racine]</strong> (Dossier racine sélectionné, ex: "Chantiers en cours")</div>
            <div className="pl-4">└── 📁 <strong>[Chantier]</strong> (Niveau 1 : noms de chantiers variés)</div>
            <div className="pl-8 text-amber-700 font-semibold">└── 📁 <strong>5 - corps d'état</strong> <span className="text-slate-500 font-normal">(Niveau 2 : obligatoire · autres branches ignorées)</span></div>
            <div className="pl-12 text-indigo-700 font-semibold">└── 📁 <strong>3 - Marchés + Assurances</strong> <span className="text-slate-500 font-normal">(Niveau 3 : obligatoire · autres branches ignorées)</span></div>
            <div className="pl-16 text-slate-800 bg-slate-50 p-1.5 rounded border border-neutral-200 mt-1 space-y-1">
              <div>
                <span className="font-semibold text-slate-900">► Cas sans phase (4 niveaux au total) :</span>
                <div className="pl-4 text-emerald-800 font-medium">└── 📁 <strong>[Artisan-Lot]</strong> (Niveau 4 final : nom de l'artisan ou contenant "lot")</div>
              </div>
              <div>
                <span className="font-semibold text-slate-900">► Cas avec phase (5 niveaux au total) :</span>
                <div className="pl-4 text-slate-600">├── 📁 <strong>[Phase]</strong> (Niveau 4 : nom contenant "phase" · optionnel, pas d'anomalie si absent)</div>
                <div className="pl-8 text-emerald-800 font-medium">└── 📁 <strong>[Artisan-Lot]</strong> (Niveau 5 final : nom de l'artisan ou contenant "lot")</div>
              </div>
              <div className="text-[10px] text-slate-500 italic pt-0.5">
                * Note : Le niveau artisan-lot contient directement les fichiers. Il n'y a jamais de niveau 6.
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            <strong>Règles de conformité :</strong> L'absence de phase n'est pas une anomalie. Le niveau artisan-lot est obligatoire pour la conformité : son absence est classée <em>« Sans acte d'engagement »</em> (manque_ae). En l'absence d'acte d'engagement ou en l'absence de facture, aucun contrôle budgétaire n'est à faire. Seule une rupture sur <em>5 - corps d'état</em> ou <em>3 - Marchés + Assurances</em> déclenche le statut <em>« Non vérifié »</em>.
          </p>
        </div>

        {/* Composant Google Drive exclusif */}
        <GoogleDriveFolderSelector
          moisTraitement={moisTraitement}
          onChantiersLoaded={onChantiersImported}
        />
      </div>

      {/* 4. SECTION 3 : APERÇU DE L'ARBORESCENCE CHARGÉE */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-slate-800" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                <span>3. Chantiers &amp; Corps d'État Détectés </span>
                <span className="font-mono-numbers">({chantiers.length} chantier{chantiers.length > 1 ? 's' : ''})</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                <span>Aperçu des lots et de la facturation active pour le mois de </span>
                <span className="capitalize">{formatMoisFr(moisTraitement)}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {chantiers.map(ch => (
            <div
              key={ch.id}
              className="border border-neutral-200 rounded-xl overflow-hidden"
            >
              <div className="bg-neutral-50/80 px-4 py-3 flex items-center justify-between border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  <span className="font-bold text-slate-900 text-xs">
                    <span>{ch.name}</span>
                  </span>
                  <span className="font-mono-numbers text-[10px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
                    <span>{ch.code}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono-numbers">
                  <span>{ch.corpsDetats.length} corps d’état · Facturé ce mois : </span>
                  <strong className="text-slate-900">
                    <span>{formatMontant(ch.metrics.totalFactureMoisHT)} HT</span>
                  </strong>
                </div>
              </div>

              <div className="divide-y divide-neutral-100">
                {ch.corpsDetats.map(corps => {
                  const hasAE = Boolean(corps.acteEngagement);
                  const facturesDuMois = corps.factures.filter(
                    f => f.dateEmission && f.dateEmission.startsWith(moisTraitement)
                  );
                  const montantMois = facturesDuMois.reduce(
                    (acc, f) => acc + (f.montantHT || 0),
                    0
                  );

                  return (
                    <div
                      key={corps.id}
                      onClick={() => onSelectLot(ch.id, corps.id)}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono-numbers text-[11px] font-semibold text-slate-500 w-16">
                          <span>{corps.code}</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            <span>{corps.name}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            <span>{corps.entreprise} · Dossier : </span>
                            <code className="text-[10px] text-slate-500">{corps.folderPath}</code>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0 font-mono-numbers">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">
                            <span>Facturé sur </span>
                            <span className="capitalize">{formatMoisFr(moisTraitement)}</span>
                          </span>
                          <span
                            className={`font-semibold ${
                              montantMois > 0 ? 'text-slate-900' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatMontant(montantMois)} HT</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            <span className="font-mono-numbers">{facturesDuMois.length}</span>
                            <span> facture{facturesDuMois.length > 1 ? 's' : ''}</span>
                          </span>
                        </div>

                        <div className="text-right w-24">
                          <span className="text-[10px] text-slate-400 block">Acte d'Eng.</span>
                          {hasAE ? (
                            <span className="text-emerald-700 font-semibold text-[11px]">
                              <span>{formatMontant(corps.metrics.budgetRevisHT, 0)}</span>
                            </span>
                          ) : (
                            <span className="text-purple-600 font-semibold text-[11px]">
                              Manquant
                            </span>
                          )}
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
