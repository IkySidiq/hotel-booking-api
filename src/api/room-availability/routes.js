export const routes = (handler) => [
  {
    method: 'POST',
    path: '/rooms/check-availability',
    handler: handler.checkAvailabilityHandler,
  },
];
