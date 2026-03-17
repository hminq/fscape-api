const { query } = require('express-validator');

const UPLOAD_TYPES = [
  'building_thumbnail', 'building_gallery',
  'room_thumbnail', 'room_gallery', 'room_3d', 'room_blueprint',
  'contract_pdf', 'avatar',
  'request_attachment', 'request_completion', 'signature',
];

exports.upload = [
  query('type')
    .notEmpty().withMessage('Loại upload không được để trống')
    .isIn(UPLOAD_TYPES).withMessage(`Loại upload phải là: ${UPLOAD_TYPES.join(', ')}`),
];
