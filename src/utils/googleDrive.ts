import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { ActeEngagement, Avenant, Chantier, CorpsDetat, Facture } from '../types/audit';
import { computeChantierMetrics, computeCorpsDetatMetrics } from './calculator';
import {
  analyzeDocumentIntelligently,
  detectDocumentCategory,
  extractFinancialDataFromContent,
  extractTextFromBlobOrBuffer,
} from './fileExtractor';

// Initialisation unique de Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

// Caching en mémoire et persistance du token Google Drive
const TOKEN_STORAGE_KEY = 'btp_gdrive_access_token';
const TOKEN_TIME_KEY = 'btp_gdrive_token_timestamp';

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const getStoredDriveToken = (): string | null => {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const timeStr = localStorage.getItem(TOKEN_TIME_KEY) || sessionStorage.getItem(TOKEN_TIME_KEY);
    if (token && timeStr) {
      const time = parseInt(timeStr, 10);
      // Validité conservée si moins de 50 minutes (tokens Google valides 1h)
      if (Date.now() - time < 50 * 60 * 1000) {
        return token;
      }
    }
  } catch (e) {
    console.warn('Erreur lecture token stocké:', e);
  }
  return null;
};

export const saveStoredDriveToken = (token: string) => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_TIME_KEY, Date.now().toString());
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    sessionStorage.setItem(TOKEN_TIME_KEY, Date.now().toString());
  } catch (e) {
    console.warn('Erreur sauvegarde token:', e);
  }
};

export const removeStoredDriveToken = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_TIME_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_TIME_KEY);
  } catch (e) {
    console.warn('Erreur suppression token:', e);
  }
};

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || getStoredDriveToken();
      if (token) {
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      removeStoredDriveToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Impossible d'obtenir le jeton d'accès Google Drive");
    }
    cachedAccessToken = credential.accessToken;
    saveStoredDriveToken(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erreur de connexion Google Drive:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken || getStoredDriveToken();
};

export const logoutGoogleDrive = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  removeStoredDriveToken();
};

// Interfaces pour l'explorateur Google Drive
export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  driveId?: string;
  sharedWithMe?: boolean;
}

export interface SharedDrive {
  id: string;
  name: string;
}

// Récupérer la liste des Drives Partagés (Shared Drives)
export const fetchSharedDrives = async (token: string): Promise<SharedDrive[]> => {
  try {
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/drives?pageSize=50',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      console.warn('Impossible de récupérer les drives partagés', res.statusText);
      return [];
    }
    const data = await res.json();
    return data.drives || [];
  } catch (err) {
    console.error('Erreur fetchSharedDrives:', err);
    return [];
  }
};

// Récupérer les dossiers selon le parent et le drive
export const fetchDriveFolders = async (
  token: string,
  options: {
    parentId?: string;
    driveId?: string;
    isSharedWithMe?: boolean;
  }
): Promise<DriveItem[]> => {
  const { parentId, driveId, isSharedWithMe } = options;

  let query = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";

  if (isSharedWithMe) {
    query += ' and sharedWithMe = true';
  } else if (parentId) {
    query += ` and '${parentId}' in parents`;
  } else if (driveId) {
    query += ` and '${driveId}' in parents`;
  } else {
    // Racine de Mon Drive
    query += " and 'root' in parents";
  }

  const params = new URLSearchParams({
    q: query,
    fields: 'files(id, name, mimeType, parents, driveId)',
    pageSize: '100',
    orderBy: 'folder, name',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  if (driveId) {
    params.append('corpora', 'drive');
    params.append('driveId', driveId);
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Erreur API Drive (${res.status})`);
  }

  const data = await res.json();
  const files: any[] = data.files || [];

  return files.map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    driveId: f.driveId,
  }));
};

// Recherche ciblée d'un dossier par nom dans Google Drive (supporte dossiers partagés et racine)
export const findDriveFolderByName = async (
  token: string,
  targetNamePattern: string
): Promise<DriveItem | null> => {
  try {
    const query = `mimeType = 'application/vnd.google-apps.folder' and trashed = false and name contains '${targetNamePattern.replace(/'/g, "\\'")}'`;
    const params = new URLSearchParams({
      q: query,
      fields: 'files(id, name, mimeType, parents, driveId)',
      pageSize: '20',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const files: any[] = data.files || [];
    const match = files.find(f => /^2\s*[-_]?\s*clients\s*en\s*cours/i.test(f.name.trim())) || files[0];
    if (match) {
      return {
        id: match.id,
        name: match.name,
        mimeType: match.mimeType,
        isFolder: true,
        driveId: match.driveId,
      };
    }
    return null;
  } catch (e) {
    console.error('Erreur recherche dossier Google Drive:', e);
    return null;
  }
};

/**
 * Télécharge le flux binaire d'un fichier depuis Google Drive API v3 (alt=media ou export)
 */
export const downloadDriveFileStream = async (
  token: string,
  fileId: string,
  mimeType?: string
): Promise<ArrayBuffer | null> => {
  try {
    // Si c'est un Google Sheet
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&supportsAllDrives=true`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      return await res.arrayBuffer();
    }
    // Si c'est un Google Doc
    if (mimeType === 'application/vnd.google-apps.document') {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain&supportsAllDrives=true`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      return await res.arrayBuffer();
    }
    // Fichier binaire standard (PDF, XLSX, etc.)
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch (err) {
    console.warn(`Erreur téléchargement flux Drive pour fichier ${fileId}:`, err);
    return null;
  }
};

// Récupérer l'arborescence selon les 4 ou 5 niveaux obligatoires :
// Racine > Chantier > "5 - corps d'état" > "3 - Marchés + Assurances" > [Phase optionnelle] > Artisan-Lot
export const importGoogleDriveProjectTree = async (
  token: string,
  rootFolderId: string,
  rootFolderName: string,
  moisTraitement: string,
  onProgress?: (status: string) => void
): Promise<Chantier[]> => {
  const listFolderChildren = async (folderId: string) => {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, description)',
      pageSize: '250',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Erreur Drive lors de la lecture du dossier ${folderId}`);
    }

    const data = await res.json();
    return (data.files || []) as Array<{
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      createdTime?: string;
      modifiedTime?: string;
      description?: string;
    }>;
  };

  // Helpers pour détecter la nomenclature stricte demandée :
  // Niveau 2 : "5 - corps d'état"
  const isCorpsDetatFolder = (name: string) =>
    /^5\s*[-_]?\s*corps\s*d['’]?[eé]tats?/i.test(name.trim());

  // Niveau 3 : "3 - Marchés + Assurances"
  const isMarchesFolder = (name: string) =>
    /^3\s*[-_]?\s*march[eé]s?\s*(?:\+|et|&)\s*assurances?/i.test(name.trim());

  // Niveau 4 : Découpage en phase de travaux (nom contenant le mot "phase")
  const isPhaseFolder = (name: string) =>
    /phase/i.test(name.trim());

  const rootChildren = await listFolderChildren(rootFolderId);
  const rootSubFolders = rootChildren.filter(
    f => f.mimeType === 'application/vnd.google-apps.folder'
  );

  // Déterminer les chantiers à parcourir
  let chantiersToProcess: Array<{ name: string; folderId: string }> = [];

  // Si le dossier sélectionné contient déjà directement "5 - corps d'état", c'est un chantier direct
  const hasDirectCorpsDetat = rootSubFolders.some(f => isCorpsDetatFolder(f.name));
  if (hasDirectCorpsDetat) {
    chantiersToProcess = [{ name: rootFolderName, folderId: rootFolderId }];
  } else if (rootSubFolders.length > 0) {
    // Cas standard : la racine contient chaque dossier chantier
    chantiersToProcess = rootSubFolders.map(f => ({ name: f.name, folderId: f.id }));
  } else {
    chantiersToProcess = [{ name: rootFolderName, folderId: rootFolderId }];
  }

  const resultChantiers: Chantier[] = [];
  let chIndex = 1;

  for (const chItem of chantiersToProcess) {
    const chantierId = `gdrive-ch-${chIndex++}`;
    const chantierChildren =
      chItem.folderId === rootFolderId ? rootChildren : await listFolderChildren(chItem.folderId);

    const chantierSubFolders = chantierChildren.filter(
      f => f.mimeType === 'application/vnd.google-apps.folder'
    );

    // NIVEAU 2 : Recherche obligatoire du dossier "5 - corps d'état"
    // Ne pas traiter les autres branches de l'arborescence !
    const folder5CorpsDetat = chantierSubFolders.find(f => isCorpsDetatFolder(f.name));

    if (!folder5CorpsDetat) {
      // Anomalie d'arborescence : absence du dossier "5 - corps d'état"
      const fakeLotMetrics = computeCorpsDetatMetrics(null, [], [], moisTraitement, false);
      const fakeCorps: CorpsDetat = {
        id: `${chantierId}-ano-arb`,
        chantierId,
        code: 'NON VÉRIFIÉ',
        name: "Arborescence non conforme : Dossier '5 - corps d'état' absent",
        folderPath: `Google Drive/${chItem.name}/[Anomalie: '5 - corps d'état' manquant]`,
        entreprise: 'Branche non traitée',
        arborescenceValide: false,
        acteEngagement: null,
        factures: [],
        avenants: [],
        metrics: fakeLotMetrics,
      };

      resultChantiers.push({
        id: chantierId,
        code: `GD-${chIndex - 1}`,
        name: chItem.name,
        folderPath: `Google Drive/${chItem.name}`,
        maitreOuvrage: 'Maître d’Ouvrage (Google Drive)',
        lieu: 'Site Chantier',
        dateDebut: new Date().toISOString().slice(0, 10),
        dateLivraisonPrevue: 'En cours',
        corpsDetats: [fakeCorps],
        metrics: computeChantierMetrics([fakeCorps]),
        hasArborescenceAnomaly: true,
      });
      continue;
    }

    // NIVEAU 3 : Recherche obligatoire du sous-dossier "3 - Marchés + Assurances"
    // Ne pas traiter les autres branches sous "5 - corps d'état" !
    const corpsDetatChildren = await listFolderChildren(folder5CorpsDetat.id);
    const corpsDetatSubFolders = corpsDetatChildren.filter(
      f => f.mimeType === 'application/vnd.google-apps.folder'
    );

    const folder3Marches = corpsDetatSubFolders.find(f => isMarchesFolder(f.name));

    if (!folder3Marches) {
      // Anomalie d'arborescence : absence du dossier "3 - Marchés + Assurances"
      const fakeLotMetrics = computeCorpsDetatMetrics(null, [], [], moisTraitement, false);
      const fakeCorps: CorpsDetat = {
        id: `${chantierId}-ano-mar`,
        chantierId,
        code: 'NON VÉRIFIÉ',
        name: "Arborescence non conforme : Dossier '3 - Marchés + Assurances' absent",
        folderPath: `Google Drive/${chItem.name}/${folder5CorpsDetat.name}/[Anomalie: '3 - Marchés + Assurances' manquant]`,
        entreprise: 'Branche non traitée',
        arborescenceValide: false,
        acteEngagement: null,
        factures: [],
        avenants: [],
        metrics: fakeLotMetrics,
      };

      resultChantiers.push({
        id: chantierId,
        code: `GD-${chIndex - 1}`,
        name: chItem.name,
        folderPath: `Google Drive/${chItem.name}`,
        maitreOuvrage: 'Maître d’Ouvrage (Google Drive)',
        lieu: 'Site Chantier',
        dateDebut: new Date().toISOString().slice(0, 10),
        dateLivraisonPrevue: 'En cours',
        corpsDetats: [fakeCorps],
        metrics: computeChantierMetrics([fakeCorps]),
        hasArborescenceAnomaly: true,
      });
      continue;
    }

    // NIVEAU 4 / 5 (Il n'y a jamais de niveau 6) :
    // Sous "3 - Marchés + Assurances", on trouve :
    // - SOIT un découpage en "phase" (nom contenant le mot "phase")
    // - SOIT directement le découpage en "artisan-lot" (nom contenant "lot" ou nom varié d'artisan).
    // L'absence de phase n'est PAS une anomalie (elle est optionnelle).
    // L'absence du niveau "artisan-lot" est considérée comme "sans acte d'engagement" (manque_ae).
    const marchesChildren = await listFolderChildren(folder3Marches.id);
    const marchesSubFolders = marchesChildren.filter(
      f => f.mimeType === 'application/vnd.google-apps.folder'
    );

    // Détection de présence de phases (dossiers contenant "phase")
    const phaseFolders = marchesSubFolders.filter(f => isPhaseFolder(f.name));
    const hasPhases = phaseFolders.length > 0;

    // Collecte des dossiers artisan-lot
    type LotTarget = {
      lotFolder?: { id: string; name: string };
      phaseName?: string;
      isMissingLotFolder?: boolean;
      containerFolderId?: string;
    };
    const targets: LotTarget[] = [];

    if (hasPhases) {
      // Arborescence à 5 niveaux : Chantier > 5 - corps d'état > 3 - Marchés + Assurances > Phase > Artisan-Lot
      for (const phFolder of phaseFolders) {
        const phChildren = await listFolderChildren(phFolder.id);
        const lotSubs = phChildren.filter(
          f => f.mimeType === 'application/vnd.google-apps.folder'
        );

        if (lotSubs.length > 0) {
          for (const lotSub of lotSubs) {
            targets.push({
              lotFolder: lotSub,
              phaseName: phFolder.name,
              isMissingLotFolder: false,
            });
          }
        } else {
          // Phase sans sous-dossier artisan-lot : considéré comme "sans acte d'engagement"
          targets.push({
            phaseName: phFolder.name,
            isMissingLotFolder: true,
            containerFolderId: phFolder.id,
          });
        }
      }
    } else {
      // Arborescence à 4 niveaux : Chantier > 5 - corps d'état > 3 - Marchés + Assurances > Artisan-Lot
      if (marchesSubFolders.length > 0) {
        for (const lotSub of marchesSubFolders) {
          targets.push({
            lotFolder: lotSub,
            phaseName: undefined,
            isMissingLotFolder: false,
          });
        }
      } else {
        // "3 - Marchés + Assurances" sans sous-dossier artisan-lot :
        // considéré comme "sans acte d'engagement"
        targets.push({
          phaseName: undefined,
          isMissingLotFolder: true,
          containerFolderId: folder3Marches.id,
        });
      }
    }

    // Traitement de chaque dossier artisan-lot (ou lot sans dossier d'artisan)
    const corpsDetats: CorpsDetat[] = [];
    let lotIndex = 1;

    for (const target of targets) {
      const { lotFolder, phaseName, isMissingLotFolder, containerFolderId } = target;
      const lotId = `${chantierId}-lot-${lotIndex++}`;

      // CAS 1 : Absence du niveau artisan-lot -> Considéré comme "sans acte d'engagement"
      if (isMissingLotFolder || !lotFolder) {
        // On vérifie s'il y a des fichiers dans le dossier conteneur
        const containerFiles = containerFolderId
          ? (await listFolderChildren(containerFolderId)).filter(
              f => f.mimeType !== 'application/vnd.google-apps.folder'
            )
          : [];

        const factures: Facture[] = [];
        for (const file of containerFiles) {
          const cat = detectDocumentCategory(file.name, file.name);
          if (cat === 'facture' || /facture|situation|fac-|decompte/i.test(file.name)) {
            if (onProgress) onProgress(`Lecture flux : ${file.name}...`);
            let contentText = '';
            const streamBuffer = await downloadDriveFileStream(token, file.id, file.mimeType);
            if (streamBuffer) {
              contentText = await extractTextFromBlobOrBuffer(streamBuffer, file.name, file.mimeType);
            }
            const extracted = await analyzeDocumentIntelligently(contentText, file.name, 'facture');
            const dateEmission =
              extracted.date ||
              (file.createdTime ? file.createdTime.slice(0, 10) : new Date().toISOString().slice(0, 10));
            const ttc = extracted.montantTTC || 0;
            const tva = extracted.tauxTVA || 20;
            const ht = extracted.montantHT || (ttc > 0 ? Math.round((ttc / (1 + tva / 100)) * 100) / 100 : 0);

            factures.push({
              id: `f-${file.id}`,
              fileName: file.name,
              filePath: `Google Drive/${chItem.name}/${folder5CorpsDetat.name}/${folder3Marches.name}/${file.name}`,
              numeroFacture: extracted.numero || `FAC-${factures.length + 1}`,
              situationNumero: extracted.numero?.startsWith('Sit') ? extracted.numero : `Situation N°${factures.length + 1}`,
              dateEmission,
              montantHT: ht,
              tauxTVA: tva,
              montantTTC: ttc,
              retenueGarantieHT: 0,
              statutPaiement: 'validee',
              rawContent: contentText ? contentText.slice(0, 1000) : `Fichier Drive: ${file.name}`,
              isAiParsed: extracted.isMontantExtrait,
              justification: extracted.justification,
            });
          }
        }

        // L'absence du niveau artisan-lot est considérée "Lot absent" (lot_absent)
        const metrics = computeCorpsDetatMetrics(
          null, // Pas d'acte d'engagement
          factures,
          [],
          moisTraitement,
          true,
          true // isLotAbsent = true (dossier lot absent de l'arborescence)
        );

        corpsDetats.push({
          id: lotId,
          chantierId,
          code: `LOT ${lotIndex - 1 < 10 ? '0' : ''}${lotIndex - 1}`,
          name: phaseName
            ? `[${phaseName}] Dossier artisan-lot absent`
            : "Dossier artisan-lot absent",
          folderPath: phaseName
            ? `Google Drive/${chItem.name}/${folder5CorpsDetat.name}/${folder3Marches.name}/${phaseName}`
            : `Google Drive/${chItem.name}/${folder5CorpsDetat.name}/${folder3Marches.name}`,
          entreprise: "Sous-dossier artisan-lot non créé dans l'arborescence",
          phase: phaseName,
          arborescenceValide: true,
          acteEngagement: null,
          factures,
          avenants: [],
          metrics,
        });
        continue;
      }

      // CAS 2 : Présence normale du niveau artisan-lot (soit en Niveau 4 sans phase, soit en Niveau 5 avec phase)
      const lotChildren = await listFolderChildren(lotFolder.id);

      // Si le lot contient des sous-dossiers internes (ex: "Factures"), on explore aussi ses fichiers
      let allLotFiles = [...lotChildren];
      const subFacturesFolder = lotChildren.find(
        f =>
          f.mimeType === 'application/vnd.google-apps.folder' &&
          /facture|situation/i.test(f.name)
      );
      if (subFacturesFolder) {
        const facturesChildren = await listFolderChildren(subFacturesFolder.id);
        allLotFiles.push(...facturesChildren);
      }

      const documentFiles = allLotFiles.filter(
        f => f.mimeType !== 'application/vnd.google-apps.folder'
      );

      let acteEngagement: ActeEngagement | null = null;
      const factures: Facture[] = [];
      const avenants: Avenant[] = [];

      const fullLotPath = phaseName
        ? `Google Drive/${chItem.name}/${folder5CorpsDetat.name}/${folder3Marches.name}/${phaseName}/${lotFolder.name}`
        : `Google Drive/${chItem.name}/${folder5CorpsDetat.name}/${folder3Marches.name}/${lotFolder.name}`;

      for (const file of documentFiles) {
        const category = detectDocumentCategory(file.name, file.name);
        if (category === 'autre') {
          // Document non comptable exclu
          continue;
        }

        if (onProgress) {
          onProgress(`Lecture du flux : ${file.name} (${lotFolder.name})...`);
        }

        let contentText = '';
        const streamBuffer = await downloadDriveFileStream(token, file.id, file.mimeType);
        if (streamBuffer) {
          contentText = await extractTextFromBlobOrBuffer(streamBuffer, file.name, file.mimeType);
        }

        // Analyse intelligente sémantique du contenu textuel interne du document
        const extracted = await analyzeDocumentIntelligently(contentText, file.name, category);

        const dateEmission =
          extracted.date ||
          (file.createdTime ? file.createdTime.slice(0, 10) : new Date().toISOString().slice(0, 10));

        const ttc = extracted.montantTTC || 0;
        const tva = extracted.tauxTVA || 20;
        const ht = extracted.montantHT || (ttc > 0 ? Math.round((ttc / (1 + tva / 100)) * 100) / 100 : 0);

        if ((extracted.category === 'acte_engagement' || category === 'acte_engagement') && !acteEngagement) {
          acteEngagement = {
            id: `ae-${file.id}`,
            fileName: file.name,
            filePath: `${fullLotPath}/${file.name}`,
            entrepriseTitulaire:
              extracted.entreprise ||
              lotFolder.name.replace(/^Lot[_\s\d-]+/i, '').trim() ||
              lotFolder.name,
            siret: extracted.siret,
            dateSignature: dateEmission,
            montantHT: ht,
            tauxTVA: tva,
            montantTTC: ttc,
            retenueGarantiePct: 0,
            rawContent: contentText ? contentText.slice(0, 1000) : `Document Google Drive ID: ${file.id}\nFichier: ${file.name}`,
            isAiParsed: extracted.isMontantExtrait,
            justification: extracted.justification,
          };
        } else if (extracted.category === 'avenant' || category === 'avenant') {
          avenants.push({
            id: `av-${file.id}`,
            numero: extracted.numero || `Avenant ${avenants.length + 1}`,
            date: dateEmission,
            objet: file.name.replace(/\.[^/.]+$/, ''),
            montantHT: ht,
            statut: 'valide',
          });
        } else if (
          extracted.category === 'facture' ||
          category === 'facture' ||
          /facture|situation|fac-|decompte/i.test(file.name)
        ) {
          factures.push({
            id: `f-${file.id}`,
            fileName: file.name,
            filePath: `${fullLotPath}/${file.name}`,
            numeroFacture: extracted.numero || `FAC-${factures.length + 1}`,
            situationNumero: extracted.numero?.startsWith('Sit') ? extracted.numero : `Situation N°${factures.length + 1}`,
            dateEmission,
            montantHT: ht,
            tauxTVA: tva,
            montantTTC: ttc,
            retenueGarantieHT: 0, // Client n'applique pas la garantie légale de 5%
            statutPaiement: 'validee',
            rawContent: contentText ? contentText.slice(0, 1000) : `Fichier Drive: ${file.name}\nCréé le: ${file.createdTime}`,
            isAiParsed: extracted.isMontantExtrait,
            justification: extracted.justification,
          });
        }
      }

      // Trier factures par date
      factures.sort((a, b) => (a.dateEmission || '').localeCompare(b.dateEmission || ''));

      // Calcul des métriques strictes :
      // Si acte manquant OU facture manquante -> aucun contrôle budgétaire n'est à faire
      const metrics = computeCorpsDetatMetrics(
        acteEngagement,
        factures,
        avenants,
        moisTraitement,
        true
      );

      // Nom d'affichage de l'artisan ou du lot
      const isNamedLot = /^lot/i.test(lotFolder.name);
      const codeLot = isNamedLot
        ? lotFolder.name.slice(0, 8).toUpperCase()
        : `LOT ${lotIndex - 1 < 10 ? '0' : ''}${lotIndex - 1}`;
      const nameLot = isNamedLot
        ? lotFolder.name.replace(/^Lot[_\s\d-]+/i, '').trim() || lotFolder.name
        : lotFolder.name;
      const entrepriseName =
        acteEngagement?.entrepriseTitulaire ||
        (isNamedLot ? nameLot : lotFolder.name) ||
        'Artisan / Entreprise';

      corpsDetats.push({
        id: lotId,
        chantierId,
        code: codeLot,
        name: phaseName ? `[${phaseName}] ${nameLot}` : nameLot,
        folderPath: fullLotPath,
        entreprise: entrepriseName,
        phase: phaseName,
        arborescenceValide: true,
        acteEngagement,
        factures,
        avenants,
        metrics,
      });
    }

    const chantierMetrics = computeChantierMetrics(corpsDetats);

    resultChantiers.push({
      id: chantierId,
      code: `GD-${chIndex - 1}`,
      name: chItem.name,
      folderPath: `Google Drive/${chItem.name}`,
      maitreOuvrage: 'Maître d’Ouvrage (Google Drive)',
      lieu: 'Site Chantier',
      dateDebut: new Date().toISOString().slice(0, 10),
      dateLivraisonPrevue: 'En cours',
      corpsDetats,
      metrics: chantierMetrics,
    });
  }

  return resultChantiers;
};
