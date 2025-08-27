import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info', // level logging: error < warn < info < verbose < debug < silly
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [
    new winston.transports.Console(),           // tampil di console
    new winston.transports.File({ filename: 'logs/app.log' }) // simpan ke file
  ]
});