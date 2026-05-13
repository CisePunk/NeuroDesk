# Companion API Contract

Base URL locale:

```text
http://127.0.0.1:8090
```

## GET /health

Verifica stato servizio.

Response:

```json
{
  "status": "ok",
  "service": "neurodesk-companion-service",
  "provider": "mock"
}
```

## POST /api/companion/respond

Genera una risposta del bot.

Request:

```json
{
  "message": "Non riesco a studiare, dimentico tutto e mi viene da piangere",
  "mode": "crisis_mode",
  "profile": {
    "energy": "bassa",
    "memory": "fragile",
    "physicalLimits": ["no sforzi fisici"],
    "needs": ["studio", "burocrazia", "soldi"]
  }
}
```

`mode` accetta:

- `crisis_mode`
- `study_mode`
- `bureaucracy_mode`
- `work_mode`
- `autonomy_mode`

Response:

```json
{
  "mode": "crisis_mode",
  "risk": {
    "level": "standard",
    "guidance": null
  },
  "reply": "Ti credo...",
  "provider": "mock",
  "usage": {
    "estimatedInputTokens": 16,
    "note": "Stima locale. Il consumo reale dipende dal provider AI."
  }
}
```

Se viene rilevato rischio immediato, il servizio non chiama l'AI e restituisce una risposta di sicurezza.

Esempio rischio alto:

```json
{
  "mode": "crisis_mode",
  "risk": {
    "level": "high",
    "guidance": "Se sei in pericolo immediato, contatta subito il 112 o una persona fidata. Se puoi, non restare da sola mentre chiedi aiuto."
  },
  "reply": "Se sei in pericolo immediato, contatta subito il 112 o una persona fidata. Se puoi, non restare da sola mentre chiedi aiuto.",
  "provider": null,
  "nextAction": "Contatta subito una persona fidata o il 112 se sei in pericolo immediato."
}
```

## Policy Token

Il frontend deve mostrare all'utente che:

- la modalita' mock non consuma token
- la modalita' reale richiede API key o abbonamento
- materiali lunghi possono costare di piu'
- diagnosi, salute, farmaci, invalidita' e burocrazia richiedono professionisti o enti competenti
- i dati del profilo possono essere inviati al provider AI configurato
- prima di un deploy remoto serve rate limiting per proteggere token e costi
