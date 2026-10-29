"""Download UCI measurements and create a reproducible, causal 15-minute series."""
import hashlib
import json
import urllib.request
import zipfile
from datetime import datetime, timezone
import pandas as pd
from backend.app.config import DATA

URL = 'https://archive.ics.uci.edu/static/public/235/individual+household+electric+power+consumption.zip'

def prepare():
    raw = DATA / 'raw'
    raw.mkdir(exist_ok=True)
    archive = raw / 'household.zip'
    if not archive.exists():
        print('Downloading original UCI archive...', flush=True)
        urllib.request.urlretrieve(URL, archive)
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    with zipfile.ZipFile(archive) as z:
        with z.open('household_power_consumption.txt') as f:
            frame = pd.read_csv(f, sep=';', usecols=['Date', 'Time', 'Global_active_power'], na_values=['?', ''])
    index = pd.to_datetime(frame.Date + ' ' + frame.Time, format='%d/%m/%Y %H:%M:%S')
    series = pd.Series(pd.to_numeric(frame.Global_active_power, errors='coerce').to_numpy(), index=index)
    series = series[~series.index.duplicated()].sort_index()
    bins = series.resample('15min').agg(['mean', 'count'])
    # Fixed complete-day subset: one year, small enough for a laptop demo.
    bins = bins.loc['2009-11-25':'2010-11-25 23:45']
    bins['imputed'] = bins['count'] < 15
    # Forward fill only: no future value is used, including across split boundaries.
    bins['kw'] = bins['mean'].ffill()
    bins = bins.dropna(subset=['kw'])
    bins.index.name = 'timestamp'
    output = DATA / 'household_15min.csv.gz'
    bins[['kw', 'imputed']].to_csv(output, float_format='%.7f', compression={'method':'gzip','mtime':0})
    meta = {
        'title': 'Individual Household Electric Power Consumption',
        'authors': 'Georges Hebrail and Alice Berard',
        'url': 'https://archive.ics.uci.edu/dataset/235/individualhouseholdelectricpowerconsumption',
        'doi': '10.24432/C58K54', 'license': 'CC BY 4.0', 'download_url': URL,
        'download_sha256': checksum, 'processed_sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
        'retrieved_at': datetime.now(timezone.utc).isoformat(),
        'location': 'One household in Sceaux, France; NOT measured Pune city demand',
        'unit': 'kW', 'native_interval_minutes': 15, 'original_interval_minutes': 1,
        'start': str(bins.index[0]), 'end': str(bins.index[-1]), 'rows': len(bins),
        'partially_or_fully_missing_bins': int(bins.imputed.sum()),
        'processing': '15-minute mean of available measurements; empty bins forward-filled causally. Any target window with incomplete bins is excluded from evaluation. No city measurements are claimed.'
    }
    (DATA / 'provenance.json').write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta, indent=2), flush=True)

if __name__ == '__main__':
    prepare()
