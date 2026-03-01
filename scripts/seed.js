import 'dotenv/config';
import mongoose from 'mongoose';
import config from '../src/config.js';
import logger from '../src/utils/logger.js';

const seedData = {
    users: [
        {
            jid: 'seed_user@s.whatsapp.net',
            name: 'Demo User',
            level: 1,
            xp: 0,
            coins: 100,
            bank: 0,
            premium: false,
            banned: false,
            role: 'user',
            createdAt: new Date()
        }
    ],
    groups: [
        {
            jid: 'seed_group@g.us',
            name: 'Demo Group',
            settings: {
                welcome: true,
                goodbye: true,
                antilink: false,
                antispam: true,
                autoReaction: true
            },
            createdAt: new Date()
        }
    ],
    settings: {
        botMode: 'public',
        prefix: '.',
        autoRead: false,
        autoTyping: true,
        antiSpam: true,
        maxWarnings: 3
    }
};

async function seed() {
    try {
        console.log('🌱 Starting database seeding...\n');
        
        if (!config.database.enabled) {
            console.log('⚠️  Database is disabled in config. Skipping seed.');
            return;
        }

        await mongoose.connect(config.database.url, config.database.options);
        console.log('✅ Connected to database\n');

        const User = mongoose.model('User');
        const Group = mongoose.model('Group');
        const Setting = mongoose.model('Setting');

        for (const userData of seedData.users) {
            const exists = await User.findOne({ jid: userData.jid });
            if (!exists) {
                await User.create(userData);
                console.log(`✅ Created user: ${userData.name}`);
            } else {
                console.log(`⏭️  Skipped existing user: ${userData.name}`);
            }
        }

        for (const groupData of seedData.groups) {
            const exists = await Group.findOne({ jid: groupData.jid });
            if (!exists) {
                await Group.create(groupData);
                console.log(`✅ Created group: ${groupData.name}`);
            } else {
                console.log(`⏭️  Skipped existing group: ${groupData.name}`);
            }
        }

        const existingSettings = await Setting.findOne();
        if (!existingSettings) {
            await Setting.create(seedData.settings);
            console.log('✅ Created default settings');
        } else {
            console.log('⏭️  Settings already exist');
        }

        console.log('\n✨ Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    }
}

seed();
