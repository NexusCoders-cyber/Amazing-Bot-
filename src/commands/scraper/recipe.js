import axios from 'axios';

export default {
    name: 'recipe', aliases: ['cook', 'food'], category: 'scraper',
    description: 'Search recipes by ingredient or name', usage: 'recipe <ingredient>', cooldown: 10,
    async execute({ sock, message, args, from }) {
        const q = args.join(' ').trim();
        if (!q) return sock.sendMessage(from, { text: '❌ Usage: .recipe chicken, pasta, tomato' }, { quoted: message });
        await sock.sendMessage(from, { react: { text: '🍳', key: message.key } });
        try {
            const { data } = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`, { timeout: 10000 });
            const meals = data?.meals || [];
            if (!meals.length) {
                // Try ingredient search instead
                const { data: d2 } = await axios.get(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(q)}`, { timeout: 10000 });
                const meals2 = d2?.meals || [];
                if (!meals2.length) throw new Error('No recipes');
                let msg = `🍳 *Recipes with ${q}*\n\n`;
                meals2.slice(0, 10).forEach((m, i) => msg += `${i + 1}. ${m.strMeal}\n`);
                return sock.sendMessage(from, { text: msg }, { quoted: message });
            }
            const m = meals[0];
            await sock.sendMessage(from, {
                image: { url: m.strMealThumb },
                caption: `🍳 *${m.strMeal}*\n🌍 ${m.strArea || '?'} | 🏷️ ${m.strCategory || '?'}\n\n📝 ${(m.strInstructions || '').slice(0, 500)}...`
            }, { quoted: message });
        } catch { await sock.sendMessage(from, { text: '❌ No recipes found.' }, { quoted: message }); }
    }
};
