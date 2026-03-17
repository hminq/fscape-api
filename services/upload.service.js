const path = require('path');
const Busboy = require('busboy');
const cloudinary = require('../config/cloudinary');
const { UPLOAD_CATEGORIES } = require('../constants/upload');

/**
 * Parse multipart files from request, validate against category config,
 * upload to Cloudinary, and return an array of secure_url strings.
 */
async function uploadFiles(req, categoryKey) {
  const config = UPLOAD_CATEGORIES[categoryKey];
  if (!config) {
    const err = new Error(`Unknown upload type: ${categoryKey}`);
    err.status = 400;
    throw err;
  }

  const files = await parseMultipart(req, config);

  if (files.length === 0) {
    const err = new Error('No files provided');
    err.status = 400;
    throw err;
  }

  const resourceType = config.resourceType || 'image';

  const uploads = files.map((file) => {
    // For raw uploads, preserve original file extension in public_id
    // so the Cloudinary URL ends with .glb, .gltf, .pdf, etc.
    const ext = file.filename ? path.extname(file.filename).toLowerCase() : '';
    return uploadToCloudinary(file.buffer, {
      folder: config.folder,
      resourceType,
      extension: resourceType === 'raw' ? ext : '',
    });
  });

  return Promise.all(uploads);
}

/**
 * Use busboy to parse multipart form data into in-memory buffers.
 * Validates file count, individual file size, and MIME type.
 */
function parseMultipart(req, config) {
  return new Promise((resolve, reject) => {
    const files = [];
    let finished = false;

    const fail = (msg) => {
      if (finished) return;
      finished = true;
      const err = new Error(msg);
      err.status = 400;
      reject(err);
    };

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: config.maxFiles,
        fileSize: config.maxSize,
      },
    });

    busboy.on('file', (fieldname, stream, info) => {
      const { mimeType, filename } = info;

      if (!config.mimePattern.test(mimeType)) {
        stream.resume(); // drain the stream
        return fail(`Invalid file type: ${mimeType}`);
      }

      const chunks = [];
      let size = 0;

      stream.on('data', (chunk) => {
        size += chunk.length;
        chunks.push(chunk);
      });

      stream.on('limit', () => {
        const maxMB = (config.maxSize / (1024 * 1024)).toFixed(0);
        fail(`File exceeds maximum size of ${maxMB}MB`);
      });

      stream.on('end', () => {
        if (!finished) {
          files.push({ buffer: Buffer.concat(chunks), mimeType, filename });
        }
      });
    });

    busboy.on('filesLimit', () => {
      fail(`Too many files. Maximum allowed: ${config.maxFiles}`);
    });

    busboy.on('finish', () => {
      if (!finished) {
        finished = true;
        resolve(files);
      }
    });

    busboy.on('error', (err) => {
      if (!finished) {
        finished = true;
        reject(err);
      }
    });

    req.pipe(busboy);
  });
}

/**
 * Upload a buffer to Cloudinary using upload_stream.
 * Returns the secure_url string.
 */
function uploadToCloudinary(buffer, { folder, resourceType, extension = '' }) {
  return new Promise((resolve, reject) => {
    const opts = { folder, resource_type: resourceType };

    // Append extension to public_id so the URL preserves it
    // e.g. rooms/3d/abc123.glb instead of rooms/3d/abc123
    if (extension) {
      const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      opts.public_id = `${uniqueId}${extension}`;
    }

    const stream = cloudinary.uploader.upload_stream(
      opts,
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Upload a raw buffer to Cloudinary for a given category.
 * Used for server-side uploads (e.g. PDF generation) where there is no HTTP request.
 *
 * @param {Buffer} buffer - File content
 * @param {string} categoryKey - Key from UPLOAD_CATEGORIES (e.g. 'contract_pdf')
 * @param {string} filename - Original filename (used for extension)
 * @returns {string} Cloudinary secure_url
 */
async function uploadBuffer(buffer, categoryKey, filename) {
  const config = UPLOAD_CATEGORIES[categoryKey];
  if (!config) {
    const err = new Error(`Unknown upload type: ${categoryKey}`);
    err.status = 400;
    throw err;
  }

  const resourceType = config.resourceType || 'image';
  const ext = filename ? path.extname(filename).toLowerCase() : '';

  return uploadToCloudinary(buffer, {
    folder: config.folder,
    resourceType,
    extension: resourceType === 'raw' ? ext : '',
  });
}

module.exports = { uploadFiles, uploadBuffer };
