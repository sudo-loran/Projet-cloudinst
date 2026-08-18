import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom"; // <-- Ajout de Outlet ici
import Accueil from "./components/accueil";
import Connexion from "./components/connexion";
import Inscription from "./components/inscription";
import Profil from "./components/profil";
import CreerSite from "./components/Creersite";
import AdminDashboard from "./components/AdminDashboard";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { fetchMesSites } from "./api";
import { fetchProfil } from "./api";

function App() {
  const [estConnecte, setEstConnecte] = useState(false);
  const [theme, setTheme] = useState("sombre");
  const [sites, setSites] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; }
  });

  const chargerSites = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setChargement(false);
      return;
    }

    try {
      const data = await fetchMesSites();
      if (data.sites) {
        setSites(data.sites);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des sites:", error);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setEstConnecte(true);
      chargerSites();
    } else {
      setChargement(false);
    }
  }, []);

  // Récupération du profil utilisateur (pour role + espace utilisé)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    (async () => {
      try {
        const p = await fetchProfil();
        // Attendre que le back renvoie { username, role, espaceUtilise } ou similar
        if (p) {
          const normalized = {
            nom: p.username || p.nom || localStorage.getItem('username') || 'Utilisateur',
            role: p.role || p.rol || p.type || (p.is_admin ? 'ADMIN' : 'GRATUIT'),
            espaceUtilise: p.espace_utilise_bytes || p.espaceUtilise || 0
          };
          setUser(normalized);
          try { localStorage.setItem('user', JSON.stringify(normalized)); } catch (e) {}
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [estConnecte]);

  const changerTheme = () => {
    setTheme((prev) => (prev === "sombre" ? "clair" : "sombre"));
  };

  const ajouterNouveauSite = (nouveauSite) => {
    setSites((prev) => [nouveauSite, ...prev]);
  };

  const supprimerSite = (idSite) => {
    setSites((prev) => prev.filter((s) => s.id !== idSite));
  };

  const modifierSite = (siteModifie) => {
    setSites((prev) =>
      prev.map((s) => (s.id === siteModifie.id ? siteModifie : s)),
    );
  };

  const handleDeconnexion = () => {
    setEstConnecte(false);
    setSites([]);
  };

  if (chargement) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#000",
          color: "#fff",
        }}
      >
        <p>Chargement...</p>
      </div>
    );
  }

  const RouteProtegee = ({ children }) => {
    return estConnecte ? children : <Navigate to="/" />;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Pages SANS Header ni Footer (Connexion / Inscription) */}
        <Route
          path="/"
          element={<Connexion onLogin={setEstConnecte} theme={theme} />}
        />
        <Route
          path="/inscription"
          element={<Inscription onLogin={setEstConnecte} theme={theme} />}
        />

        {/* 2. Pages AVEC Header et Footer (Accessibles uniquement si connecté) */}
        <Route
          element={
            <RouteProtegee>
              <div>
                <Header theme={theme} onChangerTheme={changerTheme} />
                <div style={{ minHeight: "80vh", paddingTop: "80px" }}>
                  <Outlet />{" "}
                  {/* Le contenu des pages enfants s'affichera ici */}
                </div>
                <Footer theme={theme} />
              </div>
            </RouteProtegee>
          }
        >
          <Route
            path="/accueil"
            element={
              <Accueil
                sites={sites}
                theme={theme}
                onChangerTheme={changerTheme}
              />
            }
          />
          <Route
            path="/creersite"
            element={
              <CreerSite
                sites={sites}
                onAjouterSite={ajouterNouveauSite}
                onSupprimerSite={supprimerSite}
                onModifierSite={modifierSite}
                theme={theme}
                onChangerTheme={changerTheme}
                user={user}
                onUserUpdate={setUser}
              />
            }
          />
          <Route
            path="/profil"
            element={
              <Profil
                utilisateur={{
                  nom: localStorage.getItem("username") || "Utilisateur",
                }}
                nombreSites={sites.length}
                onDeconnexion={handleDeconnexion}
                theme={theme}
                onChangerTheme={changerTheme}
              />
            }
          />
          <Route
            path="/admin"
            element={<AdminDashboard currentUser={user} onUserUpdate={setUser} />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
