# Modello di minaccia

Un elenco di controlli dimostra che una difesa *c'è*. Un modello di minaccia
dimostra che *copre* — e, più utile ancora, fa vedere dove non copre. Questo
documento parte dalle minacce, non dai controlli, e ogni riga finisce con il
rischio che resta. Il metodo è **STRIDE** per la sicurezza e **LINDDUN** per la
privacy, perché i contenuti sono dati relativi alla salute, categoria particolare
ex art. 9 GDPR.

I *valori* segreti (chiavi, sale, percorsi-trappola) non compaiono qui né nel
resto del repository: stanno solo sul server. Quello che segue è il disegno, non
le sue chiavi — ed è pubblico apposta, perché una difesa che regge solo finché il
codice è nascosto non è una difesa.

## Cosa si protegge

Le conversazioni, che sono dati sulla salute. La mappa codice↔persona, che è la
chiave di re-identificazione e sta *fuori* dal sistema, nella conoscenza di chi
gestisce. Le chiavi AI che un tester può portare (BYOT). Le credenziali di
amministrazione. I segreti del server.

## Confini di fiducia

Internet verso Caddy. Il client React, che sta sulla macchina dell'utente ed è per
definizione non fidato, verso il backend. Il companion-service verso il backend,
sul canale interno. Il backend verso il database. E il confine che li domina tutti:
l'host — chi diventa amministratore ha tutto ciò che sta sopra.

## STRIDE

### Spoofing — fingersi un altro

| minaccia | controllo | rischio residuo |
|---|---|---|
| Anonimo si finge tester o amministratore | accesso con codice + token di sessione; le funzioni riservate rispondono 401 | Il codice è a bassa entropia e il rate-limit sul login è per-IP: un brute force distribuito su molti indirizzi non lo tocca |
| Fingersi il companion sul canale interno | token a confronto a tempo costante; `/api/internal` è 404 dal web | Solo da dentro l'host (post-compromissione) |
| Furto del token di sessione | HTTPS; una CSP con `script-src 'self'` (nessuno script inline, niente terzi) impedisce l'esecuzione di script iniettati | Il token è in Web Storage, leggibile da JavaScript: la CSP toglie il vettore principale, ma resta un residuo stretto. Chiusura futura: token in cookie httpOnly |

### Tampering — alterare

| minaccia | controllo | rischio residuo |
|---|---|---|
| Alterare i dati in transito | TLS ovunque | Basso |
| Alterare i dati a riposo | database solo su localhost | Compromissione dell'host |
| Client manomesso | il server riautorizza ogni richiesta (401/403) | Nessuno oltre i diritti dell'utente stesso |

### Repudiation — negare di aver fatto

| minaccia | controllo | rischio residuo |
|---|---|---|
| Un amministratore nega una lettura di dati sensibili | log applicativo minimo | Manca una traccia di chi ha letto cosa e quando (scelta dichiarata, vedi sotto) |

### Information disclosure — far uscire i dati

| minaccia | controllo | rischio residuo |
|---|---|---|
| Dump del database o backup rubato | cifratura a riposo (AES-256-GCM); la chiave sta fuori dal backup | Coperto per il furto offline; resta la compromissione dell'host, dove la chiave è in memoria |
| Accesso incrociato tra utenti — broken access control / IDOR (caso Baudr) | 401/403; ogni query cerca per id *e* proprietario insieme | Basso, verificato dall'audit esterno |
| ID progressivi rivelano il volume | nessuno | Informazione di scala, non un dato di nessuno |
| Chiave AI di un tester (BYOT) | cifrata, decifrata solo dal companion sul canale interno | Host compromesso |

### Denial of service

| minaccia | controllo | rischio residuo |
|---|---|---|
| Flood e scansioni | Caddy, fail2ban, reputazione condivisa (CrowdSec) | Un DDoS volumetrico vero; e il VPS singolo è un punto di rottura unico |
| Un tester brucia il credito AI condiviso | consumo tracciato; il BYOT sposta il costo; tetto di consumo predisposto | Il tetto è pronto ma tenuto spento finché il consumo resta basso |

### Elevation of privilege

| minaccia | controllo | rischio residuo |
|---|---|---|
| Tester diventa amministratore | controlli di ruolo lato server (403) | Basso, verificato |
| RCE via iniezione | query parametrizzate; nessuno stack vulnerabile in esecuzione; fail2ban blocca i payload; un guardiano rifiuta l'avvio con segreti di default o riusati | Uno 0-day in una dipendenza (il controllo CVE è periodico, non in tempo reale) |
| Compromissione dell'host | firewall, porte minime, servizi interni su localhost, aggiornamenti | L'apice: sconfigge la cifratura a riposo perché la chiave è sull'host |

## LINDDUN — privacy

| minaccia | controllo | rischio residuo |
|---|---|---|
| Collegabilità / identificabilità | accesso pseudonimo, mappa di re-identificazione fuori dal sistema | Chi gestisce tiene la mappa (necessario al servizio); il testo libero può contenere un dato identificante |
| Rilevabilità | TLS nasconde il contenuto | I metadati di rete restano visibili — standard |
| Inconsapevolezza | pagina di consenso | Dipende dall'adeguatezza del linguaggio |
| Non-conformità (art. 9 / 32) | pseudonimizzazione con chiave separata, cifratura, cancellazione a 30 giorni, accordo di trattamento con il fornitore AI | La chiave sull'host indebolisce la tesi delle «misure tecniche adeguate» contro una compromissione dell'host |

## Cosa resta scoperto, detto onestamente

- **La cifratura non protegge da un host già compromesso.** Copre il furto di un
  backup o di un dump — la chiave sta fuori dal backup — ma su un solo server che
  elabora le conversazioni con l'AI lato server, la chiave *deve* stare in memoria
  durante una sessione. Nessuna gestione delle chiavi batte un amministratore vivo:
  il gioco è alzarne il costo, ridurre la finestra (cancellazione a 30 giorni) e
  renderlo rumoroso, non fingere di eliminarlo. Se il progetto cresce, la strada è
  una gestione delle chiavi con un servizio esterno dedicato.
- **Il rilevamento è cieco sulle rotte valide.** Le soglie poggiano sui 404: un
  utente autenticato che tocca solo endpoint esistenti — abuso di logica,
  enumerazione lenta, raccolta dati che sembra legittima — non genera 404 e non
  compare. È una scelta consapevole; coprirla richiederebbe un limite di frequenza
  per utente e una traccia delle letture sensibili.
- **Gli identificativi sono interi progressivi**: informazione di scala.
- **Il livello host** è coperto da un controllo periodico, non in tempo reale.

Questa è la fotografia di oggi. Va rifatta quando cambia la superficie, o quando un
occhio esterno indipendente conduce un test proprio.
