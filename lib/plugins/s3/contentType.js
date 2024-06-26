const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

const types = {
  css: 'text/css',
  gif: 'image/gif',
  html: 'text/html',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpg',
  js: 'application/javascript',
  json: 'application/json',
  har: 'application/json',
  mp4: 'video/mp4',
  png: 'image/png',
  svg: 'image/svg+xml',
  gz: 'application/gzip',
  log: 'text/plain'
};

function getExtension(filename) {
  return filename.split('.').pop();
}

export function getContentType(file) {
  return types[getExtension(file)] || DEFAULT_CONTENT_TYPE;
}
