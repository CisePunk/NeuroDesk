export const MODES = {
  crisis_mode: {
    label: 'Blocco o crisi',
    maxWords: 120,
    instruction: 'Rispondi con massimo una micro-azione da 2-5 minuti. Non dare liste lunghe.',
  },
  study_mode: {
    label: 'Studio',
    maxWords: 220,
    instruction: 'Dividi studio, memoria o esercizi in blocchi piccoli. Se manca materiale, chiedi massimo 10 righe.',
  },
  bureaucracy_mode: {
    label: 'Burocrazia',
    maxWords: 220,
    instruction: 'Crea checklist, bozza messaggio o prossimo contatto. Ricorda di verificare con ente competente.',
  },
  work_mode: {
    label: 'Lavoro',
    maxWords: 220,
    instruction: 'Parti dai vincoli reali: salute, energia, stress, competenze, trasporti e orari.',
  },
  autonomy_mode: {
    label: 'Autonomie',
    maxWords: 180,
    instruction: 'Aiuta su soldi, casa, routine o scadenze con una sola abilita alla volta.',
  },
};

export function normalizeMode(mode) {
  return Object.hasOwn(MODES, mode) ? mode : 'crisis_mode';
}
