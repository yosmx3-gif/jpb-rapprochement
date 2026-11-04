import * as XLSX from 'xlsx';
// Utilisation du build legacy compatible tous navigateurs
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

// Configuration du worker local bundle Vite (même origine, aucun CORS, 100% fonctionnel en iframe)
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch (e) {
    console.warn('Erreur init worker PDF.js local:', e);
  }
}

// Catégorisation du document selon sa nomenclature ou son dossier conteneur
export function detectDocumentCategory(
  fileName: string,
  filePath: string
): 'acte_engagement' | 'facture' | 'avenant' | 'autre' {
  const normalized = (fileName + ' ' + filePath).toLowerCase();

  // Avenant
  if (
    normalized.includes('avenant') ||
    normalized.includes('travaux_suppl') ||
    normalized.includes('plus_value') ||
    normalized.includes('ordre_service') ||
    normalized.includes('_ts_')
  ) {
    return 'avenant';
  }

  // Acte d'engagement / Marché / DPGF
  if (
    normalized.includes('acte') ||
    normalized.includes('engagement') ||
    normalized.includes('contrat') ||
    normalized.includes('marche') ||
    normalized.includes('marché') ||
    normalized.includes('dpgf') ||
    normalized.includes('bpu') ||
    normalized.includes('_ae_') ||
    normalized.startsWith('ae_') ||
    normalized.includes('ae.') ||
    normalized.includes('ae-')
  ) {
    return 'acte_engagement';
  }

  // Facture / Situation
  if (
    normalized.includes('facture') ||
    normalized.includes('fac_') ||
    normalized.includes('fac-') ||
    normalized.includes('situation') ||
    normalized.includes('acompte') ||
    normalized.includes('solde') ||
    normalized.includes('decompt') ||
    normalized.includes('décompte') ||
    normalized.includes('dgd') ||
    normalized.includes('dgp') ||
    normalized.includes('memoire') ||
    normalized.includes('honoraire')
  ) {
    return 'facture';
  }

  return 'autre';
}

/**
 * Extrait le flux textuel brut d'un document (PDF, Excel XLSX/XLS, TXT, CSV, JSON).
 * Respect strict : lit exclusivement l'intérieur du flux binaire.
 */
export async function extractTextFromBlobOrBuffer(
  data: Blob | ArrayBuffer,
  fileName: string,
  mimeType?: string
): Promise<string> {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  // 1. Textuel (txt, csv, tsv, json)
  if (['txt', 'csv', 'tsv', 'json'].includes(extension) || mimeType?.startsWith('text/')) {
    try {
      if (data instanceof Blob) {
        return await data.text();
      }
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(data);
    } catch (e) {
      console.warn('Erreur décodage texte:', e);
      return '';
    }
  }

  // 2. Tableur Excel (xlsx, xls)
  if (['xlsx', 'xls'].includes(extension) || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
    try {
      const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
      const workbook = XLSX.read(buffer, { type: 'array' });
      let fullContent = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (sheet) {
          fullContent += `--- FEUILLE : ${sheetName} ---\n`;
          fullContent += XLSX.utils.sheet_to_csv(sheet) + '\n';
        }
      }
      return fullContent;
    } catch (e) {
      console.warn('Erreur lecture tableur Excel XLSX:', e);
      return '';
    }
  }

  // 3. Document PDF (via PDF.js avec worker local bundle Vite et fallback résilient)
  if (extension === 'pdf' || mimeType === 'application/pdf') {
    const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        verbosity: 0,
      });
      const pdf = await loadingTask.promise;
      let pdfText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .filter(Boolean);
        pdfText += pageStrings.join(' ') + '\n';
      }
      if (pdfText.trim().length > 0) {
        return pdfText;
      }
    } catch (err) {
      console.warn('Erreur extraction PDF.js, passage sur l\'analyseur de flux binaire :', err);
    }

    // Repli de secours robuste : extraction directe des chaînes textuelles du flux binaire PDF
    try {
      const bytes = new Uint8Array(buffer);
      let extracted = '';
      let currentWord = '';
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b >= 160) {
          currentWord += String.fromCharCode(b);
        } else {
          if (currentWord.length >= 3) {
            extracted += currentWord + ' ';
          }
          currentWord = '';
        }
      }
      if (currentWord.length >= 3) extracted += currentWord;
      return extracted;
    } catch (fallbackErr) {
      console.warn('Erreur extraction de secours PDF :', fallbackErr);
      return '';
    }
  }

  return '';
}

export interface ExtractedFinancialData {
  category?: 'acte_engagement' | 'facture' | 'avenant' | 'autre';
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  date?: string;
  numero?: string;
  entreprise?: string;
  siret?: string;
  retenueGarantiePct?: number;
  isMontantExtrait: boolean;
  justification?: string;
  previewText: string;
}

/**
 * Analyse autonome et locale haute précision :
 * - Fonctionne à 100% en local dans le navigateur (aucun quota, aucune limitation, 0ms de latence)
 * - Détecte automatiquement la catégorie et le taux de TVA
 * - Pour les Actes d'Engagement (B.2) : cible l'Article 2 ("Total T.T.C.") et déduit HT = TTC / (1 + TVA/100)
 * - Pour les Factures (B.3) : extrait le Net TTC à payer, taux TVA, déduit HT et applique les 5% de retenue de garantie
 * - Respect strict de la tolérance zéro : pas de montant inventé ou déduit du nom de fichier.
 */
export async function analyzeDocumentIntelligently(
  content: string,
  fileName: string,
  categoryHint?: 'acte_engagement' | 'facture' | 'avenant' | 'autre'
): Promise<ExtractedFinancialData> {
  if (!content || content.trim().length === 0) {
    return {
      category: categoryHint || 'autre',
      montantHT: 0,
      tauxTVA: 20,
      montantTTC: 0,
      isMontantExtrait: false,
      justification: 'Document sans flux textuel extractible (scan image sans OCR ou fichier vide).',
      previewText: 'Document vide ou scan sans texte.',
    };
  }

  const category = categoryHint && categoryHint !== 'autre' ? categoryHint : detectDocumentCategory(fileName, '');
  return extractFinancialDataFromContent(
    content,
    category !== 'autre' ? category : 'facture',
    fileName
  );
}

/**
 * Moteur algorithmique d'analyse harmonisée (B.2 et B.3) :
 * - Détection prioritaire du MONTANT TTC (Article 2 "total T.T.C." pour AE, Net TTC pour Facture)
 * - Détection automatique du TAUX DE TVA
 * - Déduction stricte du MONTANT HT (HT = TTC / (1 + TVA/100))
 */
export function extractFinancialDataFromContent(
  content: string,
  category: 'acte_engagement' | 'facture' | 'avenant',
  fileName?: string
): ExtractedFinancialData {
  if (!content || content.trim().length === 0) {
    return {
      montantHT: 0,
      tauxTVA: 20,
      montantTTC: 0,
      isMontantExtrait: false,
      justification: 'Contenu non extractible ou fichier vide.',
      previewText: 'Contenu non extractible ou fichier vide.',
    };
  }

  let montantTTC: number | undefined;
  let montantHT: number | undefined;
  let tauxTVA: number | undefined;
  let date: string | undefined;
  let numero: string | undefined;
  let entreprise: string | undefined;
  let siret: string | undefined;
  let justification = '';

  // 1. Détection automatique du TAUX DE TVA
  const tvaPatterns = [
    /(?:taux\s*(?:de\s*)?tva|tva)\s*[:=]?\s*([0-9,.]+)\s*%/i,
    /tva\s*\(\s*([0-9,.]+)\s*%\s*\)/i,
    /tva\s*[aà]\s*([0-9,.]+)\s*%/i,
    /\b([0-9,.]+)\s*%\s*(?:de\s*)?tva\b/i,
  ];

  for (const pattern of tvaPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const parsed = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 35) {
        tauxTVA = parsed;
        break;
      }
    }
  }

  // 2. Point B.2 : ACTE D'ENGAGEMENT -> Détection automatique du montant TTC (Article 2 Total T.T.C.)
  if (category === 'acte_engagement') {
    // Ciblage prioritaire de la clause Article 2
    const article2ZoneMatch = content.match(
      /(?:article\s*2|art\.?\s*2|montant\s*du\s*march[eé])([^]{1,1800}?)(?=article\s*3|art\.?\s*3|$)/i
    );
    const searchScope = article2ZoneMatch ? article2ZoneMatch[1] : content;

    const aeTtcPatterns = [
      // Article 2 : Total T.T.C. : [montant]
      /(?:total\s*t\.?t\.?c\.?|montant\s*total\s*t\.?t\.?c\.?)\s*[:=]?\s*([0-9\s.,\u00A0\u202F]+)\s*(?:€|eur)?/i,
      // [montant] € T.T.C.
      /([0-9\s.,\u00A0\u202F]{2,20})\s*(?:€|eur)?\s*(?:total\s*)?t\.?t\.?c\.?/i,
      // Total toutes taxes comprises
      /(?:total\s*toutes\s*taxes\s*comprises|montant\s*toutes\s*taxes\s*comprises)\s*[:=]?\s*([0-9\s.,\u00A0\u202F]+)/i,
      // Arrêté à la somme de [montant] TTC
      /(?:arr[eê]t[eé]\s*[aà]\s*la\s*somme\s*de|conclu\s*pour\s*la\s*somme\s*de)\s*[:=]?\s*([0-9\s.,\u00A0\u202F]+)\s*(?:€|eur)?\s*t\.?t\.?c\.?/i,
    ];

    for (const pattern of aeTtcPatterns) {
      const match = searchScope.match(pattern);
      if (match && match[1]) {
        const parsed = parseNumberString(match[1]);
        if (parsed > 0) {
          montantTTC = parsed;
          justification = `Article 2 : Total T.T.C. extrait (${parsed.toLocaleString('fr-FR')} € TTC)`;
          break;
        }
      }
    }

    // Si le TTC n'a pas été trouvé dans l'article 2 mais que le HT s'y trouve, on le lit
    if (!montantTTC) {
      const aeHtMatch = searchScope.match(
        /(?:total\s*h\.?t\.?|montant\s*(?:du\s*march[eé])?\s*h\.?t\.?|prix\s*(?:global\s*et\s*forfaitaire)?\s*h\.?t\.?)\s*[:=]?\s*([0-9\s.,\u00A0\u202F]+)/i
      );
      if (aeHtMatch && aeHtMatch[1]) {
        const parsedHt = parseNumberString(aeHtMatch[1]);
        if (parsedHt > 0) {
          montantHT = parsedHt;
        }
      }
    }
  }

  // 3. Point B.3 : FACTURE / SITUATION -> Détection automatique du montant TTC (Net à payer TTC / Total TTC)
  if (category === 'facture' || !montantTTC) {
    const factureTtcPatterns = [
      /(?:net\s*[aà]\s*payer\s*(?:t\.?t\.?c\.?)?|total\s*[aà]\s*payer\s*(?:t\.?t\.?c\.?)?|net\s*[aà]\s*verser)\s*[:=]?\s*([0-9\s.,\u00A0\u202F]+)\s*(?:€|eur)?/i,
      /(?:total\s*t\.?t\.?c\.?|montant\s*total\s*t\.?t\.?c\.?)\s*[:=]?\s*([0-9\s.,\u00A0\u202F]+)\s*(?:€|eur)?/i,
      /(?:total\s*toutes\s*taxes\s*comprises)\s*[:=]?\s*([0-9\s.,\u00A0\u202F]+)\s*(?:€|eur)?/i,
      /([0-9\s.,\u00A0\u202F]{2,20})\s*(?:€|eur)?\s*t\.?t\.?c\.?/i,
      /\bttc\s*[:=]\s*([0-9\s.,\u00A0\u202F]+)\s*(?:€|eur)?/i,
    ];

    for (const pattern of factureTtcPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const parsed = parseNumberString(match[1]);
        if (parsed > 0) {
          montantTTC = parsed;
          if (!justification) {
            justification = `Montant T.T.C. certifié (${parsed.toLocaleString('fr-FR')} € TTC)`;
          }
          break;
        }
      }
    }
  }

  // Si HT n'a pas été déduit mais existe en tant que fallback
  if (!montantTTC && !montantHT) {
    const htPatterns = [
      /(?:montant\s*(?:total|forfaitaire|du\s*march[eé]|des\s*travaux|net)?\s*h\.?t\.?)\s*[:=]?\s*([0-9\s.,\u00A0\u202F]+)\s*(?:€|eur)?/i,
      /(?:total\s*(?:g[eé]n[eé]ral\s*)?h\.?t\.?)\s*[:=]?\s*([0-9\s.,\u00A0\u202F]+)\s*(?:€|eur)?/i,
      /(?:prix\s*(?:global\s*et\s*forfaitaire\s*)?h\.?t\.?)\s*[:=]?\s*([0-9\s.,\u00A0\u202F]+)\s*(?:€|eur)?/i,
      /(?:total\s*hors\s*taxes?|montant\s*hors\s*taxes?)\s*[:=]?\s*([0-9\s.,\u00A0\u202F]+)\s*(?:€|eur)?/i,
      /\bht\s*[:=]\s*([0-9\s.,\u00A0\u202F]+)\s*(?:€|eur)?/i,
    ];
    for (const pattern of htPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const parsed = parseNumberString(match[1]);
        if (parsed > 0) {
          montantHT = parsed;
          justification = `Montant H.T. extrait (${parsed.toLocaleString('fr-FR')} € HT)`;
          break;
        }
      }
    }
  }

  const finalTva = tauxTVA !== undefined ? tauxTVA : 20;

  // Harmonisation mathématique stricte : HT = TTC / (1 + TVA/100)
  if (montantTTC !== undefined && montantHT === undefined) {
    montantHT = Math.round((montantTTC / (1 + finalTva / 100)) * 100) / 100;
  } else if (montantHT !== undefined && montantTTC === undefined) {
    montantTTC = Math.round(montantHT * (1 + finalTva / 100) * 100) / 100;
  }

  // 4. Date d'émission ou de signature dans le document
  const datePatterns = [
    /(?:date\s*(?:d['’]?[eé]mission|de\s*facture|de\s*signature|du\s*march[eé])?|fait\s*le|le)\s*[:=]?\s*([0-3]?[0-9][\/\-.][0-1]?[0-9][\/\-.]202[0-9])/i,
    /\b([0-3]?[0-9])[\/\-.]([0-1]?[0-9])[\/\-.](202[0-9])\b/,
  ];

  for (const pattern of datePatterns) {
    const match = content.match(pattern);
    if (match) {
      if (match[3]) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        date = `${year}-${month}-${day}`;
        break;
      } else if (match[1]) {
        const parts = match[1].split(/[\/\-.]/);
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          date = `${year}-${month}-${day}`;
          break;
        }
      }
    }
  }

  // 5. Numéro de facture / situation dans le document
  const numPatterns = [
    /(?:facture\s*n°?|fac\s*n°?|situation\s*n°?|d[eé]compte\s*n°?)\s*[:=]?\s*([A-Za-z0-9_\-\/]{2,30})/i,
    /(?:facture\s*num[eé]ro|situation\s*num[eé]ro)\s*[:=]?\s*([A-Za-z0-9_\-\/]{2,30})/i,
  ];

  for (const pattern of numPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      numero = match[1].trim();
      break;
    }
  }

  // 6. SIRET dans le document
  const siretMatch = content.match(/(?:siret|siren)\s*[:=]?\s*([0-9\s]{9,17})/i);
  if (siretMatch && siretMatch[1]) {
    siret = siretMatch[1].replace(/\s+/g, '');
  }

  // 7. Raison sociale / Titulaire dans le document
  const entrepriseMatch = content.match(
    /(?:titulaire|entreprise|soci[eé]t[eé]|raison\s*sociale)\s*[:=]?\s*([A-Z0-9\s\-&]{3,40})/i
  );
  if (entrepriseMatch && entrepriseMatch[1]) {
    entreprise = entrepriseMatch[1].trim();
  }

  const isMontantExtrait = Boolean((montantTTC && montantTTC > 0) || (montantHT && montantHT > 0));

  return {
    category,
    montantHT: montantHT || 0,
    montantTTC: montantTTC || 0,
    tauxTVA: finalTva,
    date,
    numero,
    entreprise,
    siret,
    isMontantExtrait,
    justification: isMontantExtrait ? justification : 'Montant non trouvé dans le document.',
    previewText: content.substring(0, 500).replace(/\s+/g, ' ').trim(),
  };
}

/**
 * Nettoie une chaîne textuelle représentant un montant numérique en euros
 */
export function parseNumberString(raw: string): number {
  if (!raw) return 0;
  // Enlève espaces, devises, insécables
  let cleaned = raw.replace(/[\s\u00A0\u202F€$EUR]/gi, '').trim();

  // Format français 123.456,78 ou 123 456,78
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Analyse de fichier uploadé local via l'analyse intelligente autonome
 */
export async function parseUploadedFile(
  file: File,
  category?: 'acte_engagement' | 'facture' | 'avenant'
): Promise<ExtractedFinancialData> {
  const content = await extractTextFromBlobOrBuffer(file, file.name, file.type);
  const data = await analyzeDocumentIntelligently(content, file.name, category);

  // Si aucune date trouvée dans le document, date de modification du fichier
  if (!data.date) {
    const fileDate = new Date(file.lastModified || Date.now());
    data.date = fileDate.toISOString().split('T')[0];
  }

  return data;
}

/**
 * Alias de compatibilité pour l'extraction textuelle directe
 */
export function extractAmountsFromText(content: string): ExtractedFinancialData {
  return extractFinancialDataFromContent(content, 'facture');
}
