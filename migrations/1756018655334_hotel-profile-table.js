export const up = (pgm) => {
  pgm.createTable('hotel_profile', {
    id: { type: 'varchar(50)', primaryKey: true },
    name: { type: 'varchar(100)', notNull: true },
    address: { type: 'text', notNull: true },
    city: { type: 'text', notNull: true },
    description: { type: 'text', notNull: true },
    contact_number: { type: 'varchar(20)', notNull: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    rating: { type: 'decimal(2,1)', notNull: true },
    created_at: { type: 'date', notNull: true, default: pgm.func('CURRENT_DATE') },
    updated_at: { type: 'date' },
  });
};

export const down = (pgm) => {
  pgm.dropTable('hotel_profile');
};
