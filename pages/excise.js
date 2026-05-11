/* ============================================================
   BarOps Backend — src/routes/excise.js
   Акцизні марки → Telegram топік закладу
   ============================================================ */

const express  = require('express');
const multer   = require('multer');
const auth     = require('../middleware/auth');
const telegram = require('../telegram');
const router   = express.Router();

// Зберігаємо фото в пам'яті (не на диск)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/* ── POST /api/excise/photo — надсилання фото ── */
router.post('/photo', auth, upload.single('photo'), async (req, res) => {
  try {
    const { venueName, barmanName } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Фото не передано' });
    }
    if (!venueName) {
      return res.status(400).json({ error: 'Вкажіть назву закладу' });
    }

    const now     = new Date();
    const timeStr = now.toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const caption =
      `📋 *Акцизна марка*\n` +
      `👤 Бармен: ${barmanName || 'Бармен'}\n` +
      `🏠 Заклад: ${venueName}\n` +
      `🕐 Час: ${timeStr}`;

    // Надсилаємо фото в потрібний топік Telegram
    const sent = await telegram.sendExcisePhoto({
      venueName,
      photoBuffer: req.file.buffer,
      caption,
    });

    console.log(`[Excise Photo] ${venueName} — ${barmanName} — Telegram: ${sent ? '✓' : '✗'}`);

    res.json({ success: true, sent });
  } catch (err) {
    console.error('[Excise Photo POST]', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /api/excise — текстовий (legacy) ── */
router.post('/', auth, async (req, res) => {
  try {
    const { code, productName, venueName, barmanName } = req.body;
    if (!productName) return res.status(400).json({ error: 'Вкажіть назву товару' });

    const now     = new Date();
    const timeStr = now.toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const sent = await telegram.notifyExcise({
      venueName:  venueName || 'Невідомий заклад',
      barmanName: barmanName || 'Бармен',
      productName,
      code:       code || 'Не розпізнано',
      time:       timeStr,
    });

    res.json({ success: true, sent, data: { code, productName, venueName, time: timeStr } });
  } catch (err) {
    console.error('[Excise POST]', err);
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /api/excise ── */
router.get('/', auth, async (req, res) => {
  res.json({ success: true, venues: telegram.VENUE_TOPICS });
});

module.exports = router;
