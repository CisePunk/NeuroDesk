# HOWTO USO - NeuroDesk

Questo documento spiega, passo per passo, come usare NeuroDesk in locale.

Non e' il README. E' una guida operativa.

## 1. Aprire la cartella corretta

La cartella unica del progetto e':

```bash
cd /Users/cisepunk/Desktop/ciseops/neurodesk
```

Da qui partono tutti i comandi.

La struttura utile e':

```text
backend             API Spring Boot
frontend            interfaccia React
companion-service   servizio Node.js AI/mock
docs                documentazione
screenshots         immagini del progetto
```

## 2. Cosa serve installato

Prima di avviare tutto servono:

- Java 21
- Node.js 20.6 o superiore
- MySQL
- Maven wrapper gia' incluso nel backend

Per controllare:

```bash
java -version
node -v
mysql --version
```

Node deve essere almeno `20.6`, perche' il Companion usa:

```bash
node --env-file=.env
```

## 3. Preparare il database MySQL

Aprire MySQL e creare il database:

```sql
CREATE DATABASE neurodesk_db;
```

Il nome atteso dal backend e':

```text
neurodesk_db
```

## 4. Preparare la configurazione backend

Entrare nella cartella backend:

```bash
cd /Users/cisepunk/Desktop/ciseops/neurodesk/backend
```

Copiare il file esempio:

```bash
cp src/main/resources/application.properties.example src/main/resources/application.properties
```

Aprire:

```text
backend/src/main/resources/application.properties
```

Impostare utente e password MySQL:

```properties
spring.datasource.username=IL_TUO_UTENTE_MYSQL
spring.datasource.password=LA_TUA_PASSWORD_MYSQL
```

La configurazione completa deve restare simile a questa:

```properties
spring.application.name=neurodesk

spring.datasource.url=jdbc:mysql://localhost:3306/neurodesk_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=IL_TUO_UTENTE_MYSQL
spring.datasource.password=LA_TUA_PASSWORD_MYSQL
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
server.port=8080
```

## 5. Avviare il backend

Dalla cartella:

```bash
cd /Users/cisepunk/Desktop/ciseops/neurodesk/backend
```

avviare:

```bash
./mvnw spring-boot:run
```

Il backend deve partire su:

```text
http://localhost:8080
```

Endpoint principali:

```text
http://localhost:8080/api/studenti
http://localhost:8080/api/moduli
http://localhost:8080/api/task
```

Lasciare questo terminale aperto.

## 6. Avviare il frontend

Aprire un secondo terminale.

Entrare nella cartella frontend:

```bash
cd /Users/cisepunk/Desktop/ciseops/neurodesk/frontend
```

Se e' la prima volta:

```bash
npm install
```

Poi avviare:

```bash
npm run dev
```

Il frontend deve partire su:

```text
http://localhost:5173
```

Aprire il browser su:

```text
http://localhost:5173
```

## 7. Usare la piattaforma principale

Nella piattaforma puoi usare:

- Dashboard
- Studenti
- Moduli
- Task
- tema chiaro/scuro

### 7.1 Creare uno studente

1. Aprire `Studenti`.
2. Cliccare `Nuovo studente`.
3. Compilare:
   - nome
   - cognome
   - email
   - profilo neurodivergente, se utile
   - livello energia preferito
4. Salvare.

### 7.2 Creare un modulo

1. Aprire `Moduli`.
2. Cliccare `Nuovo modulo`.
3. Compilare:
   - titolo
   - tecnologia o materia
   - stato
   - difficolta'
   - carico cognitivo
   - descrizione
4. Salvare.

### 7.3 Creare un task

Prima devono esistere almeno:

- uno studente
- un modulo

Poi:

1. Aprire `Task`.
2. Cliccare `Nuovo task`.
3. Scegliere studente e modulo.
4. Compilare:
   - titolo
   - priorita'
   - stato
   - durata stimata
   - tag focus
   - finestra energia
   - descrizione
5. Salvare.

### 7.4 Leggere la dashboard

La dashboard mostra:

- numero studenti
- numero moduli
- numero task
- percentuale task completati
- ultimi task creati

Serve per avere una vista rapida senza dover rileggere tutto.

## 8. Avviare il Companion Service

Il Companion Service e' il servizio Node.js che prepara le funzioni AI.

Aprire un terzo terminale.

Entrare nella cartella:

```bash
cd /Users/cisepunk/Desktop/ciseops/neurodesk/companion-service
```

Se il file `.env` non esiste:

```bash
cp .env.example .env
```

Avviare:

```bash
npm run dev
```

Il servizio deve partire su:

```text
http://127.0.0.1:8090
```

Lasciare questo terminale aperto.

## 9. Testare il Companion Service

Aprire un quarto terminale oppure usare lo stesso terminale dopo aver lasciato il servizio attivo in un altro.

Controllare se il servizio e' vivo:

```bash
curl http://127.0.0.1:8090/health
```

Risposta attesa:

```json
{
  "status": "ok",
  "service": "neurodesk-companion-service",
  "provider": "mock"
}
```

## 10. Usare il Companion in modalita' mock

Il Companion ora e' disponibile anche nel browser.

Con frontend, backend e Companion Service accesi:

1. aprire `http://localhost:5173`
2. cliccare `Companion` nella sidebar
3. scegliere una modalita'
4. scrivere cosa non si riesce a fare adesso
5. decidere se includere il profilo funzionale minimale
6. cliccare `Aiutami a fare il prossimo passo`

La risposta compare nel pannello a destra.

La modalita' mock non consuma token.

## 10.1 Testare il Companion via API

Per test tecnici si puo' usare anche l'endpoint diretto.

Esempio modalita' studio:

```bash
curl -X POST http://127.0.0.1:8090/api/companion/respond \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Non riesco a studiare, dimentico tutto e mi viene da piangere",
    "mode": "study_mode"
  }'
```

Risposta attesa simile:

```json
{
  "mode": "study_mode",
  "risk": {
    "level": "standard",
    "guidance": null
  },
  "reply": "Ti credo. Se il materiale è troppo grande, il cervello va in sovraccarico...",
  "provider": "mock",
  "usage": {
    "estimatedInputTokens": 16,
    "note": "Stima locale. Il consumo reale dipende dal provider AI."
  }
}
```

## 11. Modalita' Companion disponibili

Puoi cambiare il valore di `mode`.

### Blocco o crisi

```json
"mode": "crisis_mode"
```

Da usare quando l'utente e' in blocco, pianto, panico, sovraccarico o fallimento.

### Studio

```json
"mode": "study_mode"
```

Da usare per testi lunghi, memoria, sintesi, esercizi, esami.

### Burocrazia

```json
"mode": "bureaucracy_mode"
```

Da usare per documenti, diagnosi, tutor, uffici, categorie protette, richieste scritte.

### Lavoro

```json
"mode": "work_mode"
```

Da usare per orientamento, vincoli fisici, annunci, colloqui, possibilita' realistiche.

### Autonomie

```json
"mode": "autonomy_mode"
```

Da usare per soldi, scadenze, pagamenti, casa, routine.

## 12. Usare un profilo utente nel Companion

Si puo' passare un profilo opzionale:

```bash
curl -X POST http://127.0.0.1:8090/api/companion/respond \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Devo gestire una scadenza ma mi blocco",
    "mode": "autonomy_mode",
    "profile": {
      "energy": "bassa",
      "memory": "fragile",
      "physicalLimits": ["no sforzi fisici"],
      "needs": ["soldi", "burocrazia", "micro-passaggi"]
    }
  }'
```

Attenzione: in modalita' `mock` non viene chiamato nessun provider esterno. In modalita' AI reale, il profilo puo' essere inviato al provider configurato.

## 13. Usare il Companion con AI reale

Aprire:

```text
companion-service/.env
```

Impostare:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=LA_TUA_API_KEY
OPENAI_MODEL=gpt-4.1-mini
```

Poi riavviare il servizio:

```bash
npm run dev
```

Importante:

- l'API key non deve mai stare nel frontend
- l'utente finale deve avere una propria API key o un abbonamento
- ogni richiesta puo' consumare token
- testi lunghi costano di piu'
- dati sensibili possono essere inviati al provider AI

## 14. Fermare i servizi

Per fermare backend, frontend o companion:

1. andare nel terminale dove il servizio e' in esecuzione
2. premere:

```text
CTRL + C
```

## 15. Verificare che il codice sia a posto

Dalla root:

```bash
cd /Users/cisepunk/Desktop/ciseops/neurodesk
```

### Frontend lint

```bash
cd frontend
npm run lint
```

Deve finire senza errori.

### Frontend build

```bash
cd frontend
npm run build
```

Deve finire con:

```text
✓ built
```

### Backend test

```bash
cd backend
./mvnw test
```

Deve finire con:

```text
BUILD SUCCESS
```

### Companion smoke test

```bash
cd companion-service
npm run dev
```

Poi, da un altro terminale:

```bash
curl http://127.0.0.1:8090/health
```

Deve rispondere con `status: ok`.

## 16. Cosa non e' ancora pronto

La pagina React del Companion e' pronta per l'uso base.

Mancano ancora funzioni avanzate:

- storico conversazioni
- salvataggio delle sessioni Companion nel backend
- profilo utente modificabile da UI
- consenso privacy/token persistente

## 17. Problemi comuni

### Il backend non parte

Controllare:

- MySQL acceso
- database `neurodesk_db` creato
- username/password corretti in `application.properties`
- porta `8080` libera

### Il frontend parte ma non carica dati

Controllare:

- backend acceso su `http://localhost:8080`
- CORS configurato
- database raggiungibile

### Il Companion non parte

Controllare:

- Node almeno `20.6`
- file `.env` presente in `companion-service`
- porta `8090` libera

### La modalita' OpenAI non funziona

Controllare:

- `AI_PROVIDER=openai`
- `OPENAI_API_KEY` presente
- API key valida
- connessione internet
- credito/token disponibili sul provider

## 18. Uso consigliato per demo

Per una demo semplice:

1. Avviare MySQL.
2. Avviare backend.
3. Avviare frontend.
4. Aprire `http://localhost:5173`.
5. Creare uno studente.
6. Creare un modulo.
7. Creare un task.
8. Mostrare la dashboard.
9. Avviare Companion Service.
10. Aprire `Companion` dalla sidebar.
11. Fare una richiesta in `study_mode` o `crisis_mode`.

## 19. Nota etica

NeuroDesk Companion e' un supporto operativo.

Non deve essere presentato come terapia, diagnosi, consulenza medica, consulenza legale o soluzione automatica a problemi di invalidita', lavoro o universita'.

Il suo scopo e':

- ridurre il carico cognitivo
- proporre micro-passaggi
- aiutare a scrivere richieste e checklist
- sostenere l'utente senza giudizio
- rendere visibili limiti, energia e priorita'
