import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { upload, ALLOWED_EXTENSIONS } from '../middleware/upload.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadRateLimit } from '../middleware/rateLimit.js';

const router = Router();

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

// Ensure upload directories exist
for (const sub of ['documents', 'media', 'avatars']) {
  const dir = path.join(UPLOAD_DIR, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Safely extract and validate file extension
function getSafeExtension(originalname: string, category: string): string | null {
  const ext = path.extname(originalname).toLowerCase();
  const allowedExts = ALLOWED_EXTENSIONS[category];
  if (!allowedExts || !allowedExts.includes(ext)) return null;
  // Only allow simple alphanumeric extensions
  if (!/^\.[a-z0-9]+$/i.test(ext)) return null;
  return ext;
}

// POST /api/upload/:category — Upload a file (documents | media | avatars)
router.post('/:category', authenticate, uploadRateLimit, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const category = req.params.category as string;
    if (!['documents', 'media', 'avatars'].includes(category)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CATEGORY', message: 'Category must be documents, media, or avatars' } });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }

    const ext = getSafeExtension(req.file.originalname, category);
    if (!ext) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_FILE_TYPE', message: `File type not allowed for ${category}` } });
    }

    const filename = `${crypto.randomUUID()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, category, filename);

    // Ensure resolved path stays within upload directory (path traversal protection)
    const resolvedPath = path.resolve(filepath);
    if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PATH', message: 'Invalid file path' } });
    }

    fs.writeFileSync(filepath, req.file.buffer);

    const url = `/uploads/${category}/${filename}`;

    res.status(201).json({
      success: true,
      data: {
        url,
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

// POST /api/upload/:category/multiple — Upload multiple files
router.post('/:category/multiple', authenticate, uploadRateLimit, upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const category = req.params.category as string;
    if (!['documents', 'media', 'avatars'].includes(category)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CATEGORY', message: 'Category must be documents, media, or avatars' } });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No files uploaded' } });
    }

    const results = [];
    for (const file of files) {
      const ext = getSafeExtension(file.originalname, category);
      if (!ext) continue; // Skip invalid files silently (already filtered by multer)

      const filename = `${crypto.randomUUID()}${ext}`;
      const filepath = path.join(UPLOAD_DIR, category, filename);

      const resolvedPath = path.resolve(filepath);
      if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) continue;

      fs.writeFileSync(filepath, file.buffer);
      results.push({
        url: `/uploads/${category}/${filename}`,
        filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      });
    }

    res.status(201).json({ success: true, data: results });
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
});

export default router;
export { UPLOAD_DIR };
