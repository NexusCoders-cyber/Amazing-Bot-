export default {
    name: 'news',
    aliases: ['headlines', 'breaking'],
    category: 'general',
    description: 'Get latest news headlines and updates',
    usage: 'news [category]',
    cooldown: 10,
    permissions: ['user'],

    async execute({ sock, message, args, from, sender }) {
        const category = args[0]?.toLowerCase() || 'general';
        
        const validCategories = ['general', 'technology', 'sports', 'entertainment', 'science', 'business'];
        if (!validCategories.includes(category)) {
            return sock.sendMessage(from, {
                text: `❌ *Invalid Category*\n\nAvailable categories:\n${validCategories.map(cat => `• ${cat}`).join('\n')}\n\n*Example:* news technology`
            });
        }
        
        try {
            // Mock news data - in real implementation, this would fetch from news API
            const newsData = this.getMockNews(category);
            
            const categoryEmojis = {
                general: '📰',
                technology: '💻',
                sports: '⚽',
                entertainment: '🎬',
                science: '🔬',
                business: '💼'
            };
            
            const emoji = categoryEmojis[category] || '📰';
            
            let newsResponse = `${emoji} *Latest ${category.toUpperCase()} News*\n\n`;
            newsResponse += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            newsResponse += `📅 **Updated:** ${new Date().toLocaleString()}\n`;
            newsResponse += `🌍 **Source:** Global News Network\n\n`;
            
            newsData.forEach((article, index) => {
                const urgencyEmoji = article.breaking ? '🚨' : article.trending ? '📈' : '📄';
                const ageEmoji = this.getAgeEmoji(article.publishedAt);
                
                newsResponse += `**${index + 1}. ${urgencyEmoji} ${article.title}**\n`;
                newsResponse += `📝 ${article.description}\n`;
                newsResponse += `🏢 ${article.source} ${ageEmoji} ${article.publishedAt}\n`;
                if (article.breaking) newsResponse += `🚨 *BREAKING NEWS*\n`;
                if (article.trending) newsResponse += `📈 *TRENDING*\n`;
                newsResponse += `\n`;
            });
            
            newsResponse += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            // News statistics
            const breakingCount = newsData.filter(n => n.breaking).length;
            const trendingCount = newsData.filter(n => n.trending).length;
            
            newsResponse += `📊 **News Stats:**\n`;
            newsResponse += `├ Total Articles: ${newsData.length}\n`;
            newsResponse += `├ Breaking News: ${breakingCount}\n`;
            newsResponse += `├ Trending: ${trendingCount}\n`;
            newsResponse += `╰ Category: ${category.toUpperCase()}\n\n`;
            
            newsResponse += `💡 **Available Categories:**\n`;
            validCategories.forEach(cat => {
                newsResponse += `• \`news ${cat}\` - ${this.getCategoryDescription(cat)}\n`;
            });
            
            newsResponse += `\n🔄 *News updates every 30 minutes*\n`;
            newsResponse += `⚠️ *Note: Demo news. Real implementation needs News API*`;
            
            await sock.sendMessage(from, { text: newsResponse });
            
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ *News Error*\n\nCould not fetch news at this time.\n\n**Possible issues:**\n• News API not configured\n• Network connection error\n• Rate limit exceeded\n\n*Contact admin to configure news service*`
            });
        }
    },
    
    getMockNews(category) {
        const newsTemplates = {
            general: [
                { title: 'Global Climate Summit Reaches Historic Agreement', description: 'World leaders unite on ambitious climate goals for 2025.', breaking: true },
                { title: 'Economic Markets Show Strong Recovery Signs', description: 'Financial analysts report positive growth across major sectors.', trending: true },
                { title: 'International Space Station Mission Launches Successfully', description: 'New crew begins six-month research mission in orbit.' },
                { title: 'Major Breakthrough in Renewable Energy Storage', description: 'Scientists develop more efficient battery technology.' },
                { title: 'Global Health Initiative Expands to 50 More Countries', description: 'Healthcare access program reaches new milestones.' }
            ],
            technology: [
                { title: 'AI Breakthrough: New Model Achieves Human-Level Reasoning', description: 'Revolutionary AI system demonstrates advanced problem-solving capabilities.', breaking: true },
                { title: 'Quantum Computing Milestone Reached by Tech Giants', description: 'Major advancement brings quantum supremacy closer to reality.', trending: true },
                { title: 'Revolutionary Battery Technology Promises 10x Longer Life', description: 'New lithium-sulfur batteries could transform electric vehicles.' },
                { title: 'Virtual Reality Headsets Become More Accessible', description: 'Latest VR technology drops in price while improving quality.' },
                { title: 'Cybersecurity Firm Discovers Major Vulnerability', description: 'Critical security flaw affects millions of devices worldwide.' }
            ],
            sports: [
                { title: 'World Cup Qualifiers Produce Stunning Upsets', description: 'Underdog teams secure spots in major tournament.', breaking: true },
                { title: 'Olympic Records Broken in Swimming Championships', description: 'Multiple world records fall at international competition.', trending: true },
                { title: 'Tennis Grand Slam Features Surprise Final Matchup', description: 'Unexpected finalists set for championship showdown.' },
                { title: 'Basketball League Announces Expansion Plans', description: 'New teams to join professional basketball league.' },
                { title: 'Marathon World Record Attempt This Weekend', description: 'Elite runners prepare for historic race attempt.' }
            ],
            entertainment: [
                { title: 'Blockbuster Movie Breaks Opening Weekend Records', description: 'Latest superhero film shatters box office expectations.', breaking: true },
                { title: 'Music Festival Lineup Announced With Major Headliners', description: 'Popular artists confirmed for summer music festival.', trending: true },
                { title: 'Streaming Platform Launches Original Series', description: 'New drama series premieres to critical acclaim.' },
                { title: 'Award Season Predictions Heat Up', description: 'Industry experts debate likely award winners.' },
                { title: 'Celebrity Chef Opens New Restaurant Chain', description: 'Famous chef expands culinary empire with new locations.' }
            ],
            science: [
                { title: 'Mars Mission Discovers Evidence of Ancient Water', description: 'Rover findings suggest Mars once had flowing rivers.', breaking: true },
                { title: 'Gene Therapy Shows Promise for Rare Disease', description: 'Clinical trials demonstrate significant patient improvement.', trending: true },
                { title: 'New Exoplanet Found in Habitable Zone', description: 'Potentially Earth-like planet discovered in nearby system.' },
                { title: 'Fusion Energy Experiment Achieves Net Gain', description: 'Historic milestone brings clean energy closer to reality.' },
                { title: 'Ancient Fossil Discovery Rewrites Evolution Timeline', description: 'New fossils challenge existing theories about species development.' }
            ],
            business: [
                { title: 'Tech Giant Announces Record Quarterly Earnings', description: 'Company exceeds analyst expectations with strong growth.', breaking: true },
                { title: 'Cryptocurrency Market Experiences Major Volatility', description: 'Digital currencies see significant price fluctuations.', trending: true },
                { title: 'Startup Raises $100M in Series A Funding', description: 'AI company secures major investment for expansion.' },
                { title: 'Supply Chain Issues Begin to Ease Globally', description: 'Shipping delays decrease as trade routes normalize.' },
                { title: 'Green Energy Stocks Surge on Policy Changes', description: 'Renewable energy companies see stock price increases.' }
            ]
        };
        
        const articles = newsTemplates[category] || newsTemplates.general;
        
        // Add random timestamps and sources
        return articles.map(article => ({
            ...article,
            publishedAt: this.getRandomTime(),
            source: this.getRandomSource(),
            breaking: article.breaking || false,
            trending: article.trending || false
        }));
    },
    
    getRandomTime() {
        const times = ['2 minutes ago', '15 minutes ago', '1 hour ago', '3 hours ago', '6 hours ago', '12 hours ago', '1 day ago'];
        return times[Math.floor(Math.random() * times.length)];
    },
    
    getRandomSource() {
        const sources = ['Reuters', 'AP News', 'BBC', 'CNN', 'Bloomberg', 'Associated Press', 'Global Times', 'World Report'];
        return sources[Math.floor(Math.random() * sources.length)];
    },
    
    getAgeEmoji(publishedAt) {
        if (publishedAt.includes('minutes')) return '🔥';
        if (publishedAt.includes('hour')) return '⚡';
        if (publishedAt.includes('day')) return '📅';
        return '🗓️';
    },
    
    getCategoryDescription(category) {
        const descriptions = {
            general: 'World news and headlines',
            technology: 'Tech innovations and digital trends',
            sports: 'Sports updates and competition results',
            entertainment: 'Movies, music, and celebrity news',
            science: 'Scientific discoveries and research',
            business: 'Market updates and corporate news'
        };
        return descriptions[category] || 'News updates';
    }
};