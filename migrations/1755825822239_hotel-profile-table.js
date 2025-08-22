export const up = (pgm) => {
  pgm.createTable('hotel_profile', {
    id: {
      type: 'VARCHAR(100)',
      primaryKey: true,
    },
    name: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    address: {
      type: 'TEXT',
      notNull: true,
    },
    city: {
      type: 'TEXT',
      notNull: true,
    },
    description: {
      type: 'TEXT',
      notNull: true,
    },
    contact_number: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    email: {
      type: 'VARCHAR(255)',
      notNull: true,
    },
    rating: {
      type: 'DECIMAL(2,1)',
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
};

export const down = (pgm) => {
  pgm.dropTable('hotel_profile');
};
