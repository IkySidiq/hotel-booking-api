export const up = (pgm) => {
  pgm.createTable('reviews', {
    id: {
      type: 'VARCHAR(100)',
      primaryKey: true,
    },
    booking_id: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    user_id: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    room_id: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    rating: {
      type: 'SMALLINT',
    },
    comment: {
      type: 'TEXT', // optional tambahan kolom komentar
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

  // Tambahkan foreign key
  pgm.addConstraint('reviews', 'fk_reviews_booking_id', {
    foreignKeys: {
      columns: 'booking_id',
      references: 'bookings(id)',
      onDelete: 'CASCADE',
    },
  });

  pgm.addConstraint('reviews', 'fk_reviews_user_id', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  });

  pgm.addConstraint('reviews', 'fk_reviews_room_id', {
    foreignKeys: {
      columns: 'room_id',
      references: 'rooms(id)',
      onDelete: 'CASCADE',
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('reviews');
};
