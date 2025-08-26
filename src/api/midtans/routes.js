export const routes = (handler) => [
  {
    method: 'POST',
    path: '/webhooks/midtrans',
    handler: handler.midtransNotificationHandler,
    options: {
      auth: false,
      payload: {
        parse: true,
        allow: 'application/json',
      },
    },
  },
];
