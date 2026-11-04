import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Building2,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileQuestion,
  HelpCircle,
  Receipt,
  Calendar,
  AlertCircle,
  FolderTree,
  FileX
} from 'lucide-react';
import { Chantier, StatutConformite } from '../types/audit';
import { formatMontant, formatMoisFr } from '../utils/calculator';

interface SidebarTreeProps {
  moisTraitement: string;
  onMoisTraitementChange: (newMonth: string) => void;
  chantiers: Chantier[];
  selectedChantierId: string | null;
  selectedCorpsDetatId: string | null;
  onSelectChantier: (id: string) => void;
  onSelectCorpsDetat: (chantierId: string, corpsDetatId: string) => void;
}

type FilterType = 'all' | 'valide' | 'depassement' | 'alerte' | 'manque_ae' | 'lot_absent' | 'non_verifie' | 'fichier_ko' | 'sans_facture';

export const SidebarTree: React.FC<SidebarTreeProps> = ({
  moisTraitement,
  onMoisTraitementChange,
  chantiers,
  selectedChantierId,
  selectedCorpsDetatId,
  onSelectChantier,
  onSelectCorpsDetat,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [collapsedChantiers, setCollapsedChantiers] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${statusFilter}-${id}`;
    setCollapsedChantiers(prev => {
      const currentVal = prev[key] !== undefined ? prev[key] : (statusFilter === 'all');
      return { ...prev, [key]: !currentVal };
    });
  };

  const handleMonthShift = (delta: number) => {
    const parts = moisTraitement.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const date = new Date(year, month - 1 + delta, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    onMoisTraitementChange(`${newYear}-${newMonth}`);
  };

  const currentMonthISO = new Date().toISOString().slice(0, 7);

  // Comptage global pour les badges de filtres
  let countTotal = 0;
  let countValide = 0;
  let countDepassement = 0;
  let countAlerte = 0;
  let countManqueAE = 0;
  let countLotAbsent = 0;
  let countArborescenceKO = 0;
  let countFichierKO = 0;
  let countSansFacture = 0;

  chantiers.forEach(ch => {
    ch.corpsDetats.forEach(c => {
      countTotal++;
      if (c.metrics.hasFichierKO || c.metrics.statut === 'fichier_ko') countFichierKO++;
      if (c.metrics.statut === 'valide' || c.metrics.statut === 'conforme') countValide++;
      else if (c.metrics.statut === 'depassement') countDepassement++;
      else if (c.metrics.statut === 'alerte') countAlerte++;
      else if (c.metrics.statut === 'manque_ae') countManqueAE++;
      else if (c.metrics.statut === 'lot_absent') countLotAbsent++;
      else if (c.metrics.statut === 'non_verifie' || c.metrics.statut === 'anomalie') countArborescenceKO++;
      else if (c.metrics.statut === 'sans_facture' || c.metrics.statut === 'sans_facture_mois') countSansFacture++;
    });
  });

  // Filtrage
  const cleanSearch = searchTerm.trim().toLowerCase();

  const filteredChantiers = chantiers
    .map(ch => {
      const matchChantierName = cleanSearch ? ch.name.toLowerCase().includes(cleanSearch) : false;

      const filteredCorps = ch.corpsDetats.filter(c => {
        const matchLotName = cleanSearch
          ? c.name.toLowerCase().includes(cleanSearch) ||
            c.code.toLowerCase().includes(cleanSearch) ||
            c.entreprise.toLowerCase().includes(cleanSearch)
          : false;

        const matchesSearch = cleanSearch ? (matchChantierName || matchLotName) : true;

        let matchStatus = true;
        if (statusFilter === 'valide') {
          matchStatus = c.metrics.statut === 'valide' || c.metrics.statut === 'conforme';
        } else if (statusFilter === 'depassement') {
          matchStatus = c.metrics.statut === 'depassement';
        } else if (statusFilter === 'alerte') {
          matchStatus = c.metrics.statut === 'alerte';
        } else if (statusFilter === 'manque_ae') {
          matchStatus = c.metrics.statut === 'manque_ae';
        } else if (statusFilter === 'lot_absent') {
          matchStatus = c.metrics.statut === 'lot_absent';
        } else if (statusFilter === 'fichier_ko') {
          matchStatus = Boolean(c.metrics.hasFichierKO || c.metrics.statut === 'fichier_ko');
        } else if (statusFilter === 'non_verifie') {
          matchStatus = c.metrics.statut === 'non_verifie' || c.metrics.statut === 'anomalie';
        } else if (statusFilter === 'sans_facture') {
          matchStatus = c.metrics.statut === 'sans_facture' || c.metrics.statut === 'sans_facture_mois';
        }

        return matchesSearch && matchStatus;
      });

      // Calcul des montants facturés et budget pour les lots filtrés
      const filteredFactureHT = filteredCorps.reduce((acc, c) => acc + (c.metrics.totalFactureHT || 0), 0);
      const filteredBudgetHT = filteredCorps.reduce((acc, c) => acc + (c.metrics.budgetRevisHT || 0), 0);

      return {
        ...ch,
        filteredCorps,
        filteredFactureHT,
        filteredBudgetHT,
      };
    })
    .filter(ch => {
      if (statusFilter === 'all') {
        if (!cleanSearch) return true;
        return ch.name.toLowerCase().includes(cleanSearch) || ch.filteredCorps.length > 0;
      }
      // Dans tous les onglets sauf "tous", le chantier DOIT obligatoirement avoir au moins un artisan-lot concerné
      return ch.filteredCorps.length > 0;
    })
    // Tri alphabétique obligatoire de tous les chantiers sur leur nom
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' }));

  // Rendu de l'icône et badge de statut
  const renderStatusBadge = (statut: StatutConformite) => {
    switch (statut) {
      case 'valide':
      case 'conforme':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Validé</span>
          </span>
        );
      case 'alerte':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Alerte &gt;90%</span>
          </span>
        );
      case 'depassement':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
            <span>Dépassement</span>
          </span>
        );
      case 'manque_ae':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
            <FileQuestion className="w-3 h-3 text-purple-600 shrink-0" />
            <span>AE absent</span>
          </span>
        );
      case 'lot_absent':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
            <FolderTree className="w-3 h-3 text-indigo-600 shrink-0" />
            <span>Lot absent</span>
          </span>
        );
      case 'fichier_ko':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-800 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
            <FileX className="w-3 h-3 text-orange-600 shrink-0" />
            <span>Fichier K.O.</span>
          </span>
        );
      case 'non_verifie':
      case 'anomalie':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
            <HelpCircle className="w-3 h-3 text-slate-600 shrink-0" />
            <span>Arborescence K.O.</span>
          </span>
        );
      case 'sans_facture':
      case 'sans_facture_mois':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-neutral-200">
            <Receipt className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Sans facture</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="w-80 lg:w-96 bg-white border-r border-neutral-200 flex flex-col h-[calc(100vh-61px)] shrink-0 select-none">
      {/* 1. SÉLECTEUR DU MOIS À TRAITER (Volet de gauche) */}
      <div className="p-3.5 border-b border-neutral-200 bg-neutral-50/70 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-900 text-amber-400 rounded-md">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wide block leading-tight">
                Mois de Traitement
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight">
                Seules les factures de ce mois sont auditées
              </span>
            </div>
          </div>

          {moisTraitement === currentMonthISO ? (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              En cours
            </span>
          ) : (
            <button
              onClick={() => onMoisTraitementChange(currentMonthISO)}
              className="text-[10px] font-medium text-slate-600 hover:text-slate-900 underline"
            >
              Mois actuel
            </button>
          )}
        </div>

        {/* Contrôle de changement rapide de mois */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleMonthShift(-1)}
            title="Mois précédent"
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-neutral-200 rounded-lg transition-colors shadow-2xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <input
            type="month"
            value={moisTraitement}
            onChange={e => e.target.value && onMoisTraitementChange(e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-xs font-mono-numbers font-semibold bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs"
          />
          <button
            type="button"
            onClick={() => handleMonthShift(1)}
            title="Mois suivant"
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-neutral-200 rounded-lg transition-colors shadow-2xs"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. RECHERCHE & COLONNES/FILTRES DE STATUT */}
      <div className="p-3 border-b border-neutral-200 bg-white space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span className="font-semibold text-slate-900">
            <span>Arborescence </span>
            <span className="font-mono-numbers">({chantiers.length} chantier{chantiers.length > 1 ? 's' : ''})</span>
          </span>
          <span className="text-[11px] font-mono-numbers text-slate-500">
            <span>{formatMoisFr(moisTraitement)}</span>
          </span>
        </div>

        {/* Champ de recherche */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrer chantier, lot, entreprise..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-neutral-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Colonnes / Boutons de filtre */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs scrollbar-thin">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Tous </span>
            <span className="font-mono-numbers">({countTotal})</span>
          </button>

          {/* Colonne Validé */}
          <button
            type="button"
            onClick={() => setStatusFilter('valide')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              statusFilter === 'valide'
                ? 'bg-emerald-700 text-white font-semibold'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Validé </span>
            <span className="font-mono-numbers">({countValide})</span>
          </button>

          {/* Dépassements */}
          <button
            type="button"
            onClick={() => setStatusFilter('depassement')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              statusFilter === 'depassement'
                ? 'bg-rose-700 text-white font-semibold'
                : 'text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <XCircle className="w-3 h-3 shrink-0" />
            <span>Dépassements </span>
            <span className="font-mono-numbers">({countDepassement})</span>
          </button>

          {/* Alertes */}
          <button
            type="button"
            onClick={() => setStatusFilter('alerte')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              statusFilter === 'alerte'
                ? 'bg-amber-700 text-white font-semibold'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Alertes </span>
            <span className="font-mono-numbers">({countAlerte})</span>
          </button>

          {/* AE absent */}
          <button
            type="button"
            onClick={() => setStatusFilter('manque_ae')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              statusFilter === 'manque_ae'
                ? 'bg-purple-700 text-white font-semibold'
                : 'text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200'
            }`}
            title="Dossier artisan-lot présent mais acte d'engagement absent"
          >
            <FileQuestion className="w-3 h-3 shrink-0" />
            <span>AE absent </span>
            <span className="font-mono-numbers">({countManqueAE})</span>
          </button>

          {/* Lot absent */}
          <button
            type="button"
            onClick={() => setStatusFilter('lot_absent')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              statusFilter === 'lot_absent'
                ? 'bg-indigo-700 text-white font-semibold'
                : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
            }`}
            title="Sous-dossier artisan-lot non créé ou vide dans l'arborescence"
          >
            <FolderTree className="w-3 h-3 shrink-0" />
            <span>Lot absent </span>
            <span className="font-mono-numbers">({countLotAbsent})</span>
          </button>

          {/* Fichier K.O. */}
          <button
            type="button"
            onClick={() => setStatusFilter('fichier_ko')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              statusFilter === 'fichier_ko'
                ? 'bg-orange-700 text-white font-semibold'
                : 'text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200'
            }`}
            title="Artisans-lots ayant un fichier (AE ou Facture) dont le contenu n'a pas pu être extrait"
          >
            <FileX className="w-3 h-3 shrink-0" />
            <span>Fichier K.O. </span>
            <span className="font-mono-numbers">({countFichierKO})</span>
          </button>

          {/* Arborescence K.O. */}
          <button
            type="button"
            onClick={() => setStatusFilter('non_verifie')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              statusFilter === 'non_verifie'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300'
            }`}
            title="Lots avec anomalie dans l'arborescence (5 - corps d'état / 3 - marchés manquants ou incomplets)"
          >
            <HelpCircle className="w-3 h-3 shrink-0" />
            <span>Arborescence K.O. </span>
            <span className="font-mono-numbers">({countArborescenceKO})</span>
          </button>

          {/* Sans facture */}
          <button
            type="button"
            onClick={() => setStatusFilter('sans_facture')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
              statusFilter === 'sans_facture'
                ? 'bg-slate-600 text-white font-semibold'
                : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-neutral-200'
            }`}
          >
            <Receipt className="w-3 h-3 shrink-0" />
            <span>Sans facture </span>
            <span className="font-mono-numbers">({countSansFacture})</span>
          </button>
        </div>
      </div>

      {/* 3. LISTE HIÉRARCHIQUE : CHANTIERS > CORPS D'ÉTAT */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
        {filteredChantiers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              {statusFilter === 'valide' && 'Aucun chantier avec artisan-lot validé'}
              {statusFilter === 'depassement' && 'Aucun chantier en dépassement de budget'}
              {statusFilter === 'alerte' && 'Aucun chantier avec alerte (>90%)'}
              {statusFilter === 'manque_ae' && "Aucun chantier avec lot avec acte d'engagement absent"}
              {statusFilter === 'lot_absent' && "Aucun chantier avec sous-dossier artisan-lot absent"}
              {statusFilter === 'fichier_ko' && "Aucun chantier avec fichier non extractible (Fichier K.O.)"}
              {statusFilter === 'non_verifie' && "Aucun chantier avec anomalie d'arborescence (Arborescence K.O.)"}
              {statusFilter === 'sans_facture' && 'Aucun chantier avec lot sans facture'}
              {statusFilter === 'all' && 'Aucun chantier trouvé'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {cleanSearch
                ? `Aucun résultat pour la recherche « ${searchTerm} »`
                : 'Aucun artisan-lot ne correspond aux critères de cet onglet pour ce mois.'}
            </p>
          </div>
        ) : (
          filteredChantiers.map(ch => {
            const isCollapsed =
              collapsedChantiers[`${statusFilter}-${ch.id}`] !== undefined
                ? collapsedChantiers[`${statusFilter}-${ch.id}`]
                : statusFilter === 'all';
            const isChantierSelected =
              selectedChantierId === ch.id && selectedCorpsDetatId === null;
            const hasAnomaly = ch.hasArborescenceAnomaly;

            return (
              <div key={ch.id} className="text-xs">
                {/* Ligne Chantier */}
                <div
                  onClick={() => onSelectChantier(ch.id)}
                  className={`flex items-start justify-between px-3.5 py-3 cursor-pointer transition-colors group ${
                    isChantierSelected
                      ? 'bg-slate-100/90 border-l-2 border-slate-900'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0 pr-2">
                    <button
                      onClick={e => toggleCollapse(ch.id, e)}
                      className="p-0.5 text-slate-400 hover:text-slate-700 mt-0.5 transition-colors"
                      aria-label="Plier/Déplier"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <Building2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 truncate">
                          {ch.name}
                        </span>
                        {hasAnomaly && (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Arborescence non conforme</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{ch.code}</span>
                        <span aria-hidden="true">·</span>
                        {statusFilter === 'all' ? (
                          <span>{ch.corpsDetats.length} corps d’état</span>
                        ) : (
                          <span className="font-medium text-slate-700">
                            {ch.filteredCorps.length}{' '}
                            {ch.filteredCorps.length > 1 ? 'lots concernés' : 'lot concerné'}{' '}
                            <span className="text-slate-400 font-normal">/ {ch.corpsDetats.length}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono-numbers text-[11px] font-semibold text-slate-800">
                      {formatMontant(statusFilter === 'all' ? ch.metrics.totalFactureHT : ch.filteredFactureHT, 0)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono-numbers">
                      / {formatMontant(statusFilter === 'all' ? ch.metrics.totalBudgetRevisHT : ch.filteredBudgetHT, 0)}
                    </div>
                  </div>
                </div>

                {/* Sous-arborescence : Corps d'état (Lots) */}
                {!isCollapsed && (
                  <div className="bg-neutral-50/50 pl-6 pr-2 py-1 space-y-1">
                    {ch.filteredCorps.map(corps => {
                      const isCorpsSelected = selectedCorpsDetatId === corps.id;
                      const hasAE = Boolean(corps.acteEngagement);
                      const controleEffectue = corps.metrics.controleEffectue;

                      return (
                        <div
                          key={corps.id}
                          onClick={() => onSelectCorpsDetat(ch.id, corps.id)}
                          className={`flex items-start justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                            isCorpsSelected
                              ? 'bg-white border-slate-300 shadow-xs'
                              : 'border-transparent hover:bg-white hover:border-neutral-200'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono-numbers text-[10px] font-bold text-slate-600 bg-slate-200/80 px-1 py-0.5 rounded">
                                <span>{corps.code}</span>
                              </span>
                              <span className="font-medium text-slate-800 truncate text-xs">
                                <span>{corps.name}</span>
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              <span>{corps.entreprise}</span>
                            </p>

                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {renderStatusBadge(corps.metrics.statut)}

                              {/* Indication facture / absence */}
                              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono-numbers">
                                <Receipt className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{corps.factures.length} fac.</span>
                              </span>
                            </div>
                          </div>

                          {/* Colonne droite : Contrôle budgétaire ou mention Aucun contrôle */}
                          <div className="text-right shrink-0 mt-0.5">
                            {!controleEffectue ? (
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-medium text-slate-400 block italic whitespace-nowrap">
                                  Aucun contrôle
                                </span>
                                {corps.metrics.statut !== 'manque_ae' && corps.metrics.statut !== 'lot_absent' && (
                                  <span className="text-[10px] font-mono-numbers text-slate-500 block">
                                    {corps.metrics.statut === 'non_verifie'
                                      ? '(Arborescence K.O.)'
                                      : corps.metrics.statut === 'fichier_ko'
                                      ? '(Fichier K.O.)'
                                      : '(Sans facture)'}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span
                                  className={`text-[11px] font-bold font-mono-numbers ${
                                    corps.metrics.statut === 'depassement'
                                      ? 'text-rose-600'
                                      : corps.metrics.statut === 'alerte'
                                      ? 'text-amber-600'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {corps.metrics.tauxConsommationPct > 900
                                    ? 'N/A'
                                    : `${corps.metrics.tauxConsommationPct.toFixed(0)}%`}
                                </span>
                                <div className="text-[10px] text-slate-400 font-mono-numbers">
                                  {formatMontant(corps.metrics.totalFactureHT, 0)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
