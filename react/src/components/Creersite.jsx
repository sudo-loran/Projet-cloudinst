import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { createSite, saveFichier, deleteSite, publishSite, fetchContenuSite, getSiteUrl, copierLien, fetchFichiersSite } from '../api';

function CreerSite({ sites = [], onAjouterSite, onSupprimerSite, onModifierSite, theme = 'sombre', onChangerTheme }) {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const estSombre = theme === 'sombre';

  const [nomSite, setNomSite] = useState('');
  const [visibilite, setVisibilite] = useState('prive');
  const [fichiers, setFichiers] = useState({
    'index.html': `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mon Site</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello World !</h1>
  <p>Bienvenue sur mon site CloudInst.</p>
  <script src="script.js"></script>
</body>
</html>`,
    'style.css': `body { font-family: sans-serif; padding: 20px; background: #121212; color: #fff; }
h1 { color: #00bcd4; }`,
    'script.js': `console.log("Site chargé !");`
  });
  const [fichierActif, setFichierActif] = useState('index.html');
  const [importSummary, setImportSummary] = useState(null);
  const [messageNonStatiques, setMessageNonStatiques] = useState('');

  const [modeRedaction, setModeRedaction] = useState(false);
  const [erreur, setErreur] = useState('');
  const [siteAafficher, setSiteAafficher] = useState(null);
  const [siteEnEdition, setSiteEnEdition] = useState(null);
  const [chargement, setChargement] = useState(false);

  const genererApercuComplet = (htmlPrincipal, tousLesFichiers) => {
    if (!htmlPrincipal) return '';
    let htmlFinal = htmlPrincipal;
    htmlFinal = htmlFinal.replace(/<link[^>]*href="([^"]+\.css)"[^>]*>/g, (match, url) => {
      const cssContent = tousLesFichiers[url];
      return cssContent ? `<style>${cssContent}</style>` : match;
    });
    htmlFinal = htmlFinal.replace(/<script[^>]*src="([^"]+\.js)"[^>]*><\/script>/g, (match, url) => {
      const jsContent = tousLesFichiers[url];
      return jsContent ? `<script>${jsContent}</script>` : match;
    });
    return htmlFinal;
  };

  const handleSingleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setFichiers((prev) => ({ ...prev, [file.name]: evt.target.result }));
        setFichierActif(file.name);
        setModeRedaction(true);
      };
      reader.readAsText(file);
      e.target.value = null;
    }
  };

  const handleImportDossier = async (e) => {
    const fileList = Array.from(e.target.files);
    if (fileList.length === 0) return;

    setChargement(true);
    let totalSize = 0;
    const importedFichiers = {};
    const ignoredFiles = [];
    const allowedExtensions = ['.html', '.css', '.js', '.txt', '.json'];

    for (const file of fileList) {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        ignoredFiles.push(file.name);
        continue;
      }

      const path = file.webkitRelativePath || file.name;

      try {
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result);
          reader.onerror = () => reject(new Error("Erreur de lecture"));
          reader.readAsText(file);
        });
        importedFichiers[path] = content;
        totalSize += file.size;
      } catch (error) {
        ignoredFiles.push(file.name);
      }
    }

    if (Object.keys(importedFichiers).length === 0) {
      setChargement(false);
      alert("Aucun fichier texte (HTML/CSS/JS) trouvé dans ce dossier.");
      return;
    }

    if (ignoredFiles.length > 0) {
      setMessageNonStatiques(`Les fichiers suivants ont été ignorés car ils ne sont pas statiques (textes) : ${ignoredFiles.slice(0, 5).join(', ')}${ignoredFiles.length > 5 ? '...' : ''}`);
      setTimeout(() => setMessageNonStatiques(''), 5000);
    } else {
      setMessageNonStatiques('');
    }

    setFichiers(prev => ({ ...prev, ...importedFichiers }));
    setImportSummary({
      count: Object.keys(importedFichiers).length,
      sizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    });
    setFichierActif(Object.keys(importedFichiers)[0] || 'index.html');
    setModeRedaction(true);
    setChargement(false);
    e.target.value = null;
  };

  const handleCreerFichier = () => {
    const nom = window.prompt("Nom du fichier (ex: page.html) :");
    if (!nom) return;
    if (fichiers[nom]) {
      alert("Ce fichier existe déjà !");
      return;
    }
    setFichiers(prev => ({ ...prev, [nom]: '' }));
    setFichierActif(nom);
  };

  const handleCreerDossier = () => {
    const nom = window.prompt("Nom du dossier (ex: styles) :");
    if (!nom) return;
    const cheminDossier = nom.endsWith('/') ? nom : nom + '/';
    const fichierTest = cheminDossier + 'index.html';
    if (fichiers[fichierTest]) {
      alert("Ce dossier existe déjà ou contient un index.html !");
      return;
    }
    setFichiers(prev => ({ ...prev, [fichierTest]: '' }));
    setFichierActif(fichierTest);
  };

  const handleSupprimerElement = (chemin) => {
    const estDossier = chemin.endsWith('/');
    const nomPourConfirmation = estDossier ? `dossier "${chemin.slice(0, -1)}"` : `fichier "${chemin}"`;
    
    if (!window.confirm(`Voulez-vous vraiment supprimer le ${nomPourConfirmation} ?`)) return;

    if (estDossier) {
      const nouveauxFichiers = {};
      Object.keys(fichiers).forEach(key => {
        if (!key.startsWith(chemin)) {
          nouveauxFichiers[key] = fichiers[key];
        }
      });
      setFichiers(nouveauxFichiers);
      if (fichierActif.startsWith(chemin)) {
        setFichierActif(Object.keys(nouveauxFichiers)[0] || '');
      }
    } else {
      const nouveauxFichiers = { ...fichiers };
      delete nouveauxFichiers[chemin];
      setFichiers(nouveauxFichiers);
      if (fichierActif === chemin) {
        setFichierActif(Object.keys(nouveauxFichiers)[0] || '');
      }
    }
  };

  const handleRenommerElement = (chemin) => {
    const estDossier = chemin.endsWith('/');
    const ancienNom = estDossier ? chemin.slice(0, -1) : chemin;
    const nouveauNom = window.prompt(`Nouveau nom pour "${ancienNom}" :`, ancienNom);
    
    if (!nouveauNom || nouveauNom === ancienNom) return;

    if (estDossier) {
      const nouveauCheminDossier = nouveauNom.endsWith('/') ? nouveauNom : nouveauNom + '/';
      const nouveauxFichiers = {};
      Object.keys(fichiers).forEach(key => {
        if (key.startsWith(chemin)) {
          const nouvelleCle = key.replace(chemin, nouveauCheminDossier);
          nouveauxFichiers[nouvelleCle] = fichiers[key];
        } else {
          nouveauxFichiers[key] = fichiers[key];
        }
      });
      setFichiers(nouveauxFichiers);
      if (fichierActif.startsWith(chemin)) {
        setFichierActif(fichierActif.replace(chemin, nouveauCheminDossier));
      }
    } else {
      const nouveauxFichiers = { ...fichiers };
      const contenu = nouveauxFichiers[chemin];
      delete nouveauxFichiers[chemin];
      nouveauxFichiers[nouveauNom] = contenu;
      setFichiers(nouveauxFichiers);
      if (fichierActif === chemin) {
        setFichierActif(nouveauNom);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.menu-wrapper')) {
        document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleMenu = (btn) => {
    const menu = btn.nextElementSibling;
    document.querySelectorAll('.dropdown-menu.open').forEach(m => {
      if (m !== menu) m.classList.remove('open');
    });
    menu.classList.toggle('open');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');
    setChargement(true);

    if (!nomSite.trim()) {
      setErreur('Veuillez donner un nom à votre projet.');
      setChargement(false);
      return;
    }

    const sousDomaine = nomSite
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');

    try {
      const resSite = await createSite(sousDomaine, nomSite);

      if (resSite.erreur) {
        setErreur(resSite.erreur);
        setChargement(false);
        return;
      }

      const entries = Object.entries(fichiers);
      for (const [filename, contenu] of entries) {
        if (contenu === '' && filename.endsWith('index.html')) continue;
        
        const resFichier = await saveFichier(resSite.id, filename, contenu);
        if (resFichier.erreur) {
          setErreur(resFichier.erreur);
          setChargement(false);
          return;
        }
      }

      if (onAjouterSite) {
        onAjouterSite(resSite);
      }

      setNomSite('');
      setImportSummary(null);
      setErreur('');
      setModeRedaction(false);

    } catch (error) {
      setErreur("Erreur lors de la création du site.");
    } finally {
      setChargement(false);
    }
  };

  const handleDeleteSite = async (siteId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce site ?')) {
      try {
        const res = await deleteSite(siteId);
        if (res.message) {
          onSupprimerSite(siteId);
        } else {
          setErreur(res.erreur || "Erreur lors de la suppression");
        }
      } catch (error) {
        setErreur("Impossible de supprimer le site");
      }
    }
  };

  const handlePublishSite = async (site) => {
    try {
      const res = await publishSite(site.id);
      if (res.publication !== undefined) {
        const siteMisAJour = { ...site, publication: res.publication };
        onModifierSite(siteMisAJour);
      } else {
        setErreur(res.erreur || "Erreur lors de la publication");
      }
    } catch (error) {
      setErreur("Impossible de modifier la visibilité");
    }
  };

  const handleEditSite = async (site) => {
    setChargement(true);
    try {
      const data = await fetchFichiersSite(site.id);
      const fichiersDict = {};
      if (data.fichiers && Array.isArray(data.fichiers)) {
        data.fichiers.forEach(f => {
          fichiersDict[f.filename] = f.contenu;
        });
      }
      setSiteEnEdition({
        ...site,
        fichiers: Object.keys(fichiersDict).length > 0 ? fichiersDict : { 'index.html': 'Contenu vide' },
        fichierActif: Object.keys(fichiersDict)[0] || 'index.html'
      });
    } catch (error) {
      setErreur("Impossible de charger le contenu du site");
    } finally {
      setChargement(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!siteEnEdition || !siteEnEdition.fichiers) return;
    setChargement(true);
    try {
      const entries = Object.entries(siteEnEdition.fichiers);
      for (const [filename, contenu] of entries) {
        await saveFichier(siteEnEdition.id, filename, contenu);
      }
      onModifierSite(siteEnEdition);
      setSiteEnEdition(null);
    } catch (error) {
      setErreur("Impossible d'enregistrer les modifications");
    } finally {
      setChargement(false);
    }
  };

  const voirSite = async (site) => {
    setChargement(true);
    try {
      const contenu = await fetchContenuSite(site.sous_domaine);
      setSiteAafficher({ ...site, code: contenu });
    } catch (error) {
      setErreur("Impossible de charger le site");
    } finally {
      setChargement(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: estSombre ? '#000000' : '#f5f5f7',
      color: estSombre ? '#ffffff' : '#1d1d1f',
      fontFamily: 'sans-serif',
      padding: '40px 20px',
      transition: 'all 0.3s ease'
    },
    wrapper: { maxWidth: '1100px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    title: { fontSize: '1.8rem', fontWeight: '700', margin: 0 },
    btnTheme: {
      backgroundColor: 'transparent',
      border: `1px solid ${estSombre ? '#333333' : '#cccccc'}`,
      color: estSombre ? '#ffffff' : '#1d1d1f',
      padding: '6px 12px',
      borderRadius: '6px',
      cursor: 'pointer'
    },
    cardPanel: {
      backgroundColor: estSombre ? '#0a0a0a' : '#ffffff',
      padding: '25px',
      borderRadius: '12px',
      border: `1px solid ${estSombre ? '#1a1a1a' : '#e5e5e5'}`,
      marginBottom: '40px'
    },
    formFlex: { display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
    input: {
      flex: '2',
      minWidth: '220px',
      padding: '12px 16px',
      borderRadius: '8px',
      border: `1px solid ${estSombre ? '#333333' : '#cccccc'}`,
      backgroundColor: estSombre ? '#121212' : '#ffffff',
      color: estSombre ? '#ffffff' : '#000000',
      fontSize: '0.95rem',
      outline: 'none'
    },
    selectVisibilite: {
      padding: '12px 16px',
      borderRadius: '8px',
      border: `1px solid ${estSombre ? '#333333' : '#cccccc'}`,
      backgroundColor: estSombre ? '#121212' : '#ffffff',
      color: estSombre ? '#ffffff' : '#000000',
      fontSize: '0.95rem',
      cursor: 'pointer'
    },
    btnSecondary: { flex: '1', padding: '12px 20px', borderRadius: '8px', border: '1px solid #00bcd4', backgroundColor: 'transparent', color: '#00bcd4', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer' },
    btnPrimary: { padding: '12px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#00bcd4', color: '#000000', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer' },
    btnCancel: { padding: '12px 20px', borderRadius: '8px', border: '1px solid #333333', backgroundColor: 'transparent', color: '#888888', fontSize: '0.95rem', cursor: 'pointer' },
    editorGrid: { display: 'flex', height: '480px', marginTop: '20px', gap: '0' },
    explorerBox: { width: '220px', border: `1px solid ${estSombre ? '#222' : '#ddd'}`, backgroundColor: estSombre ? '#121212' : '#ffffff', borderRadius: '8px 0 0 8px', overflow: 'hidden' },
    editorBox: { flex: 1, border: `1px solid ${estSombre ? '#222' : '#ddd'}`, borderLeft: 'none', borderRadius: '0 8px 8px 0', overflow: 'hidden' },
    previewBox: { flex: 1, border: '1px solid #222222', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' },
    erreurBox: { backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px' },
    sectionTitle: { fontSize: '1.4rem', marginBottom: '20px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' },
    card: {
      backgroundColor: estSombre ? '#0a0a0a' : '#ffffff',
      borderRadius: '12px',
      border: `1px solid ${estSombre ? '#1a1a1a' : '#e5e5e5'}`,
      padding: '25px',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    },
    cardTitle: { fontSize: '1.2rem', fontWeight: '700', margin: 0 },
    badgeVisibilite: (v) => ({
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: 'bold',
      backgroundColor: v === 'public' ? 'rgba(0, 188, 212, 0.15)' : 'rgba(255, 152, 0, 0.15)',
      color: v === 'public' ? '#00bcd4' : '#ff9800',
      border: `1px solid ${v === 'public' ? '#00bcd4' : '#ff9800'}`
    }),
    texteLien: {
      fontSize: '0.75rem',
      color: estSombre ? '#00bcd4' : '#007b9e',
      fontFamily: 'monospace'
    },
    boutonsLien: { display: 'flex', gap: '8px', marginTop: '5px' },
    btnCopier: {
      flex: '1',
      padding: '6px 10px',
      borderRadius: '6px',
      border: '1px solid #00bcd4',
      backgroundColor: 'transparent',
      color: '#00bcd4',
      cursor: 'pointer',
      fontSize: '0.75rem'
    },
    btnOuvrir: {
      flex: '1',
      padding: '6px 10px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: '#00bcd4',
      color: '#000000',
      cursor: 'pointer',
      fontSize: '0.75rem'
    },
    modalPleinEcran: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000000', zIndex: 2000, display: 'flex', flexDirection: 'column' },
    modalBarreNav: { padding: '12px 24px', backgroundColor: '#121212', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
  };

  return (
    <div style={styles.container}>
      <style>{`
        .menu-wrapper { position: relative; display: inline-block; }
        .btn-dots { background: transparent; border: none; cursor: pointer; padding: 0 5px; line-height: 1; }
        .dropdown-menu { display: none; position: absolute; right: 0; top: 30px; border-radius: 8px; min-width: 160px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); z-index: 200; flex-direction: column; padding: 5px 0; }
        .dropdown-menu.open { display: flex; }
        .dropdown-menu button { background: none; border: none; text-align: left; padding: 10px 15px; cursor: pointer; width: 100%; font-size: 0.9rem; }
        .dropdown-menu button:hover { background-color: ${estSombre ? '#2a2a2a' : '#f0f0f0'}; }
        .dropdown-menu .btn-danger { color: #ef4444; }
        .dropdown-menu .btn-danger:hover { background-color: rgba(239, 68, 68, 0.1); }
        .menu-dark .btn-dots { color: #aaa; }
        .menu-dark .btn-dots:hover { color: #fff; }
        .menu-dark .dropdown-menu { background-color: #1a1a1a; border: 1px solid #333; }
        .menu-dark .dropdown-menu button { color: #eee; }
        .menu-light .btn-dots { color: #555; }
        .menu-light .btn-dots:hover { color: #000; }
        .menu-light .dropdown-menu { background-color: #ffffff; border: 1px solid #e5e5e5; }
        .menu-light .dropdown-menu button { color: #1d1d1f; }

        .editor-layout { display: flex; gap: 20px; height: 480px; margin-top: 20px; }
        @media (max-width: 768px) {
          .editor-layout { flex-direction: column; height: auto; min-height: 80vh; gap: 15px; }
          .explorer-pane { width: 100% !important; height: 150px; }
          .editor-pane, .preview-pane { width: 100%; height: 40vh; min-height: 250px; flex: none; }
        }
      `}</style>
      
      <div style={styles.wrapper}>
        <div style={styles.header}>
          
        </div>

        {erreur && <div style={styles.erreurBox}>{erreur}</div>}
        {messageNonStatiques && <div style={{ ...styles.erreurBox, backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' }}>{messageNonStatiques}</div>}

        <div style={styles.cardPanel}>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ color: estSombre ? '#888' : '#666' }}>Visibilité du projet :</label>
            <select
              value={visibilite}
              onChange={(e) => setVisibilite(e.target.value)}
              style={styles.selectVisibilite}
            >
              <option value="prive">Privé</option>
              <option value="public">Public</option>
            </select>
          </div>

          {!modeRedaction ? (
            <div style={styles.formFlex}>
              <input
                type="text"
                placeholder="Nom du projet (ex: Portfolio)"
                value={nomSite}
                onChange={(e) => setNomSite(e.target.value)}
                style={styles.input}
              />
              
              <input type="file" ref={fileInputRef} onChange={handleSingleFile} style={{ display: 'none' }} />
              <button style={styles.btnSecondary} onClick={() => fileInputRef.current.click()}>
                Importer un fichier
              </button>

              <input 
                type="file" 
                ref={folderInputRef} 
                onChange={handleImportDossier} 
                style={{ display: 'none' }} 
                webkitdirectory="" 
                directory="" 
              />
              <button style={styles.btnSecondary} onClick={() => folderInputRef.current.click()}>
                Importer un dossier
              </button>

              <button style={styles.btnPrimary} onClick={() => setModeRedaction(true)}>
                Rédiger du code
              </button>
            </div>
          ) : (
            <div>
              <div style={{ ...styles.formFlex, marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Nom du projet (ex: Portfolio)"
                  value={nomSite}
                  onChange={(e) => setNomSite(e.target.value)}
                  style={styles.input}
                />
                <button style={styles.btnSecondary} onClick={handleCreerFichier}>
                  Ajouter un fichier
                </button>
                <button style={styles.btnSecondary} onClick={handleCreerDossier}>
                  Ajouter un dossier
                </button>
                <button style={styles.btnCancel} onClick={() => setModeRedaction(false)}>Masquer l'éditeur</button>
                <button style={styles.btnPrimary} onClick={handleSubmit} disabled={chargement}>
                  {chargement ? 'Enregistrement...' : 'Enregistrer & Publier'}
                </button>
              </div>

              {importSummary && (
                <div style={{
                  marginBottom: '15px', padding: '10px 15px',
                  backgroundColor: estSombre ? '#1a1a1a' : '#e5e5e5',
                  borderRadius: '6px', fontSize: '0.9rem',
                  display: 'flex', justifyContent: 'space-between'
                }}>
                  <span> Fichiers importés : <strong>{importSummary.count}</strong></span>
                  <span> Taille totale : <strong>{importSummary.sizeMB} Mo</strong></span>
                </div>
              )}

              <div className="editor-layout">
                <div className="explorer-pane" style={{ width: '220px', border: `1px solid ${estSombre ? '#222' : '#ddd'}`, backgroundColor: estSombre ? '#121212' : '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '10px', borderBottom: `1px solid ${estSombre ? '#222' : '#ddd'}`, fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Explorateur</span>
                  </div>
                  <div style={{ overflowY: 'auto', height: '100%', padding: '5px 10px' }}>
                    {Object.keys(fichiers).map((nom) => (
                      <div
                        key={nom}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          color: estSombre ? '#ccc' : '#444',
                          backgroundColor: fichierActif === nom ? (estSombre ? '#2a2d2e' : '#e5e5e5') : 'transparent',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          marginBottom: '4px'
                        }}
                      >
                        <span 
                          onClick={() => setFichierActif(nom)}
                          style={{ display: 'flex', alignItems: 'center', flex: 1 }}
                        >
                          {nom}
                        </span>
                        
                        {/* CORRECTION ICI : AJOUT DE LA CLASSE MENU-DARK OU MENU-LIGHT */}
                        <div className={`menu-wrapper ${estSombre ? 'menu-dark' : 'menu-light'}`} onClick={(e) => e.stopPropagation()}>
                          <button className="btn-dots" onClick={(e) => toggleMenu(e.currentTarget)}>⋮</button>
                          <div className="dropdown-menu">
                            <button onClick={() => handleRenommerElement(nom)}>Renommer</button>
                            <button onClick={() => setFichierActif(nom)}>Éditer</button>
                            <button className="btn-danger" onClick={() => handleSupprimerElement(nom)}>Supprimer</button>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>

                <div className="editor-pane" style={{ flex: 1, border: `1px solid ${estSombre ? '#222' : '#ddd'}`, borderRadius: '8px', overflow: 'hidden' }}>
                  <Editor 
                    height="100%" 
                    language={fichierActif.endsWith('.css') ? 'css' : fichierActif.endsWith('.js') ? 'javascript' : 'html'} 
                    theme={estSombre ? "vs-dark" : "light"} 
                    value={fichiers[fichierActif] || ''} 
                    onChange={(val) => setFichiers({ ...fichiers, [fichierActif]: val || '' })} 
                  />
                </div>

                <div className="preview-pane" style={{ flex: 1, border: `1px solid ${estSombre ? '#222' : '#ddd'}`, borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                  <iframe 
                    srcDoc={genererApercuComplet(fichiers['index.html'] || '', fichiers)} 
                    title="Aperçu statique" 
                    sandbox="allow-scripts" 
                    style={{ width: '100%', height: '100%', border: 'none' }} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <h2 style={styles.sectionTitle}>Tous mes projets créés</h2>

        {sites.length === 0 ? (
          <p style={{ color: estSombre ? '#666666' : '#888888' }}>Vous n'avez pas encore créé de site.</p>
        ) : (
          <div style={styles.grid}>
            {sites
              .filter(site => site && site.id && site.sous_domaine && site.date_creation)
              .map((site) => (
                <div key={site.id} style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={styles.cardTitle}>{site.titre || site.sous_domaine}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={styles.badgeVisibilite(site.publication ? 'public' : 'prive')}>
                        {site.publication ? 'Public' : 'Privé'}
                      </span>
                      <div className={`menu-wrapper ${estSombre ? 'menu-dark' : 'menu-light'}`}>
                        <button className="btn-dots" onClick={(e) => toggleMenu(e.currentTarget)}>⋮</button>
                        <div className="dropdown-menu" id={`menu-${site.id}`}>
                          <button onClick={() => copierLien(getSiteUrl(site.sous_domaine))}>Copier le lien</button>
                          <button onClick={() => handleEditSite(site)}>Modifier</button>
                          <button onClick={() => handlePublishSite(site)}>
                            {site.publication ? 'Rendre privé' : 'Rendre public'}
                          </button>
                          <button className="btn-danger" onClick={() => handleDeleteSite(site.id)}>Supprimer</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem' }}>
                    Créé le : {new Date(site.date_creation).toLocaleDateString('fr-FR')}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: estSombre ? '#666666' : '#888888', margin: 0 }}>
                    Visites : {site.nb_visites || 0}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      {siteAafficher && (
        <div style={styles.modalPleinEcran}>
          <div style={styles.modalBarreNav}>
            <span style={{ color: '#00bcd4', fontWeight: 'bold' }}>Aperçu : {siteAafficher.titre || siteAafficher.sous_domaine}</span>
            <button style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setSiteAafficher(null)}>Fermer ✕</button>
          </div>
          <iframe srcDoc={siteAafficher.code || '<p>Contenu non disponible</p>'} title={siteAafficher.titre || siteAafficher.sous_domaine} sandbox="allow-scripts" style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }} />
        </div>
      )}

      {siteEnEdition && (
        <div style={styles.modalPleinEcran}>
          <div style={styles.modalBarreNav}>
            <span style={{ color: '#00bcd4', fontWeight: 'bold' }}>Modification du site : {siteEnEdition.titre || siteEnEdition.sous_domaine}</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ backgroundColor: '#00bcd4', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} onClick={handleSaveEdit}>Enregistrer les modifications</button>
              <button style={{ backgroundColor: '#333', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setSiteEnEdition(null)}>Annuler</button>
            </div>
          </div>
          <div className="editor-layout" style={{ height: '100%', marginTop: '0px' }}>
            <div className="explorer-pane" style={{ width: '220px', border: `1px solid ${estSombre ? '#222' : '#ddd'}`, backgroundColor: estSombre ? '#121212' : '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '10px', borderBottom: `1px solid ${estSombre ? '#222' : '#ddd'}`, fontWeight: 'bold', fontSize: '0.85rem' }}>
                Explorateur
              </div>
              <div style={{ overflowY: 'auto', height: '100%', padding: '5px 10px' }}>
                {Object.keys(siteEnEdition.fichiers || {}).map((nom) => (
                  <div
                    key={nom}
                    onClick={() => setSiteEnEdition({ ...siteEnEdition, fichierActif: nom })}
                    style={{
                      cursor: 'pointer',
                      padding: '6px 10px',
                      color: estSombre ? '#ccc' : '#444',
                      backgroundColor: siteEnEdition.fichierActif === nom ? (estSombre ? '#2a2d2e' : '#e5e5e5') : 'transparent',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      marginBottom: '4px',
                      display: 'flex', alignItems: 'center'
                    }}
                  >
                    {nom}
                  </div>
                ))}
              </div>
            </div>

            <div className="editor-pane" style={{ flex: 1, border: `1px solid ${estSombre ? '#222' : '#ddd'}`, borderRadius: '8px', overflow: 'hidden' }}>
              <Editor 
                height="100%" 
                language={siteEnEdition.fichierActif?.endsWith('.css') ? 'css' : siteEnEdition.fichierActif?.endsWith('.js') ? 'javascript' : 'html'} 
                theme={estSombre ? "vs-dark" : "light"} 
                value={siteEnEdition.fichiers ? siteEnEdition.fichiers[siteEnEdition.fichierActif] : ''} 
                onChange={(val) => setSiteEnEdition({ 
                  ...siteEnEdition, 
                  fichiers: { ...siteEnEdition.fichiers, [siteEnEdition.fichierActif]: val || '' } 
                })} 
              />
            </div>

            <div className="preview-pane" style={{ flex: 1, backgroundColor: '#fff', border: `1px solid ${estSombre ? '#222' : '#ddd'}`, borderRadius: '8px', overflow: 'hidden' }}>
              <iframe 
                srcDoc={genererApercuComplet(siteEnEdition.fichiers?.['index.html'] || '', siteEnEdition.fichiers || {})} 
                title="Aperçu édition" 
                sandbox="allow-scripts" 
                style={{ width: '100%', height: '100%', border: 'none' }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreerSite;