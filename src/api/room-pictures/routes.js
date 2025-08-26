export const routes = (handler) => [
  {
    method: 'POST',
    path: '/rooms/{id}/pictures',
    handler: handler.postRoomPictureHandler,
    options: {
      auth: 'booking_hotel_jwt',
      payload: {
        allow: 'multipart/form-data',
        multipart: true,
        output: 'stream',
        parse: true,
        maxBytes: 10485760, // contoh 10MB max
      },
    },
  },
  {
    method: 'GET',
    path: '/rooms/{roomId}/pictures',
    handler: handler.getRoomPicturesHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'DELETE',
    path: '/rooms/{roomId}/pictures/{pictureId}',
    handler: handler.deleteRoomPictureHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
      method: 'DELETE',
      path: '/rooms/{roomId}/pictures',
      handler: handler.deleteAllPicturesHandler,
      options: {
        auth: 'booking_hotel_jwt', // kalau memang pakai autentikasi
      },
  },
  {
    method: 'PATCH',
    path: '/rooms/pictures/{pictureId}/primary',
    handler: handler.setPrimaryPictureHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
];
