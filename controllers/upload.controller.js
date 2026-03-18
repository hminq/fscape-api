const uploadService = require('../services/upload.service');

const uploadFiles = async (req, res) => {
  try {
    const { type } = req.query;

    if (!type) {
      console.warn('[UploadController] uploadFiles: missing type query parameter');
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }

    const urls = await uploadService.uploadFiles(req, type);

    return res.status(200).json({ urls });
  } catch (err) {
    console.error('[UploadController]', err);
    const status = err.status || 500;
    const message = err.message || 'Tải lên thất bại';
    return res.status(status).json({ message });
  }
};

module.exports = { uploadFiles };
