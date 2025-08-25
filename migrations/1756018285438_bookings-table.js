export const up = (pgm) => {
  // bikin ENUM untuk status booking
  pgm.sql(`
    CREATE TYPE booking_status AS ENUM (
      'pending_payment',
      'confirmed',
      'checked-in',
      'cancelled',
      'no-show',
      'failed',
      'checked-out',
      'pending'
    );
  `);

  pgm.createTable("bookings", {
    id: { type: "varchar(50)", primaryKey: true },
    user_id: { type: "varchar(100)", notNull: true },
    room_id: { type: "varchar(100)", notNull: true },
    guest_name: { type: "varchar(100)", notNull: true },
    total_guests: { type: "smallint", notNull: true },
    special_request: { type: "text" },
    check_in_date: { type: "date", notNull: true },
    check_out_date: { type: "date", notNull: true },
    total_price: { type: "decimal(12,2)", notNull: true },
    status: { type: "booking_status", notNull: true, default: "pending_payment" },
    
    // tambahan
    customer_details: { type: "jsonb" },   // object (nama, email, phone, dsb.)
    item_details: { type: "jsonb" },       // array of objects (item, qty, price, dsb.)
    snap_token: { type: "varchar(255)" },  // token Snap Midtrans

    created_at: { type: "timestamptz", notNull: true, default: pgm.func("CURRENT_TIMESTAMP") },
    updated_at: { type: "timestamptz" },
  });

  // FK ke users
  pgm.addConstraint("bookings", "fk_bookings.user_id_users.id", {
    foreignKeys: {
      columns: "user_id",
      references: "users(id)",
      onDelete: "CASCADE",
    },
  });

  // FK ke rooms
  pgm.addConstraint("bookings", "fk_bookings.room_id_rooms.id", {
    foreignKeys: {
      columns: "room_id",
      references: "rooms(id)",
      onDelete: "CASCADE",
    },
  });
};

export const down = (pgm) => {
  pgm.dropTable("bookings");
  pgm.sql("DROP TYPE booking_status");
};
