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

// Il provider effettivo si sceglie con AI_PROVIDER (env) oppure, per richiesta,
// col campo "provider" nel body: comodo per confrontare openai e haiku nelle prove
// senza riavviare il servizio.
export async function generateCompanionReply({ message, mode, profile, history, provider: requested }) {
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
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY è richiesta quando il provider è openai');
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    const tetto = Number(process.env.OPENAI_MAX_TOKENS || 1024);
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
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY è richiesta quando il provider è anthropic');
    }

    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
    const { system, messages } = splitSystemAndMessages({ message, mode, profile, history });

    const response = await fetchProvider(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS || 1024),
          system,
          messages,
        }),
      },
      'Anthropic',
    );

    const data = await response.json();
    const text = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    return {
      provider: 'anthropic',
      model,
      text,
      usage: normalizeUsage({
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
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
