export const routes = (handler) => [
  {
    method: 'POST',
    path: '/rooms',
    handler: handler.postRoomHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'GET',
    path: '/rooms',
    handler: handler.getRoomsHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'GET',
    path: '/rooms/{id}',
    handler: handler.getRoomByIdHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'PUT',
    path: '/rooms/{id}',
    handler: handler.putRoomHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'DELETE',
    path: '/rooms/{id}',
    handler: handler.deleteRoomHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
];
