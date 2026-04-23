const { query } = require('express-validator');

const UPLOAD_TYPES = [
  'building_thumbnail', 'building_gallery',
  'room_thumbnail', 'room_gallery', 'room_3d', 'room_blueprint',
  'contract_pdf', 'avatar',
  'request_attachment', 'request_completion', 'signature',
];

const UPLOAD_TYPE_LABELS = {
  building_thumbnail: 'Ảnh đại diện tòa nhà',
  building_gallery: 'Thư viện ảnh tòa nhà',
  room_thumbnail: 'Ảnh đại diện phòng',
  room_gallery: 'Thư viện ảnh phòng',
  room_3d: 'Mô hình 3D phòng',
  room_blueprint: 'Bản vẽ phòng',
  contract_pdf: 'Tệp hợp đồng PDF',
  avatar: 'Ảnh đại diện',
  request_attachment: 'Tệp đính kèm yêu cầu',
  request_completion: 'Ảnh hoàn thành yêu cầu',
  signature: 'Chữ ký',
};

const SUPPORTED_UPLOAD_TYPE_LABELS = UPLOAD_TYPES.map((type) => UPLOAD_TYPE_LABELS[type]).join(', ');

exports.upload = [
  query('type')
    .notEmpty().withMessage('Loại upload không được để trống')
    .isIn(UPLOAD_TYPES).withMessage(`Loại upload không hợp lệ. Các loại được hỗ trợ: ${SUPPORTED_UPLOAD_TYPE_LABELS}`),
];
