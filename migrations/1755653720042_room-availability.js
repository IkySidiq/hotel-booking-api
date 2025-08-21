export const up = (pgm) => {
  pgm.createTable('room_availability', {
    id: {
      type: 'VARCHAR(100)',
      primaryKey: true,
    },
    room_id: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    date: {
      type: 'DATE',
      notNull: true,
    },
    available_rooms: {
      type: 'SMALLINT',
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
  pgm.dropTable('room_availability');
};