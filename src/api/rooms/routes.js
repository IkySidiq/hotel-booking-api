export const routes = (handler) => [
  // Tambah kamar
  {
    method: 'POST',
    path: '/rooms',
    handler: handler.postRoomHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },

  // Ambil semua kamar (dengan filter & pagination)
  {
    method: 'GET',
    path: '/rooms',
    handler: handler.getRoomsHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },

  // Ambil kamar berdasarkan ID
  {
    method: 'GET',
    path: '/rooms/{id}',
    handler: handler.getRoomByIdHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },

  // Edit kamar
  {
    method: 'PUT',
    path: '/rooms/{id}',
    handler: handler.putRoomHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },

  // Hapus kamar (soft delete)
  {
    method: 'DELETE',
    path: '/rooms/{id}',
    handler: handler.deleteRoomHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
];
