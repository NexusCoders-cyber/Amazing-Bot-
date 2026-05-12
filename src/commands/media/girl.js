export default {
    name: 'girl',
    aliases: ['babegirl'],
    version: '1.0.0',
    author: 'AceGun',
    category: 'media',
    description: 'Send random girl photo',
    usage: 'girl',
    cooldown: 5,

    async execute({ sock, message, from }) {
        const links = [
            'https://i.postimg.cc/wTJNSC1G/E-B9ea-WQAAst-Yg.jpg',
            'https://i.postimg.cc/sgrWyTSD/E-B9eb-AWUAINyt-B.jpg',
            'https://i.postimg.cc/TYcj48LJ/E02i-P-q-XIAE62tu.jpg',
            'https://i.postimg.cc/MpK0ks12/E02i-P-w-WYAEbvgg.jpg',
            'https://i.postimg.cc/k5LWbqzq/E02i-P-x-XIAAy-K2k.jpg',
            'https://i.postimg.cc/C5R1Hqq2/E067-KUr-VIAYK-4-R.jpg',
            'https://i.postimg.cc/v8KD80Rw/E067-KUs-Uc-AM2jri.jpg',
            'https://i.postimg.cc/xCJD6y6L/E07-FXgt-UYAAp-Qn-S.jpg',
            'https://i.postimg.cc/q77d3dnb/E07-FXgu-Uc-AQB1-RK.jpg',
            'https://i.postimg.cc/pXPcTJKk/E08z-UBs-Xo-AMh-F2-F.jpg'
        ];

        const img = links[Math.floor(Math.random() * links.length)];
        await sock.sendMessage(from, {
            image: { url: img },
            caption: '「 Here is your Babe😻 」'
        }, { quoted: message });
    }
};
