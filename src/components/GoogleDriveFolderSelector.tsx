import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  Users,
  HardDrive,
  Share2,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LogOut,
  FolderTree,
  Search,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initDriveAuth,
  signInWithGoogleDrive,
  logoutGoogleDrive,
  fetchDriveFolders,
  fetchSharedDrives,
  findDriveFolderByName,
  importGoogleDriveProjectTree,
  DriveItem,
  SharedDrive,
  getDriveAccessToken
} from '../utils/googleDrive';
import { Chantier } from '../types/audit';
import { formatMoisFr } from '../utils/calculator';

interface GoogleDriveFolderSelectorProps {
  moisTraitement: string;
  onChantiersLoaded: (chantiers: Chantier[]) => void;
  selectedFolderName?: string;
}

export const GoogleDriveFolderSelector: React.FC<GoogleDriveFolderSelectorProps> = ({
  moisTraitement,
  onChantiersLoaded,
  selectedFolderName,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Vue du navigateur Drive : "shared_with_me" ("Partagés avec moi") par défaut
  const [activeDriveSource, setActiveDriveSource] = useState<'my_drive' | 'shared_drives' | 'shared_with_me'>('shared_with_me');
  const [sharedDrives, setSharedDrives] = useState<SharedDrive[]>([]);
  const [selectedSharedDriveId, setSelectedSharedDriveId] = useState<string | null>(null);

  // Navigation dans les dossiers : racine positionnée par défaut sur "Partagés avec moi"
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: 'Partagés avec moi' },
  ]);
  const [folderItems, setFolderItems] = useState<DriveItem[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [folderSearch, setFolderSearch] = useState('');

  // Dossier sélectionné pour l'import et statut de détection automatique de "2- Clients en cours"
  const [pickedFolder, setPickedFolder] = useState<{ id: string; name: string } | null>(null);
  const [isDefaultDetected, setIsDefaultDetected] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Initialisation Auth avec persistance automatique de session
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        setAuthError(null);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Chargement des dossiers lorsque le token, la source ou le dossier parent change
  useEffect(() => {
    if (!token) return;

    const loadFolders = async () => {
      setIsLoadingFolders(true);
      setImportError(null);
      try {
        if (activeDriveSource === 'shared_drives' && !selectedSharedDriveId) {
          // Charger la liste des Drives partagés
          const drives = await fetchSharedDrives(token);
          setSharedDrives(drives);
          setFolderItems([]);
        } else {
          // Charger les dossiers
          const items = await fetchDriveFolders(token, {
            parentId: currentFolderId || undefined,
            driveId: selectedSharedDriveId || undefined,
            isSharedWithMe: activeDriveSource === 'shared_with_me' && !currentFolderId,
          });

          // Positionnement automatique par défaut sur "2- Clients en cours" dans "Partagés avec moi"
          if (activeDriveSource === 'shared_with_me' && !currentFolderId) {
            let defaultFolder = items.find(f => /^2\s*[-_]?\s*clients\s*en\s*cours/i.test(f.name.trim()));
            if (!defaultFolder) {
              const directFound = await findDriveFolderByName(token, 'Clients en cours');
              if (directFound) {
                defaultFolder = directFound;
                if (!items.some(f => f.id === directFound.id)) {
                  items.unshift(directFound);
                }
              }
            }

            if (defaultFolder) {
              setPickedFolder({ id: defaultFolder.id, name: defaultFolder.name });
              setIsDefaultDetected(true);
            }
          }

          setFolderItems(items);
        }
      } catch (err: any) {
        console.error('Erreur chargement dossiers Drive:', err);
        setImportError(err.message || 'Impossible de lire les dossiers Google Drive.');
      } finally {
        setIsLoadingFolders(false);
      }
    };

    loadFolders();
  }, [token, activeDriveSource, selectedSharedDriveId, currentFolderId]);

  // Connexion Google avec redirection par défaut sur "Partagés avec moi" et "2- Clients en cours"
  const handleConnect = async () => {
    setIsConnecting(true);
    setAuthError(null);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setActiveDriveSource('shared_with_me');
        setCurrentFolderId(null);
        setSelectedSharedDriveId(null);
        setBreadcrumbs([{ id: null, name: 'Partagés avec moi' }]);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'La connexion à Google Drive a échoué.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Déconnexion
  const handleDisconnect = async () => {
    await logoutGoogleDrive();
    setUser(null);
    setToken(null);
    setFolderItems([]);
    setPickedFolder(null);
  };

  // Changer de source (Mon Drive, Partagés, Drives partagés)
  const handleSwitchSource = (source: 'my_drive' | 'shared_drives' | 'shared_with_me') => {
    setActiveDriveSource(source);
    setCurrentFolderId(null);
    setSelectedSharedDriveId(null);
    setPickedFolder(null);
    setFolderSearch('');

    const baseName =
      source === 'my_drive'
        ? 'Mon Drive'
        : source === 'shared_drives'
        ? 'Drives Partagés'
        : 'Partagés avec moi';
    setBreadcrumbs([{ id: null, name: baseName }]);
  };

  // Entrer dans un drive partagé
  const handleSelectSharedDrive = (drive: SharedDrive) => {
    setSelectedSharedDriveId(drive.id);
    setCurrentFolderId(null);
    setBreadcrumbs([
      { id: null, name: 'Drives Partagés' },
      { id: drive.id, name: drive.name },
    ]);
  };

  // Ouvrir un dossier (double-clic ou flèche)
  const handleOpenFolder = (folder: DriveItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setPickedFolder({ id: folder.id, name: folder.name });
  };

  // Naviguer via le fil d'Ariane
  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    if (index === 0) {
      setCurrentFolderId(null);
      if (activeDriveSource === 'shared_drives') {
        setSelectedSharedDriveId(null);
      }
      setBreadcrumbs([target]);
    } else {
      setCurrentFolderId(target.id);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    }
    setPickedFolder(target.id ? { id: target.id, name: target.name } : null);
  };

  // Lancer l'importation de l'arborescence à partir du dossier sélectionné
  const handleImportSelectedFolder = async () => {
    if (!token) return;
    const target = pickedFolder || (currentFolderId ? { id: currentFolderId, name: breadcrumbs[breadcrumbs.length - 1].name } : null);
    if (!target) {
      setImportError('Veuillez sélectionner un dossier à importer.');
      return;
    }

    setIsImporting(true);
    setImportStatus('Exploration de l’arborescence Google Drive en cours...');
    setImportError(null);

    try {
      const chantiers = await importGoogleDriveProjectTree(
        token,
        target.id,
        target.name,
        moisTraitement,
        (msg) => setImportStatus(msg)
      );

      if (chantiers.length === 0 || chantiers.every(c => c.corpsDetats.length === 0)) {
        setImportError(
          `Le dossier Google Drive "${target.name}" ne contient aucun sous-dossier de lots ou de chantiers identifiable.`
        );
        setIsImporting(false);
        setImportStatus(null);
        return;
      }

      setImportStatus(
        `Arborescence importée avec succès : ${chantiers.length} chantier(s) et ${chantiers.reduce((acc, c) => acc + c.corpsDetats.length, 0)} corps d'état détectés.`
      );
      onChantiersLoaded(chantiers);
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || 'Erreur lors du traitement de l’arborescence Google Drive.');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredFolders = folderItems.filter(f =>
    f.name.toLowerCase().includes(folderSearch.toLowerCase())
  );

  const isDefaultTargetSelected =
    pickedFolder && /^2\s*[-_]?\s*clients\s*en\s*cours/i.test(pickedFolder.name.trim());

  return (
    <div className="space-y-4">
      {/* 1. État de Connexion Google Drive avec connexion automatique par défaut */}
      <div className="p-4 bg-slate-50 border border-neutral-200 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-2xs">
              <svg className="w-5 h-5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.25z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.25z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
            </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs">
                    Connexion Google Drive (avec support des dossiers partagés)
                  </span>
                  {user ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Session active</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                      <span>Non connecté</span>
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 mt-0.5">
                  {user ? (
                    <p>
                      <span>Connecté avec vos identifiants Google : </span>
                      <strong className="font-semibold text-slate-800">
                        <span>{user.email || user.displayName || 'Compte Google'}</span>
                      </strong>
                      <span>. Positionné par défaut sur </span>
                      <em className="italic">Partagés avec moi / 2- Clients en cours</em>
                      <span>.</span>
                    </p>
                  ) : (
                    <p>
                      <span>Connectez vos identifiants Google pour vous positionner automatiquement sur votre dossier racine « 2- Clients en cours » dans vos dossiers partagés.</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bouton Connexion / Déconnexion */}
            <div className="shrink-0">
              {user ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>Déconnecter Google</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>{isConnecting ? 'Connexion en cours...' : 'Se connecter & Positionner « 2- Clients en cours »'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Bannière de confirmation de positionnement automatique par défaut */}
          {user && (isDefaultTargetSelected || isDefaultDetected) ? (
            <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="text-slate-700">
                  <span>Positionnement par défaut actif : Dossier </span>
                  <strong>« <span>{pickedFolder?.name || '2- Clients en cours'}</span> »</strong>
                  <span> sous </span>
                  <strong>Partagés avec moi</strong>
                  <span>.</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleImportSelectedFolder}
                disabled={isImporting}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                {isImporting ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="block">Analyse en cours...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Charger directement « </span>
                    <span className="inline-block font-semibold">{pickedFolder?.name || '2- Clients en cours'}</span>
                    <span> »</span>
                  </span>
                )}
              </button>
            </div>
          ) : null}
        </div>

        {authError ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="block flex-1">{authError}</span>
          </div>
        ) : null}

      {/* 2. Navigateur et Explorateur de Dossiers Google Drive */}
      {user ? (
        <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
          {/* Onglets de source Drive (Mon Drive, Drives Partagés, Partagés avec moi) */}
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50/80 px-4 py-2">
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => handleSwitchSource('my_drive')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeDriveSource === 'my_drive'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Mon Drive</span>
              </button>

              <button
                onClick={() => handleSwitchSource('shared_drives')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeDriveSource === 'shared_drives'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Drives partagés (Équipe)</span>
              </button>

              <button
                onClick={() => handleSwitchSource('shared_with_me')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeDriveSource === 'shared_with_me'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Dossiers partagés avec moi</span>
              </button>
            </div>

            {/* Champ de recherche rapide */}
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer les dossiers..."
                value={folderSearch}
                onChange={e => setFolderSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Fil d'Ariane de navigation */}
          <div className="px-4 py-2 border-b border-neutral-100 bg-white flex items-center gap-1 text-xs text-slate-600 overflow-x-auto">
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={b.id ?? `root-${idx}`}>
                {idx > 0 ? <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" /> : null}
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`hover:text-slate-900 font-medium whitespace-nowrap ${
                    idx === breadcrumbs.length - 1 ? 'text-slate-900 font-bold' : ''
                  }`}
                >
                  <span>{b.name}</span>
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Liste des dossiers */}
          <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100 p-2">
            {isLoadingFolders ? (
              <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400 shrink-0" />
                <span>Chargement des dossiers depuis Google Drive...</span>
              </div>
            ) : activeDriveSource === 'shared_drives' && !selectedSharedDriveId ? (
              // Affichage des drives partagés
              sharedDrives.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <Users className="w-6 h-6 mx-auto text-slate-300 mb-1.5" />
                  <p className="font-medium text-slate-700">
                    <span>Aucun Drive Partagé trouvé</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    <span>Votre compte n'est membre d'aucun Shared Drive Google Workspace d'entreprise.</span>
                  </p>
                </div>
              ) : (
                sharedDrives.map(drive => (
                  <div
                    key={drive.id}
                    onClick={() => handleSelectSharedDrive(drive)}
                    className="p-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-semibold text-slate-900 truncate">
                        <span>{drive.name}</span>
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                ))
              )
            ) : filteredFolders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Folder className="w-6 h-6 mx-auto text-slate-300 mb-1.5" />
                <p className="font-medium text-slate-700">
                  <span>Aucun sous-dossier trouvé à ce niveau</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  <span>Vous pouvez sélectionner le dossier actuel ci-dessous comme arborescence de chantier.</span>
                </p>
              </div>
            ) : (
              filteredFolders.map(item => {
                const isSelected = pickedFolder?.id === item.id;
                const isDefaultItem = /^2\s*[-_]?\s*clients\s*en\s*cours/i.test(item.name.trim());
                return (
                  <div
                    key={item.id}
                    onClick={() => setPickedFolder({ id: item.id, name: item.name })}
                    onDoubleClick={() => handleOpenFolder(item)}
                    className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Folder
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-amber-400' : 'text-amber-500'
                        }`}
                      />
                      <span className="font-medium truncate">
                        <span>{item.name}</span>
                      </span>
                      {isDefaultItem ? (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            isSelected
                              ? 'bg-emerald-400 text-slate-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <span>Racine par défaut</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenFolder(item);
                        }}
                        className={`px-2 py-1 text-[11px] rounded transition-colors ${
                          isSelected
                            ? 'bg-slate-800 hover:bg-slate-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>Ouvrir &gt;</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Barre d'action de sélection du dossier */}
          <div className="p-4 border-t border-neutral-200 bg-neutral-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <span className="text-slate-500 block text-[11px]">
                <span>Dossier cible sélectionné :</span>
              </span>
              <p className="font-bold text-slate-900 truncate">
                <span className="block">{pickedFolder ? pickedFolder.name : breadcrumbs[breadcrumbs.length - 1].name}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleImportSelectedFolder}
              disabled={isImporting || !user}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              {isImporting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="block">Traitement Drive en cours...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FolderTree className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="block">Sélectionner ce dossier Google Drive</span>
                </span>
              )}
            </button>
          </div>
        </div>
      ) : null}

      {/* Messages de statut & erreurs */}
      {importStatus ? (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span className="block flex-1">{importStatus}</span>
        </div>
      ) : null}

      {importError ? (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="block flex-1">{importError}</span>
        </div>
      ) : null}
    </div>
  );
};
