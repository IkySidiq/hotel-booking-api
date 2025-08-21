export const up = (pgm) => {
  pgm.renameColumn('active_logs', 'created_at', 'performed_at');
};

export const down = (pgm) => {
  pgm.renameColumn('active_logs', 'performed_at', 'created_at');
};
