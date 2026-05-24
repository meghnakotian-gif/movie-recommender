from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)
# Enable CORS for frontend integration
CORS(app) 

# Database Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'meghna_SQL_03', # Assuming the same password as the import script
    'database': 'movie_db'
}

def get_db_connection():
    """Establish and return a MySQL connection"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"Database connection error: {e}")
        return None

@app.route('/')
def index():
    return jsonify({
        "status": "online",
        "message": "Welcome to the Movie Recommender API!",
        "endpoints": {
            "all_movies": "/movies",
            "filter_by_genre": "/movies?genre=Action",
            "top_rated": "/top"
        }
    }), 200

@app.route('/movies', methods=['GET'])
def get_movies():
    """
    1. GET /movies -> all movies (limited to 100 to prevent massive payloads)
    2. GET /movies?genre=Action -> filter by genre
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Failed to connect to database'}), 500
        
    cursor = conn.cursor(dictionary=True)
    genre_filter = request.args.get('genre')
    
    try:
        if genre_filter:
            # We use LIKE here. If you used the FULLTEXT index from earlier, 
            # you could also use: MATCH(genres) AGAINST(%s IN BOOLEAN MODE)
            query = "SELECT * FROM movies WHERE genres LIKE %s LIMIT 100"
            search_pattern = f"%{genre_filter}%"
            cursor.execute(query, (search_pattern,))
        else:
            query = "SELECT * FROM movies LIMIT 100"
            cursor.execute(query)
            
        movies = cursor.fetchall()
        return jsonify(movies), 200
        
    except Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/top', methods=['GET'])
def get_top_movies():
    """
    3. GET /top -> top rated movies
    This assumes you have created the `ratings` table as discussed earlier.
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Failed to connect to database'}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Join movies with ratings, calculate average, and filter for movies with a minimum number of ratings
        query = """
            SELECT 
                m.movieId, 
                m.title, 
                m.genres, 
                ROUND(AVG(r.rating), 2) as avg_rating, 
                COUNT(r.rating) as num_ratings
            FROM movies m
            JOIN ratings r ON m.movieId = r.movieId
            GROUP BY m.movieId, m.title, m.genres
            HAVING num_ratings >= 50  -- Only consider movies with at least 50 ratings
            ORDER BY avg_rating DESC
            LIMIT 20
        """
        cursor.execute(query)
        top_movies = cursor.fetchall()
        return jsonify(top_movies), 200
        
    except Error as e:
        # Catch errors gracefully (e.g. if the ratings table doesn't exist yet)
        return jsonify({
            'error': str(e),
            'message': 'Make sure the ratings table is created and populated with data.'
        }), 500
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    # Run the server on port 5000
    app.run(debug=True, port=5000)
