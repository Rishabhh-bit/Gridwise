import json
from backend.app.config import DATA
from backend.app.weather import fetch_weather

if __name__=='__main__':
    snapshot=fetch_weather()
    (DATA/'weather_snapshot.json').write_text(json.dumps(snapshot,indent=2))
    print('Saved Open-Meteo snapshot:',snapshot['retrieved_at'],snapshot['payload']['hourly']['time'][0])
