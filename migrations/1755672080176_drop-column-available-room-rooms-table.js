// migrations/175566XXXXXX_drop-available-rooms.js
export const up = (pgm) => {
  // hapus kolom available_rooms
  pgm.dropColumn('rooms', 'available_rooms');
};

export const down = (pgm) => {
  // rollback: tambahkan kembali kolom available_rooms
  pgm.addColumn('rooms', {
    available_rooms: {
      type: 'SMALLINT',
      notNull: true,
      default: 0, // bisa disesuaikan default value
    },
  });
};
