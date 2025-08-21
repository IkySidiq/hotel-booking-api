export const routes = (handler) => [
  {
    method: 'POST',
    path: '/bookings',
    handler: handler.postBookingHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'GET',
    path: '/bookings/pending',
    handler: handler.getPendingBookingsHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'GET',
    path: '/bookings',
    handler: handler.getBookingsHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'GET',
    path: '/bookings/{id}',
    handler: handler.getBookingbyIdHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'DELETE',
    path: '/bookings/{id}',
    handler: handler.cancelBookingHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'POST',
    path: '/bookings/{id}/check-in',
    handler: handler.checkInBookingHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'POST',
    path: '/bookings/{id}/check-out',
    handler: handler.checkOutBookingHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
];
