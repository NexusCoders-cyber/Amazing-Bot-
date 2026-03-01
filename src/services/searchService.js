import logger from '../utils/logger.js';
import googlethis from 'googlethis';

class SearchService {
    async search(query, options = {}) {
        try {
            const results = await googlethis.search(query, {
                page: options.page || 0,
                safe: options.safe !== false
            });

            return {
                results: results.results || [],
                knowledge_panel: results.knowledge_panel || null
            };
        } catch (error) {
            logger.error('Search error:', error);
            return { results: [], knowledge_panel: null };
        }
    }

    async image(query, options = {}) {
        try {
            const results = await googlethis.image(query, {
                safe: options.safe !== false
            });

            return results || [];
        } catch (error) {
            logger.error('Image search error:', error);
            return [];
        }
    }
}

const searchService = new SearchService();
export default searchService;
