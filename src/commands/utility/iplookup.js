import axios from 'axios';

function formatField(label, value) {
    return `• *${label}:* ${value || 'N/A'}`;
}

export default {
    name: 'iplookup',
    aliases: ['ipinfo', 'ip'],
    category: 'utility',
    description: 'Lookup geolocation and network details for an IP address',
    usage: 'iplookup <ip-address>',
    minArgs: 1,
    cooldown: 3,

    async execute({ sock, message, args, from }) {
        const ip = args[0]?.trim();
        if (!ip) {
            return sock.sendMessage(from, { text: '❌ Provide an IP address. Example: .iplookup 8.8.8.8' }, { quoted: message });
        }

        await sock.sendMessage(from, { react: { text: '🌐', key: message.key } });

        try {
            const { data } = await axios.get(`http://ip-api.com/json/${encodeURIComponent(ip)}`, {
                params: {
                    fields: 'status,message,query,country,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting'
                },
                timeout: 30000
            });

            if (data?.status !== 'success') {
                return sock.sendMessage(from, {
                    text: `❌ IP lookup failed: ${data?.message || 'Unknown error'}`
                }, { quoted: message });
            }

            const text = [
                '🌍 *IP Lookup Result*',
                '',
                formatField('IP', data.query),
                formatField('Country', data.country),
                formatField('Region', data.regionName),
                formatField('City', data.city),
                formatField('ZIP', data.zip),
                formatField('Timezone', data.timezone),
                formatField('Latitude', data.lat),
                formatField('Longitude', data.lon),
                formatField('ISP', data.isp),
                formatField('Organization', data.org),
                formatField('AS', data.as),
                formatField('Mobile', String(data.mobile)),
                formatField('Proxy', String(data.proxy)),
                formatField('Hosting', String(data.hosting))
            ].join('\n');

            await sock.sendMessage(from, { text }, { quoted: message });
        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ Failed to lookup IP. ${error.message}`
            }, { quoted: message });
        }
    }
};
