import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

def generate_mock_data(num_samples=1000):
    stop_ids = [101, 102, 103, 104, 205, 301, 405]
    congestions = ['Low', 'Moderate', 'Heavy']

    data = []
    base_time = datetime.now() - timedelta(days=30)
    
    for _ in range(num_samples):
        stop_id_from = random.choice(stop_ids)
        stop_id_to = random.choice([s for s in stop_ids if s != stop_id_from])
        arrival_time = base_time + timedelta(
            days=random.randint(0, 30),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59)
        )
        number_of_trips = random.randint(1, 10)
        
        # Simple logic: more trips or specific hours (rush hour 8-10, 17-19) increase congestion probability
        hour = arrival_time.hour
        is_rush_hour = 8 <= hour <= 10 or 17 <= hour <= 19
        
        if is_rush_hour and number_of_trips > 5:
            congestion = random.choices(congestions, weights=[0.1, 0.3, 0.6])[0]
        elif not is_rush_hour and number_of_trips < 3:
            congestion = random.choices(congestions, weights=[0.7, 0.2, 0.1])[0]
        else:
            congestion = random.choices(congestions, weights=[0.3, 0.5, 0.2])[0]
            
        data.append({
            'stop_id_from': stop_id_from,
            'stop_id_to': stop_id_to,
            'arrival_time': arrival_time.strftime('%Y-%m-%d %H:%M:%S'),
            'Number_of_trips': number_of_trips,
            'Degree_of_congestion': congestion
        })
        
    df = pd.DataFrame(data)
    df.to_csv('../data/pmpml_data.csv', index=False)
    print("Mock data generated at ../data/pmpml_data.csv")

if __name__ == '__main__':
    generate_mock_data()
