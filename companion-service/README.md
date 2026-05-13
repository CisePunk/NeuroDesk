# NeuroDesk Companion Service

Servizio Node.js minimale per aggiungere un bot AI a NeuroDesk.

Il servizio funziona senza dipendenze esterne e supporta due modalita':

- `AI_PROVIDER=mock`: demo locale deterministica, senza chiavi e senza consumare token
- `AI_PROVIDER=openai`: chiamata a provider compatibile con OpenAI usando `OPENAI_API_KEY`

> **Disclaimer.** Di default il servizio gira in `mock` e mostra l'intera
> architettura senza costi. Per ottenere risposte AI reali serve collegare una
> chiave API valida nel file `.env` e avviare il servizio
> caricando le variabili d'ambiente. Senza chiave, il servizio resta in `mock`:
> e' l'ultimo passo di configurazione, non una parte mancante del codice.

## Avvio

```bash
cp .env.example .env
# inserisci la tua chiave API nel file .env, poi:
node --env-file=.env src/server.js
```

Verifica del provider attivo:

```bash
curl http://localhost:8090/health
# "provider": "mock"      -> nessuna chiave caricata (demo)
# "provider": "openai"    -> chiave OpenAI attiva
```

Default:

- API: `http://localhost:8090`
- endpoint: `POST /api/companion/respond`
- bind locale: `127.0.0.1`

## Esempio richiesta

```bash
curl -X POST http://localhost:8090/api/companion/respond \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Non riesco a studiare, dimentico tutto e mi viene da piangere",
    "mode": "crisis_mode"
  }'
```

## Token

In modalita' reale, l'utente finale deve collegare una propria API key o attivare un piano che copra il costo dei token.

Il progetto deve mostrare questa informazione prima di elaborare materiali lunghi.

Se il profilo contiene dati sensibili, questi possono essere inviati al provider AI configurato. L'interfaccia deve chiedere consenso esplicito prima di inviare diagnosi, salute, invalidita', terapia o dati burocratici.

Prima di esporre il servizio fuori da localhost, aggiungere rate limiting per evitare consumo incontrollato di token.

## Collegamento a NeuroDesk

La guida di integrazione e' in `../docs/integration-plan.md`.
