import React from 'react';

// Composant Modal Paywall (Dark Theme)
// Affiche un message lorsque l'utilisateur a atteint son quota et propose d'upgrader
export default function PaywallModal({ open, onClose, onSubscribe, message }) {
  if (!open) return null;

  const backdrop = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2,6,23,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000
  };

  const box = {
    width: 'min(720px, 96%)',
    background: '#0F172A', // très foncé
    border: '1px solid rgba(255,215,0,0.08)',
    borderRadius: '12px',
    padding: '22px',
    color: '#E6EEF8',
    boxShadow: '0 10px 30px rgba(2,6,23,0.6)'
  };

  const title = { fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: '#F8E6C8' };
  const subtitle = { color: '#9FB4D6', marginBottom: '14px' };
  const perks = { display: 'grid', gap: '8px', marginBottom: '18px' };
  const perkItem = { display: 'flex', gap: '12px', alignItems: 'center', color: '#DDEEFF' };
  const btnRow = { display: 'flex', justifyContent: 'flex-end', gap: '12px' };
  const btnCancel = { background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#9FB4D6', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' };
  const btnAction = { background: 'linear-gradient(90deg,#F6C84C,#00B4FF)', border: 'none', color: '#07203A', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Vous avez atteint la limite du compte Gratuit</h3>
            <div className="muted">{message || "Votre compte a atteint une limite. Pour continuer, passez à l'offre Pro."}</div>
          </div>
        </div>

        <div className="modal-perks">
          <div className="perk">💠 <strong>Jusqu'à 100 projets</strong> — hébergement illimité de projets statiques</div>
          <div className="perk">⚡ <strong>Stockage 10 Go</strong> — plus d'espace pour vos fichiers</div>
          <div className="perk">🔒 <strong>SLA & Support</strong> — prioritaire pour les incidents</div>
          <div className="perk">🔁 <strong>Mises à jour faciles</strong> — déploiements rapides via l'interface</div>
        </div>

        <p className="muted">En améliorant votre compte, vous pourrez créer davantage de projets et héberger des fichiers plus volumineux.</p>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              // Appel du callback fourni par le parent pour simuler l'abonnement
              if (onSubscribe) onSubscribe();
            }}
          >
            S'abonner
          </button>
        </div>
      </div>
    </div>
  );
}
