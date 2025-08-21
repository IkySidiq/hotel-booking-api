export const up = (pgm) => {
  pgm.createType('payment_status', ['settlement', 'capture', 'expire', 'deny', 'pending', 'unknown']);

  pgm.createTable('transactions_records', {
    id: { type: 'VARCHAR(100)', primaryKey: true },
    booking_id: { type: 'VARCHAR(100)', notNull: true },
    transaction_code: { type: 'VARCHAR(100)', notNull: true },
    amount: { type: 'DECIMAL(12,2)' },
    paid_at: { type: 'TIMESTAMP' },
    payment_status: { type: 'payment_status' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'TIMESTAMP' },
  });

  pgm.addConstraint('transactions_records', 'fk_transactions_records_booking_id', {
    foreignKeys: {
      columns: 'booking_id',
      references: 'bookings(id)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('transactions_records');
  pgm.dropType('payment_status');
};