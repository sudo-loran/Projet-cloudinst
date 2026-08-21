"""
Fonctions partagées pour résoudre un chemin d'URL vers un SiteFile,
et déterminer le content-type associé.

Utilisé à la fois par SousDomaineMiddleware (mode production, sous-domaine)
et par la vue `apercu` (mode preview, /apercu/<sous_domaine>/<filename>).

Avoir une seule implémentation évite que les deux modes se comportent
différemment (ex: résolution d'index.html dans un sous-dossier).
"""

import mimetypes

# Extensions considérées comme des assets statiques (cache navigateur/serveur).
STATIC_EXTENSIONS = (
    ".css",
    ".js",
    ".png",
    ".jpg",
    ".jpeg",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
)

CONTENT_TYPES = {
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain",
}


def chemin_est_dangereux(chemin: str) -> bool:
    """Vérifie qu'un chemin ne tente pas de sortir de l'arborescence du site
    et ne contient pas de caractères interdits dans un nom de fichier web."""
    # La racine "/" est autorisée
    if chemin == "/" or chemin == "":
        return False
    if ".." in chemin or chemin.startswith("/") or chemin.startswith("\\"):
        return True
    dangerous_chars = ["<", ">", ":", '"', "|", "?", "*"]
    return any(char in chemin for char in dangerous_chars)


def resoudre_fichier_site(site, chemin_url: str):
    """
    Résout un chemin d'URL (ex: '', 'style.css', 'blog/', 'blog/article.html')
    vers un objet SiteFile appartenant à `site`.

    Comportement façon Neocities / GitHub Pages :
      - '' ou '/'            -> index.html
      - 'blog' ou 'blog/'    -> blog/index.html (si le fichier littéral 'blog' n'existe pas)
      - 'style.css'          -> style.css

    Retourne le SiteFile trouvé, ou None si rien ne correspond.
    Lève ValueError si le chemin est dangereux (à catcher par l'appelant).
    """
    if chemin_est_dangereux(chemin_url):
        raise ValueError("Chemin invalide")

    chemin = chemin_url.strip("/")
    filename = chemin if chemin else "index.html"

    # 1. Correspondance exacte
    fichier = site.files.filter(filename=filename).first()
    if fichier:
        return fichier

    # 2. Fallback "dossier" -> on cherche filename/index.html
    #    (seulement si le dernier segment n'a pas d'extension, pour éviter
    #    de chercher un index.html derrière un vrai fichier manquant type .png)
    dernier_segment = filename.rsplit("/", 1)[-1]
    if "." not in dernier_segment:
        fichier = site.files.filter(filename=f"{filename}/index.html").first()
        if fichier:
            return fichier

    return None


def deviner_content_type(filename: str) -> str:
    """Retourne le content-type à utiliser pour servir ce fichier."""
    for ext, content_type in CONTENT_TYPES.items():
        if filename.lower().endswith(ext):
            return content_type

    # Fallback sur le module standard pour les extensions non listées ci-dessus
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "application/octet-stream"


def est_fichier_statique(filename: str) -> bool:
    return filename.lower().endswith(STATIC_EXTENSIONS)