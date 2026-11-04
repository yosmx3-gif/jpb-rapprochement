import React, { useState } from 'react';
import { X, FileText, Receipt, Check, Edit2 } from 'lucide-react';
import { formatMontant } from '../utils/calculator';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileInfo: {
    name: string;
    path: string;
    category: string;
    content?: string;
    montantHT?: number;
    tauxTVA?: number;
    date?: string;
    numero?: string;
  } | null;
  onSaveCorrection?: (updatedData: {
    montantHT: number;
    tauxTVA: number;
    date: string;
    numero: string;
  }) => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  isOpen,
  onClose,
  fileInfo,
  onSaveCorrection,
}) => {
  if (!isOpen || !fileInfo) return null;

  const isInvoice = fileInfo.category === 'Facture';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            {isInvoice ? (
              <Receipt className="w-5 h-5 text-slate-800 shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-slate-800 shrink-0" />
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-900 truncate max-w-sm">
                <span className="block truncate">{fileInfo.name}</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                <span className="inline-block">{fileInfo.category}</span>
                <span> · Document BTP</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-5 space-y-4 text-xs">
          {/* Métadonnées de chemin */}
          <div className="p-3 bg-neutral-100/60 rounded-lg">
            <span className="text-[11px] text-slate-500 font-medium block">
              Chemin complet dans l'arborescence :
            </span>
            <p className="font-mono text-[11px] text-slate-800 break-all mt-0.5 select-all">
              <span className="block">{fileInfo.path}</span>
            </p>
          </div>

          {/* Aperçu du contenu ou texte extrait */}
          <div>
            <span className="text-xs font-semibold text-slate-800 block">
              Contenu textuel / Données extraites
            </span>
            <div className="mt-1.5 p-3.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg h-44 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
              <span className="block whitespace-pre-wrap">
                {fileInfo.content ||
                  `[Aperçu du fichier : ${fileInfo.name}]\nType : ${fileInfo.category}\nExtension : ${fileInfo.name.split('.').pop()?.toUpperCase() || 'DOCUMENT'}\n\nL'algorithme de détection et comparaison financière extrait automatiquement les mentions HT, TVA et TTC pour consolider le contrôle de conformité avec l'Acte d'Engagement.`}
              </span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-900 text-[11px]">
            <strong>Note de conformité : </strong>
            <span>Les montants extraits de ce document sont automatiquement rapprochés du marché initial pour calculer l'état d'avancement et la retenue légale de garantie de 5%.</span>
          </div>
        </div>

        {/* Pied */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-neutral-200 bg-neutral-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
