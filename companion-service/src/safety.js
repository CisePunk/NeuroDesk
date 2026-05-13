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
        'Se sei in pericolo immediato, contatta subito il 112 o una persona fidata. Se puoi, non restare da sola mentre chiedi aiuto.',
    };
  }

  return { level: 'standard', guidance: null };
}
