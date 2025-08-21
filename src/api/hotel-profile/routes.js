export const routes = (handler) => [
  {
    method: "GET",
    path: "/hotel-profile",
    handler: handler.getProfileHandler,
    options: {
      auth: "booking_hotel_jwt", // atau hapus auth jika public
    },
  },
  {
    method: "PUT",
    path: "/hotel-profile",
    handler: handler.updateProfileHandler,
    options: {
      auth: "booking_hotel_jwt",
    },
  },
];
