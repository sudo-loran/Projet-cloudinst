function Footer({ theme }) {
  const estSombre = theme === 'sombre';

  const stylesFooter = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '25px 20px',
    marginTop: '40px',
    borderTop: 'none',
    backgroundColor: 'transparent',
    color: estSombre ? '#9FB4D6' : '#666666',
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