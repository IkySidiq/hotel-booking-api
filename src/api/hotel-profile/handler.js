import autoBind from "auto-bind";

export class HotelProfileHandler {
  constructor(service, validator, usersService) {
    this._service = service;
    this._validator = validator;
    this._usersService = usersService;

    autoBind(this);
  }

  // =====================
  // GET /hotel-profile
  // =====================
  async getProfileHandler(request, h) {
    try {
      const profile = await this._service.getProfile();

      return h.response({
        status: "success",
        data: profile,
      }).code(200);
    } catch (error) {
      throw error;
    }
  }

  // =====================
  // POST /hotel-profile (singleton)
  // =====================
  async addProfileHandler(request, h) {
    try {
      const {id: userId} = request.auth.credentials;
      await this._usersService.verifyUser({ userId })

      const { name, address, city, description, contactNumber, email, rating } = request.payload;
      await this._validator.validateHotelProfilePayload({ name, address, city, description, contactNumber, email, rating })

      this._validator?.validateAddProfilePayload?.(request.payload);

      const profileId = await this._service.addProfile({
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
        message: "Profil hotel berhasil ditambahkan",
        data: { id: profileId },
      }).code(201);
    } catch (error) {
      throw error;
    }
  }

  // =====================
  // PUT /hotel-profile
  // =====================
  async updateProfileHandler(request, h) {
    try {
      // Validasi payload jika ada validator
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
