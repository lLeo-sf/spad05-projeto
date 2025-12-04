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

with open('Json/clima_SigefFinal_Fazendas.geojson', encoding='utf-8') as f:
    data = json.load(f)

for feature in data['features']:
    props = feature['properties']
    area_id = props['area_id']
    data_clima = props['data']
    temperatura = props['temperatura']
    umidade = props['umidade']
    cur.execute("""
        INSERT INTO Clima_fazendas_sigef_final (area_id, data, temperatura, umidade)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT DO NOTHING;
    """, (area_id, data_clima, temperatura, umidade))

conn.commit()
cur.close()
conn.close()
print("Dados inseridos com sucesso!")