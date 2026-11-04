import { ActeEngagement, Avenant, Chantier, CorpsDetat, Facture } from '../types/audit';
import { computeChantierMetrics, computeCorpsDetatMetrics } from './calculator';
import { detectDocumentCategory, parseUploadedFile } from './fileExtractor';

// Dossiers utilitaires qui ne sont PAS des corps d'état mais des sous-dossiers de classement
const SUBFOLDER_BLACKLIST = new Set([
  'factures',
  'facture',
  'situations',
  'situation',
  'invoices',
  'pieces_comptables',
  'pieces_jointes',
  'marche',
  'contrat',
  'actes',
  'documents',
  'pj',
  'scans',
  'pdf',
  'decomptes',
  'avenants',
]);

export interface ParsedItem {
  file: File;
  relativePath: string;
  category: 'acte_engagement' | 'facture' | 'avenant' | 'autre';
}

export async function parseFolderStructure(files: File[]): Promise<Chantier[]> {
  // Structure temporaire : Map<chantierName, Map<corpsDetatName, { actes: File[], factures: File[], avenants: File[] }>>
  type LotBucket = {
    chantierName: string;
    lotName: string;
    folderPath: string;
    actes: { file: File; path: string }[];
    factures: { file: File; path: string }[];
    avenants: { file: File; path: string }[];
  };

  const chantiersMap = new Map<string, Map<string, LotBucket>>();

  // Parcours respectant les 4 ou 5 niveaux (jamais de niveau 6) :
  // [Racine] > [Chantier] > 5 - corps d'état > 3 - Marchés + Assurances > [Phase optionnelle] > Artisan-Lot
  for (const file of files) {
    const rawPath = file.webkitRelativePath || file.name;
    const parts = rawPath.split(/[\/\\]+/).filter(Boolean);

    if (parts.length <= 1) {
      continue;
    }

    const fileName = parts[parts.length - 1];
    if (fileName.startsWith('.') || fileName.startsWith('Thumbs.db')) {
      continue;
    }

    // Trouver l'index de "5 - corps d'état" et de "3 - Marchés + Assurances"
    const idxCorpsDetat = parts.findIndex(p => /^5\s*[-_]?\s*corps\s*d['’]?[eé]tats?/i.test(p.trim()));
    const idxMarches = parts.findIndex(p => /^3\s*[-_]?\s*march[eé]s?\s*(?:\+|et|&)\s*assurances?/i.test(p.trim()));

    // Si le chemin ne passe pas par ces branches obligatoires, on ignore les autres branches du chantier
    if (idxCorpsDetat === -1 || idxMarches === -1 || idxMarches <= idxCorpsDetat) {
      continue;
    }

    // Le chantier est le segment immédiatement avant "5 - corps d'état"
    const chantierName = idxCorpsDetat > 0 ? parts[idxCorpsDetat - 1] : 'Chantier';

    // Après "3 - Marchés + Assurances", on cherche soit une phase, soit l'artisan-lot
    const remainingParts = parts.slice(idxMarches + 1); // ex: ["Phase 1", "Lot 01", "facture.pdf"] ou ["Lot 01", "facture.pdf"]
    if (remainingParts.length < 2) {
      // Fichier directement dans "3 - Marchés + Assurances" sans artisan-lot -> considéré sans acte d'engagement
      const cleanChantier = cleanDisplayName(chantierName);
      if (!chantiersMap.has(cleanChantier)) chantiersMap.set(cleanChantier, new Map());
      const lotMap = chantiersMap.get(cleanChantier)!;
      const lotName = "Dossier artisan-lot non créé";
      if (!lotMap.has(lotName)) {
        lotMap.set(lotName, {
          chantierName: cleanChantier,
          lotName,
          folderPath: parts.slice(0, -1).join('/'),
          actes: [],
          factures: [],
          avenants: [],
        });
      }
      const bucket = lotMap.get(lotName)!;
      const category = detectDocumentCategory(fileName, rawPath);
      if (category === 'facture' || /facture|situation/i.test(fileName)) {
        bucket.factures.push({ file, path: rawPath });
      }
      continue;
    }

    let lotName = '';
    let phaseName: string | undefined = undefined;

    // Vérifier si le premier sous-dossier après marchés est une phase (nom contenant "phase")
    if (/phase/i.test(remainingParts[0].trim())) {
      phaseName = remainingParts[0].trim();
      if (remainingParts.length >= 3) {
        lotName = remainingParts[1];
      } else {
        lotName = `[${phaseName}] Dossier artisan-lot non créé`;
      }
    } else {
      // Pas de découpage en phase : 4 niveaux, premier dossier = artisan-lot
      lotName = remainingParts[0];
    }

    const cleanChantier = cleanDisplayName(chantierName);
    const cleanLot = phaseName && !lotName.startsWith('[') ? `[${phaseName}] ${cleanDisplayName(lotName)}` : cleanDisplayName(lotName);

    if (!chantiersMap.has(cleanChantier)) {
      chantiersMap.set(cleanChantier, new Map());
    }
    const lotMap = chantiersMap.get(cleanChantier)!;

    if (!lotMap.has(cleanLot)) {
      lotMap.set(cleanLot, {
        chantierName: cleanChantier,
        lotName: cleanLot,
        folderPath: parts.slice(0, -1).join('/'),
        actes: [],
        factures: [],
        avenants: [],
      });
    }

    const bucket = lotMap.get(cleanLot)!;
    const category = detectDocumentCategory(fileName, rawPath);

    if (category === 'acte_engagement') {
      bucket.actes.push({ file, path: rawPath });
    } else if (category === 'avenant') {
      bucket.avenants.push({ file, path: rawPath });
    } else {
      // Facture par défaut pour tout autre document comptable
      bucket.factures.push({ file, path: rawPath });
    }
  }

  // 2. Transformer les buckets en modèles complets
  const resultChantiers: Chantier[] = [];
  let chantierIdx = 1;

  for (const [chantierName, lotMap] of chantiersMap.entries()) {
    const chantierId = `imported-ch-${chantierIdx++}`;
    const corpsDetats: CorpsDetat[] = [];
    let lotIdx = 1;

    for (const [lotName, bucket] of lotMap.entries()) {
      const lotId = `${chantierId}-lot-${lotIdx++}`;

      // Extraire l'acte d'engagement s'il existe (prendre le plus récent ou premier)
      let acteEngagement: ActeEngagement | null = null;
      if (bucket.actes.length > 0) {
        const item = bucket.actes[0];
        const parsed = await parseUploadedFile(item.file, 'acte_engagement');
        const ttc = parsed.montantTTC || 0;
        const tva = parsed.tauxTVA || 20;
        const ht = parsed.montantHT || (ttc > 0 ? Math.round((ttc / (1 + tva / 100)) * 100) / 100 : 0);
        const fileDate = item.file.lastModified ? new Date(item.file.lastModified).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        acteEngagement = {
          id: `ae-${lotId}`,
          fileName: item.file.name,
          filePath: item.path,
          entrepriseTitulaire: parsed.entreprise || guessCompanyFromFilename(item.file.name) || 'Entreprise Titulaire',
          dateSignature: parsed.date || fileDate,
          montantHT: ht,
          tauxTVA: tva,
          montantTTC: ttc,
          retenueGarantiePct: parsed.retenueGarantiePct || 5,
          rawContent: parsed.previewText,
          isAiParsed: parsed.isMontantExtrait,
          justification: parsed.justification,
        };
      }

      // Extraire les avenants
      const avenants: Avenant[] = [];
      for (let i = 0; i < bucket.avenants.length; i++) {
        const item = bucket.avenants[i];
        const parsed = await parseUploadedFile(item.file, 'avenant');
        const fileDate = item.file.lastModified ? new Date(item.file.lastModified).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        avenants.push({
          id: `av-${lotId}-${i + 1}`,
          numero: `Avenant N°${i + 1}`,
          date: parsed.date || fileDate,
          objet: cleanDisplayName(item.file.name.replace(/\.[^/.]+$/, '')),
          montantHT: parsed.montantHT || 0,
          statut: 'valide',
        });
      }

      // Extraire les factures
      const factures: Facture[] = [];
      for (let i = 0; i < bucket.factures.length; i++) {
        const item = bucket.factures[i];
        const parsed = await parseUploadedFile(item.file, 'facture');
        const ttc = parsed.montantTTC || 0;
        const tva = parsed.tauxTVA || 20;
        const ht = parsed.montantHT || (ttc > 0 ? Math.round((ttc / (1 + tva / 100)) * 100) / 100 : 0);
        const fileDate = item.file.lastModified ? new Date(item.file.lastModified).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        factures.push({
          id: `f-${lotId}-${i + 1}`,
          fileName: item.file.name,
          filePath: item.path,
          numeroFacture: parsed.numero || `FAC-${(i + 1).toString().padStart(3, '0')}`,
          situationNumero: `Situation N°${i + 1}`,
          dateEmission: parsed.date || fileDate,
          montantHT: ht,
          tauxTVA: tva,
          montantTTC: ttc,
          retenueGarantieHT: ht * 0.05,
          statutPaiement: 'validee',
          rawContent: parsed.previewText,
          isAiParsed: parsed.isMontantExtrait,
          justification: parsed.justification,
        });
      }

      // Trier factures par date
      factures.sort((a, b) => (a.dateEmission || '').localeCompare(b.dateEmission || ''));

      // Calcul des métriques de conformité
      const metrics = computeCorpsDetatMetrics(acteEngagement, factures, avenants);

      corpsDetats.push({
        id: lotId,
        chantierId,
        code: `LOT ${lotIdx - 1 < 10 ? '0' : ''}${lotIdx - 1}`,
        name: lotName,
        folderPath: bucket.folderPath,
        entreprise: acteEngagement?.entrepriseTitulaire || 'Entreprise à définir',
        acteEngagement,
        factures,
        avenants,
        metrics,
      });
    }

    // Calcul métriques chantier
    const chantierMetrics = computeChantierMetrics(corpsDetats);

    resultChantiers.push({
      id: chantierId,
      code: `IMP-${chantierIdx - 1}`,
      name: chantierName,
      folderPath: chantierName,
      maitreOuvrage: 'Maître d’Ouvrage (Dossier Importé)',
      lieu: 'Site Chantier',
      dateDebut: new Date().toISOString().split('T')[0],
      dateLivraisonPrevue: 'En cours',
      corpsDetats,
      metrics: chantierMetrics,
    });
  }

  return resultChantiers;
}

function cleanDisplayName(raw: string): string {
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/^\d+[\s.-]*/, '') // Enlève les préfixes de tri ex: "01 - " ou "1_"
    .trim() || raw;
}

function guessCompanyFromFilename(fileName: string): string | undefined {
  const parts = fileName.split(/[_\-.]+/);
  // Trouver un mot en majuscules ou avec SAS / SARL / BTP
  for (const part of parts) {
    if (/(?:SAS|SARL|BTP|EURL|SA|EI|CIE)/i.test(part) && part.length > 2) {
      return part;
    }
  }
  return undefined;
}
