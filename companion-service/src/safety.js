const CRISIS_TERMS = [
  'non voglio vivere',
  'farla finita',
  'suicid',
  'mi ammazzo',
  'voglio ammazzarmi',
  'voglio morire',
  'non vale la pena vivere',
  'mi taglio',
  'mi faccio del male',
  'autolesionismo',
  'finirla',
  'non voglio più stare qui',
  'non voglio piu stare qui',
  'mi butto',
  'mi butto dal',
];

export function assessRisk(message = '') {
  const text = message.toLowerCase();
  const immediateRisk = CRISIS_TERMS.some((term) => text.includes(term));

  if (immediateRisk) {
    return {
      level: 'high',
      guidance:
        'Mi dispiace che tu stia così. Non sei solo/a in questo. Se ti va, parlane con una persona di cui ti fidi o con il tuo medico: meriti di essere ascoltato/a e supportato/a.',
    };
  }

  return { level: 'standard', guidance: null };
}
