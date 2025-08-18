export const routes = (handler) => [
  {
    method: "POST",
    path: "/create-transaction",
    handler: handler.createTransactionHandler,
    options: {
      auth: "booking_hotel_jwt",
    },
  },
];
