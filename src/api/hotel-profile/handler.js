import autoBind from "auto-bind";

export class HotelProfileHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  // GET /hotel-profile
  async getProfileHandler(request, h) {
    try {
      const profile = await this._service.getProfile();

      return {
        status: "success",
        data: profile,
      };
    } catch (error) {
      throw error;
    }
  }

  // PUT /hotel-profile
  async updateProfileHandler(request, h) {
    try {
      this._validator?.validateUpdateProfilePayload?.(request.payload);

      const { name, address, city, description, contactNumber, email, rating } = request.payload;

      const profileId = await this._service.updateProfile({
        name,
        address,
        city,
        description,
        contactNumber,
        email,
        rating,
      });

      return h.response({
        status: "success",
        message: "Profil hotel berhasil diperbarui",
        data: { id: profileId },
      }).code(200);
    } catch (error) {
      throw error;
    }
  }
}
