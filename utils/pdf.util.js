const puppeteer = require('puppeteer');
const { uploadBuffer } = require('../services/upload.service');

const PDF_PAGE_FORMAT = 'A4';
const PDF_MARGIN = { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' };

/**
 * Wrap rendered contract HTML in a full HTML document with proper styling.
 */
const buildFullHtml = (renderedContent) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Times New Roman', serif;
      font-size: 14px;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
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
 * 4. Upload buffer to Cloudinary via uploadBuffer
 *
 * @param {string} renderedContent - The contract's rendered HTML
 * @param {string} contractNumber  - Used for the PDF filename
 * @returns {string}  secure_url of the uploaded PDF
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
