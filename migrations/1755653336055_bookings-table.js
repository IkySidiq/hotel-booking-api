export const up = (pgm) => {
  // Enum untuk status booking
  pgm.createType('booking_status', [
    'pending_payment',
    'confirmed',
    'checked-in',
    'cancelled',
    'no-show',
    'failed',
    'check-out'
  ]);

  pgm.createTable('bookings', {
    id: {
      type: 'VARCHAR(100)',
      primaryKey: true,
    },
    user_id: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    room_id: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    guest_name: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    total_guest: {
      type: 'SMALLINT',
      notNull: true,
    },
    special_request: {
      type: 'TEXT',
    },
    check_in_date: {
      type: 'DATE',
      notNull: true,
    },
    check_out_date: {
      type: 'DATE',
      notNull: true,
    },
    total_price: {
      type: 'DECIMAL(12,2)',
    },
    status: {
      type: 'booking_status',
      notNull: true,
      default: 'pending_payment',
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'TIMESTAMP',
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('bookings');
  pgm.dropType('booking_status');
};
