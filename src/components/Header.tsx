import React from 'react';
import { FolderOpen, HardHat, RefreshCw, Calendar, Settings } from 'lucide-react';
import { formatMoisFr } from '../utils/calculator';

interface HeaderProps {
  currentTab: 'audit' | 'synthese' | 'parametrage' | 'guide';
  onTabChange: (tab: 'audit' | 'synthese' | 'parametrage' | 'guide') => void;
  moisTraitement: string;
  onResetDemo: () => void;
  totalChantiers: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  moisTraitement,
  onResetDemo,
  totalChantiers,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-neutral-200 sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 bg-slate-900 text-amber-400 rounded-lg flex items-center justify-center font-bold">
          <HardHat className="w-5 h-5 text-amber-400" />
        </div>
        <div className="leading-tight">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            AuditBTP
          </span>
          <span className="hidden sm:inline text-xs text-slate-500 ml-2">
            Contrôle Budgétaire & Facturation
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <button
          onClick={() => onTabChange('parametrage')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 text-sm flex items-center gap-1.5 ${
            currentTab === 'parametrage'
              ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
              : ''
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Paramétrage & Dossier</span>
        </button>

        <button
          onClick={() => onTabChange('audit')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 text-sm ${
            currentTab === 'audit'
              ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
              : ''
          }`}
        >
          Contrôle des Lots
        </button>

        <button
          onClick={() => onTabChange('synthese')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 text-sm ${
            currentTab === 'synthese'
              ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
              : ''
          }`}
        >
          Synthèse Portfolio
        </button>

        <button
          onClick={() => onTabChange('guide')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 text-sm ${
            currentTab === 'guide'
              ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
              : ''
          }`}
        >
          Guide CCAG
        </button>
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Badge cliquable du mois de traitement */}
        <button
          onClick={() => onTabChange('parametrage')}
          title="Modifier le mois de traitement"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold font-mono-numbers text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-600" />
          <span className="capitalize">{formatMoisFr(moisTraitement)}</span>
        </button>

        {/* Réinitialisation vers démo */}
        <button
          onClick={onResetDemo}
          title="Réinitialiser les données et recharger l'exemple démo"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-neutral-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Exemple Démo</span>
        </button>

        <button
          onClick={() => onTabChange('parametrage')}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          <FolderOpen className="w-4 h-4 text-amber-400" />
          <span>Changer Dossier</span>
        </button>
      </div>
    </header>
  );
};
