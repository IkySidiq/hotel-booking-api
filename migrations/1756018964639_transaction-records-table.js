export const up = (pgm) => {
  // ENUM untuk payment_status
  pgm.sql(`
    CREATE TYPE payment_status AS ENUM (
      'pending_payment',
      'settlement',
      'capture',
      'expire',
      'deny',
      'pending',
      'unknown'
    );
  `);

  pgm.createTable("transactions_records", {
    id: { type: "varchar(50)", primaryKey: true },
    booking_id: { type: "varchar(100)", notNull: true },
    transaction_id: { type: "varchar(100)", notNull: true, unique: true },
    amount: { type: "decimal(12,2)", notNull: true },
    payment_status: { type: "payment_status", notNull: true, default: "pending" },
    created_at: { type: "date", notNull: true, default: pgm.func("CURRENT_DATE") },
    updated_at: { type: "timestamp" },
  });

  // FK ke bookings
  pgm.addConstraint("transactions_records", "fk_transactions_records.booking_id_bookings.id", {
    foreignKeys: {
      columns: "booking_id",
      references: "bookings(id)",
      onDelete: "CASCADE",
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable("transactions_records");
  pgm.sql("DROP TYPE payment_status");
};
