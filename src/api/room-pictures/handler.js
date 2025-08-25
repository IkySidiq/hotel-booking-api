import autoBind from "auto-bind";
import path from 'path';
import { nanoid } from "nanoid";

export class RoomPicturesHandler {
  constructor(service, validator, userService, storageService) {
    this._service = service;
    this._validator = validator
    this._storageService = storageService;
    this._userService = userService;

    autoBind(this);
  }

  // Upload foto kamar
  async postRoomPictureHandler(request, h) {
    try {
      const { id: userId } = request.auth.credentials;

      // pastikan user valid
      await this._userService.verifyUser({ userId });

      // ambil roomId, primaryFileName, dan array files dari payload
      const {id: roomId} = request.params;
              console.log('PERCOBAAN', roomId)


      const { fotoSatu, fotoDua, fotoTiga } = request.payload;
      const filesArray = [fotoSatu, fotoDua, fotoTiga].filter(Boolean);

      if (!filesArray.length) {
        throw new Error("Tidak ada file yang diunggah");
      }

      const results = [];

      for (const file of filesArray) {
        const meta = file.hapi;
        const extension = path.extname(meta.filename);

        // nama file unik untuk storage
        const filename = `room-${roomId}-${nanoid(8)}${extension}`;

        // simpan file ke folder storage, subfolder berdasarkan roomId
        const filePath = await this._storageService.writeFile(file, filename, roomId);

        // tentukan apakah foto ini primary
        const isPrimary = file === fotoSatu;

        // simpan path ke DB melalui service
        const result = await this._service.addPicture({
          roomId,
          path: filePath,
          isPrimary
        });

        results.push(result);
      }

      return h.response({
        status: "success",
        message: "Foto kamar berhasil diunggah",
        data: results
      }).code(201);

    } catch (err) {
      console.error("Error postRoomPictureHandler:", err);
      throw err;
    }
  }

  // Ambil semua foto kamar
  async getRoomPicturesHandler(request) {
    try {
      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId });

      const { roomId } = request.params;
      console.log('HEBAT', roomId)
      const pictures = await this._service.getPictures({ roomId });

      return {
        status: "success",
        data: pictures
      };
    } catch (error) {
      throw error;
    }
  }

  // Hapus foto kamar
  async deleteRoomPictureHandler(request) {
    try {
      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId });

      const { roomId, pictureId } = request.params;

      const pictures = await this._service.getPictures({ roomId });
      const picture = pictures.find(p => p.id === pictureId);

      if (!picture) throw new NotFoundError("Foto tidak ditemukan");

      await this._storageService.deleteFile(picture.path);
      const result = await this._service.deletePicture({ pictureId });

      return {
        status: "success",
        data: result
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteAllPicturesHandler(request, h) {
    try {
      const { roomId } = request.params;

      const { deletedPictureIds } = await this._service.deleteAllPictures({ roomId });

      return h.response({
        status: "success",
        message: "Semua foto berhasil dihapus",
        data: {
          deletedPictureIds,
        },
      }).code(200);

    } catch (error) {
      console.error(error);
      return h.response({
        status: "fail",
        message: error.message,
      }).code(error.statusCode || 500);
    }
  }

  // Set primary picture
  async setPrimaryPictureHandler(request) {
    try {
      const { id: userId } = request.auth.credentials;
      await this._userService.verifyUser({ userId });

      const { pictureId } = request.params;
      const result = await this._roomPicturesService.setPrimaryPicture({ pictureId });

      return {
        status: "success",
        data: result
      };
    } catch (error) {
      throw error;
    }
  }
}
