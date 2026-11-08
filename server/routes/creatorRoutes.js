const express = require('express');

const {
    protect,
    authorizeCreator
} = require('../middleware/authMiddleware');

const router = express.Router();

// Protected creator dashboard route
router.get('/dashboard', protect, authorizeCreator, (req, res) => {
    res.status(200).json({
        message: 'Welcome to your Boujee Creator Dashboard!',
        creator: req.user
    });
});

module.exports = router;