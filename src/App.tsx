/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Chantier, CorpsDetat, Facture } from './types/audit';
import { getMockChantiers } from './data/mockChantiers';
import { computeChantierMetrics, computeCorpsDetatMetrics, recomputeChantiersWithMonth } from './utils/calculator';
import { Header } from './components/Header';
import { SidebarTree } from './components/SidebarTree';
import { CorpsDetatAudit } from './components/CorpsDetatAudit';
import { ChantierOverview } from './components/ChantierOverview';
import { GlobalSynthesisTable } from './components/GlobalSynthesisTable';
import { NormesCcagGuide } from './components/NormesCcagGuide';
import { ParametrageTab } from './components/ParametrageTab';
import { FileViewerModal } from './components/FileViewerModal';
import { AddFactureModal } from './components/AddFactureModal';
import { AuditReportModal } from './components/AuditReportModal';

const STORAGE_KEY_CHANTIERS = 'auditbtp_saved_chantiers_v1';
const STORAGE_KEY_MOIS = 'auditbtp_saved_mois_v1';
const STORAGE_KEY_CHANTIER_ID = 'auditbtp_saved_chantier_id_v1';
const STORAGE_KEY_LOT_ID = 'auditbtp_saved_lot_id_v1';

export default function App() {
  // Mois de traitement mémorisé ou mois en cours (format YYYY-MM)
  const [moisTraitement, setMoisTraitement] = useState<string>(() => {
    try {
      const savedMois = localStorage.getItem(STORAGE_KEY_MOIS);
      if (savedMois && /^\d{4}-\d{2}$/.test(savedMois)) {
        return savedMois;
      }
    } catch {}
    return new Date().toISOString().slice(0, 7); // ex: "2026-10"
  });

  // Chantiers mémorisés (dernière session scannée) ou démo
  const [chantiers, setChantiers] = useState<Chantier[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHANTIERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erreur lecture cache chantiers persistés :', e);
    }
    const currentMonth = new Date().toISOString().slice(0, 7);
    return getMockChantiers(currentMonth);
  });

  const [selectedChantierId, setSelectedChantierId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_CHANTIER_ID);
      if (savedId) return savedId;
    } catch {}
    return 'c1';
  });

  const [selectedCorpsDetatId, setSelectedCorpsDetatId] = useState<string | null>(() => {
    try {
      const savedLot = localStorage.getItem(STORAGE_KEY_LOT_ID);
      if (savedLot) return savedLot;
    } catch {}
    return 'c1-lot-01';
  });

  const [currentTab, setCurrentTab] = useState<'audit' | 'synthese' | 'parametrage' | 'guide'>('parametrage');

  // Sauvegarde automatique dans localStorage dès qu'une modification survient
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CHANTIERS, JSON.stringify(chantiers));
    } catch (e) {
      console.warn('Erreur sauvegarde localStorage chantiers :', e);
    }
  }, [chantiers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MOIS, moisTraitement);
    } catch {}
  }, [moisTraitement]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CHANTIER_ID, selectedChantierId);
    } catch {}
  }, [selectedChantierId]);

  useEffect(() => {
    try {
      if (selectedCorpsDetatId) {
        localStorage.setItem(STORAGE_KEY_LOT_ID, selectedCorpsDetatId);
      } else {
        localStorage.removeItem(STORAGE_KEY_LOT_ID);
      }
    } catch {}
  }, [selectedCorpsDetatId]);

  // Modales
  const [isAddFactureOpen, setIsAddFactureOpen] = useState(false);
  const [addFactureTargetLotId, setAddFactureTargetLotId] = useState<string | null>(null);

  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
  const [fileViewerData, setFileViewerData] = useState<{
    name: string;
    path: string;
    category: string;
    content?: string;
  } | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Recherche du chantier et corps d'état sélectionnés
  const activeChantier = chantiers.find(c => c.id === selectedChantierId) || chantiers[0] || null;
  const activeCorpsDetat =
    activeChantier?.corpsDetats.find(c => c.id === selectedCorpsDetatId) || null;

  // Modification du mois de traitement
  const handleMoisTraitementChange = (newMonth: string) => {
    setMoisTraitement(newMonth);
    setChantiers(prevChantiers => recomputeChantiersWithMonth(prevChantiers, newMonth));
  };

  // Actions de navigation
  const handleSelectChantier = (id: string) => {
    setSelectedChantierId(id);
    setSelectedCorpsDetatId(null);
    setCurrentTab('audit');
  };

  const handleSelectCorpsDetat = (chantierId: string, corpsDetatId: string) => {
    setSelectedChantierId(chantierId);
    setSelectedCorpsDetatId(corpsDetatId);
    setCurrentTab('audit');
  };

  // Import de dossiers utilisateur (exclusivement via Google Drive dans l'onglet Paramétrage)
  const handleFolderImported = (importedChantiers: Chantier[]) => {
    const recomputed = recomputeChantiersWithMonth(importedChantiers, moisTraitement);
    setChantiers(recomputed);
    if (recomputed.length > 0) {
      setSelectedChantierId(recomputed[0].id);
      if (recomputed[0].corpsDetats.length > 0) {
        setSelectedCorpsDetatId(recomputed[0].corpsDetats[0].id);
      } else {
        setSelectedCorpsDetatId(null);
      }
    }
    setCurrentTab('audit');
  };

  // Réinitialisation de la démo
  const handleResetDemo = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_CHANTIERS);
      localStorage.removeItem(STORAGE_KEY_CHANTIER_ID);
      localStorage.removeItem(STORAGE_KEY_LOT_ID);
    } catch {}
    const recomputed = getMockChantiers(moisTraitement);
    setChantiers(recomputed);
    setSelectedChantierId('c1');
    setSelectedCorpsDetatId('c1-lot-01');
  };

  // Ajout manuel d'une facture
  const handleOpenAddFacture = (corpsDetatId: string) => {
    setAddFactureTargetLotId(corpsDetatId);
    setIsAddFactureOpen(true);
  };

  const handleAddFacture = (newFactureData: Omit<Facture, 'id'>) => {
    if (!addFactureTargetLotId || !activeChantier) return;

    setChantiers(prevChantiers => {
      const updated = prevChantiers.map(ch => {
        if (ch.id !== selectedChantierId) return ch;

        const updatedCorps = ch.corpsDetats.map(corps => {
          if (corps.id !== addFactureTargetLotId) return corps;

          const updatedFactures: Facture[] = [
            ...corps.factures,
            {
              ...newFactureData,
              id: `f-${corps.id}-${Date.now()}`,
            },
          ];

          // Recalcul des métriques du lot selon le mois de traitement
          const updatedMetrics = computeCorpsDetatMetrics(
            corps.acteEngagement,
            updatedFactures,
            corps.avenants,
            moisTraitement
          );

          return {
            ...corps,
            factures: updatedFactures,
            metrics: updatedMetrics,
          };
        });

        // Recalcul des métriques du chantier
        const updatedChantierMetrics = computeChantierMetrics(updatedCorps);

        return {
          ...ch,
          corpsDetats: updatedCorps,
          metrics: updatedChantierMetrics,
        };
      });

      return updated;
    });
  };

  // Consultation d'un fichier source
  const handleViewFile = (fileInfo: {
    name: string;
    path: string;
    category: string;
    content?: string;
  }) => {
    setFileViewerData(fileInfo);
    setIsFileViewerOpen(true);
  };

  // Génération du rapport d'audit formel
  const handleGenerateAuditReport = (_corpsDetat: CorpsDetat, _chantier: Chantier) => {
    setIsReportModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* 1. Header principal */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        moisTraitement={moisTraitement}
        onResetDemo={handleResetDemo}
        totalChantiers={chantiers.length}
      />

      {/* 2. Zone de travail principale */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation arborescente (avec choix du mois de traitement sur le volet de gauche) */}
        <SidebarTree
          moisTraitement={moisTraitement}
          onMoisTraitementChange={handleMoisTraitementChange}
          chantiers={chantiers}
          selectedChantierId={selectedChantierId}
          selectedCorpsDetatId={selectedCorpsDetatId}
          onSelectChantier={handleSelectChantier}
          onSelectCorpsDetat={handleSelectCorpsDetat}
        />

        {/* Contenu central */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {currentTab === 'parametrage' ? (
            <ParametrageTab
              moisTraitement={moisTraitement}
              onMoisTraitementChange={handleMoisTraitementChange}
              chantiers={chantiers}
              onChantiersImported={handleFolderImported}
              onResetDemo={handleResetDemo}
              onSelectLot={handleSelectCorpsDetat}
            />
          ) : currentTab === 'synthese' ? (
            <GlobalSynthesisTable
              chantiers={chantiers}
              moisTraitement={moisTraitement}
              onSelectLot={handleSelectCorpsDetat}
              onOpenParametrage={() => setCurrentTab('parametrage')}
            />
          ) : currentTab === 'guide' ? (
            <NormesCcagGuide />
          ) : activeChantier && activeCorpsDetat ? (
            <CorpsDetatAudit
              chantier={activeChantier}
              corpsDetat={activeCorpsDetat}
              moisTraitement={moisTraitement}
              onOpenParametrage={() => setCurrentTab('parametrage')}
              onViewFile={handleViewFile}
              onGenerateAuditReport={handleGenerateAuditReport}
              onAddFactureModal={handleOpenAddFacture}
            />
          ) : activeChantier ? (
            <ChantierOverview
              chantier={activeChantier}
              moisTraitement={moisTraitement}
              onSelectCorpsDetat={lotId => handleSelectCorpsDetat(activeChantier.id, lotId)}
              onOpenParametrage={() => setCurrentTab('parametrage')}
            />
          ) : (
            <div className="p-12 text-center text-slate-500">
              Aucun chantier sélectionné.
            </div>
          )}
        </main>
      </div>

      {/* 3. Modales fonctionnelles */}
      <FileViewerModal
        isOpen={isFileViewerOpen}
        onClose={() => setIsFileViewerOpen(false)}
        fileInfo={fileViewerData}
      />

      <AddFactureModal
        isOpen={isAddFactureOpen}
        onClose={() => {
          setIsAddFactureOpen(false);
          setAddFactureTargetLotId(null);
        }}
        corpsDetatName={
          activeChantier?.corpsDetats.find(c => c.id === addFactureTargetLotId)?.name ||
          'Corps d’État'
        }
        defaultTauxTVA={activeCorpsDetat?.metrics.tauxTVA || 20}
        onAddFacture={handleAddFacture}
      />

      <AuditReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        chantier={activeChantier}
        corpsDetat={activeCorpsDetat}
      />
    </div>
  );
}
