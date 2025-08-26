export const routes = (handler) => [
  {
    method: 'POST',
    path: '/rooms/{roomId}/reviews',
    handler: handler.postReviewHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'GET',
    path: '/rooms/{roomId}/reviews',
    handler: handler.getReviewsHandler,
  },
  {
    method: 'GET',
    path: '/reviews/{reviewId}',
    handler: handler.getReviewbyIdHandler,
  },
  {
    method: 'PUT',
    path: '/reviews/{reviewId}',
    handler: handler.putReviewHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
  {
    method: 'DELETE',
    path: '/reviews/{reviewId}',
    handler: handler.deleteReviewHandler,
    options: {
      auth: 'booking_hotel_jwt',
    },
  },
];
