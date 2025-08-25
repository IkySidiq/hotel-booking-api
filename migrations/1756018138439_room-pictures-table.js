export const up = (pgm) => {
  pgm.createTable("room_pictures", {
    id: { type: "varchar(50)", primaryKey: true },
    room_id: { type: "varchar(100)", notNull: true },
    path: { type: "text", notNull: true },
    created_at: { type: "date", notNull: true, default: pgm.func("CURRENT_DATE") },
    updated_at: { type: "date" },
    is_primary: { type: "boolean", notNull: true, default: false },
  });

  // kasih foreign key ke tabel rooms
  pgm.addConstraint(
    "room_pictures",
    "fk_room_pictures.room_id_rooms.id",
    {
      foreignKeys: {
        columns: "room_id",
        references: "rooms(id)",
        onDelete: "CASCADE",
      },
    }
  );
};

export const down = (pgm) => {
  pgm.dropTable("room_pictures");
};
