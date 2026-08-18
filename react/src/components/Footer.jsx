function Footer({ theme }) {
  const estSombre = theme === 'sombre';

  const stylesFooter = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '25px 20px',
    marginTop: '40px',
    borderTop: `1px solid ${estSombre ? '#111111' : '#e5e5e5'}`,
    backgroundColor: estSombre ? '#000000' : '#ffffff',
    color: estSombre ? '#888888' : '#666666',
    fontSize: '0.85rem'
  };

  return (
    <footer style={stylesFooter}>
      <p style={{ margin: '0 0 5px 0' }}>
        CloudInst.
      </p>
      <p style={{ margin: '0', display: 'flex', gap: '15px' }}>
      </p>
    </footer>
  );
}

export default Footer;