import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api';

function Connexion({ onLogin }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    motDePasse: '',
  });

  const [erreur, setErreur] = useState('');
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [chargement, setChargement] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur('');

    if (!formData.username.trim() || !formData.motDePasse.trim()) {
      setErreur("Veuillez remplir tous les champs.");
      return;
    }

    setChargement(true);

    try {
      const data = await loginUser(formData.username, formData.motDePasse);
      setChargement(false);

      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        if (onLogin) onLogin(true);
        navigate('/accueil');
      } else {
        setErreur(data.erreur || "Identifiants incorrects.");
      }
    } catch (error) {
      setChargement(false);
      setErreur("Impossible de contacter le serveur.");
    }
  };

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#ffffff',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    },
    leftSection: {
      flex: 1,
      backgroundColor: '#0a0a0a',
      borderRight: '1px solid #1a1a1a',
      padding: '60px 40px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    leftContent: {
      maxWidth: '500px',
      margin: '0 auto',
    },
    brandTitle: {
      fontSize: '2.5rem',
      fontWeight: '800',
      color: '#00bcd4',
      marginBottom: '15px',
      letterSpacing: '-0.5px',
    },
    heroText: {
      fontSize: '1.1rem',
      color: '#cccccc',
      lineHeight: '1.6',
      marginBottom: '40px',
    },
    featureList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '25px',
    },
    featureItem: {
      paddingLeft: '15px',
      borderLeft: '2px solid #00bcd4',
    },
    featureTitle: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#ffffff',
      margin: '0 0 6px 0',
    },
    featureDesc: {
      fontSize: '0.88rem',
      color: '#888888',
      margin: 0,
      lineHeight: '1.5',
    },
    rightSection: {
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px',
      backgroundColor: '#000000',
    },
    formBox: {
      width: '100%',
      maxWidth: '400px',
    },
    formHeader: {
      marginBottom: '30px',
    },
    formTitle: {
      fontSize: '2rem',
      fontWeight: '700',
      margin: '0 0 8px 0',
    },
    formSubTitle: {
      color: '#888888',
      fontSize: '0.9rem',
      margin: 0,
    },
    erreurBox: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#ef4444',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '0.88rem',
      marginBottom: '20px',
    },
    group: {
      marginBottom: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    label: {
      color: '#cccccc',
      fontSize: '0.85rem',
      fontWeight: '500',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      borderRadius: '8px',
      border: '1px solid #333333',
      backgroundColor: '#121212',
      color: '#ffffff',
      fontSize: '0.95rem',
      outline: 'none',
      boxSizing: 'border-box',
    },
    passwordWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    toggleBtn: {
      position: 'absolute',
      right: '12px',
      background: 'none',
      border: 'none',
      color: '#888888',
      cursor: 'pointer',
      fontSize: '0.8rem',
      padding: 0,
    },
    btnSubmit: {
      width: '100%',
      padding: '14px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#00bcd4',
      color: '#000000',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: chargement ? 'not-allowed' : 'pointer',
      opacity: chargement ? 0.7 : 1,
      marginTop: '10px',
    },
    footerText: {
      marginTop: '25px',
      color: '#888888',
      fontSize: '0.88rem',
      textAlign: 'center',
    },
    link: {
      color: '#00bcd4',
      textDecoration: 'none',
      fontWeight: '500',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.leftSection}>
        <div style={styles.leftContent}>
          <h1 style={styles.brandTitle}>cloudlnst</h1>
          <p style={styles.heroText}>
            Plateforme de développement pour concevoir, tester et héberger vos projets web locaux.
          </p>

          <div style={styles.featureList}>
            <div style={styles.featureItem}>
              <h3 style={styles.featureTitle}>Éditeur de code en direct</h3>
              <p style={styles.featureDesc}>
                Rédigez du code HTML/CSS et observez le résultat en temps réel dans votre navigateur.
              </p>
            </div>

            <div style={styles.featureItem}>
              <h3 style={styles.featureTitle}>Importation simplifiée</h3>
              <p style={styles.featureDesc}>
                Chargement direct de vos fichiers source pour une mise en place rapide de votre espace.
              </p>
            </div>

            <div style={styles.featureItem}>
              <h3 style={styles.featureTitle}>Contrôle d'accès</h3>
              <p style={styles.featureDesc}>
                Définissez la visibilité de vos projets en mode public ou privé selon vos besoins.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.rightSection}>
        <div style={styles.formBox}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Connexion</h2>
            <p style={styles.formSubTitle}>Entrez vos identifiants pour accéder au projet</p>
          </div>

          {erreur && <div style={styles.erreurBox}>{erreur}</div>}

          <form onSubmit={handleSubmit}>
            <div style={styles.group}>
              <label style={styles.label} htmlFor="username">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                type="text"
                name="username"
                placeholder="Ex: alex_dev"
                value={formData.username}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div style={styles.group}>
              <label style={styles.label} htmlFor="motDePasse">
                Mot de passe
              </label>
              <div style={styles.passwordWrapper}>
                <input
                  id="motDePasse"
                  type={voirMotDePasse ? 'text' : 'password'}
                  name="motDePasse"
                  placeholder="••••••••"
                  value={formData.motDePasse}
                  onChange={handleChange}
                  style={styles.input}
                />
                <button
                  type="button"
                  style={styles.toggleBtn}
                  onClick={() => setVoirMotDePasse(!voirMotDePasse)}
                >
                  {voirMotDePasse ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </div>

            <button type="submit" style={styles.btnSubmit} disabled={chargement}>
              {chargement ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          <p style={styles.footerText}>
            Pas encore de compte ?{' '}
            <Link to="/inscription" style={styles.link}>
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Connexion;