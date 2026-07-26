import { chromium } from 'playwright';
const log = (...a) => process.stderr.write(a.join(' ') + '\n');
const CODICE = process.env.ADMIN_CODICE, PASS = process.env.ADMIN_PASS;
const browser = await chromium.launch();
const page = await browser.newPage();
const cspViol = [];
page.on('console', (m) => { if (/content security policy|refused to/i.test(m.text())) cspViol.push(m.text()); });

await page.goto('https://app.neurodesk.it/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(1500);
// Login admin (codice + password)
const inputs = await page.getByRole('textbox').all();
await inputs[0].fill(CODICE);
const pwd = await page.locator('input[type=password]').count();
if (pwd) await page.locator('input[type=password]').first().fill(PASS);
await page.locator('button[type=submit]').first().click();
await page.waitForTimeout(2500);

// Vai alla pagina Companion
await page.goto('https://app.neurodesk.it/companion', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(2000);

const h1 = await page.getByRole('heading', { level: 1 }).allInnerTexts().catch(() => []);
log(`[#5 h1 su Companion] ${JSON.stringify(h1)}`);

// #1 textarea etichettata
const ta = page.locator('#companion-input');
const taName = await ta.evaluate((el) => (el.labels && el.labels[0]) ? el.labels[0].innerText : '(nessuna)').catch(() => '(non trovata)');
log(`[#1 textarea] nome accessibile: ${JSON.stringify(taName)}`);

// #2 live region
const live = await page.locator('.companion-thread').getAttribute('aria-live').catch(() => null);
const liveEmpty = await page.locator('[aria-live]').count();
log(`[#2 aria-live] su .companion-thread: ${live ?? '(thread non presente se vuota)'} | elementi aria-live in pagina: ${liveEmpty}`);

// #4 skip-link (nel layout con barra)
const skip = page.getByText('Salta al contenuto');
log(`[#4 skip-link] presente: ${await skip.count() > 0}`);

// #7 aria-expanded sul toggle avanzate
const toggle = page.getByRole('button', { name: /Opzioni avanzate/ });
const exp = await toggle.getAttribute('aria-expanded').catch(() => null);
log(`[#7 opzioni avanzate] aria-expanded: ${exp}`);

log(`[CSP] ${cspViol.length ? cspViol.join(' | ') : 'nessuna violazione'}`);
await browser.close();
process.exit(0);
