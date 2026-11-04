import React from 'react';
import {
  BookOpen,
  FileText,
  ShieldCheck,
  Scale,
  AlertTriangle,
  Receipt,
  Layers,
  CheckCircle2
} from 'lucide-react';

export const NormesCcagGuide: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-8 space-y-6">
      {/* En-tête */}
      <div className="pb-4 border-b border-neutral-200">
        <div className="text-xs text-slate-500 mb-1">Réglementation BTP France</div>
        <h1 className="text-2xl font-bold text-slate-900">
          Guide des Normes Contractuelles & Contrôle Budgétaire
        </h1>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
          Rappels essentiels du CCAG Travaux, de la norme NF P 03-001 (marchés privés) et de la loi du 16 juillet 1971 relative aux retenues de garantie.
        </p>
      </div>

      {/* Cartes thématiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. L'Acte d'Engagement */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-100">
            <FileText className="w-5 h-5 text-slate-800" />
            <h2 className="text-sm font-bold text-slate-900">
              1. L'Acte d'Engagement (AE) & Marché Initial
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            L’Acte d'engagement est la pièce contractuelle constitutive par laquelle le candidat adhère aux clauses du dossier de consultation et présente son offre financière.
          </p>
          <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
            <li><strong>Montant Forfaitaire :</strong> Fixe le plafond contractuel infranchissable sans avenant signé.</li>
            <li><strong>Délai d'exécution :</strong> Point de départ des éventuelles pénalités de retard journalières.</li>
            <li><strong>Obligation :</strong> Toute facturation émise sans AE validé constitue une anomalie juridique majeure (absence de fondement contractuel).</li>
          </ul>
        </div>

        {/* 2. Situations de Travaux & DGD */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-100">
            <Receipt className="w-5 h-5 text-slate-800" />
            <h2 className="text-sm font-bold text-slate-900">
              2. Factures, Situations & Décompte Définitif
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pendant les travaux, l'entreprise émet des situations mensuelles constatant l'avancement physique des ouvrages exécutés.
          </p>
          <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
            <li><strong>Cumul des situations :</strong> Chaque nouvelle situation récapitule les travaux exécutés depuis le début du chantier et déduit les acomptes déjà perçus.</li>
            <li><strong>Contrôle de dépassement :</strong> Dès que le cumul excède 100% du budget initial, la maîtrise d'œuvre doit bloquer le paiement du surplus.</li>
            <li><strong>DGD (Décompte Général Définitif) :</strong> Clôt définitivement les comptes du lot.</li>
          </ul>
        </div>

        {/* 3. Retenue de Garantie (5%) */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-100">
            <ShieldCheck className="w-5 h-5 text-slate-800" />
            <h2 className="text-sm font-bold text-slate-900">
              3. Retenue de Garantie Légale (Loi 71-584)
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            En droit français, une retenue maximale de <strong>5% du montant HT</strong> peut être prélevée sur chaque paiement pour garantir la levée des réserves à la réception des travaux.
          </p>
          <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
            <li><strong>Caution bancaire :</strong> L'entreprise titulaire peut fournir une caution solidaire en substitution de la retenue de 5%.</li>
            <li><strong>Libération :</strong> La retenue est libérée un an après la réception sans réserves (garantie de parfait achèvement).</li>
          </ul>
        </div>

        {/* 4. Avenants & Travaux Supplémentaires */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-100">
            <Scale className="w-5 h-5 text-slate-800" />
            <h2 className="text-sm font-bold text-slate-900">
              4. Avenants & Régularisation des Dépassements
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            En cas de modification du programme, d'imprévus ou de demandes du maître d'ouvrage, un <strong>Avenant</strong> doit impérativement être signé.
          </p>
          <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
            <li><strong>Ordre de Service (OS) préalable :</strong> Tout travail supplémentaire doit faire l'objet d'un OS écrit chiffré avant exécution.</li>
            <li><strong>Seuils de vigilance :</strong> Tout dépassement de plus de 10% du marché initial sans avenant engage la responsabilité du contrôleur de travaux.</li>
          </ul>
        </div>
      </div>

      {/* Tableau récapitulatif des taux de TVA */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Barème de TVA en vigueur dans le BTP
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-neutral-200 text-slate-500 font-medium bg-neutral-50">
                <th className="py-2.5 px-3">Taux de TVA</th>
                <th className="py-2.5 px-3">Type d'opération</th>
                <th className="py-2.5 px-3">Conditions d'application</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr>
                <td className="py-3 px-3 font-bold font-mono text-slate-900">20,0%</td>
                <td className="py-3 px-3 font-medium text-slate-800">Construction neuve & Bâtiments tertiaires</td>
                <td className="py-3 px-3 text-slate-600">Taux standard applicable à toute construction neuve ou extension &gt;10% de surface.</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold font-mono text-slate-900">10,0%</td>
                <td className="py-3 px-3 font-medium text-slate-800">Rénovation, amélioration de logements</td>
                <td className="py-3 px-3 text-slate-600">Logements de plus de 2 ans (attestation fiscale simplifiée obligatoire).</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold font-mono text-slate-900">5,5%</td>
                <td className="py-3 px-3 font-medium text-slate-800">Rénovation énergétique éligible</td>
                <td className="py-3 px-3 text-slate-600">Travaux d'isolation, pompes à chaleur, conformité critères RGE.</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold font-mono text-slate-900">0,0%</td>
                <td className="py-3 px-3 font-medium text-slate-800">Autoliquidation Sous-traitance</td>
                <td className="py-3 px-3 text-slate-600">Article 283-2 nonies du CGI : facture HT sans TVA émise par le sous-traitant.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
