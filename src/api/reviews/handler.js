import autoBind from "auto-bind";

export class ReviewsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postReviewHandler(request, h) {
    try {
      const { rating, comment, bookId } = request.payload;
      this._validator.validateReviewPayload({ rating, comment, bookId });

      const { id: userId } = request.auth.credentials;
      const { id, logId } = await this._service.addReview({ userId, rating, comment, bookId });

      return h.response({
        status: "success",
        data: { id, logId }
      }).code(201);
    } catch (error) {
      throw error;
    }
  }

  async getReviewsHandler(request) {
    try {
      const { bookId, page = 1, limit = 10 } = request.query;
      const data = await this._service.getReviews({ bookId, page, limit });

      return {
        status: "success",
        data
      };
    } catch (error) {
      throw error;
    }
  }

  async getReviewbyIdHandler(request) {
    try {
      const { id } = request.params;
      const data = await this._service.getReviewById(id);

      return {
        status: "success",
        data
      };
    } catch (error) {
      throw error;
    }
  }

  async putReviewHandler(request) {
    try {
      const { id } = request.params;
      const { rating, comment } = request.payload;
      this._validator.validateReviewPayload({ rating, comment });

      const { id: userId } = request.auth.credentials;
      const { id: reviewId, logId } = await this._service.editReview({ id, userId, rating, comment });

      return {
        status: "success",
        data: { id: reviewId, logId }
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteReviewHandler(request) {
    try {
      const { id } = request.params;
      const { id: userId } = request.auth.credentials;
      const { id: reviewId, logId } = await this._service.deleteReview({ id, userId });

      return {
        status: "success",
        data: { id: reviewId, logId }
      };
    } catch (error) {
      throw error;
    }
  }
}
