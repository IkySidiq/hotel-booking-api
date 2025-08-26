export const up = (pgm) => {
  pgm.createTable('active_logs', {
    id: { type: 'varchar(50)', primaryKey: true },
    user_id: {
      type: 'varchar(50)',
      notNull: false,
      references: 'users(id)',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    action: { type: 'varchar(50)', notNull: true },
    target_table: { type: 'varchar(50)', notNull: true },
    target_id: { type: 'varchar(50)', notNull: true },
    performed_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
  });
};

export const down = (pgm) => {
  pgm.dropTable('active_logs');
};
