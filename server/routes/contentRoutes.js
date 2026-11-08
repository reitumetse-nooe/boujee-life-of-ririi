
const express = require('express');
const mongoose = require('mongoose');
const Content = require('../models/Content');

const {
    protect,
    authorizeCreator
} = require('../middleware/authMiddleware');

const router = express.Router();


// ======================================
// AUTOMATICALLY PUBLISH SCHEDULED CONTENT
// ======================================

const publishScheduledContent = async () => {
    try {
        const now = new Date();

        await Content.updateMany(
            {
                status: 'scheduled',
                scheduledAt: { $lte: now }
            },
            {
                $set: {
                    status: 'published',
                    publishedAt: now,
                    scheduledAt: null
                }
            }
        );
    } catch (error) {
        console.error('Scheduled publishing error:', error.message);
    }
};

const scheduledPublisher = setInterval(() => {
    publishScheduledContent();
}, 60 * 1000);

if (scheduledPublisher.unref) {
    scheduledPublisher.unref();
}


// ======================================
// PUBLIC: GET ALL PUBLISHED CONTENT
// ======================================

router.get('/published', async (req, res) => {
    try {
        await publishScheduledContent();

        const contents = await Content.find({
            status: 'published'
        })
            .sort({ publishedAt: -1, createdAt: -1 })
            .select(
                'title description mediaUrl mediaType contentType category status likes likedBy views comments publishedAt createdAt'
            )
            .lean();

        const publicContents = contents.map((content) => ({
            ...content,
            contentType: content.contentType || 'post',

            comments: (content.comments || []).filter(
                (comment) =>
                    comment.moderationStatus === 'approved' ||
                    !comment.moderationStatus
            )
        }));

        res.status(200).json({
            count: publicContents.length,
            contents: publicContents
        });

    } catch (error) {
        console.error('Fetch published content:', error.message);

        res.status(500).json({
            message: 'Unable to retrieve published content.'
        });
    }
});


// ======================================
// PUBLIC: RECORD A CONTENT VIEW
// ======================================

router.post('/:id/view', async (req, res) => {
    try {
        const content = await Content.findOneAndUpdate(
            {
                _id: req.params.id,
                status: 'published'
            },
            {
                $inc: { views: 1 }
            },
            {
                returnDocument: 'after'
            }
        ).select('views');

        if (!content) {
            return res.status(404).json({
                message: 'Published content not found.'
            });
        }

        res.status(200).json({
            message: 'View recorded successfully!',
            views: content.views
        });

    } catch (error) {
        console.error('Record content view:', error.message);

        res.status(500).json({
            message: 'Unable to record content view.'
        });
    }
});


// ======================================
// PUBLIC: LIKE CONTENT
// ======================================

router.post('/:id/like', async (req, res) => {
    try {
        const visitorId = String(req.body.visitorId || '').trim();
        const name = String(req.body.name || '').trim();

        if (!visitorId || !name) {
            return res.status(400).json({
                message: 'Please provide your name before liking.'
            });
        }

        if (visitorId.length > 100 || name.length > 40) {
            return res.status(400).json({
                message: 'Your visitor ID or name is too long.'
            });
        }

        const content = await Content.findOneAndUpdate(
            {
                _id: req.params.id,
                status: 'published',
                'likedBy.visitorId': { $ne: visitorId }
            },
            {
                $inc: { likes: 1 },
                $push: {
                    likedBy: {
                        visitorId,
                        name
                    }
                }
            },
            {
                returnDocument: 'after',
                runValidators: true
            }
        ).select('likes likedBy');

        if (!content) {
            const existingContent = await Content.findOne({
                _id: req.params.id,
                status: 'published'
            }).select('likes likedBy');

            if (!existingContent) {
                return res.status(404).json({
                    message: 'Published content not found.'
                });
            }

            return res.status(200).json({
                message: 'You have already liked this content.',
                likes: existingContent.likes,
                likedBy: existingContent.likedBy,
                alreadyLiked: true
            });
        }

        res.status(200).json({
            message: 'Content liked successfully!',
            likes: content.likes,
            likedBy: content.likedBy,
            alreadyLiked: false
        });

    } catch (error) {
        console.error('Like content error:', error.message);

        res.status(500).json({
            message: 'Unable to like this content.'
        });
    }
});


// ======================================
// PUBLIC: ADD A COMMENT
// ======================================

router.post('/:id/comments', async (req, res) => {
    try {
        const name = String(req.body.name || 'Guest').trim();
        const text = String(req.body.text || '').trim();

        if (!text) {
            return res.status(400).json({
                message: 'Please enter a comment.'
            });
        }

        if (name.length > 40 || text.length > 1000) {
            return res.status(400).json({
                message: 'Your name or comment is too long.'
            });
        }

        const content = await Content.findOneAndUpdate(
            {
                _id: req.params.id,
                status: 'published'
            },
            {
                $push: {
                    comments: {
                        name: name || 'Guest',
                        text,
                        moderationStatus: 'pending'
                    }
                }
            },
            {
                returnDocument: 'after',
                runValidators: true
            }
        ).select('comments');

        if (!content) {
            return res.status(404).json({
                message: 'Published content not found.'
            });
        }

        const newComment = content.comments[
            content.comments.length - 1
        ];

        res.status(201).json({
            message: 'Comment submitted. It will appear after creator approval.',
            comment: newComment
        });

    } catch (error) {
        console.error('Add comment error:', error.message);

        res.status(500).json({
            message: 'Unable to add your comment.'
        });
    }
});


// ======================================
// CREATOR-ONLY ROUTES
// ======================================

router.use(protect, authorizeCreator);


// ======================================
// IMPORT HOMEPAGE GALLERY AS REAL POSTS
// ======================================

router.post('/import-gallery', async (req, res) => {
    try {
        const galleryImages = [
            // JET-SET DIARIES
            {
                filename: 'jet-set.jpg',
                title: 'Jet-Set Diaries',
                description: 'A glimpse into my world of luxury travel and unforgettable destinations.',
                category: 'Jet-Set Diaries'
            },
            {
                filename: 'jet-set2.jpg',
                title: 'A Life Above the Clouds',
                description: 'Travelling in style and making every journey unforgettable.',
                category: 'Jet-Set Diaries'
            },
            {
                filename: 'jet-set3.jpg',
                title: 'The Art of Travelling',
                description: 'Beautiful destinations, extraordinary experiences and the finer things in life.',
                category: 'Jet-Set Diaries'
            },
            {
                filename: 'jet-set4.jpg',
                title: 'First Class Moments',
                description: 'Because the journey should be just as beautiful as the destination.',
                category: 'Jet-Set Diaries'
            },

            // THE HIGH LIFE
            {
                filename: 'high-life.jpg',
                title: 'The High Life',
                description: 'Living beautifully, embracing luxury and enjoying every moment.',
                category: 'The High Life'
            },
            {
                filename: 'high-life2.jpg',
                title: 'Luxury Looks Good on Me',
                description: 'A collection of beautiful moments and elevated experiences.',
                category: 'The High Life'
            },
            {
                filename: 'high-life3.jpg',
                title: 'Living the Beautiful Life',
                description: 'Celebrating the lifestyle I love, one beautiful moment at a time.',
                category: 'The High Life'
            },
            {
                filename: 'high-life4.jpg',
                title: 'An Affair with Luxury',
                description: 'A little indulgence, a lot of elegance and everything in between.',
                category: 'The High Life'
            },

            // DRESSED IN LUXURY
            {
                filename: 'fashion.jpg',
                title: 'Dressed in Luxury',
                description: 'Fashion is an expression of elegance, confidence and individuality.',
                category: 'Dressed in Luxury'
            },
            {
                filename: 'fashion2.jpg',
                title: 'The Boujee Wardrobe',
                description: 'Curated looks, timeless pieces and effortless personal style.',
                category: 'Dressed in Luxury'
            },

            // BEAUTY & THE BADDIE
            {
                filename: 'beauty.jpg',
                title: 'Beauty & The Baddie',
                description: 'Beauty, confidence and the little details that make all the difference.',
                category: 'Beauty & The Baddie'
            },
            {
                filename: 'beauty2.jpg',
                title: 'Beauty Is an Art',
                description: 'A celebration of beauty, self-expression and feeling your best.',
                category: 'Beauty & The Baddie'
            },
            {
                filename: 'beauty3.jpg',
                title: 'The Beauty Diaries',
                description: 'My favourite beauty moments and everything that inspires my look.',
                category: 'Beauty & The Baddie'
            },
            {
                filename: 'beauty4.jpg',
                title: 'Pretty in Every Detail',
                description: 'Because looking good and feeling good go hand in hand.',
                category: 'Beauty & The Baddie'
            },

            // THE RICH GIRL DIARIES
            {
                filename: 'rich-girl1.jpg',
                title: 'The Rich Girl Diaries',
                description: 'A diary of beautiful experiences, ambition and the lifestyle I dream of.',
                category: 'The Rich Girl Diaries'
            },
            {
                filename: 'rich-girl2.jpg',
                title: 'Soft Life, Big Dreams',
                description: 'Creating a life filled with beautiful experiences and meaningful memories.',
                category: 'The Rich Girl Diaries'
            },
            {
                filename: 'rich-girl3.jpg',
                title: 'A Taste of the Good Life',
                description: 'Romanticising life and appreciating every beautiful detail.',
                category: 'The Rich Girl Diaries'
            },
            {
                filename: 'rich-girl4.jpg',
                title: 'My Kind of Lifestyle',
                description: 'The moments, places and experiences that make life beautiful.',
                category: 'The Rich Girl Diaries'
            }
        ];

        const imported = [];
        const skipped = [];

        for (const image of galleryImages) {
            const mediaUrl = `/images/${image.filename}`;

            const existingContent = await Content.findOne({
                creator: req.user.id,
                mediaUrl
            });

            if (existingContent) {
                skipped.push(image.filename);
                continue;
            }

            const newContent = await Content.create({
                creator: req.user.id,
                title: image.title,
                description: image.description,
                mediaUrl,
                mediaType: 'image',
                contentType: 'post',
                category: image.category,
                status: 'published',
                publishedAt: new Date()
            });

            imported.push(newContent);
        }

        res.status(200).json({
            message: 'Homepage gallery import completed successfully!',
            importedCount: imported.length,
            skippedCount: skipped.length,
            totalImages: galleryImages.length,
            imported: imported.map((item) => item.title),
            skipped
        });

    } catch (error) {
        console.error('Gallery import error:', error.message);

        res.status(500).json({
            message: 'Unable to import the homepage gallery.'
        });
    }
});


// ======================================
// CREATE NEW CONTENT
// ======================================

router.post('/', async (req, res) => {
    try {
        const {
            title,
            description,
            mediaUrl,
            mediaType,
            contentType,
            category,
            status,
            scheduledAt
        } = req.body;

        if (!title || !mediaUrl || !mediaType || !category) {
            return res.status(400).json({
                message: 'Please provide a title, media URL, media type and category.'
            });
        }

        const selectedType = contentType || 'post';

        if (!['post', 'story'].includes(selectedType)) {
            return res.status(400).json({
                message: 'Content type must be either post or story.'
            });
        }

        if (!['image', 'video'].includes(mediaType)) {
            return res.status(400).json({
                message: 'Media type must be image or video.'
            });
        }

        const selectedStatus = ['draft', 'published', 'scheduled'].includes(status)
            ? status
            : 'draft';

        let publicationDate = null;

        if (selectedStatus === 'scheduled') {
            publicationDate = new Date(scheduledAt);

            if (!scheduledAt || Number.isNaN(publicationDate.getTime())) {
                return res.status(400).json({
                    message: 'Please provide a valid scheduled publication date and time.'
                });
            }

            if (publicationDate <= new Date()) {
                return res.status(400).json({
                    message: 'The scheduled publication time must be in the future.'
                });
            }
        }

        const newContent = await Content.create({
            creator: req.user.id,
            title,
            description,
            mediaUrl,
            mediaType,
            contentType: selectedType,
            category,
            status: selectedStatus,
            scheduledAt: selectedStatus === 'scheduled' ? publicationDate : null,
            publishedAt: selectedStatus === 'published' ? new Date() : null
        });

        res.status(201).json({
            message: selectedStatus === 'scheduled'
                ? 'Content scheduled successfully!'
                : `${selectedType === 'story' ? 'Story' : 'Post'} created successfully!`,
            content: newContent
        });

    } catch (error) {
        console.error('Create content error:', error.message);

        res.status(500).json({
            message: 'Unable to create content.'
        });
    }
});


// ======================================
// GET ALL CREATOR CONTENT
// ======================================

router.get('/', async (req, res) => {
    try {
        await publishScheduledContent();

        const contents = await Content.find({
            creator: req.user.id
        }).sort({ createdAt: -1 }).lean();

        const creatorContents = contents.map((content) => ({
            ...content,
            contentType: content.contentType || 'post'
        }));

        res.status(200).json({
            count: creatorContents.length,
            contents: creatorContents
        });

    } catch (error) {
        console.error('Fetch creator content:', error.message);

        res.status(500).json({
            message: 'Unable to retrieve content.'
        });
    }
});


// ======================================
// APPROVE OR HIDE A COMMENT
// ======================================

router.put('/:id/comments/:commentId', async (req, res) => {
    try {
        const { moderationStatus } = req.body;

        if (!['approved', 'hidden'].includes(moderationStatus)) {
            return res.status(400).json({
                message: 'Comment status must be approved or hidden.'
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(req.params.id) ||
            !mongoose.Types.ObjectId.isValid(req.params.commentId)
        ) {
            return res.status(400).json({
                message: 'Invalid content or comment ID.'
            });
        }

        const content = await Content.findOne({
            _id: req.params.id,
            creator: req.user.id
        });

        if (!content) {
            return res.status(404).json({
                message: 'Content not found.'
            });
        }

        const comment = content.comments.id(req.params.commentId);

        if (!comment) {
            return res.status(404).json({
                message: 'Comment not found.'
            });
        }

        comment.moderationStatus = moderationStatus;

        await content.save();

        res.status(200).json({
            message: moderationStatus === 'approved'
                ? 'Comment approved successfully!'
                : 'Comment hidden successfully!',
            comment
        });

    } catch (error) {
        console.error('Moderate comment error:', error.message);

        res.status(500).json({
            message: 'Unable to update comment status.'
        });
    }
});


// ======================================
// DELETE A COMMENT
// ======================================

router.delete('/:id/comments/:commentId', async (req, res) => {
    try {
        if (
            !mongoose.Types.ObjectId.isValid(req.params.id) ||
            !mongoose.Types.ObjectId.isValid(req.params.commentId)
        ) {
            return res.status(400).json({
                message: 'Invalid content or comment ID.'
            });
        }

        const content = await Content.findOne({
            _id: req.params.id,
            creator: req.user.id
        });

        if (!content) {
            return res.status(404).json({
                message: 'Content not found.'
            });
        }

        const comment = content.comments.id(req.params.commentId);

        if (!comment) {
            return res.status(404).json({
                message: 'Comment not found.'
            });
        }

        comment.deleteOne();

        await content.save();

        res.status(200).json({
            message: 'Comment deleted successfully!'
        });

    } catch (error) {
        console.error('Delete comment error:', error.message);

        res.status(500).json({
            message: 'Unable to delete comment.'
        });
    }
});


// ======================================
// UPDATE CONTENT
// ======================================

router.put('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid content ID.'
            });
        }

        const content = await Content.findOne({
            _id: req.params.id,
            creator: req.user.id
        });

        if (!content) {
            return res.status(404).json({
                message: 'Content not found.'
            });
        }

        const allowedFields = [
            'title',
            'description',
            'mediaUrl',
            'mediaType',
            'category'
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                content[field] = req.body[field];
            }
        });

        if (req.body.contentType !== undefined) {
            if (!['post', 'story'].includes(req.body.contentType)) {
                return res.status(400).json({
                    message: 'Content type must be either post or story.'
                });
            }

            content.contentType = req.body.contentType;
        }

        if (req.body.status !== undefined) {
            if (!['draft', 'published', 'scheduled'].includes(req.body.status)) {
                return res.status(400).json({
                    message: 'Invalid content status.'
                });
            }

            content.status = req.body.status;

            if (req.body.status === 'published') {
                content.publishedAt = new Date();
                content.scheduledAt = null;
            }

            if (req.body.status === 'draft') {
                content.publishedAt = null;
                content.scheduledAt = null;
            }

            if (req.body.status === 'scheduled') {
                const publicationDate = new Date(req.body.scheduledAt);

                if (
                    !req.body.scheduledAt ||
                    Number.isNaN(publicationDate.getTime()) ||
                    publicationDate <= new Date()
                ) {
                    return res.status(400).json({
                        message: 'Please choose a valid future publication date and time.'
                    });
                }

                content.scheduledAt = publicationDate;
                content.publishedAt = null;
            }
        } else if (req.body.scheduledAt !== undefined) {
            return res.status(400).json({
                message: 'Change the content status to scheduled when setting a publication date.'
            });
        }

        await content.save();

        res.status(200).json({
            message: 'Content updated successfully!',
            content
        });

    } catch (error) {
        console.error('Update content error:', error.message);

        res.status(500).json({
            message: 'Unable to update content.'
        });
    }
});


// DELETE CONTENT

router.delete('/:id', async (req, res) => {
    try {
        const content = await Content.findOneAndDelete({
            _id: req.params.id,
            creator: req.user.id
        });

        if (!content) {
            return res.status(404).json({
                message: 'Content not found.'
            });
        }

        res.status(200).json({
            message: 'Content deleted successfully!'
        });

    } catch (error) {
        console.error('Delete content error:', error.message);

        res.status(500).json({
            message: 'Unable to delete content.'
        });
    }
});


module.exports = router;
