export const up = (pgm) => {
  pgm.createTable("room_availability", {
    id: { type: "varchar(50)", primaryKey: true },
    room_id: { type: "varchar(100)", notNull: true },
    date: { type: "date", notNull: true },
    available_rooms: { type: "smallint", notNull: true },
    created_at: { type: "date", notNull: true, default: pgm.func("CURRENT_DATE") },
    updated_at: { type: "date" },
  });

  // Foreign key ke tabel rooms
  pgm.addConstraint(
    "room_availability",
    "fk_room_availability.room_id_rooms.id",
    {
      foreignKeys: {
        columns: "room_id",
        references: "rooms(id)",
        onDelete: "CASCADE",
      },
    }
  );

  // Optional: supaya 1 room_id cuma boleh punya 1 data per tanggal
  pgm.addConstraint(
    "room_availability",
    "unique_room_id_date",
    {
      unique: ["room_id", "date"],
    }
  );
};

export const down = (pgm) => {
  pgm.dropTable("room_availability");
};
