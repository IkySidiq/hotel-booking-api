export const up = (pgm) => {
  pgm.createTable('rooms', {
    id: {
      type: 'VARCHAR(100)',
      primaryKey: true,
    },
    room_type: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    price_per_night: {
      type: 'DECIMAL(12,2)',
      notNull: true,
    },
    capacity: {
      type: 'SMALLINT',
      notNull: true,
    },
    total_rooms: {
      type: 'SMALLINT',
      notNull: true,
    },
    available_rooms: {
      type: 'SMALLINT',
      notNull: true,
    },
    description: {
      type: 'TEXT',
      notNull: true,
    },
    is_active: {
      type: 'BOOLEAN',
      default: true,
    },
    is_complete: {
      type: 'BOOLEAN',
      default: false,
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
  pgm.dropTable('rooms');
};