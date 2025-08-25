export const up = (pgm) => {
  pgm.createTable("reviews", {
    id: { type: "varchar(50)", primaryKey: true },
    booking_id: { type: "varchar(100)", notNull: true },
    user_id: { type: "varchar(100)", notNull: true },
    room_id: { type: "varchar(100)", notNull: true },
    rating: { type: "smallint", notNull: true },
    comment: { type: "text" },
    created_at: { type: "date", notNull: true, default: pgm.func("CURRENT_DATE") },
    updated_at: { type: "date" },
  });

  // FK ke bookings
  pgm.addConstraint("reviews", "fk_reviews.booking_id_bookings.id", {
    foreignKeys: {
      columns: "booking_id",
      references: "bookings(id)",
      onDelete: "CASCADE",
    },
  });

  // FK ke users
  pgm.addConstraint("reviews", "fk_reviews.user_id_users.id", {
    foreignKeys: {
      columns: "user_id",
      references: "users(id)",
      onDelete: "CASCADE",
    },
  });

  // FK ke rooms
  pgm.addConstraint("reviews", "fk_reviews.room_id_rooms.id", {
    foreignKeys: {
      columns: "room_id",
      references: "rooms(id)",
      onDelete: "CASCADE",
    },
  });

  // optional: pastikan 1 booking hanya bisa punya 1 review
  pgm.addConstraint("reviews", "unique_booking_review", {
    unique: ["booking_id"],
  });
};

export const down = (pgm) => {
  pgm.dropTable("reviews");
};
