import { Chantier, CorpsDetat } from '../types/audit';
import { computeChantierMetrics, computeCorpsDetatMetrics } from '../utils/calculator';

// Construction des chantiers et corps d'état selon l'arborescence stricte à 5 ou 6 niveaux :
// Racine (Chantiers en cours) > Chantier > "5 - corps d'état" > "3 - Marchés + Assurances" > [Phase optionnelle] > Artisan-Lot
export function getMockChantiers(moisTraitement: string = '2026-10'): Chantier[] {
  function createCorpsDetat(
    id: string,
    chantierId: string,
    code: string,
    name: string,
    entreprise: string,
    folderPath: string,
    acte: Parameters<typeof computeCorpsDetatMetrics>[0],
    factures: Parameters<typeof computeCorpsDetatMetrics>[1],
    avenants: Parameters<typeof computeCorpsDetatMetrics>[2] = [],
    phase?: string,
    arborescenceValide: boolean = true,
    isLotAbsent: boolean = false
  ): CorpsDetat {
    const metrics = computeCorpsDetatMetrics(acte, factures, avenants, moisTraitement, arborescenceValide, isLotAbsent);
    return {
      id,
      chantierId,
      code,
      name,
      entreprise,
      folderPath,
      phase,
      arborescenceValide,
      acteEngagement: acte,
      factures,
      avenants,
      metrics,
    };
  }

  // CHANTIER 1 : Résidence Le Belvédère (42 Logements collectifs)
  // Arborescence à 6 niveaux (avec découpage en Phase 1 et Phase 2)
  const c1_corps: CorpsDetat[] = [
    // Lot 1 : Validé (AE présent, Factures conformes au budget)
    createCorpsDetat(
      'c1-lot-01',
      'c1',
      'LOT 01',
      '[Phase 1] Terrassement & Gros Œuvre',
      'Vinci Construction France SAS',
      'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 1/Lot 01 - Vinci Construction France',
      {
        id: 'ae-c1-01',
        fileName: 'Acte_Engagement_Marche_LOT01_Vinci.pdf',
        filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 1/Lot 01 - Vinci Construction France/Acte_Engagement_Marche_LOT01_Vinci.pdf',
        entrepriseTitulaire: 'Vinci Construction France SAS',
        siret: '834 928 102 00034',
        dateSignature: '2026-01-15',
        montantHT: 480000,
        tauxTVA: 20,
        montantTTC: 576000,
        dureeMois: 14,
        retenueGarantiePct: 5,
        penalitesRetardJour: 500,
        clausesParticulieres: 'Marché forfaitaire révisable selon index BT01. Retenue de garantie de 5% substituée par caution bancaire solidaire.',
      },
      [
        {
          id: 'f-c1-01-1',
          fileName: 'Facture_F2026-014_Situation_01.pdf',
          filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 1/Lot 01 - Vinci Construction France/Factures/Facture_F2026-014_Situation_01.pdf',
          numeroFacture: 'FAC-2026-014',
          situationNumero: 'Situation N°1 (Terrassement)',
          dateEmission: '2026-06-30',
          montantHT: 95000,
          tauxTVA: 20,
          montantTTC: 114000,
          retenueGarantieHT: 4750,
          statutPaiement: 'payee',
        },
        {
          id: 'f-c1-01-2',
          fileName: 'Facture_F2026-039_Situation_02.pdf',
          filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 1/Lot 01 - Vinci Construction France/Factures/Facture_F2026-039_Situation_02.pdf',
          numeroFacture: 'FAC-2026-039',
          situationNumero: 'Situation N°2 (Fondations)',
          dateEmission: '2026-08-31',
          montantHT: 125000,
          tauxTVA: 20,
          montantTTC: 150000,
          retenueGarantieHT: 6250,
          statutPaiement: 'payee',
        },
        {
          id: 'f-c1-01-3',
          fileName: 'Facture_F2026-092_Situation_04.pdf',
          filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 1/Lot 01 - Vinci Construction France/Factures/Facture_F2026-092_Situation_04.pdf',
          numeroFacture: 'FAC-2026-092',
          situationNumero: 'Situation N°4 (Élévation R+3)',
          dateEmission: `${moisTraitement}-15`,
          montantHT: 85000,
          tauxTVA: 20,
          montantTTC: 102000,
          retenueGarantieHT: 4250,
          statutPaiement: 'validee',
        },
      ],
      [],
      'Phase 1',
      true
    ),

    // Lot 2 : Alerte >90% (Conforme mais conso critique)
    createCorpsDetat(
      'c1-lot-02',
      'c1',
      'LOT 02',
      '[Phase 1] Électricité & Courants Faibles',
      'Eiffage Énergie Systèmes',
      'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 1/Lot 02 - Eiffage Énergie',
      {
        id: 'ae-c1-02',
        fileName: 'AE_Lot02_Electricite_Eiffage.pdf',
        filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 1/Lot 02 - Eiffage Énergie/AE_Lot02_Electricite_Eiffage.pdf',
        entrepriseTitulaire: 'Eiffage Énergie Systèmes',
        siret: '439 821 902 00018',
        dateSignature: '2026-02-01',
        montantHT: 195000,
        tauxTVA: 20,
        montantTTC: 234000,
        retenueGarantiePct: 5,
      },
      [
        {
          id: 'f-c1-02-1',
          fileName: 'Facture_ELE-0081_Sit01.pdf',
          filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 1/Lot 02 - Eiffage Énergie/Factures/Facture_ELE-0081_Sit01.pdf',
          numeroFacture: 'ELE-0081',
          dateEmission: '2026-07-20',
          montantHT: 80000,
          tauxTVA: 20,
          montantTTC: 96000,
          statutPaiement: 'payee',
        },
        {
          id: 'f-c1-02-2',
          fileName: 'Facture_ELE-0112_Sit02.pdf',
          filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 1/Lot 02 - Eiffage Énergie/Factures/Facture_ELE-0112_Sit02.pdf',
          numeroFacture: 'ELE-0112',
          dateEmission: `${moisTraitement}-10`,
          montantHT: 100000,
          tauxTVA: 20,
          montantTTC: 120000,
          statutPaiement: 'validee',
        },
      ],
      [],
      'Phase 1',
      true
    ),

    // Lot 3 : Dépassement budgétaire
    createCorpsDetat(
      'c1-lot-03',
      'c1',
      'LOT 03',
      '[Phase 2] Plomberie, Sanitaires & CVC',
      'BATI PRO 75',
      'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 2/BATI PRO 75',
      {
        id: 'ae-c1-03',
        fileName: 'Acte_Engagement_Plomberie_CVC.pdf',
        filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 2/BATI PRO 75/Acte_Engagement_Plomberie_CVC.pdf',
        entrepriseTitulaire: 'BATI PRO 75',
        dateSignature: '2026-02-15',
        montantHT: 160000,
        tauxTVA: 20,
        montantTTC: 192000,
        retenueGarantiePct: 5,
      },
      [
        {
          id: 'f-c1-03-1',
          fileName: 'Facture_FP-26-001.pdf',
          filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 2/BATI PRO 75/Factures/Facture_FP-26-001.pdf',
          numeroFacture: 'FP-26-001',
          dateEmission: '2026-08-15',
          montantHT: 90000,
          tauxTVA: 20,
          montantTTC: 108000,
          statutPaiement: 'payee',
        },
        {
          id: 'f-c1-03-2',
          fileName: 'Facture_FP-26-005.pdf',
          filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 2/BATI PRO 75/Factures/Facture_FP-26-005.pdf',
          numeroFacture: 'FP-26-005',
          dateEmission: `${moisTraitement}-20`,
          montantHT: 85000, // Cumul = 175 000 > 160 000 => Dépassement
          tauxTVA: 20,
          montantTTC: 102000,
          statutPaiement: 'en_attente',
        },
      ],
      [],
      'Phase 2',
      true
    ),

    // Lot 4 : Sans AE -> Détecté, AUCUN contrôle à faire selon règle 2
    createCorpsDetat(
      'c1-lot-04',
      'c1',
      'LOT 04',
      '[Phase 2] Menuiseries Extérieures & Serrurerie',
      'SARL Fenêtres & Façades',
      'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 2/SARL Fenêtres & Façades',
      null, // Absence d'AE !
      [
        {
          id: 'f-c1-04-1',
          fileName: 'Facture_MEN-2026-44.pdf',
          filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 2/SARL Fenêtres & Façades/Factures/Facture_MEN-2026-44.pdf',
          numeroFacture: 'MEN-2026-44',
          dateEmission: `${moisTraitement}-18`,
          montantHT: 42000,
          tauxTVA: 20,
          montantTTC: 50400,
          statutPaiement: 'en_attente',
        },
      ],
      [],
      'Phase 2',
      true
    ),

    // Lot 5 : Sans facture sur le mois -> AUCUN contrôle à faire selon règle 2
    createCorpsDetat(
      'c1-lot-05',
      'c1',
      'LOT 05',
      '[Phase 2] Peinture, Revêtements & Finitions',
      'Entreprise Lefebvre Finitions',
      'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 2/Entreprise Lefebvre Finitions',
      {
        id: 'ae-c1-05',
        fileName: 'AE_Lot05_Peinture.pdf',
        filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 2/Entreprise Lefebvre Finitions/AE_Lot05_Peinture.pdf',
        entrepriseTitulaire: 'Entreprise Lefebvre Finitions',
        dateSignature: '2026-03-01',
        montantHT: 85000,
        tauxTVA: 20,
        montantTTC: 102000,
        retenueGarantiePct: 5,
      },
      [], // Aucune facture !
      [],
      'Phase 2',
      true
    ),

    // Lot 6 : Lot absent -> Sous-dossier artisan-lot absent de la Phase 3
    createCorpsDetat(
      'c1-lot-06',
      'c1',
      'LOT 06',
      '[Phase 3] Dossier artisan-lot absent',
      "Sous-dossier artisan-lot non créé dans l'arborescence",
      'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 3',
      null,
      [],
      [],
      'Phase 3',
      true,
      true // isLotAbsent = true
    ),

    // Lot 7 : Fichier K.O. -> Document scanné présent mais non extractible (flux illisible)
    createCorpsDetat(
      'c1-lot-07',
      'c1',
      'LOT 07',
      '[Phase 3] Carrelage & Faïence',
      'SARL Carrelage Méditerranée',
      'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 3/SARL Carrelage Méditerranée',
      {
        id: 'ae-c1-07',
        fileName: 'Scan_Acte_Engagement_Carrelage_Image_NonOCR.pdf',
        filePath: 'Chantiers en cours/Résidence Le Belvédère/5 - corps d\'état/3 - Marchés + Assurances/Phase 3/SARL Carrelage Méditerranée/Scan_Acte_Engagement_Carrelage_Image_NonOCR.pdf',
        entrepriseTitulaire: 'SARL Carrelage Méditerranée',
        dateSignature: '2026-03-10',
        montantHT: 0,
        tauxTVA: 20,
        montantTTC: 0,
        retenueGarantiePct: 0,
        isAiParsed: false,
        justification: 'Fichier K.O. : Document image scanné sans flux textuel extractible (OCR manquant).',
      },
      [],
      [],
      'Phase 3',
      true,
      false
    ),
  ];

  // CHANTIER 2 : Villa Médicis (Arborescence à 5 niveaux, sans phase intermédiaire)
  const c2_corps: CorpsDetat[] = [
    createCorpsDetat(
      'c2-lot-01',
      'c2',
      'LOT 01',
      'Maçonnerie & Rénovation Pierre de Taille',
      'SARL Bâtiment Patrimoine',
      'Chantiers en cours/Villa Médicis/5 - corps d\'état/3 - Marchés + Assurances/SARL Bâtiment Patrimoine',
      {
        id: 'ae-c2-01',
        fileName: 'Acte_Engagement_Maconnerie_Medicis.pdf',
        filePath: 'Chantiers en cours/Villa Médicis/5 - corps d\'état/3 - Marchés + Assurances/SARL Bâtiment Patrimoine/Acte_Engagement_Maconnerie_Medicis.pdf',
        entrepriseTitulaire: 'SARL Bâtiment Patrimoine',
        dateSignature: '2026-04-10',
        montantHT: 220000,
        tauxTVA: 20,
        montantTTC: 264000,
        retenueGarantiePct: 5,
      },
      [
        {
          id: 'f-c2-01-1',
          fileName: 'Facture_FAC-MED-01.pdf',
          filePath: 'Chantiers en cours/Villa Médicis/5 - corps d\'état/3 - Marchés + Assurances/SARL Bâtiment Patrimoine/Factures/Facture_FAC-MED-01.pdf',
          numeroFacture: 'FAC-MED-01',
          dateEmission: `${moisTraitement}-05`,
          montantHT: 65000,
          tauxTVA: 20,
          montantTTC: 78000,
          statutPaiement: 'validee',
        },
      ],
      [],
      undefined,
      true
    ),

    createCorpsDetat(
      'c2-lot-02',
      'c2',
      'LOT 02',
      'Plâtrerie & Faux-Plafonds Décoratifs',
      'Staff & Décor SAS',
      'Chantiers en cours/Villa Médicis/5 - corps d\'état/3 - Marchés + Assurances/Staff & Décor SAS',
      {
        id: 'ae-c2-02',
        fileName: 'AE_Platrerie_Staff.pdf',
        filePath: 'Chantiers en cours/Villa Médicis/5 - corps d\'état/3 - Marchés + Assurances/Staff & Décor SAS/AE_Platrerie_Staff.pdf',
        entrepriseTitulaire: 'Staff & Décor SAS',
        dateSignature: '2026-04-20',
        montantHT: 75000,
        tauxTVA: 20,
        montantTTC: 90000,
        retenueGarantiePct: 5,
      },
      [
        {
          id: 'f-c2-02-1',
          fileName: 'Facture_STF-26-09.pdf',
          filePath: 'Chantiers en cours/Villa Médicis/5 - corps d\'état/3 - Marchés + Assurances/Staff & Décor SAS/Factures/Facture_STF-26-09.pdf',
          numeroFacture: 'STF-26-09',
          dateEmission: `${moisTraitement}-22`,
          montantHT: 35000,
          tauxTVA: 20,
          montantTTC: 42000,
          statutPaiement: 'validee',
        },
      ],
      [],
      undefined,
      true
    ),
  ];

  // CHANTIER 3 : Îlot République (Illustration d'une anomalie dans l'arborescence traitée : dossier "3 - Marchés + Assurances" manquant)
  const c3_corps: CorpsDetat[] = [
    createCorpsDetat(
      'c3-ano-01',
      'c3',
      'NON VÉRIFIÉ',
      'Arborescence non conforme : Dossier "3 - Marchés + Assurances" absent',
      'Artisan non identifié (branche rompue)',
      'Chantiers en cours/Îlot République/5 - corps d\'état/[Anomalie: "3 - Marchés + Assurances" absent]',
      null,
      [],
      [],
      undefined,
      false // arborescenceValide = false -> statut 'non_verifie'
    ),
  ];

  return [
    {
      id: 'c1',
      code: 'CH-2026-01',
      name: 'Résidence Le Belvédère',
      folderPath: 'Chantiers en cours/Résidence Le Belvédère',
      maitreOuvrage: 'Nexity Immobilier Résidentiel',
      maitreOeuvre: 'Atelier Architectes & Ingénieurs',
      lieu: 'Lyon 3ème (69)',
      dateDebut: '2026-01-10',
      dateLivraisonPrevue: '2027-04-30',
      corpsDetats: c1_corps,
      metrics: computeChantierMetrics(c1_corps),
      hasArborescenceAnomaly: false,
    },
    {
      id: 'c2',
      code: 'CH-2026-02',
      name: 'Villa Médicis',
      folderPath: 'Chantiers en cours/Villa Médicis',
      maitreOuvrage: 'SCI Les Pins Parasols',
      maitreOeuvre: 'Cabinet V. Laurent Architecte',
      lieu: 'Nice (06)',
      dateDebut: '2026-04-01',
      dateLivraisonPrevue: '2026-12-15',
      corpsDetats: c2_corps,
      metrics: computeChantierMetrics(c2_corps),
      hasArborescenceAnomaly: false,
    },
    {
      id: 'c3',
      code: 'CH-2026-03',
      name: 'Îlot République',
      folderPath: 'Chantiers en cours/Îlot République',
      maitreOuvrage: 'SEM Aménagement Urbain',
      lieu: 'Marseille (13)',
      dateDebut: '2026-05-15',
      dateLivraisonPrevue: '2027-09-30',
      corpsDetats: c3_corps,
      metrics: computeChantierMetrics(c3_corps),
      hasArborescenceAnomaly: true,
    },
  ];
}
