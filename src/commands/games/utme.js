import axios from 'axios';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

const userScores = new Map();
const userStreaks = new Map();

const client = new Cerebras({
    apiKey: process.env.CEREBRAS_API_KEY || "csk-prcc628w42cc6jhjn48n5pe8xwhyyd26tteyek8x4dy8dpf6",
    warmTCPConnection: false
});

async function getAIExplanation(question, correctAnswer, userAnswer, subject, isCorrect, options) {
    try {
        const prompt = `You are a UTME/JAMB exam tutor. A student just answered a ${subject} question.

Question: ${question}

Options:
A. ${options.a}
B. ${options.b}
C. ${options.c}
D. ${options.d}

Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}
Result: ${isCorrect ? 'CORRECT' : 'WRONG'}

${isCorrect 
    ? 'Provide a brief encouraging explanation (2-3 sentences) of why this answer is correct and reinforce the key concept.' 
    : 'Provide a clear, concise explanation (3-4 sentences) of: 1) Why their answer is wrong, 2) Why the correct answer is right, 3) Key concept to remember.'}

Keep it simple, educational, and encouraging. Use Nigerian educational context where relevant. Maximum 400 characters.`;

        const response = await client.chat.completions.create({
            model: "llama-3.3-70b",
            messages: [
                { role: "user", content: prompt }
            ],
            stream: false
        });

        const aiResponse = response?.choices?.[0]?.message?.content || "";
        
        if (!aiResponse || aiResponse.length < 10) {
            return null;
        }

        return aiResponse.substring(0, 400);
    } catch (error) {
        console.error('AI explanation error:', error);
        return null;
    }
}

export default {
    name: 'utme',
    aliases: ['jamb', 'exam', 'quiz'],
    category: 'games',
    description: 'Practice UTME/JAMB exam questions with AI-powered explanations',
    usage: 'utme <subject>',
    example: 'utme mathematics',
    cooldown: 2,
    permissions: ['user'],
    args: false,
    minArgs: 0,
    maxArgs: 1,

    subjects: {
        'mathematics': 'Mathematics',
        'further-math': 'Further Mathematics',
        'english': 'English Language',
        'physics': 'Physics',
        'chemistry': 'Chemistry',
        'biology': 'Biology',
        'literature': 'Literature in English',
        'government': 'Government',
        'economics': 'Economics',
        'commerce': 'Commerce',
        'accounting': 'Accounting',
        'crk': 'Christian Religious Studies',
        'irk': 'Islamic Religious Studies',
        'geography': 'Geography',
        'civics': 'Civic Education',
        'agriculture': 'Agricultural Science',
        'computer': 'Computer Studies',
        'history': 'History',
        'french': 'French',
        'igbo': 'Igbo',
        'yoruba': 'Yoruba',
        'hausa': 'Hausa',
        'marketing': 'Marketing',
        'insurance': 'Insurance',
        'office-practice': 'Office Practice',
        'typewriting': 'Typewriting',
        'technical-drawing': 'Technical Drawing',
        'fine-arts': 'Fine Arts',
        'music': 'Music',
        'physical-education': 'Physical Education',
        'health-education': 'Health Education',
        'home-economics': 'Home Economics',
        'food-nutrition': 'Food and Nutrition'
    },

    departments: {
        '🏥 Medical Sciences': {
            'Medicine & Surgery': ['biology', 'chemistry', 'physics'],
            'Pharmacy': ['biology', 'chemistry', 'physics'],
            'Nursing': ['biology', 'chemistry', 'physics'],
            'Physiotherapy': ['biology', 'chemistry', 'physics']
        },
        '⚙️ Engineering & Tech': {
            'Engineering': ['mathematics', 'physics', 'chemistry'],
            'Computer Science': ['mathematics', 'physics', 'english'],
            'Architecture': ['mathematics', 'physics', 'technical-drawing']
        },
        '💼 Social Sciences': {
            'Accounting': ['accounting', 'economics', 'mathematics'],
            'Economics': ['economics', 'mathematics', 'government'],
            'Law': ['english', 'literature', 'government'],
            'Mass Communication': ['english', 'literature', 'government']
        },
        '📚 Arts & Humanities': {
            'English': ['english', 'literature', 'government'],
            'History': ['history', 'government', 'literature'],
            'Theatre Arts': ['literature', 'english', 'music']
        },
        '🌾 Agriculture & Sciences': {
            'Agriculture': ['agriculture', 'chemistry', 'biology'],
            'Food Science': ['chemistry', 'biology', 'agriculture'],
            'Geography': ['geography', 'mathematics', 'economics']
        },
        '🎓 Education & Others': {
            'Physical Education': ['physical-education', 'biology', 'health-education'],
            'Home Economics': ['home-economics', 'chemistry', 'biology']
        }
    },

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            if (args.length === 0) {
                return this.showSubjects({ sock, message, from, prefix, sender });
            }

            const input = args[0].toLowerCase();

            if (input === 'score' || input === 'stats') {
                return this.showStats({ sock, message, from, sender });
            }

            if (input === 'reset') {
                userScores.delete(sender);
                userStreaks.delete(sender);
                return await sock.sendMessage(from, {
                    text: '🔄 Stats Reset\n\nYour score and streak have been reset to zero.'
                }, { quoted: message });
            }

            const subject = input;
            const subjectName = this.subjects[subject];

            if (!subjectName) {
                return this.showSubjects({ sock, message, from, prefix, sender });
            }

            await this.loadQuestion({ sock, message, from, sender, subject, subjectName, prefix });

        } catch (error) {
            console.error('UTME command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Failed to load question\n\n⚠️ ${error.message}\n💡 Try again later`
            }, { quoted: message });
        }
    },

    async loadQuestion({ sock, message, from, sender, subject, subjectName, prefix }) {
        await sock.sendMessage(from, {
            react: { text: '📚', key: message.key }
        });

        const apiUrl = `https://questions.aloc.com.ng/api/v2/q/1?subject=${subject}`;
        const response = await axios.get(apiUrl, {
            headers: {
                'Accept': 'application/json',
                'AccessToken': 'QB-e1bc44df0c670fa0b972'
            },
            timeout: 15000
        });

        if (!response.data || !response.data.data || response.data.data.length === 0) {
            await sock.sendMessage(from, {
                text: `❌ No questions found for ${subjectName}\n\n💡 Try another subject`
            }, { quoted: message });
            return;
        }

        const questionData = response.data.data[0];
        const correctAnswer = questionData.answer;

        if (!userScores.has(sender)) {
            userScores.set(sender, { total: 0, correct: 0, subjects: {} });
        }
        if (!userStreaks.has(sender)) {
            userStreaks.set(sender, 0);
        }

        const userScore = userScores.get(sender);
        if (!userScore.subjects[subject]) {
            userScore.subjects[subject] = { total: 0, correct: 0 };
        }

        const stats = userScore.subjects[subject];
        const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        const streak = userStreaks.get(sender);

        let questionText = `📚 *${subjectName}*\n\n`;
        questionText += `📊 Score: ${stats.correct}/${stats.total} (${percentage}%)`;
        if (streak > 0) {
            questionText += ` | 🔥 Streak: ${streak}`;
        }
        questionText += `\n\n`;

        if (questionData.instruction) {
            questionText += `📌 ${questionData.instruction}\n\n`;
        }

        questionText += `❓ *Question:*\n${questionData.question}\n\n`;

        questionText += `*Options:*\n`;
        questionText += `A. ${questionData.option.a}\n`;
        questionText += `B. ${questionData.option.b}\n`;
        questionText += `C. ${questionData.option.c}\n`;
        questionText += `D. ${questionData.option.d}\n\n`;

        questionText += `💡 Reply: A, B, C, or D\n`;
        questionText += `⏭️ Type NEXT for next question\n`;
        questionText += `🛑 Type STOP to end quiz`;

        let sentMsg;

        if (questionData.image) {
            try {
                sentMsg = await sock.sendMessage(from, {
                    image: { url: questionData.image },
                    caption: questionText
                }, { quoted: message });
            } catch (error) {
                sentMsg = await sock.sendMessage(from, {
                    text: questionText
                }, { quoted: message });
            }
        } else {
            sentMsg = await sock.sendMessage(from, {
                text: questionText
            }, { quoted: message });
        }

        if (sentMsg && sentMsg.key) {
            const commandInstance = this;
            
            if (!global.replyHandlers) {
                global.replyHandlers = {};
            }

            const replyHandler = async (replyText, replyMessage) => {
                const replySender = replyMessage.key.participant || replyMessage.key.remoteJid;

                if (replySender !== sender) {
                    return;
                }

                const input = replyText.toUpperCase().trim();

                if (input === 'NEXT' || input === 'N') {
                    delete global.replyHandlers[sentMsg.key.id];
                    
                    return await commandInstance.loadQuestion({
                        sock,
                        message: replyMessage,
                        from,
                        sender,
                        subject,
                        subjectName,
                        prefix
                    });
                }

                if (input === 'STOP' || input === 'END' || input === 'QUIT') {
                    delete global.replyHandlers[sentMsg.key.id];
                    
                    const userScore = userScores.get(sender);
                    const stats = userScore?.subjects[subject];
                    
                    if (stats && stats.total > 0) {
                        const percentage = Math.round((stats.correct / stats.total) * 100);
                        return await sock.sendMessage(from, {
                            text: `✋ Quiz Stopped\n\n📊 Session Stats:\n${stats.correct}/${stats.total} (${percentage}%)\n\n💡 Continue: ${prefix}utme ${subject}`
                        }, { quoted: replyMessage });
                    }
                    
                    return await sock.sendMessage(from, {
                        text: `✋ Quiz stopped\n\n💡 Start again: ${prefix}utme`
                    }, { quoted: replyMessage });
                }

                const answer = input;

                if (!['A', 'B', 'C', 'D'].includes(answer)) {
                    return;
                }

                await sock.sendMessage(from, {
                    react: { text: '🤖', key: replyMessage.key }
                });

                const isCorrect = answer === correctAnswer.toUpperCase();
                
                const userScore = userScores.get(sender);
                userScore.total++;
                userScore.subjects[subject].total++;
                
                if (isCorrect) {
                    userScore.correct++;
                    userScore.subjects[subject].correct++;
                    
                    const currentStreak = userStreaks.get(sender) + 1;
                    userStreaks.set(sender, currentStreak);
                    
                    if (!userScore.bestStreak || currentStreak > userScore.bestStreak) {
                        userScore.bestStreak = currentStreak;
                    }
                } else {
                    userStreaks.set(sender, 0);
                }

                const aiExplanation = await getAIExplanation(
                    questionData.question,
                    questionData.option[correctAnswer.toLowerCase()],
                    questionData.option[answer.toLowerCase()],
                    subjectName,
                    isCorrect,
                    questionData.option
                );

                const stats = userScore.subjects[subject];
                const percentage = Math.round((stats.correct / stats.total) * 100);
                const streak = userStreaks.get(sender);

                let resultText = isCorrect ? `✅ *CORRECT!*\n\n` : `❌ *WRONG!*\n\n`;
                resultText += `📖 Subject: ${subjectName}\n`;
                resultText += `💡 Your Answer: ${answer}\n`;
                resultText += `✅ Correct: ${correctAnswer.toUpperCase()}\n`;
                resultText += `📝 Answer Text: ${questionData.option[correctAnswer.toLowerCase()]}\n`;
                resultText += `\n📊 Score: ${stats.correct}/${stats.total} (${percentage}%)`;
                
                if (streak > 0) {
                    resultText += `\n🔥 Streak: ${streak}`;
                }

                if (aiExplanation) {
                    resultText += `\n\n🤖 *AI Tutor Explains:*\n${aiExplanation}`;
                } else if (questionData.solution) {
                    const shortSolution = questionData.solution.substring(0, 200);
                    resultText += `\n\n💭 *Explanation:*\n${shortSolution}${questionData.solution.length > 200 ? '...' : ''}`;
                }
                
                resultText += `\n\n⏭️ Reply NEXT for another question`;

                delete global.replyHandlers[sentMsg.key.id];

                const resultMsg = await sock.sendMessage(from, {
                    text: resultText,
                    mentions: [sender]
                }, { quoted: replyMessage });

                await sock.sendMessage(from, {
                    react: { text: isCorrect ? '✅' : '❌', key: replyMessage.key }
                });

                if (resultMsg && resultMsg.key) {
                    global.replyHandlers[resultMsg.key.id] = {
                        command: commandInstance.name,
                        handler: replyHandler
                    };
                }
            };

            global.replyHandlers[sentMsg.key.id] = {
                command: this.name,
                handler: replyHandler
            };
        }

        await sock.sendMessage(from, {
            react: { text: '✅', key: message.key }
        });
    },

    async showStats({ sock, message, from, sender }) {
        const userScore = userScores.get(sender);
        const streak = userStreaks.get(sender) || 0;

        if (!userScore || userScore.total === 0) {
            return await sock.sendMessage(from, {
                text: '📊 No Stats Yet\n\nStart practicing to see your statistics!'
            }, { quoted: message });
        }

        const overallPercentage = Math.round((userScore.correct / userScore.total) * 100);
        let statsText = `📊 *Your UTME Stats*\n\n`;
        statsText += `🎯 Overall: ${userScore.correct}/${userScore.total} (${overallPercentage}%)\n`;
        statsText += `🔥 Current Streak: ${streak}\n`;
        statsText += `⭐ Best Streak: ${userScore.bestStreak || 0}\n\n`;
        statsText += `📚 *By Subject:*\n\n`;

        const sortedSubjects = Object.entries(userScore.subjects)
            .sort((a, b) => b[1].correct - a[1].correct)
            .slice(0, 10);

        sortedSubjects.forEach(([subject, stats]) => {
            const percentage = Math.round((stats.correct / stats.total) * 100);
            const subjectName = this.subjects[subject] || subject;
            statsText += `📌 ${subjectName}\n`;
            statsText += `   ${stats.correct}/${stats.total} (${percentage}%)\n\n`;
        });

        await sock.sendMessage(from, {
            text: statsText
        }, { quoted: message });
    },

    async showSubjects({ sock, message, from, prefix, sender }) {
        const userScore = userScores.get(sender);
        const hasStats = userScore && userScore.total > 0;

        let subjectsText = `📚 *UTME SUBJECTS BY DEPARTMENT*\n\n`;
        
        for (const [category, depts] of Object.entries(this.departments)) {
            subjectsText += `${category}\n`;
            for (const [dept, subjects] of Object.entries(depts)) {
                subjectsText += `  📌 ${dept}\n`;
                subjects.forEach(sub => {
                    if (this.subjects[sub]) {
                        subjectsText += `    • ${prefix}utme ${sub}\n`;
                    }
                });
            }
            subjectsText += `\n`;
        }

        subjectsText += `💡 *Commands:*\n`;
        subjectsText += `📝 Start: ${prefix}utme mathematics\n`;
        if (hasStats) {
            subjectsText += `📊 Stats: ${prefix}utme score\n`;
        }
        subjectsText += `🔄 Reset: ${prefix}utme reset\n\n`;
        subjectsText += `🤖 Powered by Cerebras AI for instant explanations!`;

        await sock.sendMessage(from, {
            text: subjectsText
        }, { quoted: message });
    }
};