import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

// Allowed MIME types per upload category
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
  media: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
  ],
  avatars: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
};

// Allowed file extensions (double-check beyond MIME)
const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'],
  media: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mp3', '.wav'],
  avatars: ['.jpg', '.jpeg', '.png', '.webp'],
};

// Blocked extension patterns (dangerous regardless of MIME)
const BLOCKED_EXTENSIONS = /\.(exe|sh|bat|cmd|ps1|vbs|js|php|asp|aspx|jsp|py|rb|pl|cgi|com|scr|pif|msi|dll)$/i;

function fileFilter(req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const category = req.params.category;

  // Check for blocked extensions first
  if (BLOCKED_EXTENSIONS.test(file.originalname)) {
    return cb(new Error('File type not allowed'));
  }

  // If category is known, validate against whitelist
  const cat = Array.isArray(category) ? category[0] : category;
  if (cat && ALLOWED_MIME_TYPES[cat]) {
    const allowedMimes = ALLOWED_MIME_TYPES[cat];
    const allowedExts = ALLOWED_EXTENSIONS[cat];
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();

    if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
      return cb(new Error(`File type not allowed for ${category}. Allowed: ${allowedExts.join(', ')}`));
    }
  }

  cb(null, true);
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

export { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS };
