export const up = (pgm) => {
  pgm.createTable("rooms", {
    id: { type: "varchar(50)", primaryKey: true },
    room_type: { type: "varchar(100)", notNull: true },
    price_per_night: { type: "decimal(12,2)", notNull: true },
    capacity: { type: "smallint", notNull: true },
    total_rooms: { type: "smallint", notNull: true },
    description: { type: "text" },
    is_active: { type: "boolean", notNull: true, default: true },
    is_complete: { type: "boolean", notNull: true, default: false },
    created_at: { type: "date", notNull: true, default: pgm.func("CURRENT_DATE") },
    updated_at: { type: "date" },
  });
};

export const down = (pgm) => {
  pgm.dropTable("rooms");
};
