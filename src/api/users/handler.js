import autoBind from "auto-bind";
import validator from "validator";
import owasp from "owasp-password-strength-test";

export class UsersHandler{
  constructor(service, validator) {
    this._service = service;
    this._validator = validator

    autoBind(this)
  }

  async postUserHandler(request, h) {
    try {
      const { fullname, email, contactNumber, password } = request.payload;

      //* Validasi email pakai validator
      if (!validator.isEmail(email)) {
        return h.response({
          status: "fail",
          message: "Email tidak valid"
        }).code(400);
      }

      //* Validasi contact number pakai validator
      if (!validator.isMobilePhone(phone, 'any')) {
        return h.response({ 
          status: "fail", 
          message: "Nomor HP tidak valid" 
        }).code(400);
      }

      //* Validasi password pakai OWASP
      const passwordResult = owasp.test(password);
      if (!passwordResult.strong) {
        return h.response({
          status: "fail",
          message: "Password lemah: " + passwordResult.errors.join(", ")
        }).code(400);
      }

      this._validator.validateUserPayload({ fullname, email, contactNumber, password });

      const { id, logId } = await this._service.addUserService({ fullname, email, contactNumber, password });
    
      return h.response({
        status: "success",
        data: { id, logId }
      }).code(201);
    } catch (error) {
      throw error;
    }
  }

  async getUsersHandler(request) {
    try {
      const { id: userId } = request.auth.credentials
      const { page = 1, limit = 10, role } = request.query;

      await this._service.verifyUser({ userId });
      const data = await this._service.getAllUsers({ role, page, limit });

      return {
        status: "success",
        data
      }
    } catch(error) {
      throw error;
    }
  }

  async getUserbyIdHandler(request) {
    try {
      const { id: targetId} = request.params;
      const { id: userId } = request.auth.credentials;

      await this._service.verifyUser({ userId });

      const data = await this._service.getUserbyId({ targetId });

      return {
        status: 'success',
        data
      }
    } catch(error) {
      throw error
    }
  }

  async putUserHandler(request) {
    try {
      const { fullname, email, contactNumber, password } = request.payload;
      const { id: targetId } = request.params;
      await this._validator.validateUserPayload({ fullname, email, contactNumber, password });

      const { id: userId } = request.auth.credentials;
      await this._service.verifyUser({ userId });

      const { id, logId } = await this._service.editUser({targetId, userId, fullname, email, contactNumber, password});

      return {
        status: "success",
        data: {
          id,
          logId
        }
      }
    } catch(error) {
      throw error;
    }
  }

  async deleteUserHandler(request) {
    try {
      const { id: targetId } = request.params;
      const { id: userId } = request.auth.credentials;
      await this._service.verifyUser({ userId });

      const { id, logId} = await this._service.deleteUser({ userId, targetId });

      return {
        status: "success",
        data: {
          id,
          logId
        }
      }
    } catch(error) {
      throw error;
    }
  }
}