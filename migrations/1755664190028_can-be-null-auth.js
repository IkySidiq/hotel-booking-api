// migrations/175566XXXXXX_update-authentications-nullable.js
export const up = (pgm) => {
  // ubah refresh_token jadi boleh null
  pgm.alterColumn('authentications', 'refresh_token', {
    type: 'text',
    notNull: false,
  });
};

export const down = (pgm) => {
  // rollback: kembalikan menjadi NOT NULL
  pgm.alterColumn('authentications', 'refresh_token', {
    type: 'text',
    notNull: true,
  });
};
