export const up = (pgm) => {
  // Rename column total_guest menjadi total_guests
  pgm.renameColumn('bookings', 'total_guest', 'total_guests');
};

export const down = (pgm) => {
  // Undo rename, kembalikan ke total_guest
  pgm.renameColumn('bookings', 'total_guests', 'total_guest');
};
