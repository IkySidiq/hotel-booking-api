export const up = (pgm) => {
  pgm.createTable('room_pictures', {
    id: { type: 'VARCHAR(100)', primaryKey: true },
    room_id: { type: 'VARCHAR(100)', notNull: true },
    path: { type: 'TEXT' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'TIMESTAMP' },
    is_primary: { type: 'BOOLEAN', default: false },
  });

  pgm.addConstraint('room_pictures', 'fk_room_pictures_room_id', {
    foreignKeys: {
      columns: 'room_id',
      references: 'rooms(id)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('room_pictures');
};
