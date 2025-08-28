import 'dotenv/config';
import amqp from 'amqplib';
import { BookingService } from './BookingService.js';
import { InvoiceService } from './InvoiceService.js';
import { InvoiceStorage } from './InvoiceStorage.js';
import { Listener } from './listener.js';

const init = async () => {
  try {
    const bookingService = new BookingService();
    const invoiceService = new InvoiceService();
    const invoiceStorage = new InvoiceStorage();
    const listener = new Listener(bookingService, invoiceService, invoiceStorage);

    const connection = await amqp.connect(process.env.RABBITMQ_SERVER);
    const channel = await connection.createChannel();

    await channel.assertQueue('export:invoice', { durable: true });

    console.log('📡 Waiting for messages in queue "export:invoice"...');
    channel.consume('export:invoice', listener.listen, { noAck: true });
  } catch (error) {
    console.error('❌ Gagal inisialisasi consumer:', error.message);
    process.exit(1);
  }
};

init();
