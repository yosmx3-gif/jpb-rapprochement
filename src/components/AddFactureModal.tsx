import React, { useState } from 'react';
import { X, Receipt, PlusCircle, Calendar, Euro } from 'lucide-react';
import { Facture } from '../types/audit';

interface AddFactureModalProps {
  isOpen: boolean;
  onClose: () => void;
  corpsDetatName: string;
  defaultTauxTVA?: number;
  onAddFacture: (newFacture: Omit<Facture, 'id'>) => void;
}

export const AddFactureModal: React.FC<AddFactureModalProps> = ({
  isOpen,
  onClose,
  corpsDetatName,
  defaultTauxTVA = 20,
  onAddFacture,
}) => {
  const [numeroFacture, setNumeroFacture] = useState('');
  const [situationNumero, setSituationNumero] = useState('Situation de travaux');
  const [dateEmission, setDateEmission] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [montantHT, setMontantHT] = useState('');
  const [tauxTVA, setTauxTVA] = useState(defaultTauxTVA.toString());
  const [commentaires, setCommentaires] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ht = parseFloat(montantHT);
    if (isNaN(ht) || ht <= 0) return;

    const tva = parseFloat(tauxTVA) || 20;
    const ttc = ht * (1 + tva / 100);

    onAddFacture({
      fileName: `Facture_${numeroFacture || 'Saisie'}.pdf`,
      filePath: `Manuel/${corpsDetatName}/Facture_${numeroFacture || 'Saisie'}.pdf`,
      numeroFacture: numeroFacture || `FAC-${Date.now().toString().slice(-4)}`,
      situationNumero,
      dateEmission,
      montantHT: ht,
      tauxTVA: tva,
      montantTTC: ttc,
      retenueGarantieHT: ht * 0.05,
      statutPaiement: 'validee',
      commentaires: commentaires || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50/70">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-800 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ajouter une Facture / Situation
              </h3>
              <p className="text-[11px] text-slate-500">
                <span className="block">{corpsDetatName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Numéro de Facture *
            </label>
            <input
              type="text"
              required
              placeholder="ex: FAC-2025-098"
              value={numeroFacture}
              onChange={e => setNumeroFacture(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Libellé / Situation
              </label>
              <input
                type="text"
                placeholder="ex: Situation N°3"
                value={situationNumero}
                onChange={e => setSituationNumero(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Date d'Émission *
              </label>
              <input
                type="date"
                required
                value={dateEmission}
                onChange={e => setDateEmission(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Montant HT (€) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="ex: 15400.00"
                value={montantHT}
                onChange={e => setMontantHT(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Taux TVA (%)
              </label>
              <select
                value={tauxTVA}
                onChange={e => setTauxTVA(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              >
                <option value="20">20.0% (Neuf standard)</option>
                <option value="10">10.0% (Rénovation)</option>
                <option value="5.5">5.5% (Énergétique)</option>
                <option value="0">0.0% (Autoliquidation)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Observations / Commentaires
            </label>
            <input
              type="text"
              placeholder="ex: Travaux en sous-sol validés par la maîtrise d’œuvre"
              value={commentaires}
              onChange={e => setCommentaires(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-slate-600 hover:text-slate-900 rounded-lg transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-sm transition-colors"
            >
              Enregistrer la facture
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
