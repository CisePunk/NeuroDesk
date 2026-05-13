# NeuroDesk Companion MVP

NeuroDesk Companion e' un assistente AI pratico e motivazionale per adulti neurodivergenti o fragili che faticano con studio, lavoro, burocrazia, gestione quotidiana, memoria, sintesi e blocco emotivo.

Il progetto nasce come estensione Node.js del NeuroDesk esistente. Non sostituisce medici, terapeuti, tutor, CAF, patronati, uffici universitari o consulenti legali. Aiuta l'utente a trasformare un problema ingestibile in micro-azioni sostenibili.

## Persona di riferimento

La persona di riferimento e' anonima e sintetizzata da un caso reale letto in un gruppo pubblico. Il progetto non deve includere nomi, screenshot, citazioni riconoscibili o dati personali.

Profilo funzionale:

- adulta con ADHD e forte senso di fallimento
- difficolta' di memoria, sintesi, logica, scrittura ed esami lunghi
- problemi fisici e terapie che limitano energia e disponibilita'
- invalidita' o possibile percorso in categorie protette
- difficolta' con soldi, burocrazia, diagnosi, tutor universitario e lavoro
- bassa fiducia nelle proprie capacita'
- bisogno di istruzioni semplici, ripetute e non giudicanti

## Obiettivo del bot

Il bot non deve dire all'utente cosa dovrebbe essere. Deve aiutarla a capire cosa puo' fare adesso, in modo piccolo, concreto e sostenibile.

Promessa prodotto:

> Quando tutto sembra troppo, NeuroDesk Companion riduce il caos a un prossimo passo possibile.

## Modalita' MVP

### 1. Blocco o crisi

Per frasi come "non ce la faccio", "mi viene da piangere", "non ho scelta", "sono bloccata".

Output:

- riconoscimento breve
- abbassamento del carico
- una sola micro-azione da 2-5 minuti
- una domanda semplice

### 2. Studio

Per testi lunghi, esami, scritti, grammatica, concetti da memorizzare.

Output:

- micro-blocchi
- spiegazione semplice
- esempio guidato
- esercizi graduati
- mini-test senza aiuto
- ripasso programmato

### 3. Burocrazia

Per diagnosi, tutor, ufficio disabilita', categorie protette, documenti, email.

Output:

- checklist documenti
- prossima telefonata/email
- bozza messaggio
- promemoria follow-up
- disclaimer: non e' consulenza legale o amministrativa

### 4. Lavoro

Per orientamento realistico in presenza di limiti fisici, stress, bassa energia, difficolta' logiche o manuali.

Output:

- vincoli espliciti
- opzioni esplorabili
- micro-ricerca
- lettura semplificata annunci
- preparazione colloquio

### 5. Autonomie

Per gestione soldi, pagamenti, casa, routine, scadenze.

Output:

- micro-routine
- checklist a prova di sovraccarico
- una scadenza alla volta
- tracciamento "fatto / troppo difficile / rimandato"

## Principi di risposta

- frasi brevi
- massimo 1-3 passi
- mai paternalismo
- mai "devi solo impegnarti"
- mai liste lunghe quando l'utente e' in crisi
- nessuna promessa di guarigione, lavoro, esito universitario o beneficio economico
- nessun consiglio medico/farmacologico
- attenzione a salute, invalidita', terapie e vulnerabilita'

## Funzioni AI

MVP tecnico:

- `POST /api/companion/respond`
- input: messaggio utente, modalita', profilo opzionale
- output: risposta del bot, micro-azione, livello rischio, disclaimer opzionale

Funzioni successive:

- import materiale studio
- generazione esercizi
- ripasso programmato
- diario difficolta'
- memoria personale
- stima consumo token

## Token e costi

Le funzioni AI consumano token. L'utente finale deve collegare una propria API key oppure attivare un piano che copra il costo dei token.

NeuroDesk deve indicare chiaramente:

- che l'AI non e' gratuita da erogare
- che testi lunghi consumano piu' token
- che l'utente puo' scegliere un provider compatibile
- che una modalita' mock o locale puo' essere usata per demo e sviluppo

## Integrazione con NeuroDesk esistente

Il NeuroDesk originale usa React + Spring Boot. Questa estensione puo' vivere come servizio separato Node.js:

- React chiama il servizio Companion su porta dedicata
- Spring Boot resta fonte dati per studenti, moduli e task
- il servizio Node.js genera micro-piani e suggerimenti
- in futuro Spring Boot puo' salvare i risultati generati

Architettura iniziale:

```text
React/Vite NeuroDesk
  -> Spring Boot API: studenti, moduli, task
  -> Node.js Companion API: AI, prompt, micro-piani
       -> provider AI esterno o mock
```
