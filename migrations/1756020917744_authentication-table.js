export const up = (pgm) => {
  pgm.createTable('authentications', {
    id: {
      type: 'varchar(50)',
      primaryKey: true,
      notNull: true,
    },
    refresh_token: {
      type: 'text',
      notNull: true,
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('authentications');
};
