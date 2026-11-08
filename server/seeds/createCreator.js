const readline = require('readline');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const connectDB = require('../config/db');
const User = require('../models/User');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Ask the user for account details
const askQuestion = (question) => {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
};

const createCreator = async () => {
    try {
        await connectDB();

        console.log('\n=== BOUJEE CREATOR ACCOUNT SETUP ===\n');

        const name = await askQuestion('Enter your name: ');
        const email = await askQuestion('Enter your email: ');
        const password = await askQuestion('Create your password: ');

        if (!name.trim() || !email.trim() || password.length < 8) {
            console.log('\nPlease provide all details. Password must be at least 8 characters.');
            return;
        }

        const existingUser = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (existingUser) {
            console.log('\nAn account with this email already exists.');
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const creator = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role: 'creator'
        });

        console.log('\nCreator account created successfully!');
        console.log('Name:', creator.name);
        console.log('Email:', creator.email);
        console.log('Role:', creator.role);

    } catch (error) {
        console.error('Creator setup error:', error.message);

    } finally {
        rl.close();
        process.exit();
    }
};

createCreator();