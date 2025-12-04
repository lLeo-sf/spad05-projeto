import os
import json
import psycopg2
from dotenv import load_dotenv

load_dotenv('.env')

DB_USER = os.getenv('user')
DB_PASSWORD = os.getenv('senha')
DB_HOST = os.getenv('host')
DB_PORT = os.getenv('port')
DB_NAME = os.getenv('database')

conn = psycopg2.connect(
    dbname=DB_NAME,
    user=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT
)
cur = conn.cursor()

with open('Json/ndvi_SigefFinal_2021_2023.geojson', encoding='utf-8') as f:
    data = json.load(f)

for feature in data['features']:
    props = feature['properties']
    area_id = props['area_id']
    data_clima = props['data']
    ndvi = props['ndvi']
    if ndvi is not None:
        cur.execute("""
            UPDATE clima_fazendas_sigef_final
            SET ndvi = %s
            WHERE area_id = %s AND data = %s
        """, (ndvi, area_id, data_clima))

conn.commit()
cur.close()
conn.close()
print("Coluna NDVI atualizada com sucesso!")