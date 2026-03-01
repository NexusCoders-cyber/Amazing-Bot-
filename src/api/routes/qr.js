import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import qrService from '../../services/qrService.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const qrStatus = qrService.getQRStatus();

        if (!qrStatus.enabled) {
            return res.status(403).json({
                error: 'QR scanner is not enabled',
                message: 'Set QR_SCANNER_ENABLED=true in environment variables to enable QR scanner'
            });
        }

        if (!qrStatus.hasQR) {
            return res.status(404).json({
                error: 'No QR code available',
                message: 'QR code will be generated when WhatsApp connection requires authentication'
            });
        }

        res.json({
            status: 'available',
            qrPath: '/qr/image',
            qrData: qrStatus.qrData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting QR status:', error);
        res.status(500).json({
            error: 'Failed to get QR status',
            message: error.message
        });
    }
});

router.get('/image', async (req, res) => {
    try {
        const qrStatus = qrService.getQRStatus();

        if (!qrStatus.enabled) {
            return res.status(403).json({
                error: 'QR scanner is not enabled'
            });
        }

        if (!qrStatus.hasQR || !qrStatus.exists) {
            return res.status(404).json({
                error: 'QR code image not found',
                message: 'QR code will be generated when WhatsApp connection requires authentication'
            });
        }

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const qrStream = fs.createReadStream(qrStatus.path);
        qrStream.pipe(res);

        qrStream.on('error', (error) => {
            console.error('Error streaming QR image:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Failed to stream QR image',
                    message: error.message
                });
            }
        });
    } catch (error) {
        console.error('Error serving QR image:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to serve QR image',
                message: error.message
            });
        }
    }
});

router.get('/data', async (req, res) => {
    try {
        const qrStatus = qrService.getQRStatus();

        if (!qrStatus.enabled) {
            return res.status(403).json({
                error: 'QR scanner is not enabled'
            });
        }

        if (!qrStatus.qrData) {
            return res.status(404).json({
                error: 'No QR data available'
            });
        }

        const qrDataURL = await qrService.generateQRDataURL(qrStatus.qrData);

        if (!qrDataURL) {
            return res.status(500).json({
                error: 'Failed to generate QR data URL'
            });
        }

        res.json({
            status: 'success',
            qrDataURL: qrDataURL,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting QR data:', error);
        res.status(500).json({
            error: 'Failed to get QR data',
            message: error.message
        });
    }
});

export default router;
