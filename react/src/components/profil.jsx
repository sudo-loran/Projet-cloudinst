import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchProfil, logoutUser, updateProfil } from "../api";

function Profil({ onDeconnexion, theme = "sombre", onChangerTheme }) {
  const navigate = useNavigate();
  const estSombre = theme === "sombre";

  const [profil, setProfil] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [nouveauUsername, setNouveauUsername] = useState("");
  const [nouveauPassword, setNouveauPassword] = useState("");
  const [confirmationPassword, setConfirmationPassword] = useState("");

  useEffect(() => {
    const chargerProfil = async () => {
      try {
        const data = await fetchProfil();
        if (data.username) {
          setProfil(data);
          setNouveauUsername(data.username);
        } else {
          setErreur("Impossible de charger le profil");
        }
      } catch (error) {
        setErreur("Erreur lors du chargement du profil");
      } finally {
        setChargement(false);
      }
    };
    chargerProfil();
  }, []);

  const handleSauvegarderProfil = async (e) => {
    e.preventDefault();
    setErreur("");
    setMessage("");

    if (nouveauPassword && nouveauPassword !== confirmationPassword) {
      setErreur("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    try {
      const payload = {
        username: nouveauUsername,
        ...(nouveauPassword ? { password: nouveauPassword } : {}),
      };

      await updateProfil(payload);
      setProfil((prev) => ({ ...prev, username: nouveauUsername }));
      localStorage.setItem("username", nouveauUsername);
      setMessage("Profil mis à jour avec succès.");
      setNouveauPassword("");
      setConfirmationPassword("");
    } catch (error) {
      setErreur(error.message || "Erreur lors de la mise à jour du profil");
    }
  };

  const handleDeconnexionClick = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await logoutUser();
      } catch (error) {
        console.error("Erreur lors de la déconnexion :", error);
      }
    }
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    if (onDeconnexion) {
      onDeconnexion();
    }
    navigate("/");
  };

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: estSombre ? "#000000" : "#f5f5f7",
      color: estSombre ? "#ffffff" : "#1d1d1f",
      fontFamily: "sans-serif",
      transition: "all 0.3s ease",
    },
    navbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "20px 40px",
      borderBottom: `1px solid ${estSombre ? "#111111" : "#e5e5e5"}`,
      backgroundColor: estSombre ? "#000000" : "#ffffff",
    },
    logo: {
      fontSize: "1.4rem",
      fontWeight: "700",
      color: "#00bcd4",
      textDecoration: "none",
    },
    navLinks: { display: "flex", gap: "25px", alignItems: "center" },
    navItem: {
      color: estSombre ? "#ffffff" : "#1d1d1f",
      textDecoration: "none",
      fontSize: "0.95rem",
    },
    btnTheme: {
      backgroundColor: "transparent",
      border: `1px solid ${estSombre ? "#333333" : "#cccccc"}`,
      color: estSombre ? "#ffffff" : "#1d1d1f",
      padding: "6px 12px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "0.85rem",
    },
    mainContent: { padding: "60px 20px", maxWidth: "600px", margin: "0 auto" },
    userCard: {
      backgroundColor: estSombre ? "#0a0a0a" : "#ffffff",
      border: `1px solid ${estSombre ? "#1a1a1a" : "#e5e5e5"}`,
      borderRadius: "16px",
      padding: "35px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "20px",
    },
    userName: { fontSize: "1.6rem", fontWeight: "700", margin: "0 0 5px 0" },
    userEmail: {
      color: estSombre ? "#888888" : "#666666",
      margin: 0,
      fontSize: "0.95rem",
    },
    statsBadge: {
      width: "100%",
      backgroundColor: estSombre ? "#121212" : "#f0f0f2",
      border: `1px solid ${estSombre ? "#222222" : "#e0e0e0"}`,
      color: "#00bcd4",
      padding: "15px",
      borderRadius: "10px",
      fontSize: "1.1rem",
      fontWeight: "bold",
    },
    infoText: {
      width: "100%",
      textAlign: "left",
      fontSize: "0.9rem",
      color: estSombre ? "#888888" : "#666666",
      margin: "5px 0",
    },
    form: {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      marginTop: "10px",
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: "10px",
      border: `1px solid ${estSombre ? "#333333" : "#d1d5db"}`,
      backgroundColor: estSombre ? "#111111" : "#ffffff",
      color: estSombre ? "#ffffff" : "#111111",
    },
    btnPrimary: {
      width: "100%",
      backgroundColor: "#00bcd4",
      color: "#ffffff",
      border: "none",
      padding: "12px",
      borderRadius: "10px",
      fontWeight: "bold",
      fontSize: "1rem",
      cursor: "pointer",
    },
    btnDeconnexion: {
      width: "100%",
      backgroundColor: "#ef4444",
      color: "#ffffff",
      border: "none",
      padding: "12px",
      borderRadius: "10px",
      fontWeight: "bold",
      fontSize: "1rem",
      cursor: "pointer",
      marginTop: "10px",
    },
    message: {
      width: "100%",
      color: "#10b981",
      fontSize: "0.9rem",
      margin: 0,
    },
    error: {
      width: "100%",
      color: "#ef4444",
      fontSize: "0.9rem",
      margin: 0,
    },
  };

  if (chargement) {
    return (
      <div style={styles.container}>
        <div style={styles.mainContent}>
          <p style={{ color: estSombre ? "#fff" : "#000" }}>
            Chargement du profil...
          </p>
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div style={styles.container}>
        <div style={styles.mainContent}>
          <p style={{ color: "#ef4444" }}>{erreur}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <main style={styles.mainContent}>
        <div style={styles.userCard}>
          <div>
            <h1 style={styles.userName}>{profil?.username || "Utilisateur"}</h1>
            <p style={styles.userEmail}>
              {profil?.email || "Email non défini"}
            </p>
            <p
              style={{
                color: estSombre ? "#666" : "#999",
                fontSize: "0.85rem",
                marginTop: "5px",
              }}
            >
              Inscrit le :{" "}
              {profil?.date_inscription
                ? new Date(profil.date_inscription).toLocaleDateString("fr-FR")
                : "Date inconnue"}
            </p>
          </div>

          <div style={styles.statsBadge}>
            {profil?.nombre_sites || 0} site
            {(profil?.nombre_sites || 0) > 1 ? "s" : ""} créé
            {(profil?.nombre_sites || 0) > 1 ? "s" : ""}
          </div>

          <form style={styles.form} onSubmit={handleSauvegarderProfil}>
            <input
              type="text"
              value={nouveauUsername}
              onChange={(e) => setNouveauUsername(e.target.value)}
              placeholder="Nom d'utilisateur"
              style={styles.input}
            />
            <input
              type="password"
              value={nouveauPassword}
              onChange={(e) => setNouveauPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              style={styles.input}
            />
            <input
              type="password"
              value={confirmationPassword}
              onChange={(e) => setConfirmationPassword(e.target.value)}
              placeholder="Confirmer le mot de passe"
              style={styles.input}
            />

            {erreur ? <p style={styles.error}>{erreur}</p> : null}
            {message ? <p style={styles.message}>{message}</p> : null}

            <button type="submit" style={styles.btnPrimary}>
              Enregistrer les modifications
            </button>
          </form>

          <button
            style={styles.btnDeconnexion}
            onClick={handleDeconnexionClick}
          >
            Déconnexion
          </button>
        </div>
      </main>
    </div>
  );
}

export default Profil;
