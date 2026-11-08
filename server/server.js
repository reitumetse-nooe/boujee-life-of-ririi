
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const contentRoutes = require('./routes/contentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Allow local development and the deployed website
const allowedOrigins = [
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.json());

// Authentication routes
app.use('/api/auth', authRoutes);

// Creator dashboard routes
app.use('/api/creator', creatorRoutes);

// Content management routes
app.use('/api/content', contentRoutes);

// Media upload routes
app.use('/api/upload', uploadRoutes);

// Backend health check
app.get('/api/health', (req, res) => {
    res.json({
        message: 'Boujee Life of Ririi API is running!'
    });
});

// Connect to MongoDB before starting the server
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Boujee backend running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Server startup failed:', error.message);
        process.exit(1);
    }
};

startServer();
