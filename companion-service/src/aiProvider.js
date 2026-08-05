import { buildMessages } from './companionPrompt.js';
import { normalizeMode } from './modes.js';

const VALID_PROVIDERS = ['mock', 'openai', 'anthropic'];

function shortEcho(message) {
  const s = message.trim().replace(/\s+/g, ' ');
  const breakAt = s.search(/[.!?\n]/);
  const first = breakAt > 0 && breakAt < 60 ? s.slice(0, breakAt) : s.slice(0, 55).trim();
  return first.length < s.length ? `${first}…` : first;
}

function mockReply({ message, mode }) {
  const normalizedMode = normalizeMode(mode);
  const echo = shortEcho(message);
  const ack = `Ho letto: "${echo}".`;

  if (normalizedMode === 'crisis_mode') {
    return [
      ack,
      '',
      'Non devi risolvere tutto adesso.',
      '',
      'Prossimo passo (2 minuti): apri il documento o lo strumento che serve.',
      'Non scrivere ancora niente. Non pianificare. Solo aprilo.',
      '',
      'Quando è aperto, dimmi come stai.',
    ].join('\n');
  }

  if (normalizedMode === 'study_mode') {
    return [
      ack,
      '',
      'Se il materiale è troppo grande, il cervello va in sovraccarico.',
      '',
      'Adesso non studiamo tutto.',
      '',
      'Prossimo passo: incolla qui solo 10 righe della lezione.',
      'Io le trasformo in 3 punti semplici e 2 domande per ricordarle.',
    ].join('\n');
  }

  if (normalizedMode === 'bureaucracy_mode') {
    return [
      ack,
      '',
      'Questa cosa non va tenuta tutta in testa.',
      '',
      'Prossimo passo: scrivi solo tre dati.',
      '',
      '1. Ente o ufficio da contattare.',
      '2. Cosa hai già chiesto.',
      '3. Che risposta hai ricevuto.',
      '',
      "Poi preparo una bozza ordinata da verificare con l'ufficio competente.",
    ].join('\n');
  }

  if (normalizedMode === 'work_mode') {
    return [
      ack,
      '',
      'Partiamo dai vincoli, non da una scelta definitiva.',
      '',
      'Prossimo passo: dimmi quali limiti sono veri oggi.',
      '',
      '- niente sforzi fisici',
      '- poche ore consecutive',
      '- poca matematica',
      '- ambiente tranquillo',
      '- poche telefonate',
    ].join('\n');
  }

  if (normalizedMode === 'autonomy_mode') {
    return [
      ack,
      '',
      'Non facciamo tutta la gestione dei soldi oggi.',
      '',
      'Facciamo una sola fotografia.',
      '',
      'Prossimo passo: scrivi quanto hai disponibile ora e quali spese fisse arrivano entro 7 giorni.',
    ].join('\n');
  }

  return [
    ack,
    '',
    'In questo momento non serve risolvere tutto.',
    '',
    'Serve abbassare il carico.',
    '',
    'Prossimo passo da 2 minuti: scrivi qui qual è la cosa più urgente tra studio, soldi, lavoro, burocrazia o casa.',
  ].join('\n');
}

// Divide il prompt (formato OpenAI) in system + messaggi utente, per l'API Anthropic
// che vuole il system come campo separato e messages con soli ruoli user/assistant.
function splitSystemAndMessages({ message, mode, profile, history }) {
  const all = buildMessages({ message, mode, profile, history });
  const system = all.find((m) => m.role === 'system')?.content || '';
  const messages = all
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));
  return { system, messages };
}

// Continuazione AUTOMATICA se la risposta si tronca. Vale per TUTTI i provider:
// una persona neurodivergente puo' non sapere di dover scrivere "continua", e una
// risposta tagliata a meta' non deve mai arrivarle — men che meno quando arriva
// dal ripiego, cioe' proprio nel momento in cui qualcosa e' gia' andato storto.
// I modelli recenti non accettano il prefill assistant, quindi la continuazione
// e' un nuovo turno utente con istruzione esplicita a non ripetere.
// Una sola continuazione: basta e limita costi e duplicazioni.
const MAX_CONTINUAZIONI = 1;
const NUDGE_CONTINUA =
  'La tua risposta si è interrotta per limite di spazio. Continua da dove eri rimasta, '
  + 'riprendendo dall\'ultima frase incompleta. Non ripetere ciò che hai già scritto e non aggiungere saluti o premesse.';

/**
 * Ciclo comune di continuazione: chiama, e se la risposta risulta troncata
 * riprende da dove si era fermata. `chiamata(msgs)` deve restituire
 * { testo, troncata, inTok, outTok }; ogni provider sa riconoscere il proprio
 * segnale di troncamento (stop_reason / finish_reason) e lo traduce qui.
 * I token in ingresso sono quelli del PRIMO giro: e' la misura del prompt vero.
 */
async function conContinuazione(messaggiIniziali, chiamata) {
  let msgs = messaggiIniziali;
  let completo = '';
  let inTokPrimo = null;
  let outTokTot = 0;

  for (let giro = 0; giro <= MAX_CONTINUAZIONI; giro += 1) {
    const r = await chiamata(msgs);
    const chunk = r.testo.trim();
    completo = completo ? `${completo}\n${chunk}` : chunk;
    if (inTokPrimo === null) inTokPrimo = r.inTok ?? null;
    outTokTot += r.outTok ?? 0;
    if (!r.troncata) break;
    // Riparte da un nuovo turno utente: la conversazione DEVE finire con "user".
    msgs = [...msgs, { role: 'assistant', content: chunk }, { role: 'user', content: NUDGE_CONTINUA }];
  }

  const testo = completo.trim();
  // Una bolla vuota e' peggio di una risposta tronca: chi legge non capisce se
  // ha sbagliato lei, se e' rotto, o se deve aspettare. Se dopo la continuazione
  // non e' uscita nemmeno una frase, fallisco: cosi' scatta il ripiego sull'altro
  // provider, e in ultima istanza arriva un errore onesto invece del nulla.
  if (!testo) {
    throw new Error('Il modello non ha prodotto testo (tetto di token troppo basso o risposta vuota).');
  }
  return { testo, inTok: inTokPrimo, outTok: outTokTot };
}

// Un numero preso dall'ambiente, con la garanzia che sia davvero un numero.
// Number('') e Number('duemila') danno NaN, e un NaN qui non esplode subito: se
// ne va zitto dentro al corpo della richiesta e il provider risponde 400 —
// l'errore arriva a chi sta scrivendo, lontano dalla riga sbagliata. Meglio
// tenere il valore di riferimento e dirlo nel log una volta sola, all'avvio.
function numeroEnv(nome, difetto) {
  const grezzo = process.env[nome];
  if (grezzo === undefined || grezzo === '') return difetto;
  const n = Number(grezzo);
  if (!Number.isFinite(n) || n <= 0) {
    // Il valore, non il contenuto di nessuna conversazione: si puo' registrare.
    console.warn(`[ai] ${nome}="${grezzo}" non e' un numero positivo: uso ${difetto}`);
    return difetto;
  }
  return n;
}

// Timeout della chiamata al provider. Senza, fetch() di Node aspetta all'infinito:
// una richiesta appesa terrebbe occupata la connessione e l'utente resterebbe a
// fissare lo spinner. Meglio un errore onesto dopo N secondi.
const AI_TIMEOUT_MS = numeroEnv('AI_TIMEOUT_MS', 30_000);

// Errori transitori che vale la pena riprovare una volta sola:
// 429 = rate limit del provider, 529 = sovraccarico (Anthropic), 5xx = problema loro.
function transitorio(status) {
  return status === 429 || status === 529 || status >= 500;
}

const attendi = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// fetch con timeout e UN solo ritentativo sugli errori transitori.
// Un ritentativo, non tre: chi scrive è già in sovraccarico, aspettare 30 secondi
// per poi leggere comunque un errore è peggio che leggerlo subito.
async function fetchProvider(url, options, etichetta) {
  let ultimoErrore;

  for (let tentativo = 0; tentativo < 2; tentativo += 1) {
    if (tentativo > 0) await attendi(700);

    let response;
    try {
      response = await fetch(url, { ...options, signal: AbortSignal.timeout(AI_TIMEOUT_MS) });
    } catch (err) {
      // Timeout o rete: riprovabile.
      ultimoErrore = new Error(
        `${etichetta}: nessuna risposta (${err.name === 'TimeoutError' ? `timeout ${AI_TIMEOUT_MS}ms` : err.message})`,
      );
      ultimoErrore.provider = etichetta;
      continue;
    }

    if (response.ok) return response;

    const details = await response.text();
    ultimoErrore = new Error(`${etichetta} error: ${response.status} ${details}`);
    ultimoErrore.provider = etichetta;
    // Lo stato serve a chi sta sopra per decidere se ripiegare sull'altro
    // provider: senza, l'unica scelta possibile sarebbe fallire sempre.
    ultimoErrore.status = response.status;
    // 4xx "veri" (401 chiave sbagliata, 400 modello inesistente) non migliorano
    // riprovando: falliamo subito, così l'errore in log è quello giusto.
    if (!transitorio(response.status)) throw ultimoErrore;
  }

  throw ultimoErrore;
}

export function resolveProvider(requested) {
  const provider = requested || process.env.AI_PROVIDER || 'mock';
  if (!VALID_PROVIDERS.includes(provider)) {
    throw new Error(
      `AI provider non supportato: "${provider}". Valori validi: ${VALID_PROVIDERS.join(', ')}.`,
    );
  }
  return provider;
}

// Quando conviene passare all'altro provider invece di far fallire la richiesta.
// La regola distingue "il problema e' loro" da "il problema e' nostro":
//  - nessuna risposta (timeout, rete): loro, o la strada per arrivarci
//  - 429 rate limit, 529 sovraccarico, 5xx: loro
//  - 401/402/403: chiave scaduta, credito finito, account sospeso
//  - messaggi che parlano di credito o quota: capita che arrivino come 400
// NON si ripiega su un 400 generico: una richiesta malformata e' un bug nostro e
// fallirebbe identica sull'altro provider, con in piu' il costo di una chiamata.
const PAROLE_CREDITO = /credit|quota|billing|insufficient|payment|balance/i;

function valeIlRipiego(err) {
  if (PAROLE_CREDITO.test(err?.message || '')) return true;
  const stato = err?.status;
  if (stato === undefined) return true;
  return transitorio(stato) || stato === 401 || stato === 402 || stato === 403;
}

/**
 * Il credito e' finito, e non e' un guasto passeggero.
 *
 * La distinzione conta perche' cambia cosa diciamo a chi sta scrivendo: davanti a
 * un guasto momentaneo "riprova fra poco" e' vero, davanti al credito esaurito e'
 * una bugia — riprovare non serve finche' qualcuno non ricarica. Su chi sta
 * seguendo un passo alla volta, mandarlo a ritentare a vuoto e' il modo peggiore
 * di fallire.
 */
function eCredito(err) {
  if (err?.status === 402) return true;
  return PAROLE_CREDITO.test(err?.message || '');
}

function provideDiRipiego(primario) {
  if (primario === 'anthropic' && process.env.OPENAI_API_KEY) return 'openai';
  if (primario === 'openai' && process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

/**
 * Genera la risposta, con ripiego automatico sull'altro provider.
 *
 * Senza ripiego, un rate limit o un credito esaurito non fermano una persona:
 * fermano il Companion per tutti insieme, e chi sta scrivendo in un momento
 * difficile riceve un errore invece di un passo. Con due provider configurati
 * quel guasto diventa un rallentamento invisibile.
 *
 * Il ripiego NON e' silenzioso verso di noi: la risposta porta `ripiegoDa`, cosi'
 * il server lo registra e ce ne accorgiamo. E' silenzioso solo verso chi scrive,
 * che non deve sapere niente di tutto questo.
 */
export async function generateCompanionReply(opzioni) {
  const primario = resolveProvider(opzioni.provider);

  try {
    const risposta = await chiamaProvider({ ...opzioni, provider: primario });
    return opzioni.chiaveUtente ? { ...risposta, pagatoDaUtente: true } : risposta;
  } catch (err) {
    // CHIAVE PROPRIA DEL TESTER: qui NON si ripiega, mai.
    //
    // Ripiegare vorrebbe dire far pagare a noi la richiesta di chi si era offerto
    // di pagarsela — e in silenzio, per giunta: una chiave scaduta ci svuoterebbe
    // il credito senza che nessuno se ne accorga, cioe' l'esatto contrario dello
    // scopo. Meglio dirgli che la SUA chiave non va, cosi' puo' sistemarla lui.
    if (opzioni.chiaveUtente) {
      err.chiaveUtenteFallita = true;
      console.error(`[companion] la chiave personale dell'utente non funziona (${err.status ?? 'nessuna risposta'})`);
      throw err;
    }
    const ripiego = provideDiRipiego(primario);
    if (!ripiego || !valeIlRipiego(err)) {
      // Nessun secondo provider a cui appoggiarsi: se il primario e' a secco,
      // siamo a secco e basta, e va detto com'e'.
      if (!ripiego && eCredito(err)) err.creditoEsaurito = true;
      throw err;
    }

    // Log del solo motivo tecnico: mai il testo di chi scrive (Art. 9).
    console.error(`[companion] ${primario} non disponibile (${err.status ?? 'nessuna risposta'}), passo a ${ripiego}`);
    try {
      const risposta = await chiamaProvider({ ...opzioni, provider: ripiego });
      return { ...risposta, ripiegoDa: primario, motivoRipiego: String(err.message).slice(0, 200) };
    } catch (errRipiego) {
      // Sono caduti entrambi: torna l'errore del primario, che e' quello che
      // spiega la causa. Perdere questa informazione renderebbe cieca la diagnosi.
      console.error(`[companion] anche ${ripiego} non disponibile: ${errRipiego.message}`);
      // Entrambi a secco per credito: e' l'unico caso in cui "riprova fra poco"
      // sarebbe falso. Lo marchiamo qui perche' e' l'unico punto che ha visto
      // tutti e due gli errori.
      if (eCredito(err) && eCredito(errRipiego)) err.creditoEsaurito = true;
      throw err;
    }
  }
}

// Il provider effettivo si sceglie con AI_PROVIDER (env) oppure, per richiesta,
// col campo "provider" nel body: comodo per confrontare openai e haiku nelle prove
// senza riavviare il servizio.
async function chiamaProvider({ message, mode, profile, history, provider: requested, chiaveUtente }) {
  const provider = resolveProvider(requested);

  if (provider === 'mock') {
    return {
      provider: 'mock',
      model: 'mock',
      text: mockReply({ message, mode, profile }),
      usage: {
        estimatedInputTokens: estimateTokens(message),
        note: 'Stima locale. Il consumo reale dipende dal provider AI.',
      },
    };
  }

  if (provider === 'openai') {
    // Chiave del tester se ne ha portata una ("bring your own token"), altrimenti
    // quella comune. La sua non viene mai scritta ne' registrata da nessuna parte.
    const chiaveOpenai = chiaveUtente || process.env.OPENAI_API_KEY;
    if (!chiaveOpenai) {
      throw new Error('OPENAI_API_KEY è richiesta quando il provider è openai');
    }

    // Il ripiego risponde al posto del principale: se il principale e' un
    // Sonnet 5, qui non puo' esserci un modello piccolo. Chi riceve la risposta
    // non sa che il provider e' cambiato, e non deve accorgersene dal tono.
    const model = process.env.OPENAI_MODEL || 'gpt-5.6-terra';
    const tetto = numeroEnv('OPENAI_MAX_TOKENS', 2048);
    // I modelli di ragionamento (gpt-5.x, o1/o3/o4) rifiutano con 400 sia
    // `max_tokens` (vogliono `max_completion_tokens`) sia `temperature`
    // diversa dal default. Senza questa distinzione ogni chiamata fallirebbe.
    const ragionamento = /^(gpt-5|o[0-9])/.test(model);
    // Su quei modelli `max_completion_tokens` comprende ANCHE i token di
    // ragionamento, che non si vedono mai. Col solo tetto della risposta il
    // pensiero se lo mangerebbe e uscirebbe un testo tronco: serve una riserva
    // sopra al tetto, altrimenti si tronca proprio quando il modello ragiona di piu'.
    const riserva = numeroEnv('OPENAI_RISERVA_RAGIONAMENTO', 2048);
    const parametri = ragionamento
      ? { max_completion_tokens: tetto + riserva }
      : { max_tokens: tetto, temperature: 0.4 };

    const chiamata = async (msgs) => {
      const response = await fetchProvider(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${chiaveOpenai}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model, messages: msgs, ...parametri }),
        },
        'OpenAI',
      );
      const data = await response.json();
      const scelta = data.choices?.[0];
      return {
        testo: scelta?.message?.content || '',
        // OpenAI segnala il taglio per tetto raggiunto con finish_reason='length'.
        troncata: scelta?.finish_reason === 'length',
        inTok: data.usage?.prompt_tokens,
        outTok: data.usage?.completion_tokens,
      };
    };

    const esito = await conContinuazione(
      buildMessages({ message, mode, profile, history }),
      chiamata,
    );

    return {
      provider: 'openai',
      model,
      text: esito.testo,
      usage: normalizeUsage({
        inputTokens: esito.inTok,
        outputTokens: esito.outTok,
        message,
        note: 'Conteggio reale dal provider (OpenAI).',
      }),
    };
  }

  if (provider === 'anthropic') {
    const chiaveAnthropic = chiaveUtente || process.env.ANTHROPIC_API_KEY;
    if (!chiaveAnthropic) {
      throw new Error('ANTHROPIC_API_KEY è richiesta quando il provider è anthropic');
    }

    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
    const maxTokens = numeroEnv('ANTHROPIC_MAX_TOKENS', 2048);
    const { system, messages } = splitSystemAndMessages({ message, mode, profile, history });

    // Una singola chiamata all'API: ritorna testo, motivo di stop e usage grezzo.
    const chiamata = async (msgs) => {
      const response = await fetchProvider(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'x-api-key': chiaveAnthropic,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: msgs }),
        },
        'Anthropic',
      );
      const data = await response.json();
      const testo = (data.content || [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');
      return {
        testo,
        // Anthropic segnala il taglio per tetto raggiunto con stop_reason='max_tokens'.
        troncata: data.stop_reason === 'max_tokens',
        inTok: data.usage?.input_tokens,
        outTok: data.usage?.output_tokens,
      };
    };

    // Il tetto a 2048 fa completare in un colpo quasi ogni risposta; la
    // continuazione (vedi conContinuazione) e' la rete per i casi rari.
    const esito = await conContinuazione(messages, chiamata);

    return {
      provider: 'anthropic',
      model,
      text: esito.testo,
      usage: normalizeUsage({
        inputTokens: esito.inTok,
        outputTokens: esito.outTok,
        message,
        note: 'Conteggio reale dal provider (Anthropic).',
      }),
    };
  }

  // Non raggiungibile: resolveProvider ha già validato.
  throw new Error(`AI provider non supportato: "${provider}".`);
}

// Forma unica di "usage" per tutti i provider: il frontend legge sempre
// estimatedInputTokens, così il contratto non cambia tra mock e AI reale.
function normalizeUsage({ inputTokens, outputTokens, message, note }) {
  return {
    estimatedInputTokens: typeof inputTokens === 'number' ? inputTokens : estimateTokens(message),
    outputTokens: typeof outputTokens === 'number' ? outputTokens : null,
    note,
  };
}

export function estimateTokens(text = '') {
  return Math.ceil(text.length / 4);
}
