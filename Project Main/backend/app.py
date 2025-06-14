from flask import Flask, request, jsonify
import joblib
import datetime
import requests
import pandas as pd
import numpy as np
import folium
import openrouteservice
from flask import send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


api_key = '5b3ce3597851110001cf62482e5b14280ed545639df4b9a6a25343f5'
client = openrouteservice.Client(key=api_key)
model = joblib.load('lightgbm_model.pkl')


@app.route('/map')
def serve_map():
    return app.send_static_file('congestion_alternate_routes_map.html')

def extract_datetime_features(dt_str):
    dt = datetime.datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
    hour = dt.hour
    day_of_week = dt.weekday()
    is_weekend = int(day_of_week >= 5)
    is_rush_hour = int((7 <= hour <= 9) or (16 <= hour <= 18))
    return hour, day_of_week, is_weekend, is_rush_hour

def get_weather_features(lat, lon, dt_str):
    dt = datetime.datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
    timestamp = int(dt.timestamp())
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}&hourly=temperature_2m,visibility,precipitation_probability,weathercode"
        f"&start={timestamp}&end={timestamp}&timezone=UTC"
    )
    response = requests.get(url)
    if response.status_code == 200:
        try:
            data = response.json()
            idx = 0
            temp = data['hourly']['temperature_2m'][idx]
            vis_km = data['hourly']['visibility'][idx] / 1000
            precip = data['hourly']['precipitation_probability'][idx]
            weather_code = data['hourly']['weathercode'][idx]
            return {
                "Temperature(F)": temp * 9 / 5 + 32,
                "Visibility(mi)": vis_km * 0.621371,
                "Precipitation(in)": precip * 0.0393701,
                "Weather_Conditions": weather_code
            }
        except Exception:
            pass
    return {
        "Temperature(F)": 68.0,
        "Visibility(mi)": 10.0,
        "Precipitation(in)": 0.0,
        "Weather_Conditions": 0
    }

def get_color(pred):
    return {1: 'green', 2: 'orange', 3: 'red'}.get(pred, 'gray')

@app.route('/generate-map', methods=['POST'])
def generate_map():
    data = request.get_json()

    start_coords = (data['start_lat'], data['start_lng'])
    end_coords = (data['end_lat'], data['end_lng'])
    datetime_input = data['datetime']

    # Step 1: Get Routes
    routes_response = client.directions(
        coordinates=[start_coords[::-1], end_coords[::-1]],
        profile='driving-car',
        format='geojson',
        optimize_waypoints=False,
        alternative_routes={'share_factor': 0.6, 'target_count': 2}
    )

    m = folium.Map(location=start_coords, zoom_start=13)
    hour, day_of_week, is_weekend, is_rush_hour = extract_datetime_features(datetime_input)
    route_stats = []

    for r_idx, route in enumerate(routes_response['features']):
        coords = route['geometry']['coordinates']
        latlon_coords = [(lat, lon) for lon, lat in coords]
        route_distance = route['properties']['segments'][0]['distance'] * 0.000621371

        predictions = []
        segment_coords = []

        for i in range(0, len(latlon_coords) - 1, 2):
            lat, lon = latlon_coords[i]
            segment_coords.append((lat, lon))

            weather = get_weather_features(lat, lon, datetime_input)

            input_data = pd.DataFrame([{
                'Start_Lat': lat,
                'Start_Lng': lon,
                'Distance(mi)': route_distance,
                'Temperature(F)': weather['Temperature(F)'],
                'Visibility(mi)': weather['Visibility(mi)'],
                'Precipitation(in)': weather['Precipitation(in)'],
                'Weather_Conditions': weather['Weather_Conditions'],
                'hour': hour,
                'day_of_week': day_of_week,
                'is_weekend': is_weekend,
                'is_rush_hour': is_rush_hour
            }])
            input_data['Weather_Conditions'] = input_data['Weather_Conditions'].astype('category')
            pred_probs = model.predict(input_data)
            pred_class = int(np.argmax(pred_probs, axis=1)[0])
            predictions.append(pred_class)

        avg_congestion = sum(predictions) / len(predictions)
        route_stats.append({
            'route_index': r_idx,
            'avg_congestion': avg_congestion,
            'distance': route_distance,
            'center_point': segment_coords[len(segment_coords) // 2],
            'latlon_coords': latlon_coords
        })

        for i in range(len(segment_coords) - 1):
            folium.PolyLine(
                [segment_coords[i], segment_coords[i + 1]],
                color=get_color(predictions[i]),
                weight=6,
                tooltip=f"Route {r_idx+1} - Congestion Level: {predictions[i]}"
            ).add_to(m)

    best_route = sorted(route_stats, key=lambda x: (x['avg_congestion'], x['distance']))[0]

    folium.Marker(
        best_route['center_point'],
        popup=folium.Popup(
            f"<b>Best Route</b><br>Avg Congestion: {best_route['avg_congestion']:.2f}<br>Distance: {best_route['distance']:.2f} mi",
            max_width=250
        ),
        icon=folium.Icon(color='green', icon='star')
    ).add_to(m)

    folium.Marker(best_route['latlon_coords'][-1], popup="Destination", icon=folium.Icon(color='red')).add_to(m)

    m.save(r"D:\6th Semester\ML\Project Main\backend\static\congestion_alternate_routes_map.html")
    return jsonify({"status": "success", "message": "Map generated"}), 200

if __name__ == '__main__':
    app.run(debug=True)
