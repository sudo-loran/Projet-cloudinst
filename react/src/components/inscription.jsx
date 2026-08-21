import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Inscription({ onLogin }) {
  const [formData, setFormData] = useState({
    nomComplet: '',
    username: '',
    email: '',
    motDePasse: '',
    confirmerMotDePasse: '',
  });

  const [erreurMotDePasse, setErreurMotDePasse] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    })); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.motDePasse !== formData.confirmerMotDePasse) {
      setErreurMotDePasse("Les mots de passe ne correspondent pas !");
      return;
    }
    setErreurMotDePasse("");

    try {
      // 1. Appel d'inscription (avec email)
      const response = await fetch('http://127.0.0.1:8000/inscription/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.motDePasse,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErreurMotDePasse(data.erreur || "Une erreur est survenue.");
        return; 
      }

      // 2. Appel de connexion
      const connexionResponse = await fetch('http://127.0.0.1:8000/connexion/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.motDePasse,
        }),
      });

      const connexionData = await connexionResponse.json();

      if (!connexionResponse.ok) {
        setErreurMotDePasse(connexionData.erreur || "Erreur de connexion.");
        return;
      }

      localStorage.setItem('token', connexionData.token);
      localStorage.setItem('username', connexionData.username);
      localStorage.setItem('email', formData.email); // On stocke l'email aussi

      if (onLogin) onLogin(true);
      navigate('/');

    } catch (error) {
      setErreurMotDePasse("Impossible de contacter le serveur.");
    }
  };

  const styles = {
    container: {
      maxWidth: '450px',
      margin: '60px auto',
      padding: '40px',
      backgroundColor: '#1e1e1e',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      color: '#ffffff',
      fontFamily: 'Segoe UI, Roboto, Helvetica Neue, sans-serif',
    },
    titre: { textAlign: 'center', marginBottom: '10px', fontSize: '28px', fontWeight: '600' },
    sousTitre: { textAlign: 'center', color: '#b0b0b0', marginBottom: '30px', fontSize: '15px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '14px', fontWeight: '500', color: '#e0e0e0' },
    input: {
      padding: '12px 15px',
      borderRadius: '8px',
      border: '1px solid #333',
      backgroundColor: '#2a2a2a',
      color: '#ffffff',
      fontSize: '15px',
      outline: 'none',
    },
    erreur: {
      color: '#ff4d4d',
      fontSize: '14px',
      fontWeight: '500',
      textAlign: 'center',
      backgroundColor: 'rgba(255, 77, 77, 0.1)',
      padding: '10px',
      borderRadius: '6px',
      border: '1px solid rgba(255, 77, 77, 0.2)',
      margin: '0',
    },
    bouton: {
      marginTop: '10px',
      padding: '12px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: '#00bcd4',
      color: '#fff',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
    },
    lienContainer: { marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#b0b0b0' },
    lien: { color: '#00bcd4', textDecoration: 'none', fontWeight: '500', marginLeft: '5px' },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.titre}>Créer un compte</h2>
      <p style={styles.sousTitre}>Rejoignez notre plateforme en quelques secondes.</p>

      <form style={styles.form} onSubmit={handleSubmit}>
        {/* Nom Complet */}
        <div style={styles.inputGroup}>
          <label htmlFor="nomComplet" style={styles.label}>Nom complet</label>
          <input
            type="text"
            id="nomComplet"
            name="nomComplet"
            placeholder="Jean Dupont"
            value={formData.nomComplet}
            onChange={handleChange}
            style={styles.input}
            required
          />
        </div>

        {/* Nom d'utilisateur */}
        <div style={styles.inputGroup}>
          <label htmlFor="username" style={styles.label}>Nom d'utilisateur</label>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="jeandupont12"
            value={formData.username}
            onChange={handleChange}
            style={styles.input}
            required
          />
        </div>

        {/* NOUVEAU CHAMP EMAIL */}
        <div style={styles.inputGroup}>
          <label htmlFor="email" style={styles.label}>Adresse email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="jean@exemple.com"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
            required
          />
        </div>

        {/* Mot de passe */}
        <div style={styles.inputGroup}>
          <label htmlFor="motDePasse" style={styles.label}>Mot de passe</label>
          <input
            type="password"
            id="motDePasse"
            name="motDePasse"
            placeholder="••••••••"
            value={formData.motDePasse}
            onChange={handleChange}
            style={styles.input}
            required
            minLength="6"
          />
        </div>

        {/* Confirmer mot de passe */}
        <div style={styles.inputGroup}>
          <label htmlFor="confirmerMotDePasse" style={styles.label}>Confirmer le mot de passe</label>
          <input
            type="password"
            id="confirmerMotDePasse"
            name="confirmerMotDePasse"
            placeholder="••••••••"
            value={formData.confirmerMotDePasse}
            onChange={handleChange}
            style={styles.input}
            required
            minLength="6"
          />
        </div>

        {erreurMotDePasse && <p style={styles.erreur}>{erreurMotDePasse}</p>}

        <button type="submit" style={styles.bouton}>S'inscrire</button>
      </form>

      <div style={styles.lienContainer}>
        Déjà inscrit ?
        <Link to="/" style={styles.lien}>Se connecter</Link>
      </div>
    </div>
  );
}

export default Inscription;