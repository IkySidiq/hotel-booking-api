export const routes = (handler) => [
  // GET /hotel-profile
  {
    method: "GET",
    path: "/hotel-profile",
    handler: handler.getProfileHandler,
    options: {
      auth: "booking_hotel_jwt", // bisa dihapus kalau public
    },
  },

  // POST /hotel-profile (singleton)
  {
    method: "POST",
    path: "/hotel-profile",
    handler: handler.addProfileHandler,
    options: {
      auth: "booking_hotel_jwt", // wajib login untuk menambah
    },
  },

  // PUT /hotel-profile
  {
    method: "PUT",
    path: "/hotel-profile",
    handler: handler.updateProfileHandler,
    options: {
      auth: "booking_hotel_jwt", // wajib login untuk update
    },
  },
];
