import { generateInvoiceHTML } from './generateInvoiceHTML.js';
import puppeteer from 'puppeteer';

export class InvoiceService {
  async generate(bookingData) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const htmlContent = generateInvoiceHTML(bookingData);
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
    });

    await browser.close();

    return pdfBuffer; // fleksibel: bisa simpan lokal, upload S3, atau kirim email
  }
}
