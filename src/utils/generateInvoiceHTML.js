export const generateInvoiceHTML = (bookingData) => `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Invoice ${bookingData.bookingId}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #333; }
  .container { max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; }
  header { text-align: center; margin-bottom: 30px; }
  header img { max-height: 50px; margin-bottom: 10px; }
  h1 { margin: 0; font-size: 24px; }
  .customer-info, .booking-info { margin-bottom: 20px; }
  .booking-info table { width: 100%; border-collapse: collapse; }
  .booking-info th, .booking-info td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  .booking-info th { background-color: #f4f4f4; }
  .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
  footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
</style>
</head>
<body>
<div class="container">
  <header>
    <img src="https://placehold.co/100x50?text=Logo" alt="Hotel Logo" />
    <h1>Hotel Makmur</h1>
    <p>Invoice #: ${bookingData.bookingId}</p>
    <p>Tanggal: ${new Date().toLocaleDateString()}</p>
  </header>

  <div class="customer-info">
    <strong>Tamu:</strong> ${bookingData.guestName}<br/>
    <strong>Email:</strong> ${bookingData.email}<br/>
    <strong>Telepon:</strong> ${bookingData.phone}
  </div>

  <div class="booking-info">
    <table>
      <thead>
        <tr>
          <th>Tipe Kamar</th>
          <th>Check-in</th>
          <th>Check-out</th>
          <th>Jumlah Tamu</th>
          <th>Jumlah Kamar</th>
          <th>Harga / Malam</th>
          <th>Jumlah Malam</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${bookingData.roomType}</td>
          <td>${bookingData.checkInDate}</td>
          <td>${bookingData.checkOutDate}</td>
          <td>${bookingData.totalGuests}</td>
          <td>${bookingData.numberOfRooms}</td>
          <td>${bookingData.pricePerNight}</td>
          <td>${bookingData.totalNights}</td>
          <td>${bookingData.totalPrice}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="total">
    Total: ${bookingData.totalPrice}
  </div>

  <footer>
    Terima kasih telah memesan di Hotel Makmur!
  </footer>
</div>
</body>
</html>
`;
