export const routes = (handler) => [
  {
    method: 'POST',
    path: '/bookings',
    handler: handler.postBookingHandler,
    options: {
      auth: 'booking_hotel_jwt', // hanya user login bisa bikin booking
    },
  },
  {
    method: 'GET',
    path: '/bookings',
    handler: handler.getBookingsHandler,
    options: {
      auth: 'booking_hotel_jwt', // admin bisa lihat semua booking, user hanya miliknya sendiri (logic di handler/service)
    },
  },
  {
    method: 'GET',
    path: '/bookings/{id}',
    handler: handler.getBookingByIdHandler,
    options: {
      auth: 'booking_hotel_jwt', // user hanya bisa akses booking miliknya sendiri
    },
  },
  {
    method: 'PUT',
    path: '/bookings/{id}',
    handler: handler.putBookingHandler,
    options: {
      auth: 'booking_hotel_jwt', // update booking (misalnya ubah tanggal sebelum check-in)
    },
  },
  {
    method: 'DELETE',
    path: '/bookings/{id}',
    handler: handler.deleteBookingHandler,
    options: {
      auth: 'booking_hotel_jwt', // cancel booking
    },
  },
  {
    method: 'POST',
    path: '/bookings/{id}/check-in',
    handler: handler.checkInBookingHandler,
    options: {
      auth: 'booking_hotel_jwt', // biasanya hanya resepsionis/admin
    },
  },
  {
    method: 'POST',
    path: '/bookings/{id}/check-out',
    handler: handler.checkOutBookingHandler,
    options: {
      auth: 'booking_hotel_jwt', // biasanya hanya resepsionis/admin
    },
  },
];
