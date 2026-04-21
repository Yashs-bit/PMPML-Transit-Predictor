from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import Bcrypt
import joblib
import os
import requests
import sqlite3

app = Flask(__name__)

# ─── JWT & Security Configuration ─────────────────────────────────────────────
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'pmpml-super-secret-jwt-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # Tokens don't expire during dev

jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# Allow cross-origin requests from the React frontend, including Authorization header
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# ─── SQLite Database Setup ─────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), 'users.db')

def init_db():
    """Create the users table if it doesn't already exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT    NOT NULL UNIQUE,
            email    TEXT    NOT NULL UNIQUE,
            password TEXT    NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# ─── Auth Routes ───────────────────────────────────────────────────────────────

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON payload.'}), 400

    username = data.get('username', '').strip()
    email    = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required.'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters.'}), 400

    hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')

    conn = sqlite3.connect(DB_PATH, timeout=10, check_same_thread=False)
    try:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            (username, email, hashed_pw)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username or email already exists.'}), 409
    finally:
        conn.close()

    # Auto-login: issue a token immediately after successful registration
    access_token = create_access_token(identity=username)
    return jsonify({'access_token': access_token, 'username': username}), 201


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON payload.'}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    conn = sqlite3.connect(DB_PATH, timeout=10, check_same_thread=False)
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT password FROM users WHERE username = ?', (username,))
        row = cursor.fetchone()
    finally:
        conn.close()

    if row is None or not bcrypt.check_password_hash(row[0], password):
        return jsonify({'error': 'Invalid username or password.'}), 401

    access_token = create_access_token(identity=username)
    return jsonify({'access_token': access_token, 'username': username}), 200


# ─── ML Model ─────────────────────────────────────────────────────────────────
model_path = 'model.pkl'

def load_model():
    if os.path.exists(model_path):
        return joblib.load(model_path)
    return None

model = load_model()
if model is None:
    print("Warning: model.pkl not found. Predictions will not work until the model is trained.")


# ─── Protected Predict Route ───────────────────────────────────────────────────
@app.route('/predict', methods=['POST'])
@jwt_required()
def predict():
    global model
    if model is None:
        model = load_model()
        if model is None:
            return jsonify({'error': 'Model not found. Please train the model first.'}), 500

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON payload provided.'}), 400

    # Ensure all required keys are present
    required_keys = ['stop_id_from', 'stop_id_to', 'Hour_of_day']
    for key in required_keys:
        if key not in data:
            return jsonify({'error': f'Missing key: {key}'}), 400

    try:
        stop_id_from = int(data['stop_id_from'])
        stop_id_to   = int(data['stop_id_to'])
        hour_of_day  = int(data['Hour_of_day'])
    except ValueError:
        return jsonify({'error': 'All input values must be numeric.'}), 400

    # Frequency Lookup Dictionary
    frequency_map = {
        (36156, 38709): 9,
        (36156, 2052): 12
    }
    
    number_of_trips = frequency_map.get((stop_id_from, stop_id_to), 5)

    # --- ML 5-Hour Trend Prediction ---
    hourly_trend = []
    current_prediction = None
    
    try:
        for offset in range(5):
            target_hour = (hour_of_day + offset) % 24
            features = [[stop_id_from, stop_id_to, target_hour, number_of_trips]]
            pred = model.predict(features)[0]
            
            hour_str = '12 AM' if target_hour == 0 else f'{target_hour} AM' if target_hour < 12 else '12 PM' if target_hour == 12 else f'{target_hour - 12} PM'
            
            if offset == 0:
                current_prediction = pred
                
            hourly_trend.append({
                "hour": hour_str,
                "congestion": pred
            })
            
    except Exception as e:
        return jsonify({'error': f'Error during prediction: {str(e)}'}), 500
    # ----------------------------------
        
    # --- Live IUDX API Fetch ---
    live_status = "No live data available from IUDX right now"
    try:
        iudx_url = "https://rs.iudx.org.in/ngsi-ld/v1/entities"
        params = {
            "id": "datakaveri.org/f7e044eee8122b5c88d767acf4ee430ee4410dea/rs.iudx.org.in/pune-smart-city/live-buses",
            "q": f'stop_id=={stop_id_from}'
        }
        res = requests.get(iudx_url, params=params, timeout=3)
        if res.status_code == 200:
            res_data = res.json()
            if 'results' in res_data and len(res_data['results']) > 0:
                first_bus = res_data['results'][0]
                speed = first_bus.get('speed', 'unknown')
                live_status = f"Bus found running at {speed} km/h"
    except Exception as e:
        print(f"IUDX API fetch error: {e}")
    # ---------------------------

    # --- Live Weather Impact Fetch ---
    is_raining = False
    weather_alert = "☀️ Live Weather: Clear skies, normal transit conditions apply."
    try:
        weather_url = "https://api.open-meteo.com/v1/forecast?latitude=18.5204&longitude=73.8567&current_weather=true"
        weather_res = requests.get(weather_url, timeout=2)
        if weather_res.status_code == 200:
            weather_data = weather_res.json()
            if 'current_weather' in weather_data and 'weathercode' in weather_data['current_weather']:
                weathercode = weather_data['current_weather']['weathercode']
                if (51 <= weathercode <= 67) or (80 <= weathercode <= 82):
                    is_raining = True
                    weather_alert = "🌧️ Live Weather Alert: It is currently raining in Pune. Expect 15-20% slower transit times."
    except Exception as e:
        print(f"Open-Meteo API fetch error: {e}")
    # ---------------------------------

    return jsonify({
        "current_prediction": current_prediction,
        "hourly_trend": hourly_trend,
        "live_status": live_status,
        "weather_alert": weather_alert,
        "is_raining": is_raining
    })


if __name__ == '__main__':
    # use_reloader=False prevents the Werkzeug reloader from spawning a second
    # process that would race on the SQLite file and cause 'database is locked'.
    app.run(port=5000, debug=True, use_reloader=False)
