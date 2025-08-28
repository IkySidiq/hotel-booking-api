import pkg from 'pg';
const { Pool } = pkg;

export class BookingService {
  constructor() {
    this._pool = new Pool();
  }

  async getBookingInvoiceData(bookingId) {
    const query = {
      text: `
        SELECT 
          b.id AS booking_id,
          b.id AS booking_code,
          b.guest_name,
          b.total_guests,
          b.check_in_date AS check_in,
          b.check_out_date AS check_out,
          b.customer_details,
          b.item_details,
          b.total_price,
          b.status
        FROM bookings b
        WHERE b.id = $1
      `,
      values: [bookingId],
    };

    const result = await this._pool.query(query);

    if (result.rowCount === 0) {
      throw new Error('Booking tidak ditemukan');
    }

    const booking = result.rows[0];

    return {
      booking: {
        id: booking.booking_id,
        code: booking.booking_code,
        guestName: booking.guest_name,
        totalGuests: booking.total_guests,
        checkInDate: booking.check_in,
        checkOutDate: booking.check_out,
        customerDetails: booking.customer_details, // bisa langsung parse JSON nanti kalau perlu
        itemDetails: booking.item_details,         // bisa langsung parse JSON nanti kalau perlu
        totalPrice: booking.total_price,
        status: booking.status,
      },
    };
  }

}
