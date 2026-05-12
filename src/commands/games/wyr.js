const starters = [
    'live in a world where', 'have a life where', 'wake up every day with',
    'for the next 10 years', 'for the rest of your life', 'on every weekend',
    'during every holiday', 'in your dream career', 'as a student', 'as a parent',
    'while travelling', 'when hanging out', 'while gaming', 'while coding',
    'on social media', 'at every party', 'in every group chat', 'with your best friend',
    'at your wedding', 'at your birthday', 'at work', 'in school', 'in public',
    'at home', 'during workouts', 'while shopping', 'when dating', 'during movies',
    'on your phone', 'in your future house'
];

const optionA = [
    'never sleep at night', 'eat only spicy food', 'have super speed',
    'speak every language', 'own a private jet', 'become invisible for 1 hour daily',
    'read minds randomly', 'always tell the truth', 'never use social media',
    'have unlimited music', 'travel by bike only', 'wear the same color forever',
    'have a robot assistant', 'be famous online', 'live on an island',
    'use old phones forever', 'cook every meal yourself', 'work only mornings',
    'have perfect memory', 'be the funniest person in the room'
];

const optionB = [
    'never eat junk food again', 'drink only cold water', 'have super strength',
    'talk to animals', 'own a luxury mansion', 'fly for 10 minutes daily',
    'see 10 seconds into the future', 'never tell a lie', 'never watch TV',
    'have unlimited movies', 'travel by train only', 'wear only black forever',
    'have a personal chef', 'be famous in real life', 'live in a big city',
    'use only laptops forever', 'order every meal online', 'work only nights',
    'forget bad memories instantly', 'be the smartest person in the room'
];

function generateWyrQuestions() {
    const out = [];
    let id = 1;
    for (const s of starters) {
        for (let i = 0; i < Math.min(optionA.length, optionB.length); i++) {
            out.push({
                id: id++,
                question: `Would you rather ${s}...`,
                a: optionA[i],
                b: optionB[i]
            });
        }
    }
    return out;
}

const WYR_QUESTIONS = generateWyrQuestions(); // 30 * 20 = 600 questions

export default {
    name: 'wyr',
    aliases: ['wouldyourather', 'thisorthat'],
    category: 'games',
    description: 'Would You Rather game with lots of poll questions',
    usage: 'wyr',
    args: false,
    minArgs: 0,

    async execute({ sock, from, message }) {
        const q = WYR_QUESTIONS[Math.floor(Math.random() * WYR_QUESTIONS.length)];
        const pollName = `🤔 ${q.question}`;
        const options = [`🅰️ ${q.a}`, `🅱️ ${q.b}`];

        try {
            await sock.sendMessage(from, {
                poll: {
                    name: pollName,
                    values: options,
                    selectableCount: 1
                }
            }, { quoted: message });
        } catch {
            await sock.sendMessage(from, {
                text: `${pollName}\n\nA) ${q.a}\nB) ${q.b}\n\nReply with A or B.`
            }, { quoted: message });
        }
    }
};
