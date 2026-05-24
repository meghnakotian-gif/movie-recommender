import pandas as pd
import mysql.connector
import os

# Configuration
# Resolves the path to the data folder relative to this script's location
CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'movie.csv')

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',          # Update with your MySQL username
    'password': 'meghna_SQL_03',  # Update with your MySQL password
    'database': 'movie_db'   # Ensure this database and table already exist
}

def load_and_clean_data(file_path):
    print(f"Loading data from {file_path}...")
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Error: Could not find {file_path}")
        exit(1)
        
    # 2. Clean missing values
    initial_rows = len(df)
    # Drop rows where essential columns are NaN
    df.dropna(subset=['movieId', 'title', 'genres'], inplace=True)
    
    # Optional: Fill empty genres with a placeholder if you don't want to drop them entirely
    # df['genres'].fillna('(no genres listed)', inplace=True)
    
    print(f"Cleaned data: removed {initial_rows - len(df)} rows with missing values.")
    
    # Ensure correct data types to prevent SQL errors
    df['movieId'] = df['movieId'].astype(int)
    df['title'] = df['title'].astype(str)
    df['genres'] = df['genres'].astype(str)
    
    return df

def batch_insert_movies(df, db_config):
    try:
        print("Connecting to MySQL...")
        # 3. Connect to MySQL database
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # Prepare data as a list of tuples for batch processing
        records_to_insert = [tuple(x) for x in df[['movieId', 'title', 'genres']].to_numpy()]
        
        # SQL query using parameterized inputs to prevent SQL injection
        # Uses ON DUPLICATE KEY UPDATE to handle re-runs gracefully
        insert_query = """
        INSERT INTO movies (movieId, title, genres) 
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE 
            title = VALUES(title), 
            genres = VALUES(genres);
        """
        
        print(f"Starting batch insert for {len(records_to_insert)} records...")
        
        # 5. Use batch insert for performance
        # We chunk the data to prevent overwhelming the MySQL server's max_allowed_packet limit
        batch_size = 5000
        for i in range(0, len(records_to_insert), batch_size):
            batch = records_to_insert[i:i+batch_size]
            cursor.executemany(insert_query, batch)
            conn.commit()
            print(f"Inserted {min(i + batch_size, len(records_to_insert))}/{len(records_to_insert)} records...")
            
        print("Data successfully inserted into the movies table!")

    except mysql.connector.Error as err:
        print(f"Database Error: {err}")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        # Ensure the connection is always closed
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()
            print("MySQL connection closed.")

if __name__ == "__main__":
    cleaned_df = load_and_clean_data(CSV_PATH)
    batch_insert_movies(cleaned_df, DB_CONFIG)
