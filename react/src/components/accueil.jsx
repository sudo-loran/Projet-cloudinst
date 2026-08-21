import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchContenuSite, getSiteUrl, copierLien } from '../api';

function Accueil({ sites = [], theme = 'sombre', onChangerTheme }) {
  const [siteAafficher, setSiteAafficher] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtreVisibilite, setFiltreVisibilite] = useState('tous');
  const [chargement, setChargement] = useState(false);

  const estSombre = theme === 'sombre';

  // On ne filtre que les sites de l'utilisateur (venant de la prop sites)
  const sitesFiltres = sites.filter((site) => {
    // 1. Filtre par texte (titre ou sous-domaine)
    const matchRecherche = (site.titre || site.sous_domaine || '')
      .toLowerCase()
      .includes(recherche.toLowerCase());
    
    // 2. Filtre par visibilité (Public / Privé)
    let matchVisibilite = true;
    if (filtreVisibilite === 'public') {
      matchVisibilite = site.publication === true;
    } else if (filtreVisibilite === 'prive') {
      matchVisibilite = site.publication === false;
    }

    return matchRecherche && matchVisibilite;
  });

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

  const voirSite = async (site) => {
    setChargement(true);
    try {
      const contenu = await fetchContenuSite(site.sous_domaine);
      setSiteAafficher({ ...site, code: contenu });
    } catch (error) {
      console.error("Erreur lors du chargement du site:", error);
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
      paddingBottom: '60px',
      transition: 'all 0.3s ease'
    },
    mainContent: { padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' },
    textSection: {
      marginBottom: '30px',
      lineHeight: '1.6'
    },
    pageTitle: { fontSize: '2rem', fontWeight: '800', marginBottom: '15px' },
    paragraph: { color: estSombre ? '#aaaaaa' : '#555555', fontSize: '1.05rem', marginBottom: '10px' },
    sectionTitle: { fontSize: '1.4rem', fontWeight: '700', margin: '0 0 15px 0' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
    card: {
      backgroundColor: estSombre ? '#0a0a0a' : '#ffffff',
      borderRadius: '12px',
      border: `1px solid ${estSombre ? '#1a1a1a' : '#e5e5e5'}`,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    cardTitle: { fontSize: '1.1rem', fontWeight: '700', margin: 0 },
    cardDate: { fontSize: '0.8rem', color: estSombre ? '#666666' : '#888888', margin: 0 },
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
    boiteLien: {
      backgroundColor: estSombre ? '#121212' : '#f0f0f2',
      padding: '6px 10px',
      borderRadius: '6px',
      marginTop: '5px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    texteLien: {
      fontSize: '0.75rem',
      color: estSombre ? '#00bcd4' : '#007b9e',
      fontFamily: 'monospace'
    },
    modalPleinEcran: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000000',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column'
    },
    modalBarreNav: {
      padding: '12px 24px',
      backgroundColor: '#121212',
      borderBottom: '1px solid #222',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    btnFermer: {
      backgroundColor: '#ef4444',
      color: '#fff',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: 'bold'
    }
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
      `}</style>
      
      <main style={styles.mainContent}>
        <section style={styles.textSection}>
          <h1 style={styles.pageTitle}>Bienvenue sur CloudInst</h1>
          <p style={styles.paragraph}>
            CloudInst est une plateforme dédiée à l'hébergement et au partage de projets web statiques (HTML, CSS, JavaScript).
          </p>
          <p style={styles.paragraph}>
            Parcourez ci-dessous la liste des projets publics publiés par la communauté. Vous pouvez rechercher un projet par son nom ou créer le vôtre depuis la rubrique dédiée.
          </p>
        </section>

        {/* Section des sites personnels */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
            <h2 style={styles.sectionTitle}>Mes sites</h2>
            
            {/* Barre de recherche + Filtre par visibilité */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Rechercher un site..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${estSombre ? '#333333' : '#cccccc'}`,
                  backgroundColor: estSombre ? '#121212' : '#ffffff',
                  color: estSombre ? '#ffffff' : '#000000',
                  fontSize: '0.9rem',
                  width: '200px',
                  outline: 'none'
                }}
              />
              <select
                value={filtreVisibilite}
                onChange={(e) => setFiltreVisibilite(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${estSombre ? '#333333' : '#cccccc'}`,
                  backgroundColor: estSombre ? '#121212' : '#ffffff',
                  color: estSombre ? '#ffffff' : '#000000',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="tous">Tous</option>
                <option value="public">Publics</option>
                <option value="prive">Privés</option>
              </select>
            </div>
          </div>

          {sites.length === 0 ? (
            <p style={{ color: estSombre ? '#666666' : '#888888' }}>
              Vous n'avez pas encore créé de site. Allez dans <Link to="/creersite" style={{ color: '#00bcd4' }}>Créer un site</Link> pour commencer.
            </p>
          ) : (
            <div style={styles.grid}>
              {sitesFiltres.map((site) => (
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
                          <button onClick={() => window.open(getSiteUrl(site.sous_domaine), '_blank')}>Ouvrir</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p style={styles.cardDate}>Créé le : {new Date(site.date_creation).toLocaleDateString('fr-FR')}</p>
                  <p style={styles.cardDate}>Visites : {site.nb_visites || 0}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {siteAafficher && (
        <div style={styles.modalPleinEcran}>
          <div style={styles.modalBarreNav}>
            <span style={{ color: '#00bcd4', fontWeight: 'bold' }}>
              Aperçu : {siteAafficher.titre || siteAafficher.sous_domaine}
            </span>
            <button style={styles.btnFermer} onClick={() => setSiteAafficher(null)}>
              Fermer ✕
            </button>
          </div>
          <iframe
            srcDoc={siteAafficher.code || '<p>Contenu non disponible</p>'}
            title={siteAafficher.titre || siteAafficher.sous_domaine}
            sandbox="allow-scripts"
            style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#ffffff' }}
          />
        </div>
      )}
    </div>
  );
}

export default Accueil;