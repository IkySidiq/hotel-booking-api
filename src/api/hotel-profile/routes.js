export const routes = (handler) => [
  {
    method: 'GET',
    path: '/hotel-profile',
    handler: handler.getProfileHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'POST',
    path: '/hotel-profile',
    handler: handler.addProfileHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'PUT',
    path: '/hotel-profile',
    handler: handler.updateProfileHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
];
