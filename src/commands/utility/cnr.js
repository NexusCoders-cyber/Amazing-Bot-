import axios from 'axios';

class ReactChannel {
    constructor(userJwt) {
        this.userJwt = userJwt;
        this.siteKey = '6LemKk8sAAAAAH5PB3f1EspbMlXjtwv5C8tiMHSm';
        this.backendUrl = 'https://back.asitha.top/api';
        this.http = axios.create({
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.userJwt}`
            },
            timeout: 30000
        });
    }

    async getRecaptchaToken() {
        const { data } = await axios.get('https://omegatech-api.dixonomega.tech/api/tools/recaptcha-v3', {
            params: {
                sitekey: this.siteKey,
                url: this.backendUrl,
                use_enterprise: 'false'
            },
            timeout: 70000
        });
        if (!data?.success || !data?.token) throw new Error('Recaptcha fetch failed');
        return data.token;
    }

    async getTempApiKey(token) {
        const { data } = await this.http.post(`${this.backendUrl}/user/get-temp-token`, { recaptcha_token: token });
        if (!data?.token) throw new Error('Temp API key failed');
        return data.token;
    }

    async reactToPost(postLink, reacts) {
        const recaptcha = await this.getRecaptchaToken();
        const tempKey = await this.getTempApiKey(recaptcha);
        const { data } = await this.http.post(`${this.backendUrl}/channel/react-to-post?apiKey=${tempKey}`, {
            post_link: postLink,
            reacts
        });
        return data;
    }
}

export default {
    name: 'reactch',
    aliases: ['rch', 'cnr', 'channelreact'],
    category: 'utility',
    description: 'Send reactions to WhatsApp channel post',
    usage: 'reactch <channel-post-url> <emoji1,emoji2>',
    cooldown: 5,

    async execute({ sock, message, args, from }) {
        const jwt = process.env.CHANNEL_REACT_JWT || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NTZmMzhjOTllNGEzOTVlOWM0ZTc3NSIsImlhdCI6MTc3NjQ0ODg1OCwiZXhwIjoxNzc3MDUzNjU4fQ.JiKqtKv4cMDJYCi_Ua8LxFKrfciRXVV736mo_Rtq3U8';
        if (!jwt) return sock.sendMessage(from, { text: '❌ Missing CHANNEL_REACT_JWT in env.' }, { quoted: message });

        if (!args[0] || args.length < 2) {
            return sock.sendMessage(from, { text: `⚡ Usage:
reactch <link> <emoji1,emoji2>
Example: reactch https://whatsapp.com/channel/... 😭,🔥` }, { quoted: message });
        }

        const postLink = args[0];
        const emojis = args.slice(1).join(' ').split(',').map((e) => e.trim()).filter(Boolean);
        if (!postLink.includes('whatsapp.com/channel/')) return sock.sendMessage(from, { text: '❌ Invalid WhatsApp channel link.' }, { quoted: message });
        if (!emojis.length) return sock.sendMessage(from, { text: '❌ No emojis provided.' }, { quoted: message });
        if (emojis.length > 4) return sock.sendMessage(from, { text: '❌ Max 4 emojis allowed.' }, { quoted: message });

        try {
            await sock.sendMessage(from, { text: '⏳ Sending reactions...' }, { quoted: message });
            const client = new ReactChannel(jwt);
            await client.reactToPost(postLink, emojis.join(','));
            await sock.sendMessage(from, { text: '🔥 Reactions sent successfully.' }, { quoted: message });
        } catch (e) {
            await sock.sendMessage(from, { text: `❌ Failed: ${e.response?.data?.message || e.message}` }, { quoted: message });
        }
    }
};
