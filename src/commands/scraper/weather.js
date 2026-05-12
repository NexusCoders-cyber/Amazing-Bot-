import axios from 'axios';

export default {
    name: 'weather', aliases: ['wthr', 'forecast'], category: 'scraper',
    description: 'Get weather forecast for a city', usage: 'weather <city>', cooldown: 10,
    async execute({ sock, message, args, from }) {
        const city = args.join(' ').trim();
        if (!city) return sock.sendMessage(from, { text: '❌ Usage: .weather <city>' }, { quoted: message });
        try {
            const { data } = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=YOUR_KEY`, { timeout: 10000 });
            if (data?.main) {
                const w = data.weather[0];
                await sock.sendMessage(from, {
                    text: `🌤️ *${data.name}, ${data.sys?.country || ''}*\n🌡️ ${Math.round(data.main.temp)}°C (feels ${Math.round(data.main.feels_like)}°C)\n${w.description}\n💧 Humidity: ${data.main.humidity}%\n💨 Wind: ${data.wind?.speed || 0} m/s`
                }, { quoted: message });
            } else throw new Error('No data');
        } catch { await sock.sendMessage(from, { text: `❌ Weather for "${city}" not found.` }, { quoted: message }); }
    }
};
