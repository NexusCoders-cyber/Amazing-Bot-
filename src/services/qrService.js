import qrcode from 'qrcode';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class QRService {
    constructor() {
        this.currentQR = null;
        this.qrPath = path.join(process.cwd(), 'temp', 'qr.png');
        this.qrData = null;
        this.isGenerating = false;
    }

    async generateQR(data) {
        try {
            if (this.isGenerating) {
                logger.warn('QR generation already in progress');
                return false;
            }

            this.isGenerating = true;
            this.qrData = data;

            // Ensure temp directory exists
            await fs.ensureDir(path.dirname(this.qrPath));

            // Generate QR code as PNG
            await qrcode.toFile(this.qrPath, data, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            this.currentQR = this.qrPath;
            logger.info('QR code generated successfully');

            return true;
        } catch (error) {
            logger.error('Failed to generate QR code:', error);
            return false;
        } finally {
            this.isGenerating = false;
        }
    }

    async generateQRDataURL(data) {
        try {
            const qrDataURL = await qrcode.toDataURL(data, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            this.qrData = data;
            return qrDataURL;
        } catch (error) {
            logger.error('Failed to generate QR data URL:', error);
            return null;
        }
    }

    getCurrentQR() {
        return {
            path: this.currentQR,
            data: this.qrData,
            exists: this.currentQR && fs.existsSync(this.currentQR)
        };
    }

    async clearQR() {
        try {
            if (this.currentQR && await fs.pathExists(this.currentQR)) {
                await fs.remove(this.currentQR);
                this.currentQR = null;
                this.qrData = null;
                logger.info('QR code cleared');
            }
        } catch (error) {
            logger.error('Failed to clear QR code:', error);
        }
    }

    isQREnabled() {
        return config.session.qrScannerEnabled === true;
    }

    getQRStatus() {
        return {
            enabled: this.isQREnabled(),
            hasQR: !!this.currentQR,
            qrPath: this.currentQR,
            qrData: this.qrData,
            isGenerating: this.isGenerating
        };
    }
}

export const qrService = new QRService();
export default qrService;