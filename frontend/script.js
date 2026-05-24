const API_BASE_URL = 'http://127.0.0.1:5000';
const movieGrid = document.getElementById('movie-grid');
const getMoviesBtn = document.getElementById('get-movies-btn');
const genreSelect = document.getElementById('genre-select');
const loadingIndicator = document.getElementById('loading');

// Emojis for poster placeholders
const movieEmojis = ['🎬', '🍿', '🎥', '🎞️', '⭐', '🎭', '📽️', '📺'];

async function fetchMovies() {
    // Clear grid and show loading
    movieGrid.innerHTML = '';
    loadingIndicator.classList.remove('hidden');

    const selectedGenre = genreSelect.value;
    let endpoint = `${API_BASE_URL}/movies`;
    
    if (selectedGenre) {
        endpoint += `?genre=${selectedGenre}`;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        
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
                <p>Try selecting a different genre.</p>
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
        
        // Use avg_rating if available (from /top), otherwise a placeholder or 'New'
        const ratingText = movie.avg_rating ? `${movie.avg_rating} Rating` : '98% Match';

        card.innerHTML = `
            <div class="movie-poster-placeholder">${randomEmoji}</div>
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
        
        movieGrid.appendChild(card);
    });
}

// Event Listeners
getMoviesBtn.addEventListener('click', fetchMovies);
genreSelect.addEventListener('change', fetchMovies); 

// --- Auth Logic ---
const authBtn = document.getElementById('auth-btn');
const authModal = document.getElementById('auth-modal');
const closeModal = document.getElementById('close-modal');
const authForm = document.getElementById('auth-form');
const toggleAuthLink = document.getElementById('toggle-auth-link');
const toggleAuthText = document.getElementById('toggle-auth-text');
const modalTitle = document.getElementById('modal-title');
const submitAuthBtn = document.getElementById('submit-auth-btn');
const authError = document.getElementById('auth-error');

let isLoginMode = true;
let currentUser = null;

authBtn.addEventListener('click', () => {
    if (currentUser) {
        // Sign Out
        currentUser = null;
        localStorage.removeItem('movieUser');
        // Redirect to standalone login page after signing out
        window.location.href = 'login.html'; 
    } else {
        // Redirect to standalone login page to sign in
        window.location.href = 'login.html';
    }
});

closeModal.addEventListener('click', () => {
    authModal.classList.add('hidden');
    authError.classList.add('hidden');
    authForm.reset();
});

toggleAuthLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    authError.classList.add('hidden');
    
    if (isLoginMode) {
        modalTitle.textContent = 'Sign In';
        submitAuthBtn.textContent = 'Sign In';
        toggleAuthText.textContent = 'New to Netflix Clone?';
        toggleAuthLink.textContent = 'Sign up now.';
    } else {
        modalTitle.textContent = 'Sign Up';
        submitAuthBtn.textContent = 'Sign Up';
        toggleAuthText.textContent = 'Already have an account?';
        toggleAuthLink.textContent = 'Sign in.';
    }
});

// Handle Auth Form Submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    authError.classList.add('hidden');
    submitAuthBtn.disabled = true;
    submitAuthBtn.textContent = 'Please wait...';

    const endpoint = isLoginMode ? '/login' : '/register';
    
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            if (isLoginMode) {
                // Successful Login
                currentUser = data.username || username;
                localStorage.setItem('movieUser', currentUser);
                updateAuthUI();
                authModal.classList.add('hidden');
                authForm.reset();
            } else {
                // Successful Register -> Auto switch to Login
                isLoginMode = true;
                modalTitle.textContent = 'Sign In';
                submitAuthBtn.textContent = 'Sign In';
                toggleAuthText.textContent = 'New to Netflix Clone?';
                toggleAuthLink.textContent = 'Sign up now.';
                
                authError.textContent = 'Registration successful! Please sign in.';
                authError.style.color = '#46d369';
                authError.style.background = 'rgba(70, 211, 105, 0.1)';
                authError.classList.remove('hidden');
                document.getElementById('password').value = ''; // clear password
            }
        } else {
            showError(data.error || 'Authentication failed');
        }
    } catch (err) {
        showError('Network error. Backend might be down.');
    } finally {
        submitAuthBtn.disabled = false;
        if (!isLoginMode && document.getElementById('password').value === '') {
            submitAuthBtn.textContent = 'Sign In'; 
        } else {
            submitAuthBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
        }
    }
});

function showError(msg) {
    authError.textContent = msg;
    authError.style.color = 'var(--primary-color)';
    authError.style.background = 'rgba(229, 9, 20, 0.1)';
    authError.classList.remove('hidden');
}

function updateAuthUI() {
    if (currentUser) {
        authBtn.textContent = 'Sign Out';
        authBtn.style.backgroundColor = 'var(--primary-color)';
        authBtn.style.color = 'white';
        
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
        if (document.getElementById('greeting')) {
            document.getElementById('greeting').remove();
        }
    }
}

// Initialization on load
document.addEventListener('DOMContentLoaded', () => {
    fetchMovies();
    const savedUser = localStorage.getItem('movieUser');
    if (savedUser) {
        currentUser = savedUser;
        updateAuthUI();
    }
});
