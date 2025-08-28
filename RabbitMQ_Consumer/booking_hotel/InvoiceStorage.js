import fs from 'fs';
import path from 'path';

export class InvoiceStorage {
  constructor() {
    this._outDir = path.resolve(process.cwd(), 'invoices');
    if (!fs.existsSync(this._outDir)) {
      fs.mkdirSync(this._outDir, { recursive: true });
    }
  }

  async saveInvoice(jobId, pdfBuffer) {
    const filename = `invoice-${jobId}-${Date.now()}.pdf`;
    const filePath = path.join(this._outDir, filename);

    await fs.promises.writeFile(filePath, pdfBuffer);

    return { filePath, filename };
  }
}
