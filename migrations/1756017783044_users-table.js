export const up = (pgm) => {
  // bikin enum role
  pgm.sql(`
    CREATE TYPE user_role AS ENUM ('customer', 'admin');
  `);

  pgm.createTable("users", {
    id: { type: "varchar(50)", primaryKey: true },
    fullname: { type: "varchar(100)", notNull: true },
    email: { type: "varchar(255)", notNull: true, unique: true },
    contact_number: { type: "varchar(20)", notNull: true, unique: true },
    password_hash: { type: "text", notNull: true },
    role: { type: "user_role", notNull: true, default: "customer" },
    last_login: { type: "timestamp", notNull: false },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") },
    updated_at: { type: "timestamp", notNull: false },
    is_active: { type: "boolean", notNull: true, default: true },
  });
};

export const down = (pgm) => {
  pgm.dropTable("users");
  pgm.sql("DROP TYPE user_role");
};
