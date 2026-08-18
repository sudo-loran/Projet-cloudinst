import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { createSite, saveFichier, deleteSite, publishSite, fetchContenuSite, getSiteUrl, copierLien } from '../api';
import PaywallModal from './PaywallModal';

function CreerSite({ sites = [], onAjouterSite, onSupprimerSite, onModifierSite, theme = 'sombre', onChangerTheme, user = null, onUserUpdate }) {
  const fileInputRef = useRef(null);
  const estSombre = theme === 'sombre';

  const [nomSite, setNomSite] = useState('');
  const [visibilite, setVisibilite] = useState('prive');
  const [code, setCode] = useState(
`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mon Site</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #121212; color: #fff; }
    h1 { color: #00bcd4; }
  </style>
</head>
<body>
  <h1>Hello World !</h1>
  <p>Bienvenue sur mon site CloudInst.</p>
</body>
</html>`
  );

  const [fichierImporte, setFichierImporte] = useState(null);
  const [modeRedaction, setModeRedaction] = useState(false);
  const [erreur, setErreur] = useState('');
  const [siteAafficher, setSiteAafficher] = useState(null);
  const [siteEnEdition, setSiteEnEdition] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState('');

  const gererFichier = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérification quota côté client avant import (GRATUIT)
      const userRole = user && user.role ? user.role : 'GRATUIT';
      const espaceUtilise = user && user.espaceUtilise ? user.espaceUtilise : 0; // en octets

      if (userRole === 'GRATUIT') {
        const tailleFichier = file.size; // bytes
        const limite = 2 * 1024 * 1024; // 2 MB
        if (tailleFichier + (espaceUtilise || 0) > limite) {
          setPaywallMessage("L'importer ce fichier dépasse la limite de stockage du compte Gratuit (2 Mo).\nPassez à Pro pour importer ce fichier.");
          setPaywallOpen(true);
          return;
        }
      }

      setFichierImporte(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setCode(evt.target.result);
        setModeRedaction(true);
      };
      reader.readAsText(file);
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

    // Vérification de quota côté client avant création (pour utilisateurs GRATUIT)
    try {
      const userRole = user && user.role ? user.role : 'GRATUIT';
      const espaceUtilise = user && user.espaceUtilise ? user.espaceUtilise : 0; // en octets
      const codeSize = new Blob([code]).size;
      const limite = 2 * 1024 * 1024; // 2 MB

      if (userRole === 'GRATUIT') {
        if ((sites && sites.length >= 5) || (espaceUtilise + codeSize > limite)) {
          let msg = '';
          if (sites && sites.length >= 5) msg = "Vous avez atteint la limite de 5 projets pour le compte Gratuit.";
          else msg = "La taille du code ajouté dépasse l'espace disponible sur le compte Gratuit (2 Mo).";
          setPaywallMessage(msg);
          setPaywallOpen(true);
          setChargement(false);
          return;
        }
      }

      const resSite = await createSite(sousDomaine, nomSite);

      if (resSite.erreur) {
        setErreur(resSite.erreur);
        setChargement(false);
        return;
      }

      const resFichier = await saveFichier(resSite.id, 'index.html', code);

      if (resFichier.erreur) {
        setErreur(resFichier.erreur);
        setChargement(false);
        return;
      }

      if (onAjouterSite) {
        onAjouterSite(resSite); 
      }

      setNomSite('');
      setFichierImporte(null);
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
      const contenu = await fetchContenuSite(site.sous_domaine);
      setSiteEnEdition({ ...site, code: contenu });
    } catch (error) {
      setErreur("Impossible de charger le contenu du site");
    } finally {
      setChargement(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!siteEnEdition) return;
    setChargement(true);
    try {
      await saveFichier(siteEnEdition.id, 'index.html', siteEnEdition.code);
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

  const handleMultipleFiles = async (files) => {
    // Vérification de quota pour multiple files
    const userRole = user && user.role ? user.role : 'GRATUIT';
    const espaceUtilise = user && user.espaceUtilise ? user.espaceUtilise : 0; // bytes
    const limite = 2 * 1024 * 1024;
    const totalTaille = Array.from(files).reduce((s, f) => s + (f.size || 0), 0);

    if (userRole === 'GRATUIT' && (espaceUtilise + totalTaille > limite)) {
      setPaywallMessage("L'importation dépasse la limite de stockage du compte Gratuit (2 Mo). Passez à Pro pour importer plusieurs fichiers.");
      setPaywallOpen(true);
      return;
    }

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        await saveFichier(site.id, file.name, e.target.result);
      };
      reader.readAsText(file);
    }
    alert(`${files.length} fichiers importés avec succès !`);
  };

  const handleSubscribe = () => {
    // Simuler l'abonnement côté front-end : propager la mise à jour vers App.jsx
    if (onUserUpdate) {
      const updated = { ...(user || {}), role: 'PRO', espaceUtilise: user && user.espaceUtilise ? user.espaceUtilise : 0 };
      onUserUpdate(updated);
      // sauvegarde locale pour garder l'état entre reloads
      try { localStorage.setItem('user', JSON.stringify(updated)); } catch (e) {}
    }
    setPaywallOpen(false);
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
    boutonsLien: {
      display: 'flex',
      gap: '8px',
      marginTop: '5px'
    },
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
    <div className="container" style={{ backgroundColor: estSombre ? '#000000' : '#f5f5f7' }}>
      {/* ICI : Ajout des classes CSS et de la Media Query pour la responsivité mobile */}
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

        /* NOUVEAU : Layout responsive pour l'éditeur et le modal */
        .editor-layout {
          display: flex;
          gap: 20px;
          height: 480px;
          margin-top: 20px;
        }
        .editor-pane {
          flex: 1;
          border: 1px solid #222222;
          border-radius: 8px;
          overflow: hidden;
        }
        .preview-pane {
          flex: 1;
          border: 1px solid #222222;
          border-radius: 8px;
          overflow: hidden;
          background-color: #ffffff;
        }

        /* Media Query pour écrans mobiles et tablettes (largeur < 768px) */
        @media (max-width: 768px) {
          .editor-layout {
            flex-direction: column;
            height: auto;
            min-height: 80vh;
            gap: 15px;
          }
          .editor-pane, .preview-pane {
            width: 100%;
            flex: none;
            height: 40vh; /* 40% de la hauteur de l'écran pour chaque partie */
            min-height: 250px;
          }
        }
      `}</style>
      
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <h1 style={styles.title}>Créer un projet statique</h1>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>            
          </div>
        </div>

        {erreur && <div style={styles.erreurBox}>{erreur}</div>}

        <div className="card">
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ color: estSombre ? '#888' : '#666' }}>Visibilité du projet :</label>
            <select
              value={visibilite}
              onChange={(e) => setVisibilite(e.target.value)}
              style={styles.selectVisibilite}
            >
              <option value="prive">Privé </option>
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
              <input type="file" ref={fileInputRef} accept=".html,.css,.js,.txt" onChange={gererFichier} style={{ display: 'none' }} />
              <button style={styles.btnSecondary} onClick={() => fileInputRef.current.click()}>
                {fichierImporte ? fichierImporte : 'Importer un fichier'}
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
                <button style={styles.btnCancel} onClick={() => setModeRedaction(false)}>Masquer l'éditeur</button>
                <button style={styles.btnPrimary} onClick={handleSubmit} disabled={chargement}>
                  {chargement ? 'Enregistrement...' : 'Enregistrer & Publier'}
                </button>
              </div>

              <div className="editor-layout">
                <div className="editor-pane">
                  <Editor height="100%" defaultLanguage="html" theme={estSombre ? "vs-dark" : "light"} value={code} onChange={(val) => setCode(val || '')} />
                </div>
                <div className="preview-pane">
                  <iframe srcDoc={code} title="Aperçu statique" sandbox="allow-scripts" style={{ width: '100%', height: '100%', border: 'none' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <h2 style={styles.sectionTitle}>Tous mes projets créés</h2>

        {sites.length === 0 ? (
          <p style={{ color: estSombre ? '#666666' : '#888888' }}>Vous n'avez pas encore créé de site.</p>
        ) : (
          <div className="grid">
            {sites
              .filter(site => site && site.id && site.sous_domaine && site.date_creation)
              .map((site) => (
                <div key={site.id} className="card">
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
            <div className="editor-pane" style={{ flex: 1 }}>
              <Editor height="100%" defaultLanguage="html" theme={estSombre ? "vs-dark" : "light"} value={siteEnEdition.code} onChange={(val) => setSiteEnEdition({ ...siteEnEdition, code: val || '' })} />
            </div>
            <div className="preview-pane" style={{ flex: 1, backgroundColor: '#fff' }}>
              <iframe srcDoc={siteEnEdition.code} title="Aperçu édition" sandbox="allow-scripts" style={{ width: '100%', height: '100%', border: 'none' }} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Paywall */}
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} onSubscribe={handleSubscribe} message={paywallMessage} />
    </div>
  );
}

export default CreerSite;