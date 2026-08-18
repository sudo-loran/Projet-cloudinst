import { Link } from "react-router-dom";

function Header({ theme, onChangerTheme }) {
  const estSombre = theme === "sombre";

  const stylesHeader = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    boxSizing: "border-box",
    zIndex: 1000,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 40px",
    borderBottom: `1px solid ${estSombre ? "#111111" : "#e5e5e5"}`,
    backgroundColor: estSombre ? "#000000" : "#ffffff",
  };

  return (
    <header style={stylesHeader}>
      <Link
        to="/accueil"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          textDecoration: "none",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.5 19H6.5C3.462 19 1 16.538 1 13.5C1 10.462 3.462 8 6.5 8H6.6C7.316 5.187 9.836 3 12.5 3C14.898 3 17.04 4.61 17.96 6.83C18.63 6.42 19.6 6 20.5 6C23.2 6 25.5 8.3 25.5 11C25.5 13.7 23.2 16 20.5 16H17.5V19Z"
            fill="#00bcd4"
          />
        </svg>
        <span
          style={{ fontSize: "1.1rem", fontWeight: "700", color: "#00bcd4" }}
        >
          CloudInst
        </span>
      </Link>

      <div style={{ display: "flex", gap: "25px", alignItems: "center" }}>
        <Link
          to="/accueil"
          style={{
            color: estSombre ? "#ffffff" : "#1d1d1f",
            textDecoration: "none",
            fontSize: "0.95rem",
          }}
        >
          Accueil
        </Link>
        <Link
          to="/creersite"
          style={{
            color: estSombre ? "#ffffff" : "#1d1d1f",
            textDecoration: "none",
            fontSize: "0.95rem",
          }}
        >
          Créer un site
        </Link>
        <Link
          to="/profil"
          style={{
            color: estSombre ? "#ffffff" : "#1d1d1f",
            textDecoration: "none",
            fontSize: "0.95rem",
          }}
        >
          Profil
        </Link>

        <button
          style={{
            backgroundColor: "transparent",
            border: `1px solid ${estSombre ? "#333333" : "#cccccc"}`,
            color: estSombre ? "#ffffff" : "#1d1d1f",
            padding: "6px 12px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
          onClick={onChangerTheme}
        >
          {estSombre ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}

export default Header;
