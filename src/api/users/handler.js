import autoBind from 'auto-bind';
import validator from 'validator';
import owasp from 'owasp-password-strength-test';

export class UsersHandler{
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postUserHandler(request, h) {
      const { fullname, email, contactNumber, password } = request.payload;

      //* Validasi email pakai validator
      if (!validator.isEmail(email)) {
        return h.response({
          status: 'fail',
          message: 'Email tidak valid'
        }).code(400);
      }

      //* Validasi contact number pakai validator
      if (!validator.isMobilePhone(contactNumber, 'any')) {
        return h.response({ 
          status: 'fail', 
          message: 'Nomor HP tidak valid' 
        }).code(400);
      }

      //* Validasi password pakai OWASP
      // const passwordResult = owasp.test(password);
      // if (!passwordResult.strong) {
      //   return h.response({
      //     status: 'fail',
      //     message: 'Password lemah: ' + passwordResult.errors.join(', ')
      //   }).code(400);
      // }

      this._validator.validateUserPayload({ fullname, email, contactNumber, password });

      const { id, logId } = await this._service.addUserService({ fullname, email, contactNumber, password });
    
      return h.response({
        status: 'success',
        data: { id, logId }
      }).code(201);
  }

  async getUsersHandler(request) {
      const { id: userId } = request.auth.credentials;

      await this._service.verifyUser({ userId });
      const { data, page, limit, totalItems, totalPages } = await this._service.getAllUsers();

      return {
        status: 'success',
        data,
        page,
        limit,
        totalItems,
        totalPages
      };
  }

  async getUserbyIdHandler(request) {
      const { id: targetId } = request.params;
      const { id: userId } = request.auth.credentials;

      await this._service.verifyUser({ userId });

      const data = await this._service.getUserbyId({ targetId });

      return {
        status: 'success',
        data
      };
  }

  async putUserHandler(request) {
      const { fullname, email, contactNumber, password } = request.payload;
      const { id: targetId } = request.params;
      await this._validator.validateUserPayload({ fullname, email, contactNumber, password });

      const { id: userId } = request.auth.credentials;
      await this._service.verifyUser({ userId });

      const { id, logId } = await this._service.editUser({ targetId, userId, fullname, email, contactNumber, password });

      return {
        status: 'success',
        data: {
          id,
          logId
        }
      };
  }

  async deleteUserHandler(request) {
      const { id: targetId } = request.params;
      const { id: userId } = request.auth.credentials;
      await this._service.verifyUser({ userId });

      const { id } = await this._service.deleteUser({ userId, targetId });

      return {
        status: 'success',
        data: {
          id,
        }
      };
  }

  async changeRole(request) {
    const { id: userId } = request.auth.credentials;
    console.log('ROK', userId)
    const id = await this._service.putRole(userId)

    return{
      status: 'success',
      data: {
        id
      }
    }
  }
}