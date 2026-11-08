
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import '../styles/Dashboard.css';
import '../styles/MediaStudio.css';

const API_URL = 'http://localhost:5000/api';

const categories = [
    'Jet-Set Diaries',
    'The High Life',
    'Dressed in Luxury',
    'Beauty & The Baddie',
    'The Rich Girl Diaries'
];

const getRadianAngle = (degrees) => (degrees * Math.PI) / 180;

const rotateSize = (width, height, rotation) => {
    const radians = getRadianAngle(rotation);

    return {
        width:
            Math.abs(Math.cos(radians) * width) +
            Math.abs(Math.sin(radians) * height),
        height:
            Math.abs(Math.sin(radians) * width) +
            Math.abs(Math.cos(radians) * height)
    };
};

const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
    });

const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0) => {
    const image = await createImage(imageSrc);
    const rotatedDimensions = rotateSize(
        image.width,
        image.height,
        rotation
    );

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = rotatedDimensions.width;
    canvas.height = rotatedDimensions.height;

    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(getRadianAngle(rotation));
    context.drawImage(image, -image.width / 2, -image.height / 2);

    const croppedCanvas = document.createElement('canvas');
    const croppedContext = croppedCanvas.getContext('2d');

    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    croppedContext.drawImage(
        canvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        croppedCanvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Could not create the edited image.'));
                    return;
                }

                resolve(blob);
            },
            'image/jpeg',
            0.92
        );
    });
};

const toLocalDateTime = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return '';

    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

    return date.toISOString().slice(0, 16);
};

const mapContent = (content) => ({
    id: content._id,
    title: content.title,
    description: content.description,
    category: content.category,
    contentType: content.contentType || 'post',
    media: content.mediaUrl,
    mediaType: content.mediaType,
    status: content.status,
    scheduledAt: content.scheduledAt || null,
    publishedAt: content.publishedAt || null,
    createdAt: content.createdAt || null,
    views: content.views || 0,
    likes: content.likes || 0,
    likedBy: content.likedBy || [],
    comments: content.comments || []
});

function Dashboard() {
    const navigate = useNavigate();

    const [activeSection, setActiveSection] = useState('Overview');
    const [stories, setStories] = useState([]);
    const [loadingStories, setLoadingStories] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creator, setCreator] = useState({});

    const [showStoryForm, setShowStoryForm] = useState(false);
    const [editingStoryId, setEditingStoryId] = useState(null);
    const [contentType, setContentType] = useState('post');

    const [storyTitle, setStoryTitle] = useState('');
    const [storyDescription, setStoryDescription] = useState('');
    const [storyCategory, setStoryCategory] = useState('');
    const [publicationMode, setPublicationMode] = useState('published');
    const [scheduledAt, setScheduledAt] = useState('');

    const [existingMediaUrl, setExistingMediaUrl] = useState('');
    const [existingMediaType, setExistingMediaType] = useState('');

    const [selectedMedia, setSelectedMedia] = useState(null);
    const [mediaPreview, setMediaPreview] = useState('');
    const [showMediaEditor, setShowMediaEditor] = useState(false);

    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [mediaZoom, setMediaZoom] = useState(1.2);
    const [mediaRotation, setMediaRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [cropAspect, setCropAspect] = useState(null);
    const [imageAspectRatio, setImageAspectRatio] = useState(4 / 5);

    const [toast, setToast] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [commentAction, setCommentAction] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    useEffect(() => {
        try {
            const savedUser = localStorage.getItem('boujeeUser');

            if (savedUser) {
                setCreator(JSON.parse(savedUser));
            }
        } catch (error) {
            console.error('Could not read creator information:', error);
        }
    }, []);

    useEffect(() => {
        if (!selectedMedia) {
            setMediaPreview('');
            return;
        }

        const previewUrl = URL.createObjectURL(selectedMedia);
        setMediaPreview(previewUrl);

        return () => URL.revokeObjectURL(previewUrl);
    }, [selectedMedia]);

    useEffect(() => {
        if (
            !mediaPreview ||
            !selectedMedia ||
            !selectedMedia.type.startsWith('image/')
        ) {
            return;
        }

        let active = true;
        const image = new Image();

        image.onload = () => {
            if (active && image.naturalHeight > 0) {
                setImageAspectRatio(
                    image.naturalWidth / image.naturalHeight
                );
            }
        };

        image.src = mediaPreview;

        return () => {
            active = false;
        };
    }, [mediaPreview, selectedMedia]);

    useEffect(() => {
        const loadStories = async () => {
            const token = localStorage.getItem('boujeeToken');

            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const response = await fetch(`${API_URL}/content`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || 'Could not load your content.'
                    );
                }

                setStories((data.contents || []).map(mapContent));
            } catch (error) {
                console.error('Loading content error:', error);
                showToast(error.message, 'error');
            } finally {
                setLoadingStories(false);
            }
        };

        loadStories();
    }, [navigate]);

    const handleMediaSelection = (event) => {
        const file = event.target.files[0];

        if (!file) return;

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'video/mp4',
            'video/webm'
        ];

        if (!allowedTypes.includes(file.type)) {
            showToast(
                'Please select a supported image or video.',
                'error'
            );
            event.target.value = '';
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            showToast('Your file must be smaller than 50MB.', 'error');
            event.target.value = '';
            return;
        }

        setSelectedMedia(file);
        setMediaRotation(0);
        setMediaZoom(1.2);
        setCrop({ x: 0, y: 0 });
        setCropAspect(null);
        setCroppedAreaPixels(null);
        setImageAspectRatio(4 / 5);
        setShowMediaEditor(true);
    };

    const resetStoryForm = () => {
        setEditingStoryId(null);
        setContentType('post');
        setStoryTitle('');
        setStoryDescription('');
        setStoryCategory('');
        setPublicationMode('published');
        setScheduledAt('');

        setExistingMediaUrl('');
        setExistingMediaType('');

        setSelectedMedia(null);
        setMediaPreview('');
        setMediaRotation(0);
        setMediaZoom(1.2);
        setCrop({ x: 0, y: 0 });
        setCropAspect(null);
        setCroppedAreaPixels(null);

        setShowMediaEditor(false);
        setShowStoryForm(false);
    };

    const openNewContentForm = (type) => {
        resetStoryForm();
        setContentType(type);
        setShowStoryForm(true);
    };

    const openStoryForEditing = (story) => {
        setEditingStoryId(story.id);
        setContentType(story.contentType || 'post');
        setStoryTitle(story.title || '');
        setStoryDescription(story.description || '');
        setStoryCategory(story.category || '');
        setPublicationMode(story.status || 'draft');
        setScheduledAt(toLocalDateTime(story.scheduledAt));

        setExistingMediaUrl(story.media || '');
        setExistingMediaType(story.mediaType || '');

        setSelectedMedia(null);
        setMediaPreview('');
        setShowMediaEditor(false);

        setShowStoryForm(true);
    };

    const uploadNewMedia = async (token) => {
        let mediaToUpload = selectedMedia;

        if (selectedMedia.type.startsWith('image/')) {
            if (!croppedAreaPixels || !mediaPreview) {
                throw new Error(
                    'Please finish editing your image first.'
                );
            }

            const editedBlob = await getCroppedImg(
                mediaPreview,
                croppedAreaPixels,
                mediaRotation
            );

            mediaToUpload = new File(
                [editedBlob],
                'boujee-edited-image.jpg',
                { type: 'image/jpeg' }
            );
        }

        const formData = new FormData();
        formData.append('media', mediaToUpload);

        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Media upload failed.');
        }

        return {
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType
        };
    };

    const handleSaveStory = async (event) => {
        event.preventDefault();

        const selectedMode =
            event.nativeEvent.submitter?.value || publicationMode;

        const typeLabel = contentType === 'story' ? 'story' : 'post';

        if (
            !storyTitle.trim() ||
            !storyDescription.trim() ||
            !storyCategory
        ) {
            showToast(
                `Please complete all ${typeLabel} details.`,
                'error'
            );
            return;
        }

        if (!selectedMedia && !existingMediaUrl) {
            showToast(
                `Please upload media for your ${typeLabel}.`,
                'error'
            );
            return;
        }

        let publicationDate = null;

        if (selectedMode === 'scheduled') {
            if (!scheduledAt) {
                showToast(
                    'Please choose a publication date and time.',
                    'error'
                );
                return;
            }

            publicationDate = new Date(scheduledAt);

            if (
                Number.isNaN(publicationDate.getTime()) ||
                publicationDate <= new Date()
            ) {
                showToast(
                    'Please choose a future date and time.',
                    'error'
                );
                return;
            }
        }

        try {
            setSaving(true);

            const token = localStorage.getItem('boujeeToken');

            if (!token) {
                navigate('/login');
                return;
            }

            let mediaUrl = existingMediaUrl;
            let mediaType = existingMediaType;

            if (selectedMedia) {
                const uploadedMedia = await uploadNewMedia(token);
                mediaUrl = uploadedMedia.mediaUrl;
                mediaType = uploadedMedia.mediaType;
            }

            const payload = {
                title: storyTitle.trim(),
                description: storyDescription.trim(),
                category: storyCategory,
                contentType,
                mediaUrl,
                mediaType,
                status: selectedMode,
                scheduledAt:
                    selectedMode === 'scheduled'
                        ? publicationDate.toISOString()
                        : null
            };

            const isEditing = Boolean(editingStoryId);

            const response = await fetch(
                isEditing
                    ? `${API_URL}/content/${editingStoryId}`
                    : `${API_URL}/content`,
                {
                    method: isEditing ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || `Could not save your ${typeLabel}.`
                );
            }

            const savedContent =
                data.content || data.updatedContent;

            if (!savedContent) {
                throw new Error(
                    'The server did not return the saved content.'
                );
            }

            const updatedStory = mapContent(savedContent);

            setStories((previous) => {
                if (isEditing) {
                    return previous.map((story) =>
                        story.id === editingStoryId
                            ? updatedStory
                            : story
                    );
                }

                return [updatedStory, ...previous];
            });

            resetStoryForm();
            setActiveSection('My Content');

            if (selectedMode === 'draft') {
                showToast(
                    isEditing
                        ? `Your ${typeLabel} draft has been updated.`
                        : `Your ${typeLabel} has been saved to your drafts.`
                );
            } else if (selectedMode === 'scheduled') {
                showToast(
                    `Your ${typeLabel} is scheduled for ${publicationDate.toLocaleString()}.`
                );
            } else {
                showToast(
                    isEditing
                        ? `Your ${typeLabel} has been updated and is now live.`
                        : `Your ${typeLabel} has been published successfully.`
                );
            }
        } catch (error) {
            console.error('Content saving error:', error);
            showToast(error.message || 'Something went wrong.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStory = async () => {
        if (!deleteTarget) return;

        try {
            setDeleting(true);

            const token = localStorage.getItem('boujeeToken');

            if (!token) {
                navigate('/login');
                return;
            }

            const response = await fetch(
                `${API_URL}/content/${deleteTarget.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'Could not delete this content.'
                );
            }

            setStories((previous) =>
                previous.filter(
                    (story) => story.id !== deleteTarget.id
                )
            );

            const deletedTitle = deleteTarget.title;
            setDeleteTarget(null);

            showToast(
                `"${deletedTitle}" has been permanently deleted.`
            );
        } catch (error) {
            console.error('Delete content error:', error);
            setDeleteTarget(null);
            showToast(
                error.message || 'Could not delete this content.',
                'error'
            );
        } finally {
            setDeleting(false);
        }
    };

    const handleCommentModeration = async (
        storyId,
        commentId,
        moderationStatus
    ) => {
        if (!commentId) {
            showToast('This comment could not be identified.', 'error');
            return;
        }

        const actionKey = `${storyId}-${commentId}`;

        try {
            setCommentAction(actionKey);

            const token = localStorage.getItem('boujeeToken');

            if (!token) {
                navigate('/login');
                return;
            }

            const response = await fetch(
                `${API_URL}/content/${storyId}/comments/${commentId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ moderationStatus })
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message || 'Could not update this comment.'
                );
            }

            setStories((previous) =>
                previous.map((story) => {
                    if (story.id !== storyId) return story;

                    return {
                        ...story,
                        comments: story.comments.map((comment) =>
                            comment._id === commentId
                                ? { ...comment, moderationStatus }
                                : comment
                        )
                    };
                })
            );

            showToast(
                moderationStatus === 'hidden'
                    ? 'The comment has been hidden from viewers.'
                    : 'The comment is approved and visible again.'
            );
        } catch (error) {
            console.error('Comment moderation error:', error);
            showToast(
                error.message || 'Could not update this comment.',
                'error'
            );
        } finally {
            setCommentAction(null);
        }
    };

    const handleDeleteComment = async (storyId, commentId) => {
        if (!commentId) {
            showToast('This comment could not be identified.', 'error');
            return;
        }

        const confirmed = window.confirm(
            'Are you sure you want to permanently delete this comment?'
        );

        if (!confirmed) return;

        const actionKey = `${storyId}-${commentId}`;

        try {
            setCommentAction(actionKey);

            const token = localStorage.getItem('boujeeToken');

            if (!token) {
                navigate('/login');
                return;
            }

            const response = await fetch(
                `${API_URL}/content/${storyId}/comments/${commentId}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message || 'Could not delete this comment.'
                );
            }

            setStories((previous) =>
                previous.map((story) => {
                    if (story.id !== storyId) return story;

                    return {
                        ...story,
                        comments: story.comments.filter(
                            (comment) => comment._id !== commentId
                        )
                    };
                })
            );

            showToast('The comment has been permanently deleted.');
        } catch (error) {
            console.error('Comment deletion error:', error);
            showToast(
                error.message || 'Could not delete this comment.',
                'error'
            );
        } finally {
            setCommentAction(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('boujeeToken');
        localStorage.removeItem('boujeeUser');
        navigate('/login');
    };

    const publishedStories = stories.filter(
        (story) => story.status === 'published'
    );

    const draftStories = stories.filter(
        (story) => story.status === 'draft'
    );

    const scheduledStories = stories.filter(
        (story) => story.status === 'scheduled'
    );

    const publishedPosts = publishedStories.filter(
        (story) => story.contentType === 'post'
    );

    const publishedOnlyStories = publishedStories.filter(
        (story) => story.contentType === 'story'
    );

    const totalViews = publishedStories.reduce(
        (total, story) => total + story.views,
        0
    );

    const totalLikes = publishedStories.reduce(
        (total, story) => total + story.likes,
        0
    );

    const totalComments = publishedStories.reduce(
        (total, story) => total + story.comments.length,
        0
    );

    const allComments = publishedStories
        .flatMap((story) =>
            story.comments.map((comment, index) => ({
                ...comment,
                storyTitle: story.title,
                storyType: story.contentType || 'post',
                storyId: story.id,
                commentId: comment._id,
                moderationStatus:
                    comment.moderationStatus || 'approved',
                commentKey:
                    comment._id || comment.createdAt || index
            }))
        )
        .reverse();

    const menuItems = [
        'Overview',
        'My Content',
        'Comments',
        'Analytics',
        'Settings'
    ];

    const sectionTitles = {
        Overview: 'Dashboard Overview',
        'My Content': 'My Content',
        Comments: 'Audience Comments',
        Analytics: 'Content Analytics',
        Settings: 'Creator Settings'
    };

    const renderStatistics = () => (
        <section className="statistics-section">
            <div className="statistics-heading">
                <h2>YOUR PERFORMANCE</h2>
                <p>Performance from your published content only.</p>
            </div>

            <div className="statistics-grid">
                <div className="stat-card">
                    <p>TOTAL CONTENT</p>
                    <h3>{stories.length}</h3>
                    <span>All posts and stories</span>
                </div>

                <div className="stat-card">
                    <p>PUBLISHED POSTS</p>
                    <h3>{publishedPosts.length}</h3>
                    <span>Live posts</span>
                </div>

                <div className="stat-card">
                    <p>PUBLISHED STORIES</p>
                    <h3>{publishedOnlyStories.length}</h3>
                    <span>Live stories</span>
                </div>

                <div className="stat-card">
                    <p>DRAFTS</p>
                    <h3>{draftStories.length}</h3>
                    <span>Unpublished content</span>
                </div>

                <div className="stat-card">
                    <p>SCHEDULED CONTENT</p>
                    <h3>{scheduledStories.length}</h3>
                    <span>Waiting for publication</span>
                </div>

                <div className="stat-card">
                    <p>TOTAL VIEWS</p>
                    <h3>{totalViews}</h3>
                    <span>Published content</span>
                </div>

                <div className="stat-card">
                    <p>TOTAL LIKES</p>
                    <h3>{totalLikes}</h3>
                    <span>Published content</span>
                </div>

                <div className="stat-card">
                    <p>TOTAL COMMENTS</p>
                    <h3>{totalComments}</h3>
                    <span>Published content</span>
                </div>
            </div>
        </section>
    );

    const renderContentCard = (story, showEngagement = true) => (
        <article className="story-card" key={story.id}>
            {story.mediaType === 'image' ? (
                <img src={story.media} alt={story.title} />
            ) : (
                <video src={story.media} controls />
            )}

            <div className="story-card-info">
                <p>{story.category}</p>

                <small className="story-status">
                    {(story.contentType || 'post').toUpperCase()}
                </small>

                <h3>{story.title}</h3>
                <span>{story.description}</span>

                <small className={`story-status ${story.status}`}>
                    {story.status.toUpperCase()}
                </small>

                {story.status === 'scheduled' && story.scheduledAt && (
                    <p className="scheduled-date">
                        Scheduled for:{' '}
                        {new Date(story.scheduledAt).toLocaleString()}
                    </p>
                )}

                <button
                    type="button"
                    className="story-edit-button"
                    onClick={() => openStoryForEditing(story)}
                >
                    EDIT {story.contentType === 'story' ? 'STORY' : 'POST'}
                </button>

                <button
                    type="button"
                    className="story-delete-button"
                    onClick={() => setDeleteTarget(story)}
                >
                    DELETE {story.contentType === 'story' ? 'STORY' : 'POST'}
                </button>

                {showEngagement && story.status === 'published' && (
                    <div className="story-engagement">
                        <div className="engagement-counts">
                            <span>♥ {story.likes} Likes</span>
                            <span>💬 {story.comments.length} Comments</span>
                            <span>◉ {story.views} Views</span>
                        </div>

                        <div className="engagement-details">
                            <h4>People who liked this content</h4>

                            {story.likedBy.length > 0 ? (
                                <ul>
                                    {story.likedBy.map((liker, index) => (
                                        <li
                                            key={
                                                liker._id ||
                                                liker.visitorId ||
                                                index
                                            }
                                        >
                                            ♥ {liker.name}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="no-engagement">
                                    No named likes recorded yet.
                                </p>
                            )}
                        </div>

                        <div className="engagement-details">
                            <h4>Audience comments</h4>

                            {story.comments.length > 0 ? (
                                <div className="creator-comment-list">
                                    {story.comments
                                        .slice()
                                        .reverse()
                                        .map((comment, index) => (
                                            <div
                                                className="creator-comment"
                                                key={
                                                    comment._id ||
                                                    comment.createdAt ||
                                                    index
                                                }
                                            >
                                                <strong>
                                                    {comment.name || 'Guest'}
                                                </strong>

                                                <p>{comment.text}</p>

                                                <small>
                                                    {comment.createdAt
                                                        ? new Date(
                                                            comment.createdAt
                                                        ).toLocaleString()
                                                        : ''}
                                                </small>

                                                <small>
                                                    {comment.moderationStatus === 'hidden'
                                                        ? 'HIDDEN'
                                                        : comment.moderationStatus === 'pending'
                                                            ? 'PENDING APPROVAL'
                                                            : 'APPROVED'}
                                                </small>

                                                {comment.moderationStatus !== 'approved' && (
                                                    <button
                                                        type="button"
                                                        className="comment-approve-button"
                                                        disabled={
                                                            !comment._id ||
                                                            commentAction === `${story.id}-${comment._id}`
                                                        }
                                                        onClick={() =>
                                                            handleCommentModeration(
                                                                story.id,
                                                                comment._id,
                                                                'approved'
                                                            )
                                                        }
                                                    >
                                                        APPROVE COMMENT
                                                    </button>
                                                )}

                                                {comment.moderationStatus !== 'hidden' && (
                                                    <button
                                                        type="button"
                                                        className="comment-hide-button"
                                                        disabled={
                                                            !comment._id ||
                                                            commentAction === `${story.id}-${comment._id}`
                                                        }
                                                        onClick={() =>
                                                            handleCommentModeration(
                                                                story.id,
                                                                comment._id,
                                                                'hidden'
                                                            )
                                                        }
                                                    >
                                                        HIDE COMMENT
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="comment-delete-button"
                                                    disabled={
                                                        !comment._id ||
                                                        commentAction === `${story.id}-${comment._id}`
                                                    }
                                                    onClick={() =>
                                                        handleDeleteComment(
                                                            story.id,
                                                            comment._id
                                                        )
                                                    }
                                                >
                                                    DELETE COMMENT
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <p className="no-engagement">
                                    No comments on this content yet.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </article>
    );

    const renderStories = () => {
        if (loadingStories) {
            return (
                <div className="content-empty">
                    <h3>Loading your content...</h3>
                </div>
            );
        }

        if (stories.length === 0) {
            return (
                <div className="content-empty">
                    <h3>Your creative journey starts here.</h3>
                    <p>You haven't added any posts or stories yet.</p>

                    <button
                        className="create-button"
                        onClick={() => openNewContentForm('post')}
                    >
                        CREATE YOUR FIRST POST
                    </button>

                    <button
                        className="create-button"
                        onClick={() => openNewContentForm('story')}
                    >
                        CREATE YOUR FIRST STORY
                    </button>
                </div>
            );
        }

        return (
            <div className="stories-grid">
                {stories.map((story) => renderContentCard(story))}
            </div>
        );
    };

    const effectiveCropAspect =
        cropAspect !== null
            ? cropAspect
            : (
                Math.abs(mediaRotation % 180) === 90
                    ? 1 / imageAspectRatio
                    : imageAspectRatio
            );

    return (
        <div className="dashboard-layout">
            {toast && (
                <div className="boujee-modal-backdrop">
                    <div
                        className="boujee-message-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="boujee-message-title"
                    >
                        <div className={`boujee-message-icon ${toast.type}`}>
                            {toast.type === 'error' ? '!' : '✓'}
                        </div>

                        <p className="boujee-modal-eyebrow">
                            BOUJEE LIFE OF RIRII
                        </p>

                        <h2 id="boujee-message-title">
                            {toast.type === 'error'
                                ? 'Something went wrong'
                                : 'Successfully completed'}
                        </h2>

                        <p className="boujee-message-description">
                            {toast.message}
                        </p>

                        <button
                            type="button"
                            className="boujee-message-button"
                            onClick={() => setToast(null)}
                            autoFocus
                        >
                            CONTINUE
                        </button>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="boujee-modal-backdrop">
                    <div
                        className="boujee-message-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-modal-title"
                    >
                        <div className="boujee-message-icon delete-icon">
                            !
                        </div>

                        <p className="boujee-modal-eyebrow">
                            CONTENT MANAGEMENT
                        </p>

                        <h2 id="delete-modal-title">
                            Delete this content?
                        </h2>

                        <p className="boujee-message-description">
                            Are you sure you want to permanently delete{' '}
                            <strong>"{deleteTarget.title}"</strong>?
                            This action cannot be undone.
                        </p>

                        <div className="boujee-modal-actions">
                            <button
                                type="button"
                                className="boujee-cancel-button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                            >
                                KEEP CONTENT
                            </button>

                            <button
                                type="button"
                                className="boujee-delete-confirm-button"
                                onClick={handleDeleteStory}
                                disabled={deleting}
                            >
                                {deleting ? 'DELETING...' : 'YES, DELETE'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <aside className="sidebar">
                <div className="sidebar-brand">
                    <h2>BOUJEE LIFE</h2>
                    <span>OF RIRII</span>
                </div>

                <p className="sidebar-label">MAIN MENU</p>

                <nav className="sidebar-nav">
                    {menuItems.map((item) => (
                        <button
                            type="button"
                            key={item}
                            className={
                                activeSection === item
                                    ? 'sidebar-nav-button active'
                                    : 'sidebar-nav-button'
                            }
                            onClick={() => setActiveSection(item)}
                        >
                            {item}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-bottom">
                    <button
                        className="sidebar-link-button"
                        onClick={() => navigate('/')}
                    >
                        View Website ↗
                    </button>

                    <button onClick={handleLogout}>Log Out</button>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <div>
                        <p>CREATOR STUDIO</p>
                        <h1>{sectionTitles[activeSection]}</h1>
                    </div>

                    {(activeSection === 'Overview' ||
                        activeSection === 'My Content') && (
                        <div className="dashboard-create-actions">
                            <button
                                type="button"
                                className="create-button"
                                onClick={() => openNewContentForm('post')}
                            >
                                + CREATE POST
                            </button>

                            <button
                                type="button"
                                className="create-button"
                                onClick={() => openNewContentForm('story')}
                            >
                                + CREATE STORY
                            </button>
                        </div>
                    )}
                </header>

                {activeSection === 'Overview' && (
                    <>
                        <section className="dashboard-welcome">
                            <p>WELCOME BACK, RIRII</p>
                            <h2>Your creative world, at a glance.</h2>
                            <span>
                                Manage your posts and stories and monitor your
                                audience.
                            </span>
                        </section>

                        {renderStatistics()}

                        <section className="content-management">
                            <div className="content-heading">
                                <div>
                                    <p>CONTENT MANAGEMENT</p>
                                    <h2>Your Latest Content</h2>
                                </div>

                                <button
                                    className="create-button"
                                    onClick={() =>
                                        setActiveSection('My Content')
                                    }
                                >
                                    VIEW ALL CONTENT
                                </button>
                            </div>

                            {loadingStories ? (
                                <div className="content-empty">
                                    <h3>Loading your content...</h3>
                                </div>
                            ) : (
                                <div className="stories-grid">
                                    {stories
                                        .slice(0, 3)
                                        .map((story) =>
                                            renderContentCard(story, false)
                                        )}
                                </div>
                            )}

                            {!loadingStories && stories.length === 0 && (
                                <div className="content-empty">
                                    <h3>No content created yet.</h3>
                                    <p>
                                        Create your first post or story to get
                                        started.
                                    </p>
                                </div>
                            )}
                        </section>
                    </>
                )}

                {activeSection === 'My Content' && (
                    <section className="content-management">
                        <div className="content-heading">
                            <div>
                                <p>CONTENT MANAGEMENT</p>
                                <h2>All Your Content</h2>
                                <span>
                                    Your published posts, stories, drafts and
                                    scheduled content.
                                </span>
                            </div>
                        </div>

                        {renderStories()}
                    </section>
                )}

                {activeSection === 'Comments' && (
                    <section className="content-management">
                        <div className="content-heading">
                            <div>
                                <p>COMMUNITY ENGAGEMENT</p>
                                <h2>What Your Audience Is Saying</h2>
                            </div>
                        </div>

                        <div className="comment-summary">
                            <p>TOTAL AUDIENCE COMMENTS</p>
                            <h2>{totalComments}</h2>
                        </div>

                        {allComments.length === 0 ? (
                            <div className="content-empty">
                                <h3>No comments yet.</h3>
                            </div>
                        ) : (
                            <div className="dashboard-comments-list">
                                {allComments.map((comment) => {
                                    const actionKey =
                                        `${comment.storyId}-${comment.commentId}`;

                                    const isBusy =
                                        commentAction === actionKey;

                                    const isHidden =
                                        comment.moderationStatus === 'hidden';

                                    const isPending =
                                        comment.moderationStatus === 'pending';

                                    return (
                                        <article
                                            className="dashboard-comment-card"
                                            key={`${comment.storyId}-${comment.commentKey}`}
                                        >
                                            <div className="dashboard-comment-top">
                                                <strong>
                                                    {comment.name || 'Guest'}
                                                </strong>

                                                <small>
                                                    {comment.createdAt
                                                        ? new Date(
                                                            comment.createdAt
                                                        ).toLocaleString()
                                                        : ''}
                                                </small>
                                            </div>

                                            <p>{comment.text}</p>

                                            <span>
                                                On your {comment.storyType}:{' '}
                                                {comment.storyTitle}
                                            </span>

                                            <div className="dashboard-comment-status">
                                                {isHidden
                                                    ? 'HIDDEN FROM VIEWERS'
                                                    : isPending
                                                        ? 'PENDING APPROVAL'
                                                        : 'VISIBLE TO VIEWERS'}
                                            </div>

                                            <div className="dashboard-comment-actions">
                                                {isHidden || isPending ? (
                                                    <button
                                                        type="button"
                                                        className="comment-approve-button"
                                                        disabled={!comment.commentId || isBusy}
                                                        onClick={() =>
                                                            handleCommentModeration(
                                                                comment.storyId,
                                                                comment.commentId,
                                                                'approved'
                                                            )
                                                        }
                                                    >
                                                        {isBusy ? 'PLEASE WAIT...' : 'APPROVE'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="comment-hide-button"
                                                        disabled={!comment.commentId || isBusy}
                                                        onClick={() =>
                                                            handleCommentModeration(
                                                                comment.storyId,
                                                                comment.commentId,
                                                                'hidden'
                                                            )
                                                        }
                                                    >
                                                        {isBusy ? 'PLEASE WAIT...' : 'HIDE'}
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="comment-delete-button"
                                                    disabled={!comment.commentId || isBusy}
                                                    onClick={() =>
                                                        handleDeleteComment(
                                                            comment.storyId,
                                                            comment.commentId
                                                        )
                                                    }
                                                >
                                                    {isBusy ? 'PLEASE WAIT...' : 'DELETE'}
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                {activeSection === 'Analytics' && (
                    <>
                        {renderStatistics()}

                        <section className="content-management">
                            <div className="content-heading">
                                <div>
                                    <p>CONTENT PERFORMANCE</p>
                                    <h2>How Your Content Is Performing</h2>
                                </div>
                            </div>

                            <div className="analytics-list">
                                {publishedStories.map((story) => (
                                    <article
                                        className="analytics-card"
                                        key={story.id}
                                    >
                                        <div className="analytics-story-info">
                                            <h3>{story.title}</h3>
                                            <span>
                                                {story.contentType === 'story'
                                                    ? 'STORY'
                                                    : 'POST'}{' '}
                                                · {story.category}
                                            </span>
                                        </div>

                                        <div className="analytics-metrics">
                                            <div>
                                                <strong>{story.views}</strong>
                                                <span>Views</span>
                                            </div>

                                            <div>
                                                <strong>{story.likes}</strong>
                                                <span>Likes</span>
                                            </div>

                                            <div>
                                                <strong>{story.comments.length}</strong>
                                                <span>Comments</span>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {publishedStories.length === 0 && (
                                <div className="content-empty">
                                    <h3>
                                        No published content to analyse yet.
                                    </h3>
                                </div>
                            )}
                        </section>
                    </>
                )}

                {activeSection === 'Settings' && (
                    <section className="content-management">
                        <div className="content-heading">
                            <div>
                                <p>ACCOUNT MANAGEMENT</p>
                                <h2>Your Creator Account</h2>
                            </div>
                        </div>

                        <div className="creator-settings-card">
                            <div className="creator-settings-heading">
                                <h3>ACCOUNT INFORMATION</h3>
                            </div>

                            <div className="creator-setting-row">
                                <span>Creator Name</span>
                                <strong>
                                    {creator.name || creator.username || 'Ririi'}
                                </strong>
                            </div>

                            <div className="creator-setting-row">
                                <span>Email Address</span>
                                <strong>
                                    {creator.email || 'Not available'}
                                </strong>
                            </div>

                            <div className="creator-setting-row">
                                <span>Account Type</span>
                                <strong>Content Creator</strong>
                            </div>

                            <div className="creator-setting-row">
                                <span>Website</span>
                                <strong>Boujee Life of Ririi</strong>
                            </div>
                        </div>
                    </section>
                )}

                {showStoryForm && (
                    <div className="story-modal-backdrop">
                        <section className="story-form-section">
                            <button
                                type="button"
                                className="close-modal"
                                onClick={resetStoryForm}
                            >
                                ×
                            </button>

                            <h2>
                                {editingStoryId
                                    ? `Edit Your ${contentType === 'story' ? 'Story' : 'Post'}`
                                    : `Create a New ${contentType === 'story' ? 'Story' : 'Post'}`}
                            </h2>

                            <p>
                                {editingStoryId
                                    ? 'Make changes and choose what happens next.'
                                    : 'Share something beautiful with your audience.'}
                            </p>

                            <form onSubmit={handleSaveStory}>
                                <label>Content Type</label>

                                <select
                                    value={contentType}
                                    onChange={(event) =>
                                        setContentType(event.target.value)
                                    }
                                >
                                    <option value="post">Post</option>
                                    <option value="story">Story</option>
                                </select>

                                <label>
                                    {contentType === 'story'
                                        ? 'Story Title'
                                        : 'Post Title'}
                                </label>

                                <input
                                    type="text"
                                    placeholder={
                                        contentType === 'story'
                                            ? 'Enter your story title'
                                            : 'Enter your post title'
                                    }
                                    value={storyTitle}
                                    onChange={(event) =>
                                        setStoryTitle(event.target.value)
                                    }
                                    required
                                />

                                <label>Description</label>

                                <textarea
                                    placeholder="Write something for your audience..."
                                    rows="5"
                                    value={storyDescription}
                                    onChange={(event) =>
                                        setStoryDescription(event.target.value)
                                    }
                                    required
                                />

                                <label>Category</label>

                                <select
                                    value={storyCategory}
                                    onChange={(event) =>
                                        setStoryCategory(event.target.value)
                                    }
                                    required
                                >
                                    <option value="">Choose a category</option>

                                    {categories.map((category) => (
                                        <option
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </option>
                                    ))}
                                </select>

                                <label>
                                    {editingStoryId
                                        ? 'Change Media (Optional)'
                                        : 'Upload Media'}
                                </label>

                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                                    onChange={handleMediaSelection}
                                />

                                {existingMediaUrl && !selectedMedia && (
                                    <div className="existing-media-preview">
                                        <p>Current media</p>

                                        {existingMediaType === 'image' ? (
                                            <img
                                                src={existingMediaUrl}
                                                alt="Current content"
                                            />
                                        ) : (
                                            <video
                                                src={existingMediaUrl}
                                                controls
                                            />
                                        )}
                                    </div>
                                )}

                                {selectedMedia && (
                                    <p className="upload-hint">
                                        New media selected. Apply your edits in
                                        Media Studio.
                                    </p>
                                )}

                                <p className="upload-hint">
                                    Supported formats: JPG, PNG, WEBP, MP4 and
                                    WEBM. Maximum file size: 50MB.
                                </p>

                                <div className="publication-options">
                                    <label>
                                        CHOOSE WHAT HAPPENS TO THIS{' '}
                                        {contentType.toUpperCase()}
                                    </label>

                                    <div className="publication-mode-buttons">
                                        <button
                                            type="button"
                                            className={
                                                publicationMode === 'draft'
                                                    ? 'publication-mode active'
                                                    : 'publication-mode'
                                            }
                                            onClick={() =>
                                                setPublicationMode('draft')
                                            }
                                        >
                                            SAVE AS DRAFT
                                        </button>

                                        <button
                                            type="button"
                                            className={
                                                publicationMode === 'published'
                                                    ? 'publication-mode active'
                                                    : 'publication-mode'
                                            }
                                            onClick={() =>
                                                setPublicationMode('published')
                                            }
                                        >
                                            PUBLISH NOW
                                        </button>

                                        <button
                                            type="button"
                                            className={
                                                publicationMode === 'scheduled'
                                                    ? 'publication-mode active'
                                                    : 'publication-mode'
                                            }
                                            onClick={() =>
                                                setPublicationMode('scheduled')
                                            }
                                        >
                                            SCHEDULE
                                        </button>
                                    </div>

                                    {publicationMode === 'scheduled' && (
                                        <div className="schedule-date-field">
                                            <label>
                                                PUBLICATION DATE AND TIME
                                            </label>

                                            <input
                                                type="datetime-local"
                                                value={scheduledAt}
                                                min={new Date(
                                                    Date.now() -
                                                    new Date().getTimezoneOffset() *
                                                    60000
                                                )
                                                    .toISOString()
                                                    .slice(0, 16)}
                                                onChange={(event) =>
                                                    setScheduledAt(
                                                        event.target.value
                                                    )
                                                }
                                                required
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="story-form-actions">
                                    <button
                                        type="button"
                                        className="cancel-button"
                                        onClick={resetStoryForm}
                                    >
                                        CANCEL
                                    </button>

                                    <button
                                        type="submit"
                                        className="create-button"
                                        value={publicationMode}
                                        disabled={saving}
                                    >
                                        {saving
                                            ? 'SAVING...'
                                            : publicationMode === 'draft'
                                                ? 'SAVE DRAFT'
                                                : publicationMode === 'scheduled'
                                                    ? `SCHEDULE ${contentType.toUpperCase()}`
                                                    : `PUBLISH ${contentType.toUpperCase()}`}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )}

                {showMediaEditor && mediaPreview && selectedMedia && (
                    <div className="media-editor-backdrop">
                        <section className="media-editor-window">
                            <div className="media-editor-header">
                                <div>
                                    <p>BOUJEE LIFE OF RIRII</p>
                                    <h2>Media Studio</h2>
                                </div>

                                <button
                                    type="button"
                                    className="close-modal"
                                    onClick={() =>
                                        setShowMediaEditor(false)
                                    }
                                >
                                    ×
                                </button>
                            </div>

                            <div className="media-editor-stage">
                                {selectedMedia.type.startsWith('image/') ? (
                                    <Cropper
                                        image={mediaPreview}
                                        crop={crop}
                                        zoom={mediaZoom}
                                        rotation={mediaRotation}
                                        aspect={effectiveCropAspect}
                                        onCropChange={setCrop}
                                        onZoomChange={setMediaZoom}
                                        onCropComplete={(_, pixels) =>
                                            setCroppedAreaPixels(pixels)
                                        }
                                        showGrid
                                        objectFit="contain"
                                        restrictPosition
                                    />
                                ) : (
                                    <video
                                        src={mediaPreview}
                                        controls
                                        className="media-video-preview"
                                    />
                                )}
                            </div>

                            {selectedMedia.type.startsWith('image/') && (
                                <div className="media-editor-controls">
                                    <div className="crop-control">
                                        <label>ZOOM</label>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMediaZoom((value) =>
                                                    Math.max(1, value - 0.1)
                                                )
                                            }
                                        >
                                            −
                                        </button>

                                        <input
                                            type="range"
                                            min="1"
                                            max="3"
                                            step="0.05"
                                            value={mediaZoom}
                                            onChange={(event) =>
                                                setMediaZoom(
                                                    Number(event.target.value)
                                                )
                                            }
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMediaZoom((value) =>
                                                    Math.min(3, value + 0.1)
                                                )
                                            }
                                        >
                                            +
                                        </button>
                                    </div>

                                    <div className="crop-control">
                                        <label>CROP SHAPE</label>

                                        <select
                                            value={
                                                cropAspect === null
                                                    ? 'original'
                                                    : String(cropAspect)
                                            }
                                            onChange={(event) => {
                                                const value = event.target.value;

                                                setCropAspect(
                                                    value === 'original'
                                                        ? null
                                                        : Number(value)
                                                );

                                                setCrop({ x: 0, y: 0 });
                                                setMediaZoom(1.2);
                                                setCroppedAreaPixels(null);
                                            }}
                                        >
                                            <option value="original">
                                                Original Picture
                                            </option>
                                            <option value="1">
                                                Square 1:1
                                            </option>
                                            <option value="0.8">
                                                Portrait 4:5
                                            </option>
                                            <option value="1.7777778">
                                                Landscape 16:9
                                            </option>
                                        </select>
                                    </div>

                                    <div className="crop-control">
                                        <label>ROTATE</label>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMediaRotation(
                                                    (value) => value - 90
                                                )
                                            }
                                        >
                                            ↶ Left
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMediaRotation(
                                                    (value) => value + 90
                                                )
                                            }
                                        >
                                            ↷ Right
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className="reset-edit-button"
                                        onClick={() => {
                                            setCrop({ x: 0, y: 0 });
                                            setMediaZoom(1.2);
                                            setMediaRotation(0);
                                            setCropAspect(null);
                                            setCroppedAreaPixels(null);
                                        }}
                                    >
                                        RESET EDITS
                                    </button>

                                    <p className="crop-instruction">
                                        Drag the image to reposition it. Use
                                        the zoom slider to reveal more or less
                                        of the picture.
                                    </p>
                                </div>
                            )}

                            <div className="media-editor-footer">
                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() =>
                                        setShowMediaEditor(false)
                                    }
                                >
                                    CANCEL
                                </button>

                                <button
                                    type="button"
                                    className="create-button"
                                    onClick={() =>
                                        setShowMediaEditor(false)
                                    }
                                >
                                    APPLY EDITS
                                </button>
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}

export default Dashboard;
