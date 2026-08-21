import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchProfil, logoutUser, updateProfil, envoyerCodeConfirmation, confirmerChangementMdp, fetchEspace } from "../api";

function Profil({ onDeconnexion, theme = "sombre", onChangerTheme }) {
  const navigate = useNavigate();
  const estSombre = theme === "sombre";

  const [profil, setProfil] = useState(null);
  const [espace, setEspace] = useState(null); // NOUVEAU
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [nouveauUsername, setNouveauUsername] = useState("");
  const [nouveauPassword, setNouveauPassword] = useState("");
  const [confirmationPassword, setConfirmationPassword] = useState("");

  const [codeEnvoye, setCodeEnvoye] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    const chargerProfil = async () => {
      try {
        const [dataProfil, dataEspace] = await Promise.all([
          fetchProfil(),
          fetchEspace()
        ]);

        if (dataProfil.username) {
          setProfil(dataProfil);
          setNouveauUsername(dataProfil.username);
        } else {
          setErreur("Impossible de charger le profil");
        }

        if (dataEspace && dataEspace.used_mb !== undefined) {
          setEspace(dataEspace);
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

    // Si un nouveau mot de passe est saisi
    if (nouveauPassword) {
      if (nouveauPassword !== confirmationPassword) {
        setErreur("La confirmation du mot de passe ne correspond pas.");
        return;
      }
      if (nouveauPassword.length < 6) {
        setErreur("Le mot de passe doit contenir au moins 6 caractères.");
        return;
      }

      // Si le code n'a pas encore été envoyé, on l'envoie
      if (!codeEnvoye) {
        try {
          const res = await envoyerCodeConfirmation();
          if (res.message) {
            setMessage("Code de confirmation envoyé par email. Veuillez le saisir puis réenregistrer.");
            setCodeEnvoye(true);
            return; // On s'arrête là, on ne change pas encore le mot de passe
          } else {
            setErreur(res.erreur || "Erreur lors de l'envoi du code.");
            return;
          }
        } catch (error) {
          setErreur("Impossible de contacter le serveur.");
          return;
        }
      }

      // Si le code a déjà été envoyé et que l'utilisateur l'a saisi, on valide
      if (codeEnvoye && code) {
        try {
          const res = await confirmerChangementMdp(code, nouveauPassword);
          if (res.message) {
            setMessage("Mot de passe modifié avec succès !");
            setNouveauPassword("");
            setConfirmationPassword("");
            setCode("");
            setCodeEnvoye(false);
            
            // On met à jour le username en même temps
            const payload = { username: nouveauUsername };
            await updateProfil(payload);
            setProfil((prev) => ({ ...prev, username: nouveauUsername }));
            localStorage.setItem("username", nouveauUsername);
            
            return;
          } else {
            setErreur(res.erreur || "Code invalide ou expiré.");
            return;
          }
        } catch (error) {
          setErreur("Erreur lors de la confirmation.");
          return;
        }
      }
    }

    // Si pas de mot de passe, ou après validation réussie, on enregistre le username simplement
    try {
      const payload = { username: nouveauUsername };
      await updateProfil(payload);
      setProfil((prev) => ({ ...prev, username: nouveauUsername }));
      localStorage.setItem("username", nouveauUsername);
      setMessage("Profil mis à jour avec succès.");
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
    espaceBadge: {
      width: "100%",
      backgroundColor: estSombre ? "#121212" : "#f0f0f2",
      border: `1px solid ${estSombre ? "#222222" : "#e0e0e0"}`,
      color: estSombre ? "#ffffff" : "#1d1d1f",
      padding: "15px",
      borderRadius: "10px",
      textAlign: "left",
      fontSize: "0.9rem",
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
      textAlign: "left",
    },
    error: {
      width: "100%",
      color: "#ef4444",
      fontSize: "0.9rem",
      margin: 0,
      textAlign: "left",
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

  if (erreur && !profil) {
    return (
      <div style={styles.container}>
        <div style={styles.mainContent}>
          <p style={{ color: "#ef4444" }}>{erreur}</p>
        </div>
      </div>
    );
  }

  // Calcul pour l'affichage de la jauge
  const pourcentageEspace = espace ? Math.min((espace.used_mb / espace.max_mb) * 100, 100) : 0;

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

          {/* NOUVEAU BLOC : Informations d'espace */}
          {espace && (
            <div style={styles.espaceBadge}>
              <strong>💾 Stockage utilisé :</strong> {espace.used_mb} Mo / {espace.max_mb} Mo
              <div style={{ 
                width: '100%', height: '6px', backgroundColor: estSombre ? '#333' : '#ddd', 
                borderRadius: '3px', marginTop: '8px', overflow: 'hidden' 
              }}>
                <div style={{ 
                  width: `${pourcentageEspace}%`, height: '100%', 
                  backgroundColor: pourcentageEspace > 90 ? '#ef4444' : '#00bcd4', 
                  borderRadius: '3px' 
                }} />
              </div>
              <p style={{ margin: '8px 0 0 0', color: estSombre ? '#888' : '#666' }}>
                Fichiers : {espace.used_files} / {espace.max_files}
              </p>
            </div>
          )}

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

            {/* Le champ code apparaît ici après le premier clic sur Enregistrer */}
            {codeEnvoye && (
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code de confirmation reçu par email"
                style={styles.input}
              />
            )}

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