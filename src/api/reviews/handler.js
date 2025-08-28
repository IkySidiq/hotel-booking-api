import autoBind from 'auto-bind';
import { InvariantError } from '../../exceptions/InvariantError.js';

export class ReviewsHandler {
  constructor(service, validator, bookingsService) {
    this._service = service;
    this._validator = validator;
    this._bookingService = bookingsService;

    autoBind(this);
  }

  async postReviewHandler(request, h) {
    try {
      const { comment, rating } = request.payload;
      const { roomId } = request.params;
      const userId = request.auth.credentials.id;

      this._validator.validateReviewPayload({ rating, comment });

      // Cek apakah user sudah pernah booking kamar ini yang statusnya selesai
      const booking = await this._bookingService.getCompletedBookingForUserRoom(
        userId,
        roomId
      );
      if (!booking) {
        throw new InvariantError(
          'Anda belum melakukan booking untuk kamar ini'
        );
      }

      // Cek apakah user sudah review untuk room ini
      const existingReview = await this._service.checkExistingReview(
        userId,
        roomId
      );
      if (existingReview) {
        throw new InvariantError(
          'Anda sudah memberikan review untuk kamar ini'
        );
      }

      // Tambah review
      const reviewData = {
        userId,
        roomId,
        bookingId: booking.id,
        rating: Number(rating),
        comment,
      };

      const newReview = await this._service.addReview(reviewData);

      return h
        .response({
          status: 'success',
          message: 'Review berhasil ditambahkan',
          data: { id: newReview },
        })
        .code(201);
    } catch (err) {
      console.error('Error postReviewHandler:', err);
      throw err;
    }
  }

  async getReviewsHandler(request) {
      const { roomId } = request.params;
      const { page = 1, limit = 10 } = request.query;
      const data = await this._service.getReviewsByRoomId({
        roomId,
        page,
        limit,
      });

      return {
        status: 'success',
        data,
      };
  }

  async getReviewbyIdHandler(request) {
      const { reviewId } = request.params;
      const data = await this._service.getReviewById(reviewId);

      return {
        status: 'success',
        data,
      };
  }

  async putReviewHandler(request) {
      const { reviewId: id } = request.params;
      const { rating, comment } = request.payload;
      this._validator.validateReviewPayload({ rating, comment });

      const { id: userId } = request.auth.credentials;
      const reviewId = await this._service.editReview({
        id,
        userId,
        rating,
        comment,
      });

      return {
        status: 'success',
        data: {
          id: reviewId,
        },
      };
  }

  async deleteReviewHandler(request) {
      const { reviewId: id } = request.params;
      const { id: userId } = request.auth.credentials;
      const reviewId = await this._service.deleteReview({
        id,
        userId,
      });

      return {
        status: 'success',
        data: { reviewId },
      };
  }
}
