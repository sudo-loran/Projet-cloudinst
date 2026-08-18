import React, { useState } from 'react';

// Panneau d'administration simulé (front-end only)
// Affiche une liste d'utilisateurs et permet de changer leur rôle localement
export default function AdminDashboard({ currentUser, onUserUpdate }) {
  // Données simulées — en front-end uniquement
  const [users, setUsers] = useState(() => {
    return [
      { id: 1, nom: 'Alice', role: 'GRATUIT', espaceUtilise: 1.2 },
      { id: 2, nom: 'Bob', role: 'PRO', espaceUtilise: 320 },
      { id: 3, nom: 'Charlie', role: 'ADMIN', espaceUtilise: 12 },
      // si utilisateur courant n'est pas dans la liste, on l'ajoute pour superviser
      ...(currentUser ? [{ id: 99, nom: currentUser.nom || 'Vous', role: currentUser.role || 'GRATUIT', espaceUtilise: (currentUser.espaceUtilise || 0) / (1024*1024) }] : [])
    ];
  });

  const roles = ['GRATUIT', 'PRO', 'ADMIN'];

  const changerRole = (id, nouvelleRole) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: nouvelleRole } : u));
    // Si on change le rôle de l'utilisateur courant, propager la mise à jour
    const modif = users.find(u => u.id === id);
    if (modif && modif.nom === (currentUser && (currentUser.nom || 'Vous'))) {
      if (onUserUpdate) onUserUpdate({ ...currentUser, role: nouvelleRole });
    }
  };

  const selectStyle = { padding: '6px 10px', borderRadius: '6px' };

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 className="title">Panneau d'administration</h2>
          <div className="muted" style={{ marginTop: 6 }}>Interface d'administration front-end (simulation). Changez un rôle pour tester les permissions côté client.</div>
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th className="admin-th">Nom</th>
            <th className="admin-th">Rôle</th>
            <th className="admin-th">Espace utilisé (Mo)</th>
            <th className="admin-th"></th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td className="admin-td">{u.nom}</td>
              <td className="admin-td">
                <select value={u.role} onChange={(e) => changerRole(u.id, e.target.value)} style={selectStyle}>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td className="admin-td">{(u.espaceUtilise || 0).toFixed(2)}</td>
              <td className="admin-td"><button className="btn btn-outline" onClick={() => alert(`Simulé: rôle de ${u.nom} -> ${u.role}`)}>Simuler</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
