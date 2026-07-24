// Rende in modo coerente i tre stati di una lista: caricamento, errore, vuoto.
// Se nessuno di questi, mostra i figli (il contenuto).
export function StatoLista({ caricamento, errore, vuoto, messaggioVuoto, onRiprova, children }) {
  if (caricamento) {
    return <p className="stato stato--attesa">Caricamento…</p>;
  }
  if (errore) {
    return (
      <div className="stato stato--errore" role="alert">
        <p>{errore}</p>
        {onRiprova && (
          <button type="button" className="btn-secondary" onClick={onRiprova}>
            Riprova
          </button>
        )}
      </div>
    );
  }
  if (vuoto) {
    return <p className="stato stato--vuoto">{messaggioVuoto}</p>;
  }
  return children;
}
