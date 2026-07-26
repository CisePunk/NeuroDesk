// Test FISSO: verifica che il Companion non usi forme di genere riferite a chi
// scrive, specialmente nelle risposte di sostegno/crisi (dove il modello scivola).
//
// Non è deterministico (dipende dal modello): è uno spot-check da rilanciare dopo
// ogni modifica al system prompt. Chiama davvero l'AI, quindi consuma pochi token.
//
// Come si esegue, dalla cartella companion-service (serve la chiave AI nell'env):
//   node --env-file=.env test/gender-neutral.mjs
//
// Esce con codice 1 se trova forme di genere (utile in una pipeline), 0 se pulito.
// I casi sotto includono quello reale segnalato: "essere solo in questo momento".

import { generateCompanionReply } from '../src/aiProvider.js';

// I messaggi NON devono contenere forme di genere riferite a chi scrive (niente
// "mi sento solo"): il prompt dice al modello di rispecchiare il genere che usa
// la persona, quindi lì una risposta al maschile sarebbe corretta, non un errore.
// Usiamo temi che invitano lo scivolone ("solitudine" -> "non sei solo") ma con
// frasi neutre, così ogni aggettivo di genere in uscita è un vero errore.
const CASI = [
  // Caso dedicato allo scivolone reale: la solitudine in crisi tira "non sei solo".
  { nome: 'crisi-solitudine', mode: 'crisis_mode', message: 'non ce la faccio più, è tutto troppo e mi schiaccia la solitudine, non ho nessuno vicino' },
  { nome: 'crisi-fallimento', mode: 'crisis_mode', message: 'mi sento un fallimento totale, non combino niente di buono' },
  { nome: 'crisi-abbandono',  mode: 'crisis_mode', message: 'stanotte va malissimo, ho paura e non so a chi scrivere' },
  { nome: 'stanchezza',       mode: 'autonomy_mode', message: 'sono senza energie da giorni e non tengo dietro a niente' },
  { nome: 'confronto',        mode: 'study_mode',    message: 'ho paura di restare troppo indietro rispetto agli altri' },
];

// Aggettivi/participi in -o/-a riferibili alla persona: cerchiamo solo quando
// seguono un aggancio (sei/essere/da/ti senti...) così "un solo passo" NON scatta.
const AGGANCIO = 'sei|essere|resti|rimani|non sei|ti senti|sentirti|stai|sarai|eri|sembri|da|troppo|davvero|molto|così';
const GENERE = 'sol|stanc|sicur|pront|tranquill|content|bloccat|stuf|brav|sbagliat|perdut|spacciat|finit|sfinit|esaust|sopraffatt'
  // participi comuni dopo "sei ...": è qui che scappa "sei arrivato/a", "sei rimasto/a"...
  + '|arrivat|rimast|riuscit|andat|tornat|uscit|entrat|partit|cadut|cresciut|restat|stat|preparat';
const PATTERNS = [
  new RegExp(`\\b(?:${AGGANCIO})\\s+(?:una persona\\s+)?(?:${GENERE})[oa]\\b`, 'gi'),
  /\bsol[oa]\s+(?:in questo|con questo|davanti|di fronte|adesso|ora|qui|stanotte|oggi)\b/gi,
];

let problemi = 0;
for (const c of CASI) {
  let testo = '';
  try {
    const r = await generateCompanionReply({ message: c.message, mode: c.mode, profile: null, history: [] });
    testo = r?.text || '';
  } catch (e) {
    console.log(`\n[${c.nome}] ERRORE chiamata AI: ${e.message}`);
    problemi++;
    continue;
  }
  const hits = [];
  for (const p of PATTERNS) { p.lastIndex = 0; let m; while ((m = p.exec(testo))) hits.push(m[0]); }
  console.log(`\n[${c.nome}] (${c.mode}) -> ${hits.length ? 'GENERE RILEVATO' : 'ok'}`);
  if (hits.length) { problemi++; console.log('  forme trovate: ' + hits.join(' | ')); }
  console.log('  risposta: ' + testo.replace(/\s+/g, ' ').trim());
}

console.log(`\n=== ${problemi ? problemi + ' caso/i da rivedere' : 'nessuna forma di genere rilevata'} ===`);
console.log('(Nota: euristica non esaustiva — rileggi comunque le risposte qui sopra.)');
process.exit(problemi ? 1 : 0);
