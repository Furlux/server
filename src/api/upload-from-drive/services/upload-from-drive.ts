import type { Core } from '@strapi/strapi';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const DRIVE_ID_REGEX = /(?:\/file\/d\/|[?&]id=|\/d\/)([a-zA-Z0-9_-]{20,})/;

// inputs Google Drive share URL, does extract file ID via regex, returns ID string or null
const extractDriveFileId = (url: string): string | null => {
  const match = url.match(DRIVE_ID_REGEX);
  return match ? match[1] : null;
};

// inputs file ID, does fetch binary from Drive public download endpoint, returns { buffer, contentType, filename }
const downloadDriveFile = async (fileId: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> => {
  const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`;

  const response = await fetch(downloadUrl, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Drive download failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
    throw new Error(`Not an image: ${contentType}. Ensure Drive file is public ("Anyone with the link").`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const disposition = response.headers.get('content-disposition') ?? '';
  const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `drive-${fileId}.jpg`;

  return { buffer, contentType, filename };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // inputs { url, productDocumentId }, does download Drive file and attach to product images, returns { file, product }
  async uploadAndAttach({ url, productDocumentId }: { url: string; productDocumentId: string }) {
    const fileId = extractDriveFileId(url);
    if (!fileId) {
      throw new Error('Невірний формат Google Drive URL');
    }

    const { buffer, contentType, filename } = await downloadDriveFile(fileId);

    const tmpPath = path.join(os.tmpdir(), `${crypto.randomUUID()}-${filename}`);
    fs.writeFileSync(tmpPath, buffer);

    try {
      const uploaded = await strapi.plugin('upload').service('upload').upload({
        data: {},
        files: [
          {
            filepath: tmpPath,
            originalFilename: filename,
            mimetype: contentType,
            size: buffer.length,
          },
        ],
      });

      const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;

      const product = await strapi.documents('api::product.product').findOne({
        documentId: productDocumentId,
        populate: { images: true },
      });

      if (!product) {
        throw new Error(`Товар не знайдено: ${productDocumentId}`);
      }

      const existingImageIds = (product.images ?? []).map((img: { id: number }) => img.id);

      await strapi.documents('api::product.product').update({
        documentId: productDocumentId,
        data: {
          images: [...existingImageIds, file.id],
        },
      });

      return { file, productDocumentId };
    } finally {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore cleanup error
      }
    }
  },
});
