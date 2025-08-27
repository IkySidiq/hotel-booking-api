import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { logger } from '../../utils/logger.js';

export class StorageService {
  constructor(baseFolder) {
    this._baseFolder = baseFolder;

    if (!fs.existsSync(baseFolder)) {
      fs.mkdirSync(baseFolder, { recursive: true });
      logger.info(`[StorageService] Base folder created at ${baseFolder}`);
    } else {
      logger.info(`[StorageService] Base folder exists at ${baseFolder}`);
    }
  }

  async writeFile(file, originalName, subFolder = '') {
    const ext = path.extname(originalName);
    const filename = `${nanoid(12)}${ext}`;
    const folderPath = path.join(this._baseFolder, subFolder);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      logger.info(`[StorageService] Created subfolder at ${folderPath}`);
    }

    const fullPath = path.join(folderPath, filename);
    const fileStream = fs.createWriteStream(fullPath);

    return new Promise((resolve, reject) => {
      fileStream.on('error', (err) => {
        logger.error(`[StorageService] Failed to write file ${originalName} -> ${fullPath}: ${err.message}`);
        reject(err);
      });

      fileStream.on('finish', () => {
        const relativePath = path.join(subFolder, filename).replace(/\\/g, '/');
        logger.info(`[StorageService] File written successfully: ${relativePath}`);
        resolve(relativePath);
      });

      file.pipe(fileStream);
    });
  }

  async deleteFile(filePath) {
    try {
      const fullPath = path.join(this._baseFolder, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        logger.info(`[StorageService] File deleted successfully: ${filePath}`);
      } else {
        logger.warn(`[StorageService] File not found for deletion: ${filePath}`);
      }
    } catch (err) {
      logger.error(`[StorageService] Failed to delete file ${filePath}: ${err.message}`);
      throw err;
    }
  }
}
