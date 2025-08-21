export const up = (pgm) => {
  pgm.addConstraint('bookings', 'fk_bookings_user_id', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users(id)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  });

  // Tambahkan foreign key untuk room_id → rooms(id)
  pgm.addConstraint('bookings', 'fk_bookings_room_id', {
    foreignKeys: {
      columns: 'room_id',
      references: 'rooms(id)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  });
};

export const down = (pgm) => {
  pgm.dropConstraint('bookings', 'fk_bookings_user_id');
  pgm.dropConstraint('bookings', 'fk_bookings_room_id');
};
