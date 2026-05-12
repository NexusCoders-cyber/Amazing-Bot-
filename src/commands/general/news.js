import { createCanvas } from '@napi-rs/canvas';

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text || '').split(' ');
    let line = '';
    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x, y);
            y += lineHeight;
            line = word;
        } else line = test;
    }
    if (line) ctx.fillText(line, x, y);
    return y;
}

function createNewsCard(category, newsData) {
    const W = 1080;
    const H = 1350;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0c1020');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 58px Sans';
    ctx.fillText(`📰 ${category.toUpperCase()} NEWS`, 60, 95);

    ctx.fillStyle = '#93c5fd';
    ctx.font = '26px Sans';
    ctx.fillText(`Updated ${new Date().toLocaleString()}`, 60, 140);

    let y = 210;
    newsData.slice(0, 5).forEach((article, idx) => {
        ctx.fillStyle = 'rgba(30,41,59,0.75)';
        ctx.fillRect(50, y - 10, W - 100, 200);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 34px Sans';
        let ny = drawWrappedText(ctx, article.title, 90, y + 35, W - 180, 38);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '24px Sans';
        ny = drawWrappedText(ctx, article.description, 90, ny + 34, W - 180, 30);

        ctx.fillStyle = '#93c5fd';
        ctx.font = '22px Sans';
        ctx.fillText(`${article.source} • ${article.publishedAt}`, 90, Math.min(y + 170, ny + 34));

        y += 230;
    });

    return canvas.toBuffer('image/png');
}

export default {
    name: 'news',
    aliases: ['headlines', 'breaking'],
    category: 'general',
    description: 'Get latest news headlines and updates',
    usage: 'news [category]',
    cooldown: 10,
    permissions: ['user'],

    async execute({ sock, message, args, from }) {
        const category = args[0]?.toLowerCase() || 'general';
        const validCategories = ['general', 'technology', 'sports', 'entertainment', 'science', 'business'];

        if (!validCategories.includes(category)) {
            return sock.sendMessage(from, {
                text: `❌ Invalid category.
Use one of: ${validCategories.join(', ')}`
            });
        }

        try {
            const newsData = this.getMockNews(category);
            const card = createNewsCard(category, newsData);

            await sock.sendMessage(from, {
                image: card,
                caption: `✨ ${category.toUpperCase()} news digest
Use: .news <category>`
            }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ News error: ${error.message}`
            }, { quoted: message });
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

        const sources = ['Reuters', 'AP News', 'BBC', 'CNN', 'Bloomberg', 'Global Times'];
        const times = ['2 minutes ago', '15 minutes ago', '1 hour ago', '3 hours ago', '6 hours ago'];

        return (newsTemplates[category] || newsTemplates.general).map((article) => ({
            ...article,
            publishedAt: times[Math.floor(Math.random() * times.length)],
            source: sources[Math.floor(Math.random() * sources.length)]
        }));
    }
};
