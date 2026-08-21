import React, { useState, useEffect } from 'react';
import { fetchEspace } from '../api';

function Abonnement({ theme = 'sombre' }) {
  const [espace, setEspace] = useState(null);
  const [chargement, setChargement] = useState(true);
  const estSombre = theme === 'sombre';

  useEffect(() => {
    const getEspace = async () => {
      try {
        const data = await fetchEspace();
        setEspace(data);
      } catch (error) {
        console.error("Erreur lors du chargement de l'espace", error);
      } finally {
        setChargement(false);
      }
    };
    getEspace();
  }, []);

  if (chargement) {
    return <p style={{ padding: '40px', color: '#888' }}>Chargement de votre espace...</p>;
  }

  if (!espace) {
    return <p style={{ padding: '40px', color: '#ef4444' }}>Impossible de charger les informations de stockage.</p>;
  }

  const pourcentage = Math.min((espace.used_mb / espace.max_mb) * 100, 100);
  const estPlein = pourcentage >= 100;
  const couleur = pourcentage > 90 ? '#ef4444' : pourcentage > 70 ? '#f59e0b' : '#00bcd4';

  const styles = {
    container: {
      maxWidth: '600px', margin: '40px auto', padding: '30px',
      backgroundColor: estSombre ? '#0a0a0a' : '#ffffff',
      borderRadius: '12px', border: `1px solid ${estSombre ? '#1a1a1a' : '#e5e5e5'}`,
      color: estSombre ? '#ffffff' : '#1d1d1f'
    },
    title: { fontSize: '1.8rem', fontWeight: '700', marginBottom: '25px', textAlign: 'center' },
    row: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.95rem' },
    gaugeContainer: { 
      width: '100%', height: '12px', 
      backgroundColor: estSombre ? '#222' : '#eee', 
      borderRadius: '6px', overflow: 'hidden', margin: '15px 0' 
    },
    gaugeFill: { 
      width: `${pourcentage}%`, height: '100%', 
      backgroundColor: couleur, borderRadius: '6px', transition: 'width 0.4s ease' 
    },
    planContainer: {
      marginTop: '30px', padding: '20px',
      backgroundColor: estSombre ? '#121212' : '#f0f0f2',
      borderRadius: '10px', border: `1px solid ${estSombre ? '#333' : '#ddd'}`
    },
    planTitle: { fontSize: '1.2rem', fontWeight: '700', marginBottom: '10px' },
    planPrice: { fontSize: '1.8rem', fontWeight: '800', color: '#00bcd4', marginBottom: '5px' },
    planDesc: { fontSize: '0.9rem', color: '#888', marginBottom: '15px' },
    btnPrimary: {
      width: '100%', padding: '14px',
      backgroundColor: '#00bcd4', color: '#000', border: 'none',
      borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer'
    },
    btnWarning: {
      width: '100%', padding: '14px',
      backgroundColor: '#ef4444', color: '#fff', border: 'none',
      borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer'
    },
    msgPlein: { color: '#ef4444', marginTop: '15px', fontWeight: 'bold', textAlign: 'center' }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Mon Abonnement</h1>
      
      <div style={styles.row}>
        <span>Espace utilisé</span>
        <span><strong>{espace.used_mb} Mo</strong> / {espace.max_mb} Mo</span>
      </div>
      <div style={styles.row}>
        <span>Nombre de fichiers</span>
        <span><strong>{espace.used_files}</strong> / {espace.max_files}</span>
      </div>

      <div style={styles.gaugeContainer}>
        <div style={styles.gaugeFill} />
      </div>
      <p style={{ textAlign: 'right', fontSize: '0.9rem', color: '#888' }}>
        {Math.round(pourcentage)}% utilisé
      </p>

      {estPlein && <p style={styles.msgPlein}>⚠️ Stockage saturé ! Étendez votre espace pour continuer à créer.</p>}

      <div style={styles.planContainer}>
        <div style={styles.planTitle}>Plan Extension 1 Go</div>
        <div style={styles.planPrice}>3 280 FCFA</div>
        <p style={styles.planDesc}>
          Passez de {espace.max_mb} Mo à 1 Go d'espace de stockage. Idéal pour héberger des projets plus lourds sans interruption.
        </p>
        <button 
          style={estPlein ? styles.btnWarning : styles.btnPrimary}
          onClick={() => {
            "Url de pandunya pour le paiement sécurisé"
            alert("Redirection vers le paiement sécurisé Paydunya...");
          }}
        >
          {estPlein ? "Débloquer mon espace maintenant" : "Étendre mon espace dès maintenant"}
        </button>
        <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '10px', textAlign: 'center' }}>
          Paiement 100% sécurisé via MTN MoMo, Moov Money ou carte bancaire.
        </p>
      </div>
    </div>
  );
}

export default Abonnement;