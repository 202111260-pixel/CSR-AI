import { Router } from 'express';
import { z } from 'zod';
import { emailService } from '../services/emailService.js';

const router = Router();

const contactSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(100).optional(),
  message: z.string().max(1000).optional(),
});

// POST /api/contact  — public, no auth required
router.post('/', async (req, res, next) => {
  try {
    const { email, name, message } = contactSchema.parse(req.body);

    // Send to admin inbox
    const adminEmail =
      process.env.ADMIN_EMAIL ||
      process.env.SMTP_USER ||
      process.env.EMAIL_FROM ||
      '';

    if (adminEmail) {
      await emailService.sendContactInquiry(adminEmail, { email, name, message });
    }

    res.json({ success: true, data: { message: 'تم استلام طلبك، سنتواصل معك قريباً.' } });
  } catch (err) {
    next(err);
  }
});

export default router;
