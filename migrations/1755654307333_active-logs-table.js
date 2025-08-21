export const up = (pgm) => {
  pgm.createTable('active_logs', {
    id: { type: 'VARCHAR(50)', primaryKey: true },
    user_id: {
      type: 'VARCHAR(50)',
      references: 'users(id)',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    action: { type: 'VARCHAR(50)', notNull: true },
    target_table: { type: 'VARCHAR(50)', notNull: true },
    target_id: { type: 'VARCHAR(50)', notNull: true },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable('active_logs');
};