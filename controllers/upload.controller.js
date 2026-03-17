const uploadService = require('../services/upload.service');

const uploadFiles = async (req, res) => {
  try {
    const { type } = req.query;

    if (!type) {
      return res.status(400).json({ message: 'Missing required query parameter: type' });
    }

    const urls = await uploadService.uploadFiles(req, type);

    return res.status(200).json({ urls });
  } catch (err) {
    console.error('[UploadController]', err);
    const status = err.status || 500;
    const message = err.message || 'Upload failed';
    return res.status(status).json({ message });
  }
};

module.exports = { uploadFiles };
