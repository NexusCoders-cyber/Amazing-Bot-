import logger from '../utils/logger.js';
import axios from 'axios';

class NewsService {
    constructor() {
        this.apiKey = process.env.NEWS_API_KEY;
        this.baseUrl = 'https://newsapi.org/v2';
    }

    async getTopHeadlines(country = 'us', category = 'general') {
        try {
            if (!this.apiKey) {
                logger.warn('News API key not configured');
                return [];
            }

            const response = await axios.get(`${this.baseUrl}/top-headlines`, {
                params: { country, category, apiKey: this.apiKey }
            });

            return response.data.articles || [];
        } catch (error) {
            logger.error('Error fetching news:', error);
            return [];
        }
    }

    async searchNews(query, pageSize = 5) {
        try {
            if (!this.apiKey) {
                logger.warn('News API key not configured');
                return [];
            }

            const response = await axios.get(`${this.baseUrl}/everything`, {
                params: { q: query, pageSize, apiKey: this.apiKey }
            });

            return response.data.articles || [];
        } catch (error) {
            logger.error('Error searching news:', error);
            return [];
        }
    }
}

const newsService = new NewsService();
export default newsService;
