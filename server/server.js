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

// Allow our React website to communicate with the backend
app.use(cors({ origin: 'http://localhost:3000' }));

// Allow the server to receive JSON data
app.use(express.json());

// Authentication routes
app.use('/api/auth', authRoutes);

// Creator dashboard routes
app.use('/api/creator', creatorRoutes);

// Content management routes
app.use('/api/content', contentRoutes);

// Media upload routes
app.use('/api/upload', uploadRoutes);

// Test route
app.get('/api/health', (req, res) => {
    res.json({
        message: 'Boujee Life of Ririi API is running!'
    });
});

// Connect to MongoDB before starting the server
const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Boujee backend running on port ${PORT}`);
    });
};

startServer();