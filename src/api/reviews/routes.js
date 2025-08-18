export const routes = (handler) => [
  // Tambah review baru
  {
    method: "POST",
    path: "/rooms/{roomId}/reviews",
    handler: handler.addReviewHandler,
    options: {
      auth: "booking_hotel_jwt", // hanya user login yang boleh review
    },
  },

  // Ambil semua review untuk 1 room
  {
    method: "GET",
    path: "/rooms/{roomId}/reviews",
    handler: handler.getReviewsByRoomIdHandler,
  },

  // Ambil 1 review detail (optional, kalau mau ada fitur detail review)
  {
    method: "GET",
    path: "/reviews/{reviewId}",
    handler: handler.getReviewByIdHandler,
  },

  // Edit review (hanya pemilik review)
  {
    method: "PUT",
    path: "/reviews/{reviewId}",
    handler: handler.editReviewHandler,
    options: {
      auth: "booking_hotel_jwt",
    },
  },

  // Hapus review (pemilik atau admin)
  {
    method: "DELETE",
    path: "/reviews/{reviewId}",
    handler: handler.deleteReviewHandler,
    options: {
      auth: "booking_hotel_jwt",
    },
  },
];
