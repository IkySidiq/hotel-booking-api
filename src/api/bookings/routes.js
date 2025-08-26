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
    path: '/bookings/{targetId}',
    handler: handler.getBookingbyIdHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'DELETE',
    path: '/bookings/{bookingId}',
    handler: handler.cancelBookingHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'PATCH',
    path: '/bookings/{bookingId}/check-in',
    handler: handler.checkInBookingHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'PATCH',
    path: '/bookings/{bookingId}/check-out',
    handler: handler.checkOutBookingHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'POST',
    path: '/midtrans/notification',
    handler: handler.midtransNotificationHandler,
    options: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/bookings/{bookingId}/snap',
    handler: handler.getSnapTokenHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
  method: 'GET',
  path: '/bookings/{bookingId}/invoice',
  handler: handler.getBookingInvoiceHandler,
  options: {
    auth: 'booking_hotel_jwt',
  },
}
];
