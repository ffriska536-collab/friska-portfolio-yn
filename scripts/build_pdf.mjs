// Membuat CV dan Portofolio PDF dari index.html memakai Chromium (Playwright).
// Dijalankan otomatis oleh GitHub Actions (.github/workflows/build-pdf.yml).
// Manual:  npm i --no-save playwright && npx playwright install chromium && node scripts/build_pdf.mjs
import { chromium } from 'playwright';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = pathToFileURL(path.join(root, 'index.html')).href;

const JOBS = [
  { mode: 'cv', out: 'CV_Friska_Yani_Natalia_Hutasoit.pdf' },
  { mode: 'pf', out: 'Portfolio_Friska_Yani_Natalia_Hutasoit.pdf' },
];

const browser = await chromium.launch();
try {
  for (const job of JOBS) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.goto(`${base}?print=${job.mode}`, { waitUntil: 'load' });

    // Pastikan semua gambar (termasuk yang lazy-load) benar-benar termuat.
    const broken = await page.evaluate(async () => {
      const imgs = [...document.images].filter(i => i.offsetParent !== null || i.closest('#cv-doc, #activities, .hero'));
      imgs.forEach(i => { i.loading = 'eager'; });
      await Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
      await Promise.all(imgs.map(i => (i.decode ? i.decode().catch(() => {}) : null)));
      return imgs.filter(i => !i.naturalWidth).map(i => i.getAttribute('src'));
    });
    if (broken.length) console.warn(`⚠ [${job.mode}] gambar tidak ditemukan:`, [...new Set(broken)].join(', '));

    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: path.join(root, job.out),
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true, // margin diatur lewat @page di index.html
    });
    console.log(`✓ ${job.out}`);
    await page.close();
  }
} finally {
  await browser.close();
}
