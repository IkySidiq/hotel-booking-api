//TODO: YANG BENAR YANG INI
// export const up = (pgm) => {
//   pgm.createTable('authentications', {
//     id: {
//       type: 'VARCHAR(50)',
//       primaryKey: true,
//     },
//     refresh_token: {
//       type: 'TEXT',
//       notNull: true,
//     },
//   });
// };

// export const down = (pgm) => {
//   pgm.dropTable('authentications');
// };

export const up = (pgm) => {
  pgm.createTable('authentications', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    refresh_token: {
      type: 'TEXT',
      notNull: true,
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('authentications');
};
