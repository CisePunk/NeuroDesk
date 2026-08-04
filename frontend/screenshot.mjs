// Genera gli screenshot del prodotto per il sito.
//
// Perche' uno script e non catture a mano: le immagini fatte a mano invecchiano
// in silenzio (la cartella screenshots/ conteneva pagine cancellate da mesi).
// Cosi' rigenerarle tutte e' un comando, e nessuno deve ricordarsi di rifarle.
//
// Uso:  node _screenshot.mjs <codice-tester> <codice-tester-2> <codice-tester-3>
//
// Prerequisiti: backend, companion e vite accesi, e un database DEDICATO agli
// screenshot con etichette finte. Mai la produzione: in un'immagine pubblica
// non deve poter finire il nome di una persona vera.

import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const USCITA = process.env.USCITA || '/tmp/neurodesk-shot';
const BASE = 'http://localhost:5173';
// Il quarto codice serve per la schermata del consenso, che si vede una volta
// sola: se riuso un codice gia' entrato, quella schermata non compare piu'.
const [codiceIt, codiceEn, codiceFr, codiceNuovo] = process.argv.slice(2);
if (!codiceNuovo) {
    console.error('Servono quattro codici: tre per le lingue, uno mai usato per il consenso.');
    process.exit(1);
}

fs.mkdirSync(USCITA, { recursive: true });

// Le conversazioni sono inventate, ma le RISPOSTE sono generate dall'AI vera:
// uno screenshot che mostra una risposta finta racconterebbe una cosa che l'app non fa.
const CONVERSAZIONI = [
    { nome: 'companion-it', codice: codiceIt, area: 'crisis_mode',
      messaggio: 'Devo consegnare una relazione entro venerdì e non riesco a iniziare. Ogni volta che apro il file mi blocco.' },
    { nome: 'companion-en', codice: codiceEn, area: 'study_mode',
      messaggio: 'I have an exam in three days and I cannot start studying. Every time I open the book my mind goes blank.' },
    { nome: 'companion-fr', codice: codiceFr, area: 'bureaucracy_mode',
      messaggio: "Je dois renouveler un document administratif et je repousse depuis des semaines. Je ne sais pas par où commencer." },
];

const browser = await chromium.launch();
const scatti = [];

async function entra(page, codice, conConsenso = true) {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', codice);
    await page.click('button:has-text("Entra")');
    await page.waitForTimeout(1200);
    if (conConsenso && await page.locator('.consent-check input').count()) {
        await page.check('.consent-check input[type="checkbox"]');
        await page.click('button:has-text("Continua")');
        await page.waitForTimeout(1500);
    }
}

// Il Companion ripesca dal server l'ultima conversazione di quel codice: senza
// questa pulizia, rilanciare lo script due volte produce immagini con la
// conversazione precedente sopra quella nuova. Cosi' ogni giro riparte pulito.
async function puliscilaCronologia(page) {
    await page.evaluate(async () => {
        await fetch('http://localhost:8080/api/companion-sessions', {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + localStorage.getItem('nd-token') },
        });
        sessionStorage.removeItem('nd-companion-active');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
}

async function scatta(target, nome, opzioni = {}) {
    const file = path.join(USCITA, `${nome}.png`);
    await target.screenshot({ path: file, ...opzioni });
    const kb = Math.round(fs.statSync(file).size / 1024);
    scatti.push({ nome, kb });
    console.log(`  ${nome.padEnd(24)} ${String(kb).padStart(5)} KB`);
    return file;
}

// --- 1. Le tre conversazioni, una per lingua ---------------------------------
for (const c of CONVERSAZIONI) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await entra(page, c.codice);
    await puliscilaCronologia(page);
    await page.evaluate(() => localStorage.setItem('nd-theme', 'light'));
    await page.click(`.mode-card:has-text("${{ crisis_mode: 'Blocco', study_mode: 'Studio', bureaucracy_mode: 'Burocrazia' }[c.area]}")`)
        .catch(() => {});
    await page.fill('#companion-input', c.messaggio);
    await page.click('button.companion-submit');
    // L'AI vera ci mette qualche secondo: aspetto la risposta, non un tempo fisso.
    await page.waitForFunction(
        () => document.querySelectorAll('.companion-msg--assistant').length > 0,
        { timeout: 60000 },
    );
    await page.waitForTimeout(1200);
    // Via la riga con provider e token: e' diagnostica per noi, non racconta
    // niente a chi guarda, e su un'immagine pubblica sembra solo rumore tecnico.
    await page.evaluate(() => document.querySelector('.companion-meta')?.remove());
    await scatta(page.locator('.companion-panel'), c.nome);
    await ctx.close();
}

// --- 2. La schermata del consenso -------------------------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await entra(page, codiceNuovo, false);
    if (await page.locator('.consent-check input').count()) {
        await scatta(page.locator('.auth-card'), 'consenso');
    } else {
        console.log('  consenso                  SALTATO: il codice era già entrato');
    }
    await ctx.close();
}

// --- 3. La pagina Codici, lato di chi amministra -----------------------------
// Le etichette che si vedono qui arrivano dal database dedicato e sono
// dichiaratamente di esempio: e' l'unica schermata dove comparirebbero nomi.
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    // Scegli "Amministratore" per far comparire il campo password.
    const admin = page.locator('label:has-text("Amministratore")').first();
    if (await admin.count()) await admin.click();
    await page.fill('input[type="text"]', 'scuola');
    await page.fill('input[type="password"]', 'CambiaMi123!');
    await page.click('button:has-text("Entra")');
    await page.waitForTimeout(1500);
    await page.click('.nav-link:has-text("Codici")');
    await page.waitForTimeout(1500);
    await scatta(page, 'codici', { clip: { x: 0, y: 0, width: 1280, height: 760 } });
    await ctx.close();
}

// --- 4. Il Companion da telefono --------------------------------------------
{
    const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await entra(page, codiceEn);
    await page.waitForTimeout(800);
    await scatta(page, 'companion-telefono');
    await ctx.close();
}

console.log(`\n${scatti.length} immagini in ${USCITA}`);
await browser.close();
