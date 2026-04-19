const puppeteer = require('puppeteer');
const path = require('path');
const { pathToFileURL } = require('url');
const { uploadBuffer } = require('../services/upload.service');

const PDF_PAGE_FORMAT = 'A4';
const PDF_MARGIN = { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' };
const TIMES_FONT_FILE_URL = pathToFileURL(
  path.resolve(__dirname, '../assets/fonts/times.ttf'),
).href;

/**
 * Wrap rendered contract HTML in a full HTML document with proper styling.
 */
const buildFullHtml = (renderedContent) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    @font-face {
      font-family: 'TimesLocal';
      src: url('${TIMES_FONT_FILE_URL}') format('truetype');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    body {
      font-family: 'TimesLocal', 'Times New Roman', Times, 'Liberation Serif', 'DejaVu Serif', serif;
      font-size: 14px;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    img { max-width: 100%; }
    h1, h2, h3, h4 { margin-top: 16px; margin-bottom: 8px; }
    p { margin: 4px 0; }
  </style>
</head>
<body>${renderedContent}</body>
</html>`;

/**
 * Generate a PDF from rendered contract HTML content.
 *
 * 1. Launch headless Chromium
 * 2. Set HTML content and wait for images (signatures, logos) to load
 * 3. Export PDF buffer
 * 4. Upload buffer to S3 via uploadBuffer
 *
 * @param {string} renderedContent - The contract's rendered HTML
 * @param {string} contractNumber  - Used for the PDF filename
 * @returns {string}  S3 object key of the uploaded PDF
 */
async function generateContractPdf(renderedContent, contractNumber) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(buildFullHtml(renderedContent), {
      waitUntil: 'networkidle0',
    });
    await page.emulateMediaType('screen');
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });

    const pdfBuffer = await page.pdf({
      format: PDF_PAGE_FORMAT,
      margin: PDF_MARGIN,
      printBackground: true,
    });

    const filename = `${contractNumber}.pdf`;
    return await uploadBuffer(Buffer.from(pdfBuffer), 'contract_pdf', filename);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { generateContractPdf };
