import autoBind from 'auto-bind';

export class HotelProfileHandler {
  constructor(service, validator, usersService) {
    this._service = service;
    this._validator = validator;
    this._usersService = usersService;

    autoBind(this);
  }

  async getProfileHandler(request, h) {
      const profile = await this._service.getProfile();

      return h.response({
        status: 'success',
        data: profile,
      }).code(200);
  }

  async addProfileHandler(request, h) {
      const { id: userId } = request.auth.credentials;
      await this._usersService.verifyUser({ userId });

      const { name, address, city, description, contactNumber, email, rating } = request.payload;
      await this._validator.validateHotelProfilePayload({ name, address, city, description, contactNumber, email, rating });

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
        status: 'success',
        message: 'Profil hotel berhasil ditambahkan',
        data: { id: profileId },
      }).code(201);
  }

  async updateProfileHandler(request, h) {
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
        status: 'success',
        message: 'Profil hotel berhasil diperbarui',
        data: { id: profileId },
      }).code(200);
  }
}
