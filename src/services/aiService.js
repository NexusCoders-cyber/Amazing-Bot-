const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { cache } = require('../utils/cache');

class AIService {
    constructor() {
        this.openaiClient = null;
        this.geminiClient = null;
        this.conversationHistory = new Map();
        this.rateLimits = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            if (config.apis.openai.apiKey) {
                this.setupOpenAI();
            }

            if (config.apis.gemini.apiKey) {
                this.setupGemini();
            }

            this.isInitialized = true;
            logger.info('AI Service initialized');
        } catch (error) {
            logger.error('AI Service initialization failed:', error);
            throw error;
        }
    }

    setupOpenAI() {
        this.openaiClient = axios.create({
            baseURL: config.apis.openai.baseURL || 'https://api.openai.com/v1',
            headers: {
                'Authorization': `Bearer ${config.apis.openai.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        logger.info('OpenAI client initialized');
    }

    setupGemini() {
        this.geminiClient = axios.create({
            baseURL: `${config.apis.gemini.baseURL || 'https://generativelanguage.googleapis.com/v1beta'}/models`,
            timeout: 30000
        });

        logger.info('Gemini client initialized');
    }

    async getChatGPTResponse(prompt, user = null, context = {}) {
        if (!this.openaiClient) {
            throw new Error('OpenAI not configured');
        }

        try {
            if (!await this.checkRateLimit('openai', user?.jid)) {
                throw new Error('Rate limit exceeded for OpenAI');
            }

            const cacheKey = `chatgpt_${this.hashString(prompt)}`;
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const messages = this.buildConversationHistory(prompt, user?.jid, 'openai');
            
            const response = await this.openaiClient.post('/chat/completions', {
                model: config.apis.openai.model || 'gpt-3.5-turbo',
                messages,
                max_tokens: config.apis.openai.maxTokens || 150,
                temperature: config.apis.openai.temperature || 0.7,
                presence_penalty: 0.6,
                frequency_penalty: 0.5,
                user: user?.jid || 'anonymous'
            });

            const aiResponse = response.data.choices[0]?.message?.content?.trim();
            
            if (aiResponse) {
                await cache.set(cacheKey, aiResponse, 1800);
                this.updateConversationHistory(user?.jid, 'openai', prompt, aiResponse);
                await this.updateRateLimit('openai', user?.jid);
            }

            return aiResponse;
        } catch (error) {
            logger.error('ChatGPT API error:', error);
            
            if (error.response?.status === 429) {
                throw new Error('OpenAI rate limit exceeded. Please try again later.');
            } else if (error.response?.status === 401) {
                throw new Error('OpenAI API key invalid or expired.');
            } else if (error.response?.status === 402) {
                throw new Error('OpenAI quota exceeded. Please check your billing.');
            }
            
            throw new Error('Failed to get AI response. Please try again.');
        }
    }

    async getGeminiResponse(prompt, user = null, context = {}) {
        if (!this.geminiClient) {
            throw new Error('Gemini not configured');
        }

        try {
            if (!await this.checkRateLimit('gemini', user?.jid)) {
                throw new Error('Rate limit exceeded for Gemini');
            }

            const cacheKey = `gemini_${this.hashString(prompt)}`;
            const cached = await cache.get(cacheKey);
            if (cached) {
                return cached;
            }

            const model = config.apis.gemini.model || 'gemini-pro';
            const response = await this.geminiClient.post(`/${model}:generateContent`, {
                contents: [{
                    parts: [{
                        text: this.buildGeminiPrompt(prompt, user, context)
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 150
                }
            }, {
                params: {
                    key: config.apis.gemini.apiKey
                }
            });

            const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            
            if (aiResponse) {
                await cache.set(cacheKey, aiResponse, 1800);
                this.updateConversationHistory(user?.jid, 'gemini', prompt, aiResponse);
                await this.updateRateLimit('gemini', user?.jid);
            }

            return aiResponse;
        } catch (error) {
            logger.error('Gemini API error:', error);
            
            if (error.response?.status === 429) {
                throw new Error('Gemini rate limit exceeded. Please try again later.');
            } else if (error.response?.status === 403) {
                throw new Error('Gemini API access denied. Check your API key.');
            }
            
            throw new Error('Failed to get AI response. Please try again.');
        }
    }

    async generateResponse(prompt, user = null, isGroup = false) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const cleanPrompt = this.sanitizePrompt(prompt);
            
            if (cleanPrompt.length > 500) {
                return 'Your message is too long. Please keep it under 500 characters.';
            }

            if (this.isInappropriate(cleanPrompt)) {
                return 'I cannot respond to inappropriate content. Please ask something else.';
            }

            const context = {
                isGroup,
                userInfo: user ? {
                    name: user.name || 'User',
                    isPremium: user.isPremium || false
                } : null
            };

            let response = null;

            if (config.apis.openai.apiKey && Math.random() < 0.7) {
                response = await this.getChatGPTResponse(cleanPrompt, user, context);
            } else if (config.apis.gemini.apiKey) {
                response = await this.getGeminiResponse(cleanPrompt, user, context);
            }

            if (!response) {
                return this.getFallbackResponse(cleanPrompt);
            }

            return this.postProcessResponse(response, user, isGroup);
        } catch (error) {
            logger.error('AI response generation failed:', error);
            return this.getFallbackResponse(prompt);
        }
    }

    buildConversationHistory(prompt, userId, provider) {
        const historyKey = `${provider}_${userId || 'anonymous'}`;
        const history = this.conversationHistory.get(historyKey) || [];
        
        const systemMessage = {
            role: 'system',
            content: `You are Ilom Bot, a helpful WhatsApp assistant created by Ilom. You are friendly, knowledgeable, and concise. Keep responses under 200 words. Current time: ${new Date().toLocaleString()}`
        };

        const messages = [systemMessage];
        
        history.slice(-6).forEach(entry => {
            messages.push(
                { role: 'user', content: entry.prompt },
                { role: 'assistant', content: entry.response }
            );
        });

        messages.push({ role: 'user', content: prompt });
        
        return messages;
    }

    buildGeminiPrompt(prompt, user, context) {
        const systemInfo = `You are Ilom Bot, a helpful WhatsApp assistant. Be friendly and concise.`;
        const userInfo = user ? `User: ${user.name || 'User'}` : '';
        const contextInfo = context.isGroup ? 'This is a group chat.' : 'This is a private chat.';
        
        return `${systemInfo}\n${userInfo}\n${contextInfo}\n\nUser question: ${prompt}\n\nResponse:`;
    }

    updateConversationHistory(userId, provider, prompt, response) {
        if (!userId) return;

        const historyKey = `${provider}_${userId}`;
        const history = this.conversationHistory.get(historyKey) || [];
        
        history.push({
            prompt,
            response,
            timestamp: Date.now()
        });

        if (history.length > 10) {
            history.shift();
        }

        this.conversationHistory.set(historyKey, history);
    }

    sanitizePrompt(prompt) {
        return prompt
            .replace(/[^\w\s\.,!?'-]/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 500);
    }

    isInappropriate(prompt) {
        const inappropriateWords = [
            'nsfw', 'explicit', 'adult', 'sexual', 'porn', 'nude', 'naked',
            'hate', 'violence', 'kill', 'suicide', 'harm', 'illegal'
        ];

        const lowerPrompt = prompt.toLowerCase();
        return inappropriateWords.some(word => lowerPrompt.includes(word));
    }

    async checkRateLimit(provider, userId) {
        if (!userId) return true;

        const rateLimitKey = `${provider}_rate_${userId}`;
        const requests = await cache.get(rateLimitKey) || 0;
        
        const limit = provider === 'openai' ? 10 : 15;
        const window = 3600000;

        if (requests >= limit) {
            return false;
        }

        return true;
    }

    async updateRateLimit(provider, userId) {
        if (!userId) return;

        const rateLimitKey = `${provider}_rate_${userId}`;
        const requests = await cache.get(rateLimitKey) || 0;
        
        await cache.set(rateLimitKey, requests + 1, 3600);
    }

    getFallbackResponse(prompt) {
        const responses = [
            "I'm having trouble processing that right now. Could you try rephrasing your question?",
            "I'm currently experiencing some technical difficulties. Please try again in a moment.",
            "Sorry, I couldn't understand that. Could you be more specific?",
            "I'm not sure how to respond to that. Try asking something else!",
            "My AI services are temporarily unavailable. Please try again later.",
            "I'm having trouble connecting to my knowledge base. Please retry your question.",
            "Could you rephrase your question? I want to give you the best possible answer.",
            "I'm currently learning and improving. Your question might be too complex for me right now."
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    }

    postProcessResponse(response, user, isGroup) {
        let processed = response
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (processed.length > 1000) {
            processed = processed.substring(0, 997) + '...';
        }

        if (user?.isPremium) {
            processed += '\n\n_✨ Premium AI Response_';
        }

        return processed;
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    async generateImage(prompt, user = null) {
        if (!this.openaiClient) {
            throw new Error('OpenAI not configured for image generation');
        }

        try {
            if (!await this.checkRateLimit('dall-e', user?.jid)) {
                throw new Error('Rate limit exceeded for image generation');
            }

            const response = await this.openaiClient.post('/images/generations', {
                prompt: this.sanitizePrompt(prompt),
                n: 1,
                size: '512x512',
                quality: 'standard',
                user: user?.jid || 'anonymous'
            });

            const imageUrl = response.data.data[0]?.url;
            
            if (imageUrl) {
                await this.updateRateLimit('dall-e', user?.jid);
                return imageUrl;
            }

            throw new Error('No image generated');
        } catch (error) {
            logger.error('Image generation error:', error);
            throw new Error('Failed to generate image. Please try again.');
        }
    }

    async translateText(text, targetLang = 'en', sourceLang = 'auto') {
        try {
            const translateUrl = `${config.apis.translate.baseURL || 'https://api.mymemory.translated.net'}/get`;
            
            const response = await axios.get(translateUrl, {
                params: {
                    q: text,
                    langpair: `${sourceLang}|${targetLang}`,
                    key: config.apis.translate.apiKey
                },
                timeout: 10000
            });

            return response.data.responseData?.translatedText || text;
        } catch (error) {
            logger.error('Translation error:', error);
            throw new Error('Translation failed. Please try again.');
        }
    }

    async analyzeText(text, analysisType = 'sentiment') {
        try {
            const cacheKey = `analysis_${analysisType}_${this.hashString(text)}`;
            const cached = await cache.get(cacheKey);
            if (cached) return cached;

            let result = null;

            switch (analysisType) {
                case 'sentiment':
                    result = this.analyzeSentiment(text);
                    break;
                case 'language':
                    result = this.detectLanguage(text);
                    break;
                case 'keywords':
                    result = this.extractKeywords(text);
                    break;
                default:
                    throw new Error('Unknown analysis type');
            }

            await cache.set(cacheKey, result, 3600);
            return result;
        } catch (error) {
            logger.error('Text analysis error:', error);
            throw error;
        }
    }

    analyzeSentiment(text) {
        const positiveWords = ['good', 'great', 'awesome', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'angry', 'disappointed', 'frustrated'];
        
        const words = text.toLowerCase().split(/\s+/);
        let positiveCount = 0;
        let negativeCount = 0;

        words.forEach(word => {
            if (positiveWords.includes(word)) positiveCount++;
            if (negativeWords.includes(word)) negativeCount++;
        });

        if (positiveCount > negativeCount) {
            return { sentiment: 'positive', confidence: positiveCount / words.length };
        } else if (negativeCount > positiveCount) {
            return { sentiment: 'negative', confidence: negativeCount / words.length };
        } else {
            return { sentiment: 'neutral', confidence: 0.5 };
        }
    }

    detectLanguage(text) {
        const patterns = {
            en: /^[a-zA-Z\s.,!?]+$/,
            es: /[ñáéíóúü]/i,
            fr: /[àâäéèêëïîôöùûüç]/i,
            de: /[äöüß]/i,
            ar: /[\u0600-\u06FF]/,
            zh: /[\u4e00-\u9fff]/,
            ja: /[\u3040-\u309f\u30a0-\u30ff]/,
            hi: /[\u0900-\u097F]/
        };

        for (const [lang, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) {
                return { language: lang, confidence: 0.8 };
            }
        }

        return { language: 'unknown', confidence: 0.1 };
    }

    extractKeywords(text) {
        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should'];
        
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word));

        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });

        const keywords = Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word, freq]) => ({ word, frequency: freq }));

        return { keywords, totalWords: words.length };
    }

    clearConversationHistory(userId, provider = null) {
        if (provider) {
            this.conversationHistory.delete(`${provider}_${userId}`);
        } else {
            ['openai', 'gemini'].forEach(p => {
                this.conversationHistory.delete(`${p}_${userId}`);
            });
        }
    }

    getServiceStats() {
        return {
            initialized: this.isInitialized,
            openai: !!this.openaiClient,
            gemini: !!this.geminiClient,
            conversationHistories: this.conversationHistory.size,
            rateLimits: this.rateLimits.size
        };
    }
}

const aiService = new AIService();

module.exports = {
    aiService,
    initialize: () => aiService.initialize(),
    getChatGPTResponse: (prompt, user, context) => aiService.getChatGPTResponse(prompt, user, context),
    getGeminiResponse: (prompt, user, context) => aiService.getGeminiResponse(prompt, user, context),
    generateResponse: (prompt, user, isGroup) => aiService.generateResponse(prompt, user, isGroup),
    generateImage: (prompt, user) => aiService.generateImage(prompt, user),
    translateText: (text, targetLang, sourceLang) => aiService.translateText(text, targetLang, sourceLang),
    analyzeText: (text, type) => aiService.analyzeText(text, type),
    clearConversationHistory: (userId, provider) => aiService.clearConversationHistory(userId, provider),
    getServiceStats: () => aiService.getServiceStats()
};