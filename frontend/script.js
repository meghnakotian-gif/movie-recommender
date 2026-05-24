const API_BASE_URL = 'http://127.0.0.1:5000';
const movieGrid = document.getElementById('movie-grid');
const getMoviesBtn = document.getElementById('get-movies-btn');
const genreSelect = document.getElementById('genre-select');
const loadingIndicator = document.getElementById('loading');
const viewFavoritesBtn = document.getElementById('view-favorites-btn');
const viewRecentBtn = document.getElementById('view-recent-btn');
const pageTitle = document.getElementById('page-title');

// Emojis for poster placeholders
const movieEmojis = ['🎬', '🍿', '🎥', '🎞️', '⭐', '🎭', '📽️', '📺'];

let favoriteMovieIds = new Set();
let isViewingFavorites = false;
let currentUser = null;

async function fetchUserFavoritesList() {
    const userId = localStorage.getItem('movieUserId');
    if (!userId) return;
    try {
        const res = await fetch(`${API_BASE_URL}/favorites/${userId}`, {credentials: 'include'});
        const favs = await res.json();
        favoriteMovieIds.clear();
        if (Array.isArray(favs)) {
            favs.forEach(f => favoriteMovieIds.add(f.movieId));
        }
    } catch (e) {
        console.error("Failed to load favorites list");
    }
}

async function fetchMovies(mode = 'all') {
    // Clear grid and show loading
    movieGrid.innerHTML = '';
    loadingIndicator.classList.remove('hidden');

    const userId = localStorage.getItem('movieUserId');
    
    // Sync the favorites set first so we know which hearts to fill
    if (userId) {
        await fetchUserFavoritesList();
    }

    let endpoint = `${API_BASE_URL}/movies`;
    
    if (mode === 'favorites') {
        isViewingFavorites = true;
        pageTitle.textContent = "❤️ My Favorites";
        if (!userId) {
            movieGrid.innerHTML = `
                <div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #aaa;">
                    <h2>🔒 Please Sign In</h2>
                    <p style="margin-top: 10px;">You must be signed in to view your favorites.</p>
                </div>`;
            loadingIndicator.classList.add('hidden');
            return;
        }
        endpoint = `${API_BASE_URL}/favorites/${userId}`;
    } else if (mode === 'recent') {
        isViewingFavorites = false;
        pageTitle.textContent = "⏱️ Recently Viewed";
        if (!userId) {
            movieGrid.innerHTML = `
                <div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #aaa;">
                    <h2>🔒 Please Sign In</h2>
                    <p style="margin-top: 10px;">You must be signed in to view history.</p>
                </div>`;
            loadingIndicator.classList.add('hidden');
            return;
        }
        endpoint = `${API_BASE_URL}/recent/${userId}`;
    } else {
        isViewingFavorites = false;
        const selectedGenre = genreSelect.value;
        if (selectedGenre) {
            endpoint += `?genre=${selectedGenre}`;
            pageTitle.textContent = `${selectedGenre} Movies`;
        } else {
            pageTitle.textContent = "All Movies";
        }
    }

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.status === 401) {
            movieGrid.innerHTML = `
                <div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #aaa;">
                    <h2>🔒 Members Only</h2>
                    <p style="margin-top: 10px;">You must be signed in to view our movie collection.</p>
                </div>`;
            return;
        }

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const movies = await response.json();
        renderMovies(movies);
    } catch (error) {
        console.error('Error fetching movies:', error);
        movieGrid.innerHTML = `
            <div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #e50914;">
                <h2>Error Connection</h2>
                <p>Failed to load movies. Make sure your Flask backend is running on port 5000!</p>
            </div>`;
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

function renderMovies(movies) {
    if (movies.length === 0) {
        movieGrid.innerHTML = `
            <div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: #aaa;">
                <h2>No results found</h2>
                <p>We couldn't find any movies here.</p>
            </div>`;
        return;
    }

    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        
        // Pick a random emoji for the placeholder poster
        const randomEmoji = movieEmojis[Math.floor(Math.random() * movieEmojis.length)];
        
        // Format genres into clean visual tags
        const genresList = movie.genres ? movie.genres.split('|') : ['Unknown'];
        const genreTagsHtml = genresList.map(g => `<span class="genre-tag">${g}</span>`).join('');
        
        // Use avg_rating if available, otherwise a placeholder
        const ratingText = movie.avg_rating ? `${movie.avg_rating} Rating` : '98% Match';

        const isFav = favoriteMovieIds.has(movie.movieId);
        const heartIcon = isFav ? '❤️' : '♡';

        card.innerHTML = `
            <div class="movie-poster-placeholder">
                ${randomEmoji}
                <button class="fav-btn" onclick="toggleFavorite(event, ${movie.movieId})" title="Toggle Favorite">${heartIcon}</button>
            </div>
            <div class="movie-info">
                <div>
                    <h3 class="movie-title">${movie.title}</h3>
                    <div class="movie-genres">${genreTagsHtml}</div>
                </div>
                <div class="movie-rating">
                    <span style="color: gold;">★</span> ${ratingText}
                </div>
            </div>
        `;
        
        // Add click listener to record view
        card.addEventListener('click', () => {
            recordView(movie.movieId);
            // Visual feedback
            card.style.opacity = '0.7';
            setTimeout(() => card.style.opacity = '1', 200);
        });
        
        movieGrid.appendChild(card);
    });
}

// Event Listeners
getMoviesBtn.addEventListener('click', () => fetchMovies('all'));
genreSelect.addEventListener('change', () => fetchMovies('all'));
viewFavoritesBtn.addEventListener('click', () => {
    genreSelect.value = ""; 
    fetchMovies('favorites');
});
viewRecentBtn.addEventListener('click', () => {
    genreSelect.value = ""; 
    fetchMovies('recent');
});

// --- Recently Viewed Logic ---
async function recordView(movieId) {
    const userId = localStorage.getItem('movieUserId');
    if (!userId) return; // Only track for logged-in users

    try {
        await fetch(`${API_BASE_URL}/viewed`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, movie_id: movieId })
        });
    } catch (e) {
        console.error("Failed to record view", e);
    }
}

// --- Favorites Logic ---
async function toggleFavorite(event, movieId) {
    event.stopPropagation(); // Prevent card click if any
    const userId = localStorage.getItem('movieUserId');
    if (!userId) {
        alert("Please sign in to add favorites!");
        return;
    }

    const btn = event.target;
    const isFav = favoriteMovieIds.has(movieId);
    const method = isFav ? 'DELETE' : 'POST';

    try {
        btn.style.transform = "scale(1.2)";
        
        const res = await fetch(`${API_BASE_URL}/favorite`, {
            method: method,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, movie_id: movieId })
        });
        
        const data = await res.json();
        
        if (data.success) {
            if (isFav) {
                // Successfully removed
                favoriteMovieIds.delete(movieId);
                btn.innerHTML = "♡";
                // If we are currently on the Favorites page, remove the card dynamically
                if (isViewingFavorites) {
                    btn.closest('.movie-card').remove();
                    // If grid is now empty, show empty message
                    if (movieGrid.children.length === 0) {
                        renderMovies([]);
                    }
                }
            } else {
                // Successfully added
                favoriteMovieIds.add(movieId);
                btn.innerHTML = "❤️";
            }
            setTimeout(() => { btn.style.transform = "scale(1)"; }, 200);
        } else {
            alert(data.error || "Failed to update favorite");
            btn.style.transform = "scale(1)";
        }
    } catch (e) {
        alert("Network error.");
    }
}

// --- Auth Logic ---
const authBtn = document.getElementById('auth-btn');

authBtn.addEventListener('click', async () => {
    if (currentUser) {
        // Sign Out from Backend
        try {
            await fetch(`${API_BASE_URL}/logout`, { 
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            console.error('Logout error', e);
        }
        
        currentUser = null;
        localStorage.removeItem('movieUser');
        localStorage.removeItem('movieUserId');
        window.location.href = 'login.html'; 
    } else {
        window.location.href = 'login.html';
    }
});

function updateAuthUI() {
    if (currentUser) {
        authBtn.textContent = 'Sign Out';
        authBtn.style.backgroundColor = 'var(--primary-color)';
        authBtn.style.color = 'white';
        viewFavoritesBtn.classList.remove('hidden');
        viewRecentBtn.classList.remove('hidden');
        
        if (!document.getElementById('greeting')) {
            const greeting = document.createElement('div');
            greeting.id = 'greeting';
            greeting.className = 'user-greeting';
            greeting.textContent = `Hi, ${currentUser}`;
            authBtn.parentNode.insertBefore(greeting, authBtn);
        } else {
            document.getElementById('greeting').textContent = `Hi, ${currentUser}`;
        }
    } else {
        authBtn.textContent = 'Sign In';
        authBtn.style.backgroundColor = 'transparent';
        authBtn.style.color = 'var(--primary-color)';
        viewFavoritesBtn.classList.add('hidden');
        viewRecentBtn.classList.add('hidden');
        if (document.getElementById('greeting')) {
            document.getElementById('greeting').remove();
        }
    }
}

// Initialization on load
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('movieUser');
    if (savedUser) {
        currentUser = savedUser;
        updateAuthUI();
    }
    fetchMovies('all');
});
