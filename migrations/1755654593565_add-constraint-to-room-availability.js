/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.addConstraint('room_availability', 'fk_room_availability_room_id', {
    foreignKeys: {
      columns: 'room_id',
      references: 'rooms(id)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  });
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const down = (pgm) => {
  pgm.dropConstraint('room_availability', 'fk_room_availability_room_id');
};
