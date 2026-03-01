import logger from '../utils/logger.js';
import axios from 'axios';

class WeatherService {
    constructor() {
        this.apiKey = process.env.OPENWEATHER_API_KEY;
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    }

    async getWeather(city) {
        try {
            if (!this.apiKey) {
                logger.warn('OpenWeather API key not configured');
                return null;
            }

            const response = await axios.get(`${this.baseUrl}/weather`, {
                params: {
                    q: city,
                    appid: this.apiKey,
                    units: 'metric'
                }
            });

            const data = response.data;
            return {
                city: data.name,
                country: data.sys.country,
                temp: data.main.temp,
                feels_like: data.main.feels_like,
                humidity: data.main.humidity,
                description: data.weather[0].description,
                icon: data.weather[0].icon
            };
        } catch (error) {
            logger.error('Weather fetch error:', error);
            return null;
        }
    }
}

const weatherService = new WeatherService();
export default weatherService;
