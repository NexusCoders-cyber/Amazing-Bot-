import logger from '../utils/logger.js';
import translate from 'translate-google-api';

class TranslateService {
    async translate(text, targetLang = 'en', sourceLang = 'auto') {
        try {
            const result = await translate(text, {
                to: targetLang,
                from: sourceLang
            });

            return {
                text: result[0],
                from: sourceLang,
                to: targetLang
            };
        } catch (error) {
            logger.error('Translation error:', error);
            return null;
        }
    }

    async detectLanguage(text) {
        try {
            const result = await translate(text, { to: 'en' });
            return result.from?.language?.iso || 'unknown';
        } catch (error) {
            logger.error('Language detection error:', error);
            return 'unknown';
        }
    }
}

const translateService = new TranslateService();
export default translateService;
