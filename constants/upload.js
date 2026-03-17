const UPLOAD_CATEGORIES = {
  building_thumbnail: {
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    mimePattern: /^image\//,
    folder: 'buildings/thumbnails',
  },
  building_gallery: {
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024,
    mimePattern: /^image\//,
    folder: 'buildings/gallery',
  },
  room_thumbnail: {
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    mimePattern: /^image\//,
    folder: 'rooms/thumbnails',
  },
  room_gallery: {
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024,
    mimePattern: /^image\//,
    folder: 'rooms/gallery',
  },
  room_3d: {
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    mimePattern: /^(model\/(obj|gltf\+json|gltf-binary)|application\/(octet-stream|gltf|gltf-binary))$/,
    folder: 'rooms/3d',
    resourceType: 'raw',
    allowedExtensions: ['.obj', '.gltf', '.glb'],
  },
  room_blueprint: {
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    mimePattern: /^image\//,
    folder: 'rooms/blueprints',
  },
  avatar: {
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    mimePattern: /^image\//,
    folder: 'users/avatars',
  },
  contract_pdf: {
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    mimePattern: /^application\/pdf$/,
    folder: 'contracts/pdfs',
    resourceType: 'raw',
  },
  request_attachment: {
    maxFiles: 3,
    maxSize: 5 * 1024 * 1024,
    mimePattern: /^image\//,
    folder: 'requests/attachments',
  },
  request_completion: {
    maxFiles: 3,
    maxSize: 5 * 1024 * 1024,
    mimePattern: /^image\//,
    folder: 'requests/completion',
  },
  signature: {
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024,
    mimePattern: /^image\/png$/,
    folder: 'signatures',
  },
};

module.exports = { UPLOAD_CATEGORIES };