import express from 'express';
import path from 'path';

const router = express.Router();

router.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'pair.html'));
});

router.post('/', async (req, res) => {
    try {
        const { number } = req.body;
        if (!number || number.length < 10) {
            return res.json({ success: false, error: 'Invalid number' });
        }
        try {
            const { generatePairingCode } = await import('../../services/pairingService.js');
            const result = await generatePairingCode(number);
            return res.json({ success: true, number: result.number, code: result.code });
        } catch (e) {
            return res.json({ success: false, error: e.message });
        }
    } catch (e) {
        return res.json({ success: false, error: e.message });
    }
});

export default router;
