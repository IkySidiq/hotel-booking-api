export const up = (pgm) => {
  // Tambahkan kolom item_details dan customer_details
  pgm.addColumns('bookings', {
    item_details: {
      type: 'JSONB',
    },
    customer_details: {
      type: 'JSONB',
    },
  });
};

export const down = (pgm) => {
  // Hapus kolom jika rollback
  pgm.dropColumns('bookings', ['item_details', 'customer_details']);
};
