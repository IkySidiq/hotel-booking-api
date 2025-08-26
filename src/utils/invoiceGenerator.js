import PDFDocument from 'pdfkit';
import fs from 'fs';

export const generateBookingInvoice = (bookingData, filePath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    stream.on('finish', resolve);
    stream.on('error', reject);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('Hotel Makmur', { align: 'center' });
    doc.fontSize(12).text(`Invoice #: ${bookingData.bookingId}`, { align: 'left' });
    doc.text(`Tanggal: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Customer
    doc.text(`Tamu: ${bookingData.guestName}`);
    doc.text(`Email: ${bookingData.email}`);
    doc.text(`Telepon: ${bookingData.phone}`);
    doc.moveDown();

    // Booking Details
    doc.text('Detail Kamar:');
    doc.text(`Tipe Kamar    : ${bookingData.roomType}`);
    doc.text(`Check-in      : ${bookingData.checkInDate}`);
    doc.text(`Check-out     : ${bookingData.checkOutDate}`);
    doc.text(`Jumlah Tamu   : ${bookingData.totalGuests}`);
    doc.text(`Jumlah Kamar  : ${bookingData.numberOfRooms}`);
    doc.text(`Harga / Malam : ${bookingData.pricePerNight}`);
    doc.text(`Jumlah Malam  : ${bookingData.totalNights}`);
    doc.moveDown();

    // Total
    doc.text(`Subtotal      : ${bookingData.totalPrice}`);
    doc.text(`Total         : ${bookingData.totalPrice}`);
    doc.moveDown();

    // Footer
    doc.text('Terima kasih telah memesan di Hotel Makmur!', { align: 'center' });

    doc.end();
  });
};

