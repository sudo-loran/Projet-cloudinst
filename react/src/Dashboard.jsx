import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMesSites, createSite, logoutUser } from './api';

function Dashboard() {
  const [sites, setSites] = useState([]);
  const [sousDomaine, setSousDomaine] = useState('');
  const [titre, setTitre] = useState('');
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    chargerSites();
  }, []);

  const chargerSites = async () => {
    const data = await fetchMesSites();
    if (data.sites) {
      setSites(data.sites);
    }
  };

  const handleCreerSite = async (e) => {
    e.preventDefault();
    setErreur('');

    const res = await createSite(sousDomaine, titre);

    if (res.erreur) {
      setErreur(res.erreur);
    } else {
      setSousDomaine('');
      setTitre('');
      chargerSites();
    }
  };

  const handleDeconnexion = async () => {
    await logoutUser();
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#121212', minHeight: '100vh' }}>
      <h1>Mon Tableau de Bord</h1>
      <button onClick={handleDeconnexion} style={{ background: '#ff4d4d', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
        Déconnexion
      </button>

      <h2>Créer un nouveau site</h2>
      <form onSubmit={handleCreerSite} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Sous-domaine" 
          value={sousDomaine} 
          onChange={(e) => setSousDomaine(e.target.value)} 
          required 
        />
        <input 
          type="text" 
          placeholder="Titre du site" 
          value={titre} 
          onChange={(e) => setTitre(e.target.value)} 
        />
        <button type="submit">Créer</button>
      </form>
      {erreur && <p style={{ color: '#ff4d4d' }}>{erreur}</p>}

      <h2>Mes Sites</h2>
      <ul>
        {sites.map((site) => (
          <li key={site.id}>
            <strong>{site.titre}</strong> ({site.sous_domaine}) - Visites: {site.nb_visites}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;