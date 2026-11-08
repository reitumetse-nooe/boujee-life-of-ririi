
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/CategoryPage.css';

function CategoryPage() {

    const { category } = useParams();
    const navigate = useNavigate();

    const [selectedMedia, setSelectedMedia] = useState(null);

    const categoryDetails = {
        Travel: {
            title: 'Jet-Set Diaries',
            description: 'Beautiful destinations, first-class journeys and unforgettable escapes.'
        },
        Fashion: {
            title: 'Dressed in Luxury',
            description: 'Designer inspiration, statement outfits and personal style.'
        },
        Beauty: {
            title: 'Beauty & The Baddie',
            description: 'Beauty rituals, skincare, makeup and signature fragrances.'
        },
        Experiences: {
            title: 'The High Life',
            description: 'Yacht cruises, fine dining and extraordinary experiences.'
        },
        Personal: {
            title: 'The Rich Girl Diaries',
            description: 'Personal moments, achievements and the lifestyle of Ririi.'
        }
    };

    const selectedCategory = categoryDetails[category];

    const galleryItems = [
        {
            id: 1,
            type: 'image',
            title: 'Beautiful Destinations',
            description: 'A glimpse into unforgettable luxury experiences.',
            url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200'
        },
        {
            id: 2,
            type: 'image',
            title: 'Living Lavishly',
            description: 'The beauty of enjoying extraordinary moments.',
            url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200'
        },
        {
            id: 3,
            type: 'video',
            title: 'Moving Moments',
            description: 'A video moment from the lifestyle journal.',
            url: 'https://www.w3schools.com/html/mov_bbb.mp4'
        },
        {
            id: 4,
            type: 'image',
            title: 'The Luxury Edit',
            description: 'Beautiful details and elevated personal style.',
            url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200'
        }
    ];

    if (!selectedCategory) {
        return (
            <div className="category-not-found">
                <h1>Category Not Found</h1>
                <button onClick={() => navigate('/viewer')}>
                    BACK TO VIEWER PORTAL
                </button>
            </div>
        );
    }

    return (
        <div className="category-page">

            {/* NAVIGATION */}
            <header className="category-navbar">

                <button
                    className="back-arrow"
                    onClick={() => navigate('/viewer')}
                    aria-label="Back to Viewer Portal"
                >
                    ←
                </button>

                <h2>
                    BOUJEE LIFE <span>OF RIRII</span>
                </h2>

                <button
                    className="back-text-button"
                    onClick={() => navigate('/viewer')}
                >
                    VIEWER PORTAL
                </button>

            </header>

            {/* CATEGORY HERO */}
            <section className="category-hero">

                <p>EXPLORE THE COLLECTION</p>

                <h1>{selectedCategory.title}</h1>

                <span>{selectedCategory.description}</span>

            </section>

            {/* GALLERY */}
            <section className="category-gallery">

                <p>THE VISUAL DIARY</p>

                <h2>Explore the Collection</h2>

                <div className="category-gallery-grid">

                    {galleryItems.map(item => (

                        <article
                            className="gallery-card"
                            key={item.id}
                        >

                            <div
                                className="gallery-media"
                                onClick={() => setSelectedMedia(item)}
                            >

                                {item.type === 'image' ? (

                                    <img
                                        src={item.url}
                                        alt={item.title}
                                    />

                                ) : (

                                    <div className="video-preview">
                                        <video src={item.url} muted />
                                        <span className="play-icon">▶</span>
                                    </div>

                                )}

                            </div>

                            <div className="gallery-card-info">

                                <span>
                                    {item.type === 'video' ? 'VIDEO' : 'PHOTOGRAPH'}
                                </span>

                                <h3>{item.title}</h3>

                                <p>{item.description}</p>

                                <button
                                    onClick={() => setSelectedMedia(item)}
                                >
                                    {item.type === 'video' ? 'WATCH VIDEO ↗' : 'VIEW PHOTO ↗'}
                                </button>

                            </div>

                        </article>

                    ))}

                </div>

            </section>

            {/* MEDIA VIEWER */}
            {selectedMedia && (

                <div
                    className="media-modal"
                    onClick={() => setSelectedMedia(null)}
                >

                    <div
                        className="media-modal-content"
                        onClick={(event) => event.stopPropagation()}
                    >

                        <button
                            className="media-modal-close"
                            onClick={() => setSelectedMedia(null)}
                        >
                            ×
                        </button>

                        {selectedMedia.type === 'image' ? (

                            <img
                                src={selectedMedia.url}
                                alt={selectedMedia.title}
                            />

                        ) : (

                            <video
                                src={selectedMedia.url}
                                controls
                                autoPlay
                            />

                        )}

                        <h3>{selectedMedia.title}</h3>

                        <p>{selectedMedia.description}</p>

                    </div>

                </div>

            )}

            {/* FOOTER */}
            <footer className="category-footer">

                <h2>BOUJEE LIFE OF RIRII</h2>

                <p>A LIFE BEYOND ORDINARY.</p>

            </footer>

        </div>
    );
}

export default CategoryPage;
