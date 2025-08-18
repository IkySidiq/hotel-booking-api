export const routes = (handler) => [
  {
    method: 'POST',
    path: '/users',
    handler: handler.postUserHandler,
  },
  {
    method: 'GET',
    path: '/users',
    handler: handler.getUsersHandler,
    options: {
      auth: 'booking_hotel_jwt'
    }
  },
  {
    method: 'GET',
    path: '/users/{id}',
    handler: handler.getUserbyIdHandler,
    options: {
      auth: 'booking_hotel_jwt'
    }
  },
  {
    method: 'PUT',
    path: '/users/{id}',
    handler: handler.putUserHandler,
    options: {
      auth: 'booking_hotel_jwt'
    }
  },
  {
    method: 'DELETE',
    path: '/users/{id}',
    handler: handler.deleteUserHandler,
    options: {
      auth: 'booking_hotel_jwt'
    }
  },
];