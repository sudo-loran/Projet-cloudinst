const API_URL = 'http://127.0.0.1:8000';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Token ${token}` } : {})
  };
};

export const registerUser = (username, password) => 
  fetch(`${API_URL}/inscription/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => res.json());

export const loginUser = (username, password) => 
  fetch(`${API_URL}/connexion/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => res.json());

export const logoutUser = () => 
  fetch(`${API_URL}/deconnexion/`, {
    method: 'POST',
    headers: getHeaders()
  }).then(res => res.json());

export const fetchProfil = () => 
  fetch(`${API_URL}/profil/`, { headers: getHeaders() }).then(res => res.json());

export const updateProfil = async (data) => {
  const response = await fetch(`${API_URL}/profil/`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.erreur || body.message || 'Erreur lors de la mise à jour du profil');
  }

  return body;
};

export const deleteCompte = () => 
  fetch(`${API_URL}/supprimer_compte/`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(res => res.json());

export const fetchMesSites = () => 
  fetch(`${API_URL}/sites/mes-sites/`, { headers: getHeaders() }).then(res => res.json());

export const createSite = (sousDomaine, titre) => 
  fetch(`${API_URL}/sites/creer/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sous_domaine: sousDomaine, titre })
  }).then(res => res.json());

export const deleteSite = (siteId) => 
  fetch(`${API_URL}/sites/${siteId}/supprimer/`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(res => res.json());

export const publishSite = (siteId) => 
  fetch(`${API_URL}/sites/${siteId}/publication/`, {
    method: 'POST',
    headers: getHeaders()
  }).then(res => res.json());

export const exportSite = (siteId) => 
  fetch(`${API_URL}/sites/${siteId}/exporter/`, {
    headers: getHeaders()
  }).then(res => res.blob());

export const importSite = (siteId, zipFile) => {
  const formData = new FormData();
  formData.append('fichier', zipFile);
  formData.append('site_id', siteId);
  
  return fetch(`${API_URL}/sites/importer/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${localStorage.getItem('token')}`
    },
    body: formData
  }).then(res => res.json());
};

export const fetchStatistiques = (siteId) => 
  fetch(`${API_URL}/sites/${siteId}/statistiques/`, {
    headers: getHeaders()
  }).then(res => res.json());

export const fetchFichiersSite = (siteId) => 
  fetch(`${API_URL}/sites/${siteId}/fichiers/`, {
    headers: getHeaders()
  }).then(res => res.json());

export const saveFichier = (siteId, filename, contenu) => 
  fetch(`${API_URL}/sites/fichiers/enregistrer/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ site_id: siteId, filename, contenu })
  }).then(res => res.json());

export const deleteFichier = (fileId) => 
  fetch(`${API_URL}/fichiers/${fileId}/supprimer/`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(res => res.json());

export const fetchExplorateur = (limite = 12, depart = 0) => 
  fetch(`${API_URL}/explorateur/?limite=${limite}&depart=${depart}`)
    .then(res => res.json());

export const searchSites = (query) => 
  fetch(`${API_URL}/recherche/?q=${encodeURIComponent(query)}`)
    .then(res => res.json());

export const fetchPopulaires = (limite = 10) => 
  fetch(`${API_URL}/populaires/?limite=${limite}`)
    .then(res => res.json());

export const fetchRecents = (limite = 10) => 
  fetch(`${API_URL}/recents/?limite=${limite}`)
    .then(res => res.json());

export const fetchContenuSite = (sousDomaine, filename = 'index.html') => {
  const token = localStorage.getItem('token');
  const url = `${API_URL}/apercu/${sousDomaine}/${filename}`;
  const options = token ? { headers: { 'Authorization': `Token ${token}` } } : {};
  return fetch(url, options).then(res => res.text());
};

export function getSiteUrl(sousDomaine) {
  return `http://${sousDomaine}.lvh.me:8000`;
}

export function copierLien(texte) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(texte)
      .then(() => alert('Lien copié !'))
      .catch(() => copierAncienneMethode(texte));
  } else {
    copierAncienneMethode(texte);
  }
}

function copierAncienneMethode(texte) {
  const zone = document.createElement('textarea');
  zone.value = texte;
  zone.style.position = 'fixed';
  zone.style.opacity = '0';
  document.body.appendChild(zone);
  zone.select();
  document.execCommand('copy');
  document.body.removeChild(zone);
  alert('Lien copié !');
}