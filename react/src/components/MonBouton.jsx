const MonBouton = ({ texte, clicAction }) => {
    return(
      <button onClick={clicAction}>{texte}</button>
    );
};
export default MonBouton;