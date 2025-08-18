import autoBind from "auto-bind";

export class RoomPicturesHandler {
  constructor(roomPicturesService, storageService, userService) {
    this._roomPicturesService = roomPicturesService;
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
      const { primaryFileName } = request.payload; //* dari radio di FE
      const {id: roomId} = request.params;

      const files = request.payload.files;

      if (!files || !files.length) {
        throw new Error("Tidak ada file yang diunggah");
      }

      const results = [];

      for (const file of files) {
        const meta = file.hapi;
        const extension = path.extname(meta.filename);

        // nama file unik untuk storage
        const filename = `room-${roomId}-${nanoid(8)}${extension}`;

        // simpan file ke folder storage, subfolder berdasarkan roomId
        const filePath = await this._storageService.writeFile(file, filename, roomId);

        // tentukan apakah foto ini primary
        const isPrimary = meta.filename === primaryFileName;

        // simpan path ke DB melalui service
        const result = await this._roomPicturesService.addPicture({
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
      const pictures = await this._roomPicturesService.getPictures({ roomId });

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

      const { pictureId } = request.params;

      // Ambil info path file dari DB (untuk dihapus dari storage)
      const pictures = await this._roomPicturesService.getPictures({ roomId }); // nanti ganti sesuai struktur
      const picture = pictures.find(p => p.id === pictureId);

      if (!picture) throw new Error("Foto tidak ditemukan");

      await this._storageService.deleteFile(picture.path);
      const result = await this._roomPicturesService.deletePicture({ pictureId });

      return {
        status: "success",
        data: result
      };
    } catch (error) {
      throw error;
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
