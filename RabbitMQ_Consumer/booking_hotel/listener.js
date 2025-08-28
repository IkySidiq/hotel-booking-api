export class Listener {
  constructor(bookingService, invoiceService, invoiceStorage) {
    this._bookingService = bookingService;
    this._invoiceService = invoiceService;
    this._invoiceStorage = invoiceStorage;

    this.listen = this.listen.bind(this);
  }

  async listen(message) {
    try {
      const { bookingId, jobId } = JSON.parse(message.content.toString());
      console.log(bookingId, jobId);

      const { booking } = await this._bookingService.getBookingInvoiceData(bookingId);
      if (!booking) {
        console.error(`❌ Booking dengan ID ${bookingId} tidak ditemukan`);
        return;
      }

      console.log(`📨 Membuat invoice untuk booking "${booking.code}"`);

      const pdfBuffer = await this._invoiceService.generate(booking);

      const { filePath, filename } = await this._invoiceStorage.saveInvoice(jobId, pdfBuffer);

      console.log(`✅ Invoice berhasil dibuat & disimpan: ${filename} (${filePath})`);
    } catch (error) {
      console.error('❌ Gagal memproses export invoice:', error.message);
    }
  }
}
