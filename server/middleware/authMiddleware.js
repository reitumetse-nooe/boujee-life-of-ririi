const jwt = require('jsonwebtoken');

// Verify whether the user has a valid login token
const protect = (req, res, next) => {
    try {
        // Get the authorization header
        const authHeader = req.headers.authorization;

        // Check whether a token was provided
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Access denied. Please log in.'
            });
        }

        // Extract the token
        const token = authHeader.split(' ')[1];

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach the user's information to the request
        req.user = decoded;

        // Allow the request to continue
        next();

    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired token. Please log in again.'
        });
    }
};

// Allow access only to creator accounts
const authorizeCreator = (req, res, next) => {
    if (req.user.role !== 'creator') {
        return res.status(403).json({
            message: 'Access denied. Creator permissions required.'
        });
    }

    next();
};

// Export both security functions
module.exports = {
    protect,
    authorizeCreator
};