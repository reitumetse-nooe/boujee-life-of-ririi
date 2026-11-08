
const mongoose = require('mongoose');

// Structure of an individual viewer comment
const commentSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        maxlength: 40,
        default: 'Guest'
    },

    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },

    moderationStatus: {
        type: String,
        enum: ['pending', 'approved', 'hidden'],
        default: 'pending'
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Structure of a viewer who liked content
const likerSchema = new mongoose.Schema({
    visitorId: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 40
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Structure of creator content
const contentSchema = new mongoose.Schema(
    {
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true,
            default: ''
        },

        mediaUrl: {
            type: String,
            required: true
        },

        mediaType: {
            type: String,
            enum: ['image', 'video'],
            required: true
        },

        // Separates permanent posts from stories
        contentType: {
            type: String,
            enum: ['post', 'story'],
            default: 'post',
            required: true
        },

        category: {
            type: String,
            enum: [
                'Jet-Set Diaries',
                'The High Life',
                'Dressed in Luxury',
                'Beauty & The Baddie',
                'The Rich Girl Diaries'
            ],
            required: true
        },

        status: {
            type: String,
            enum: ['draft', 'published', 'scheduled'],
            default: 'draft'
        },

        // Date and time when scheduled content should be published
        scheduledAt: {
            type: Date,
            default: null
        },

        likes: {
            type: Number,
            default: 0
        },

        likedBy: {
            type: [likerSchema],
            default: []
        },

        views: {
            type: Number,
            default: 0
        },

        comments: {
            type: [commentSchema],
            default: []
        },

        publishedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const Content = mongoose.model('Content', contentSchema);

module.exports = Content;
