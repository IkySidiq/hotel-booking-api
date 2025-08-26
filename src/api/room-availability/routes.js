export const routes = (handler) => [
  {
    method: 'POST',
    path: '/rooms/check-availability',
    handler: handler.checkAvailabilityHandler,
  },
  {
    method: 'POST',
    path: '/rooms-availability/generate-availability',
    handler: handler.generateAvailabilityHandler,
    options: {
      auth: false, // kalau testing/dev, bisa tanpa auth
    },
  },
];
