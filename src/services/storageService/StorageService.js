import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

export class StorageService {
  constructor(baseFolder) {
    this._baseFolder = baseFolder;

    if (!fs.existsSync(baseFolder)) {
      fs.mkdirSync(baseFolder, { recursive: true });
    }
  }

  /**
   * Menyimpan file ke folder storage
   * @param {ReadableStream} file - stream file dari multer / upload frontend
   * @param {string} originalName - nama file asli
   * @param {string} subFolder - folder tambahan, misal roomId
   * @returns {Promise<string>} - path relatif file yang disimpan
   */
  async writeFile(file, originalName, subFolder = '') {
    // Sanitasi nama file: hapus spasi, generate unique
    const ext = path.extname(originalName);
    const filename = `${nanoid(12)}${ext}`;

    const folderPath = path.join(this._baseFolder, subFolder);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const fullPath = path.join(folderPath, filename);
    const fileStream = fs.createWriteStream(fullPath);

    return new Promise((resolve, reject) => {
      fileStream.on('error', reject);
      fileStream.on('finish', () => {
        // kembalikan path relatif untuk DB
        const relativePath = path.join(subFolder, filename).replace(/\\/g, '/');
        resolve(relativePath);
      });
      file.pipe(fileStream);
    });
  }

  /**
   * Menghapus file dari storage
   * @param {string} filePath - path relatif file
   */
  async deleteFile(filePath) {
    const fullPath = path.join(this._baseFolder, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}
