import amqp from 'amqplib';
import { logger } from '../../utils/logger.js';

export class ProducerService {
  static async sendMessage(queue, message) {
    let connection;
    let channel;

    try {
      connection = await amqp.connect(process.env.RABBITMQ_SERVER);
      channel = await connection.createConfirmChannel();
      await channel.assertQueue(queue, { durable: true });

      const msgBuffer = Buffer.from(
        typeof message === 'string' ? message : JSON.stringify(message)
      );

      await new Promise((resolve, reject) => {
        channel.sendToQueue(queue, msgBuffer, {}, (err, ok) => {
          if (err) return reject(err);
          resolve(ok);
        });
      });

      logger.info(`✅ Message berhasil dikirim ke queue "${queue}"`);
    } catch (error) {
      logger.error(`❌ Gagal mengirim message ke RabbitMQ: ${error.message}`);
      throw error;
    } finally {
      if (channel) await channel.close().catch(() => {});
      if (connection) await connection.close().catch(() => {});
    }
  }
}
