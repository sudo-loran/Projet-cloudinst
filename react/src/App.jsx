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
import Header from "./components/Header";
import Footer from "./components/Footer";
import { fetchMesSites } from "./api";

function App() {
  const [estConnecte, setEstConnecte] = useState(false);
  const [theme, setTheme] = useState("sombre");
  const [sites, setSites] = useState([]);
  const [chargement, setChargement] = useState(true);

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
