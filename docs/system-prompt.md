# Il prompt di sistema del Companion

## Dov'è, e perché qui non c'è una copia

Il prompt vero vive in **`companion-service/src/companionPrompt.js`**. Quello è
l'unico posto in cui esiste.

Fino al 28 luglio 2026 questo documento ne conteneva una copia integrale. La
copia aveva smesso di corrispondere all'originale: parlava ancora «all'utente»
con forme di genere («chiederle», «non contraddirla») che il prompt vero aveva
già eliminato, non conteneva la sezione sulla neutralità di genere e non
conteneva la regola sulla lingua. Chi l'avesse letta per capire come si comporta
il Companion avrebbe capito una cosa diversa da come si comporta davvero.

Una copia di un testo che cambia diverge sempre. Quindi qui non c'è più: per
leggere il prompt aggiornato, apri il file, oppure

```bash
sed -n '/BASE_SYSTEM_PROMPT/,/^`;/p' companion-service/src/companionPrompt.js
```

Quello che segue è la parte che il codice non dice: **perché** il prompt è fatto
così. Se cambi il prompt e una di queste decisioni non vale più, aggiorna anche
questa pagina.

---

## Le decisioni, e il motivo

### Un solo passo, mai una lista

La regola «al massimo una micro-azione in caso di sovraccarico» non è una scelta
di stile. Chi arriva al Companion è tipicamente già bloccato: una lista di sei
cose da fare riproduce esattamente il problema che l'ha portato lì. Il prodotto
funziona se la risposta è più piccola della domanda.

### Niente asterischi, niente schwa

Il prompt vieta esplicitamente `*`, `ə` e le forme «o/a», e chiede invece di
**riformulare la frase**: non «sei stanco/a» ma «la stanchezza c'è».

Il motivo è tecnico, non ideologico: i lettori di schermo e la sintesi vocale
leggono male quei simboli, e a chi ha dislessia costano fatica in più. Su un
prodotto rivolto a persone che usano spesso quegli strumenti, marcare il genere
con un simbolo peggiora l'accessibilità mentre cerca di migliorare l'inclusione.
Riformulare ottiene lo stesso risultato senza costi.

C'è anche un'istruzione a rileggere l'ultima frase prima di inviare: è nei
passaggi di sostegno emotivo che scappa più facilmente un participio con il
genere («solo», «bloccato»), e proprio lì un errore pesa di più.

### Rispondi nella lingua di chi scrive

Aggiunta il 28 luglio 2026. Prima il prompt diceva «usa italiano semplice» e il
modello lo rispettava a intermittenza: un messaggio in inglese riceveva inglese,
uno equivalente in francese riceveva italiano. Non era una funzione, era un caso.

Ora la regola è esplicita e dichiarata prioritaria sulle altre indicazioni
linguistiche. Serve perché l'interfaccia è ancora solo in italiano ma i tester
non lo sono: la guida dice a chi non legge l'italiano di scrivere nella propria
lingua, e quella promessa deve reggere.

Quando la lingua non è riconoscibile (poche parole, un elenco, un refuso) si
resta sull'italiano.

### Niente emoji

Possono risultare ambigue o condiscendenti, e la sintesi vocale le legge in modo
imprevedibile.

### Cosa il Companion non fa, e lo dice

Non diagnostica, non interpreta referti o invalidità, non consiglia farmaci, non
promette risultati. In caso di rischio immediato invita a contattare emergenza,
medico o persona di fiducia. Sono vincoli scritti nel prompt, non note per noi:
un assistente che li superasse, su questo pubblico, farebbe danno.

---

## Le cinque modalità

Le istruzioni specifiche per modalità stanno in `companion-service/src/modes.js`
e si sommano al prompt base.

| Modalità | Quando | Cosa cambia |
|---|---|---|
| `crisis_mode` | Blocco, vergogna, frasi assolute («non ho scelta») | Una sola azione, risposta breve |
| `study_mode` | Studio, esami, testi lunghi, memoria | Materiale diviso in blocchi piccoli, domande brevi di richiamo |
| `bureaucracy_mode` | Documenti, enti, pratiche | Checklist e bozze di messaggi, sempre con «verifica con l'ente competente» |
| `work_mode` | Lavoro, candidature, orientamento | Si parte dai vincoli reali: salute, energia, orari, trasporti, stress |
| `autonomy_mode` | Soldi, casa, routine, scadenze | Una sola area per volta |

## Se cambi il prompt

1. Modifica `companionPrompt.js`.
2. Prova con il provider vero, non con il mock: il mock risponde da uno stampo
   fisso e non dice niente su come si comporterà il modello.
3. Se hai cambiato una delle decisioni qui sopra, aggiorna questa pagina.
4. Pubblica con `bash deploy/02-pubblica.sh root@IP`.
