import { buildMessages } from './companionPrompt.js';
import { normalizeMode } from './modes.js';

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

export async function generateCompanionReply({ message, mode, profile }) {
  const provider = process.env.AI_PROVIDER || 'mock';

  if (provider === 'mock') {
    return {
      provider: 'mock',
      text: mockReply({ message, mode, profile }),
      estimatedTokens: estimateTokens(message),
    };
  }

  if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        messages: buildMessages({ message, mode, profile }),
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`OpenAI error: ${response.status} ${details}`);
    }

    const data = await response.json();
    return {
      provider: 'openai',
      text: data.choices?.[0]?.message?.content || '',
      usage: data.usage || null,
    };
  }

  throw new Error(`AI_PROVIDER non supportato: "${provider}". Valori validi: mock, openai`);
}

export function estimateTokens(text = '') {
  return Math.ceil(text.length / 4);
}
