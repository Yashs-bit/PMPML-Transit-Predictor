import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

data_path = '../data/pmpml_data.csv'
model_path = 'model.pkl'

def train_model():
    try:
        print("Loading data...")
        df = pd.read_csv(data_path)
        
        # Convert arrival_time to datetime and extract Hour_of_day
        print("Preprocessing data...")
        df['arrival_time'] = pd.to_datetime(df['arrival_time'])
        df['Hour_of_day'] = df['arrival_time'].dt.hour
        
        # Define features and target
        features = ['stop_id_from', 'stop_id_to', 'Hour_of_day', 'Number_of_trips']
        target = 'Degree_of_congestion'
        
        X = df[features]
        y = df[target]
        
        # Train RandomForestClassifier
        print("Training model...")
        clf = RandomForestClassifier(random_state=42)
        clf.fit(X, y)
        
        # Save the model
        joblib.dump(clf, model_path)
        print(f"Model saved successfully to {model_path}")
        
    except FileNotFoundError:
        print(f"Error: The dataset was not found at {data_path}. Please place the CSV file there.")
    except Exception as e:
        print(f"An error occurred during training: {e}")

if __name__ == '__main__':
    train_model()
