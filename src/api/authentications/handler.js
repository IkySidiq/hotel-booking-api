import autoBind from 'auto-bind';

export class AuthenticationsHandler {
  constructor(service, usersService, tokenManager, validator) {
    this._service = service;
    this._usersService = usersService;
    this._tokenManager = tokenManager;
    this._validator = validator;
 
    autoBind(this);
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(this._service)));
  }
 
  async postAuthenticationHandler(request, h) {
    this._validator.validatePostAuthenticationPayload(request.payload);
 
    const { email, password } = request.payload;
    console.log(email, password);
    const id = await this._usersService.verifyUserCredential({ email, password });
    console.log('ID', id);
 
    const accessToken = this._tokenManager.generateAccessToken({ id });
    const refreshToken = this._tokenManager.generateRefreshToken({ id });
    console.log(refreshToken, 'tah');
 
    await this._service.addRefreshToken({ refreshToken });
 
    const response = h.response({
      status: 'success',
      message: 'Authentication berhasil ditambahkan',
      data: {
        accessToken,
        refreshToken,
      },
    });
    response.code(201);
    return response;
  }
 
  async putAuthenticationHandler(request) {
    this._validator.validatePutAuthenticationPayload(request.payload);
 
    const { refreshToken } = request.payload;
    await this._authenticationsService.verifyRefreshToken(refreshToken); 
    const { id } = this._tokenManager.verifyRefreshToken(refreshToken); 
 
    const accessToken = this._tokenManager.generateAccessToken({ id });
    return {
      status: 'success',
      message: 'Access Token berhasil diperbarui',
      data: {
        accessToken,
      },
    };
  }
 
  async deleteAuthenticationHandler(request) {
    this._validator.validateDeleteAuthenticationPayload(request.payload);
 
    const { refreshToken } = request.payload;
    await this._authenticationsService.verifyRefreshToken(refreshToken);
    await this._authenticationsService.deleteRefreshToken(refreshToken);
 
    return {
      status: 'success',
      message: 'Refresh token berhasil dihapus',
    };
  }
}