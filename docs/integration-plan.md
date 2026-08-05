# Integration Plan With Existing NeuroDesk

Il progetto esistente vive nella root del repository NeuroDesk.

Questa estensione vive in:

```text
companion-service
```

## Passo 1: servizio separato

Avviare:

```bash
cd companion-service
npm run dev
```

Il servizio espone:

```text
POST http://127.0.0.1:8090/api/companion/respond
```

## Passo 2: pagina React Companion

Gia' completato nel frontend:

- `src/pages/CompanionPage.jsx`
- `src/api/companionApi.js`
- voce menu "Companion"
- route `/companion`

La prima UI e' semplice:

- selettore modalita'
- textarea "Cosa non riesci a fare adesso?"
- bottone "Aiutami a fare il prossimo passo"
- box risposta
- box costo/stima token

## Passo 3: salvataggio su Spring Boot

Quando la UI funziona, aggiungere lato Java:

- entity `CompanionSession`
- entity `MicroAction`
- endpoint `POST /api/companion-sessions`

Campi minimi:

- messaggio originale
- modalita'
- risposta AI
- livello rischio
- micro-azione
- stato: `DA_FARE`, `FATTO`, `TROPPO_DIFFICILE`, `RIMANDATO`

## Passo 4: versione AI reale

Impostare:

```text
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-terra
```

Nota prodotto:

L'API key non deve stare nel frontend. Deve vivere solo nel servizio Node.js o in un backend sicuro.

## Passo 5: UX specifica per adulti ADHD

Regole UI:

- una domanda per schermata quando possibile
- nessun muro di testo
- pulsanti chiari
- stato visibile: "sto preparando", "fatto", "troppo difficile"
- possibilita' di chiedere "spezza ancora"
- possibilita' di salvare il prossimo passo

## Prima di un deploy remoto

- aggiungere rate limiting, per esempio massimo 10 richieste/minuto per IP
- informare l'utente prima di inviare dati sensibili al provider AI
- non salvare API key nel frontend
- valutare logging strutturato e disattivare log rumorosi in produzione
