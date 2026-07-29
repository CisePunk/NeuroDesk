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

// Timeout della chiamata al provider. Senza, fetch() di Node aspetta all'infinito:
// una richiesta appesa terrebbe occupata la connessione e l'utente resterebbe a
// fissare lo spinner. Meglio un errore onesto dopo N secondi.
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 30_000);

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

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    const tetto = Number(process.env.OPENAI_MAX_TOKENS || 1536);
    // I modelli di ragionamento (gpt-5.x, o1/o3/o4) rifiutano con 400 sia
    // `max_tokens` (vogliono `max_completion_tokens`) sia `temperature`.
    // Senza questa distinzione, mettere un gpt-5 in OPENAI_MODEL romperebbe
    // ogni chiamata. Cap sull'output in entrambi i casi: freno ai costi.
    const ragionamento = /^(gpt-5|o[0-9])/.test(model);
    const parametri = ragionamento
      ? { max_completion_tokens: tetto }
      : { max_tokens: tetto, temperature: 0.4 };

    const response = await fetchProvider(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${chiaveOpenai}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: buildMessages({ message, mode, profile, history }),
          ...parametri,
        }),
      },
      'OpenAI',
    );

    const data = await response.json();
    return {
      provider: 'openai',
      model,
      text: data.choices?.[0]?.message?.content?.trim() || '',
      usage: normalizeUsage({
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
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
    const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS || 2048);
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
      return { testo, stop: data.stop_reason, inTok: data.usage?.input_tokens, outTok: data.usage?.output_tokens };
    };

    // Continuazione AUTOMATICA se la risposta si tronca (stop_reason=max_tokens).
    // Un utente neurodivergente puo' non sapere di dover scrivere "continua": la
    // risposta troncata a meta' (es. una bozza interrotta) non deve mai arrivargli.
    // I modelli recenti (sonnet-5) NON accettano il prefill assistant, quindi la
    // continuazione e' un nuovo turno utente con istruzione esplicita a non ripetere.
    // Il tetto a 2048 fa completare in un colpo quasi ogni risposta; questa e' la
    // rete per i casi rari. Una sola continuazione: basta e limita costi/duplicazioni.
    const MAX_CONTINUAZIONI = 1;
    const NUDGE_CONTINUA =
      'La tua risposta si è interrotta per limite di spazio. Continua da dove eri rimasta, '
      + 'riprendendo dall\'ultima frase incompleta. Non ripetere ciò che hai già scritto e non aggiungere saluti o premesse.';
    let msgs = messages;
    let completo = '';
    let inTokPrimo = null;
    let outTokTot = 0;

    for (let giro = 0; giro <= MAX_CONTINUAZIONI; giro += 1) {
      const r = await chiamata(msgs);
      const chunk = r.testo.trim();
      completo = completo ? `${completo}\n${chunk}` : chunk;
      if (inTokPrimo === null) inTokPrimo = r.inTok ?? null;
      outTokTot += r.outTok ?? 0;
      if (r.stop !== 'max_tokens') break;
      // Riparte da un nuovo turno utente: la conversazione DEVE finire con "user".
      msgs = [...msgs, { role: 'assistant', content: chunk }, { role: 'user', content: NUDGE_CONTINUA }];
    }

    return {
      provider: 'anthropic',
      model,
      text: completo.trim(),
      usage: normalizeUsage({
        inputTokens: inTokPrimo,
        outputTokens: outTokTot,
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
