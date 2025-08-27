import { generateInvoiceHTML } from './generateInvoiceHTML.js';
import puppeteer from 'puppeteer';

export const generateBookingInvoice = async (bookingData, filePath) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const htmlContent = generateInvoiceHTML(bookingData);
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: filePath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
  });

  await browser.close();
};

