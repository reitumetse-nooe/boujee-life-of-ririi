import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/ViewerPortal.css';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/content`;
const LIKED_STORIES_KEY = 'boujee_liked_stories';
const VISITOR_ID_KEY = 'boujee_visitor_id';

const categories = [
    'Jet-Set Diaries',
    'The High Life',
    'Dressed in Luxury',
    'Beauty & The Baddie',
    'The Rich Girl Diaries'
];

function ViewerPortal() {
    const location = useLocation();

    const selectedCategory = new URLSearchParams(location.search)
        .get('category') || 'All Posts';

    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [commentNames, setCommentNames] = useState({});
    const [commentTexts, setCommentTexts] = useState({});
    const [submitting, setSubmitting] = useState({});
    const [liking, setLiking] = useState({});

    const [selectedMedia, setSelectedMedia] = useState(null);
    const [notification, setNotification] = useState(null);

    const viewedStories = useRef(new Set());

    // CREATE OR RETRIEVE A UNIQUE VISITOR ID
    const [visitorId] = useState(() => {
        let savedId = localStorage.getItem(VISITOR_ID_KEY);

        if (!savedId) {
            savedId = window.crypto?.randomUUID
                ? window.crypto.randomUUID()
                : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;

            localStorage.setItem(VISITOR_ID_KEY, savedId);
        }

        return savedId;
    });

    // RETRIEVE CONTENT ALREADY LIKED BY THIS VISITOR
    const [likedStories, setLikedStories] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem(LIKED_STORIES_KEY) || '[]'
            );
        } catch {
            return [];
        }
    });

    // DISPLAY A LUXURY NOTIFICATION
    const showNotification = (type, title, message) => {
        setNotification({
            type,
            title,
            message
        });
    };

    // CLOSE NOTIFICATION
    const closeNotification = () => {
        setNotification(null);
    };

    // LOAD ALL PUBLISHED CONTENT FROM MONGODB
    const fetchStories = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(`${API_URL}/published`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Unable to load content.');
            }

            setStories(data.contents || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStories();
    }, []);

    // RECORD VIEWS FOR DATABASE POSTS AND STORIES
    useEffect(() => {
        if (loading || stories.length === 0) {
            return;
        }

        const cards = document.querySelectorAll(
            '.viewer-story-card[data-story-id]'
        );

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(async (entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    const storyId = entry.target.dataset.storyId;

                    if (!storyId || viewedStories.current.has(storyId)) {
                        return;
                    }

                    viewedStories.current.add(storyId);

                    try {
                        const response = await fetch(
                            `${API_URL}/${storyId}/view`,
                            { method: 'POST' }
                        );

                        const data = await response.json();

                        if (!response.ok) {
                            throw new Error(
                                data.message || 'Unable to record view.'
                            );
                        }

                        setStories(previous =>
                            previous.map(story =>
                                story._id === storyId
                                    ? { ...story, views: data.views }
                                    : story
                            )
                        );

                    } catch (err) {
                        console.error('View tracking error:', err.message);
                        viewedStories.current.delete(storyId);
                    }
                });
            },
            { threshold: 0.5 }
        );

        cards.forEach(card => observer.observe(card));

        return () => observer.disconnect();

    }, [stories, loading, selectedCategory]);

    // OPEN FULL-SCREEN MEDIA
    const openMedia = (story) => {
        setSelectedMedia(story);
        document.body.style.overflow = 'hidden';
    };

    // CLOSE FULL-SCREEN MEDIA
    const closeMedia = () => {
        setSelectedMedia(null);

        if (!notification) {
            document.body.style.overflow = '';
        }
    };

    // CLOSE NOTIFICATION AND MEDIA WITH ESCAPE
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                if (notification) {
                    closeNotification();
                } else if (selectedMedia) {
                    closeMedia();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [notification, selectedMedia]);

    // KEEP THE PAGE LOCKED WHILE A MODAL IS OPEN
    useEffect(() => {
        document.body.style.overflow =
            selectedMedia || notification ? 'hidden' : '';

        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedMedia, notification]);

    // FILTER DATABASE CONTENT BY CATEGORY AND SEARCH
    const filteredStories = stories.filter(story => {
        const matchesCategory =
            selectedCategory === 'All Posts' ||
            story.category === selectedCategory;

        const search = searchTerm.trim().toLowerCase();

        const matchesSearch =
            !search ||
            story.title?.toLowerCase().includes(search) ||
            story.description?.toLowerCase().includes(search) ||
            story.category?.toLowerCase().includes(search);

        return matchesCategory && matchesSearch;
    });

    // SEPARATE POSTS AND STORIES
    const publishedPosts = filteredStories.filter(
        story => (story.contentType || 'post') === 'post'
    );

    const publishedStories = filteredStories.filter(
        story => story.contentType === 'story'
    );

    // LIKE DATABASE CONTENT
    const handleLike = async (storyId) => {
        if (liking[storyId] || likedStories.includes(storyId)) {
            return;
        }

        const name = (commentNames[storyId] || '').trim();

        if (!name) {
            showNotification(
                'error',
                'NAME REQUIRED',
                'Please enter your name before liking this content.'
            );
            return;
        }

        setLiking(previous => ({
            ...previous,
            [storyId]: true
        }));

        try {
            const response = await fetch(`${API_URL}/${storyId}/like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ visitorId, name })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Unable to like content.');
            }

            const updatedLikedStories = [...likedStories, storyId];

            localStorage.setItem(
                LIKED_STORIES_KEY,
                JSON.stringify(updatedLikedStories)
            );

            setLikedStories(updatedLikedStories);

            setStories(previous =>
                previous.map(story =>
                    story._id === storyId
                        ? {
                            ...story,
                            likes: data.likes,
                            likedBy: data.likedBy || story.likedBy
                        }
                        : story
                )
            );

            showNotification(
                'success',
                'THANK YOU',
                'Your like has been added. Thank you for showing some love!'
            );

        } catch (err) {
            showNotification(
                'error',
                'SOMETHING WENT WRONG',
                err.message
            );
        } finally {
            setLiking(previous => ({
                ...previous,
                [storyId]: false
            }));
        }
    };

    // SUBMIT A COMMENT FOR CREATOR APPROVAL
    const handleComment = async (event, storyId) => {
        event.preventDefault();

        const text = (commentTexts[storyId] || '').trim();
        const name = (commentNames[storyId] || '').trim();

        if (!text) {
            showNotification(
                'error',
                'COMMENT REQUIRED',
                'Please write a comment before submitting.'
            );
            return;
        }

        setSubmitting(previous => ({
            ...previous,
            [storyId]: true
        }));

        try {
            const response = await fetch(
                `${API_URL}/${storyId}/comments`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name || 'Guest',
                        text
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Unable to post comment.');
            }

            setStories(previous =>
                previous.map(story =>
                    story._id === storyId
                        ? { ...story, comments: data.comments }
                        : story
                )
            );

            setCommentTexts(previous => ({
                ...previous,
                [storyId]: ''
            }));

            showNotification(
                'success',
                'COMMENT SUBMITTED',
                'Thank you for joining the conversation. Your comment has been submitted and is awaiting creator approval.'
            );

        } catch (err) {
            showNotification(
                'error',
                'COMMENT NOT SUBMITTED',
                err.message
            );
        } finally {
            setSubmitting(previous => ({
                ...previous,
                [storyId]: false
            }));
        }
    };

    // DISPLAY CONTENT CARDS
    const renderContentCards = (contentItems) => (
        <div className="viewer-stories-grid">

            {contentItems.map(story => (
                <article
                    className="viewer-story-card"
                    key={story._id}
                    data-story-id={story._id}
                >

                    <div className="story-media-wrapper">

                        {story.mediaType === 'video' ? (
                            <video
                                className="viewer-story-media clickable-media"
                                src={story.mediaUrl}
                                controls
                                preload="metadata"
                                onClick={() => openMedia(story)}
                            />
                        ) : (
                            <img
                                className="viewer-story-media clickable-media"
                                src={story.mediaUrl}
                                alt={story.title}
                                loading="lazy"
                                onClick={() => openMedia(story)}
                            />
                        )}

                        <button
                            type="button"
                            className="media-expand-button"
                            onClick={() => openMedia(story)}
                            aria-label="View media full screen"
                        >
                            ⛶
                        </button>

                    </div>

                    <div className="story-card-content">

                        <p className="viewer-story-category">
                            {story.category}
                        </p>

                        <span className="content-type-label">
                            {(story.contentType || 'post') === 'story'
                                ? 'STORY'
                                : 'POST'}
                        </span>

                        <h3>{story.title}</h3>

                        <p className="viewer-story-description">
                            {story.description}
                        </p>

                        {/* LIKES AND ENGAGEMENT */}
                        <div className="story-engagement">

                            <button
                                className="like-button"
                                onClick={() => handleLike(story._id)}
                                disabled={
                                    liking[story._id] ||
                                    likedStories.includes(story._id)
                                }
                            >
                                {liking[story._id]
                                    ? 'PLEASE WAIT...'
                                    : likedStories.includes(story._id)
                                        ? '♥ LIKED'
                                        : '♥ LIKE'}
                            </button>

                            <span>{story.likes || 0} likes</span>

                            <span>
                                {(story.comments || []).length} comments
                            </span>

                        </div>

                        {/* COMMENTS */}
                        <div className="story-comments">

                            <h4>JOIN THE CONVERSATION</h4>

                            <form
                                className="comment-form"
                                onSubmit={event =>
                                    handleComment(event, story._id)
                                }
                            >

                                <input
                                    type="text"
                                    placeholder="Your name (needed to like)"
                                    value={commentNames[story._id] || ''}
                                    onChange={event =>
                                        setCommentNames(previous => ({
                                            ...previous,
                                            [story._id]: event.target.value
                                        }))
                                    }
                                    maxLength={40}
                                />

                                <textarea
                                    placeholder="Write a comment..."
                                    value={commentTexts[story._id] || ''}
                                    onChange={event =>
                                        setCommentTexts(previous => ({
                                            ...previous,
                                            [story._id]: event.target.value
                                        }))
                                    }
                                    maxLength={1000}
                                    required
                                />

                                <button
                                    type="submit"
                                    disabled={submitting[story._id]}
                                >
                                    {submitting[story._id]
                                        ? 'POSTING...'
                                        : 'POST COMMENT'}
                                </button>

                            </form>

                            <div className="story-comment-list">

                                {(story.comments || [])
                                    .slice()
                                    .reverse()
                                    .map((comment, index) => (
                                        <div
                                            className="story-comment"
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

                                            <span>
                                                {comment.createdAt
                                                    ? new Date(
                                                        comment.createdAt
                                                    ).toLocaleString()
                                                    : ''}
                                            </span>

                                        </div>
                                    ))}

                                {(story.comments || []).length === 0 && (
                                    <p className="no-comments">
                                        Be the first to leave a comment.
                                    </p>
                                )}

                            </div>

                        </div>

                    </div>

                </article>
            ))}

        </div>
    );

    // DISPLAY A CONTENT SECTION
    const renderContentSection = (
        heading,
        description,
        contentItems
    ) => (
        <section className="viewer-content-section">

            <div className="stories-heading">

                <p className="section-eyebrow">
                    THE RIRII COLLECTION
                </p>

                <h2>{heading}</h2>

                <span>{description}</span>

            </div>

            {contentItems.length > 0 ? (
                renderContentCards(contentItems)
            ) : (
                <p className="viewer-message">
                    No {heading.toLowerCase()} in this collection yet.
                </p>
            )}

        </section>
    );

    return (
        <div className="viewer-portal">

            {/* NAVIGATION */}
            <header className="viewer-navbar">

                <Link to="/" className="viewer-logo">
                    <span className="viewer-logo-main">
                        BOUJEE LIFE
                    </span>

                    <span className="viewer-logo-sub">
                        OF RIRII
                    </span>
                </Link>

                <nav>
                    <Link to="/">HOME</Link>
                    <a href="#stories">THE COLLECTIONS</a>
                    <Link to="/login">CREATOR LOGIN</Link>
                </nav>

            </header>

            {/* INTRODUCTION */}
            <section className="viewer-hero">

                <div className="hero-content">

                    <p className="hero-eyebrow">
                        THE WORLD OF RIRII
                    </p>

                    <h1>
                        A LIFE OF
                        <span> BEAUTY & ELEGANCE.</span>
                    </h1>

                    <p className="hero-description">
                        Fashion, beauty, travel and unforgettable
                        experiences. Welcome to my world.
                    </p>

                    <a href="#stories" className="viewer-button">
                        DISCOVER MY WORLD
                    </a>

                </div>

            </section>

            {/* CONTENT COLLECTIONS */}
            <main className="viewer-stories" id="stories">

                <div className="stories-heading">

                    <p className="section-eyebrow">
                        THE LATEST EDITION
                    </p>

                    <h2>Stories from My World</h2>

                    <span>
                        Experiences, moments and everything in between.
                    </span>

                </div>

                {/* SEARCH */}
                <div className="viewer-search-container">

                    <input
                        type="search"
                        className="viewer-search-input"
                        placeholder="Search posts, stories, titles or categories..."
                        value={searchTerm}
                        onChange={event =>
                            setSearchTerm(event.target.value)
                        }
                        aria-label="Search published content"
                    />

                    {searchTerm && (
                        <button
                            type="button"
                            className="viewer-search-clear"
                            onClick={() => setSearchTerm('')}
                        >
                            CLEAR SEARCH
                        </button>
                    )}

                </div>

                {/* CATEGORY FILTERS */}
                <div className="viewer-category-filters">

                    <Link
                        to="/viewer"
                        className={
                            selectedCategory === 'All Posts'
                                ? 'active'
                                : ''
                        }
                    >
                        All Collections
                    </Link>

                    {categories.map(category => (
                        <Link
                            key={category}
                            to={`/viewer?category=${encodeURIComponent(category)}`}
                            className={
                                selectedCategory === category
                                    ? 'active'
                                    : ''
                            }
                        >
                            {category}
                        </Link>
                    ))}

                </div>

                {selectedCategory !== 'All Posts' && (
                    <div className="stories-heading">

                        <p className="section-eyebrow">
                            YOUR SELECTED COLLECTION
                        </p>

                        <h2>{selectedCategory}</h2>

                    </div>
                )}

                {loading && (
                    <p className="viewer-message">
                        Loading content...
                    </p>
                )}

                {error && (
                    <div className="viewer-message viewer-error">

                        {error}

                        <button onClick={fetchStories}>
                            TRY AGAIN
                        </button>

                    </div>
                )}

                {!loading && !error && (
                    <>

                        <p className="viewer-search-results">
                            {filteredStories.length}{' '}
                            {filteredStories.length === 1
                                ? 'item'
                                : 'items'} found
                        </p>

                        {filteredStories.length === 0 ? (

                            <p className="viewer-message">
                                {searchTerm.trim()
                                    ? `No content found matching "${searchTerm}". Try another search.`
                                    : 'No content in this collection yet. Please explore another category.'}
                            </p>

                        ) : (

                            <>

                                {renderContentSection(
                                    'Stories',
                                    'Moments and experiences from my world.',
                                    publishedStories
                                )}

                                {renderContentSection(
                                    'Posts',
                                    'The latest looks, moments and lifestyle updates.',
                                    publishedPosts
                                )}

                            </>

                        )}

                    </>
                )}

            </main>

            {/* FULL-SCREEN MEDIA VIEWER */}
            {selectedMedia && (

                <div
                    className="media-lightbox"
                    onClick={closeMedia}
                >

                    <button
                        type="button"
                        className="media-lightbox-close"
                        onClick={closeMedia}
                        aria-label="Close media viewer"
                    >
                        &times;
                    </button>

                    <div
                        className="media-lightbox-content"
                        onClick={event => event.stopPropagation()}
                    >

                        {selectedMedia.mediaType === 'video' ? (

                            <video
                                src={selectedMedia.mediaUrl}
                                controls
                                autoPlay
                                playsInline
                            />

                        ) : (

                            <img
                                src={selectedMedia.mediaUrl}
                                alt={selectedMedia.title}
                            />

                        )}

                        <div className="media-lightbox-caption">

                            <h3>{selectedMedia.title}</h3>

                            <p>{selectedMedia.category}</p>

                        </div>

                    </div>

                </div>

            )}

            {/* LUXURY NOTIFICATION MODAL */}
            {notification && (

                <div
                    className="boujee-modal-backdrop"
                    onClick={closeNotification}
                >

                    <div
                        className="boujee-message-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="viewer-notification-title"
                        onClick={event => event.stopPropagation()}
                    >

                        <div
                            className={`boujee-message-icon ${
                                notification.type === 'error' ? 'error' : ''
                            }`}
                        >
                            {notification.type === 'error' ? '!' : '✓'}
                        </div>

                        <p className="boujee-modal-eyebrow">
                            BOUJEE LIFE OF RIRII
                        </p>

                        <h2 id="viewer-notification-title">
                            {notification.title}
                        </h2>

                        <p className="boujee-message-description">
                            {notification.message}
                        </p>

                        <button
                            type="button"
                            className="boujee-message-button"
                            onClick={closeNotification}
                        >
                            CONTINUE
                        </button>

                    </div>

                </div>

            )}

            {/* FOOTER */}
            <footer className="viewer-footer">

                <h2>BOUJEE LIFE OF RIRII</h2>

                <p>A LIFE BEYOND ORDINARY.</p>

                <Link to="/">RETURN HOME</Link>

            </footer>

        </div>
    );
}

export default ViewerPortal;