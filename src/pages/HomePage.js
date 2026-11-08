
import { Link } from 'react-router-dom';
import '../styles/HomePage.css';

function HomePage() {
    const categories = [
        {
            number: '01',
            name: 'Jet-Set Diaries',
            description: 'Travel & Destinations',
            images: ['jet-set.jpg', 'jet-set2.jpg', 'jet-set3.jpg', 'jet-set4.jpg']
        },
        {
            number: '02',
            name: 'The High Life',
            description: 'Luxury Experiences',
            images: ['high-life.jpg', 'high-life2.jpg', 'high-life3.jpg', 'high-life4.jpg']
        },
        {
            number: '03',
            name: 'Dressed in Luxury',
            description: 'Fashion & Style',
            images: ['fashion.jpg', 'fashion2.jpg']
        },
        {
            number: '04',
            name: 'Beauty & The Baddie',
            description: 'Beauty & Lifestyle',
            images: ['beauty.jpg', 'beauty2.jpg', 'beauty3.jpg', 'beauty4.jpg']
        },
        {
            number: '05',
            name: 'The Rich Girl Diaries',
            description: 'Personal Lifestyle',
            images: ['rich-girl1.jpg', 'rich-girl2.jpg', 'rich-girl3.jpg', 'rich-girl4.jpg']
        }
    ];

    return (
        <div className="homepage">

            {/* NAVIGATION */}
            <header className="home-navbar">
                <Link to="/" className="home-logo">
                    <h2>BOUJEE LIFE</h2>
                    <span>OF RIRII</span>
                </Link>

                <nav>
                    <Link to="/">HOME</Link>
                    <Link to="/viewer">EXPLORE</Link>
                    <Link to="/viewer#stories">STORIES</Link>
                    <Link to="/viewer#about">ABOUT</Link>
                    <Link to="/login">CREATOR LOGIN</Link>
                </nav>
            </header>

            {/* HERO SECTION */}
            <section className="home-hero">
                <div className="home-hero-content">
                    <p>WELCOME TO THE WORLD OF RIRII</p>

                    <h1>
                        THE ART OF
                        <br />
                        LIVING LAVISHLY.
                    </h1>

                    <span>
                        Fashion, beauty, luxury travel and extraordinary
                        experiences. Welcome to a life beyond ordinary.
                    </span>

                    <Link to="/viewer" className="home-explore-button">
                        EXPLORE THE WORLD ↗
                    </Link>
                </div>
            </section>

            {/* INTRODUCTION */}
            <section className="home-intro">
                <p>THE WORLD OF RIRII</p>

                <h2>
                    Not Just A Lifestyle.
                    <br />
                    It's An Experience.
                </h2>

                <span>
                    A personal journal celebrating beautiful destinations,
                    statement fashion, beauty and the finer things in life.
                </span>

                <Link to="/viewer" className="home-text-link">
                    ENTER MY WORLD ↗
                </Link>
            </section>

            {/* CATEGORIES */}
            <section className="home-categories">
                <p>EXPLORE THE COLLECTION</p>

                <h2>Discover My World</h2>

                <div className="home-category-grid">
                    {categories.map((category) => (
                        <Link
                            key={category.number}
                            to={`/viewer?category=${encodeURIComponent(category.name)}`}
                            className="home-category"
                        >
                            <div className="home-category-images">
                                {category.images.map((image, index) => (
                                    <img
                                        key={image}
                                        src={`/images/${image}`}
                                        alt={`${category.name} ${index + 1}`}
                                    />
                                ))}
                            </div>

                            <span>{category.number}</span>
                            <h3>{category.name}</h3>
                            <p>{category.description} ↗</p>
                        </Link>
                    ))}
                </div>
            </section>

            {/* FOOTER */}
            <footer className="home-footer">
                <h2>BOUJEE LIFE OF RIRII</h2>

                <p>A LIFE BEYOND ORDINARY.</p>

                <Link to="/viewer">EXPLORE THE WORLD ↗</Link>
            </footer>

        </div>
    );
}

export default HomePage;
