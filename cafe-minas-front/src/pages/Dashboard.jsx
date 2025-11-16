import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../index.css";
import { useState } from "react";

export default function Dashboard() {
  const metrics = [
    { name: "Temperatura", value: "23°C", icon: "🌡️" },
    { name: "Umidade", value: "72%", icon: "💧" },
    { name: "NDVI", value: "0.73", icon: "🌿" },
    { name: "NDVE", value: "0.68", icon: "🌱" },
    { name: "Densidade do plantio", value: "Baixa", icon: "🌾" },
  ];

  const [layers, setLayers] = useState({
    fazendas: true,
    temperatura: false,
    ndvi: false,
    umidade: false,
  });

  const toggleLayer = (layer) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // 🔹 GeoJSON simulado (fazendas)
  const fazendasGeoJson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "Fazenda São José" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-45.155, -22.11],
              [-45.145, -22.11],
              [-45.145, -22.12],
              [-45.155, -22.12],
              [-45.155, -22.11],
            ],
          ],
        },
      },
    ],
  };

  // 🔹 GeoJSON simulado (temperatura)
  const temperaturaGeoJson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { temp: 28 },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-45.165, -22.105],
              [-45.135, -22.105],
              [-45.135, -22.125],
              [-45.165, -22.125],
              [-45.165, -22.105],
            ],
          ],
        },
      },
    ],
  };

  return (
    <div className="layout">
      {/* === Barra lateral esquerda (só leitura) === */}
      <div className="floating-left readonly">
        {metrics.map((m) => (
          <div key={m.name} className="metric-float readonly-item">
            <div className="metric-icon">{m.icon}</div>
            <div className="metric-value">{m.value}</div>
            <div className="metric-name">{m.name}</div>
          </div>
        ))}
      </div>

      {/* === Mapa central === */}
      <MapContainer
        center={[-22.1176, -45.1314]}
        zoom={13}
        className="map"
      >
        {/* Base map */}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Camada: fazendas */}
        {layers.fazendas && (
          <GeoJSON
            data={fazendasGeoJson}
            style={{
              color: "#22c55e",
              weight: 2,
              fillColor: "#22c55e",
              fillOpacity: 0.3,
            }}
          />
        )}

        {/* Camada: temperatura */}
        {layers.temperatura && (
          <GeoJSON
            data={temperaturaGeoJson}
            style={{
              color: "#ef4444",
              weight: 1,
              fillColor: "#ef4444",
              fillOpacity: 0.5,
            }}
          />
        )}
      </MapContainer>

      {/* === Painel direito === */}
      <div className="floating-right">
        <h3>DADOS HISTÓRICOS</h3>
        <div className="history-list">
          {metrics.map((m) => (
            <div key={m.name} className="history-card">
              {m.icon} {m.name}
            </div>
          ))}
        </div>
      </div>

      {/* === Barra inferior de controle das tiles === */}
      <div className="toolbar">
        <button
          className={`tool-btn ${layers.fazendas ? "active" : ""}`}
          onClick={() => toggleLayer("fazendas")}
        >
          🟩 Fazendas
        </button>
        <button
          className={`tool-btn ${layers.temperatura ? "active" : ""}`}
          onClick={() => toggleLayer("temperatura")}
        >
          🌡️ Temperatura
        </button>
        <button
          className={`tool-btn ${layers.ndvi ? "active" : ""}`}
          onClick={() => toggleLayer("ndvi")}
        >
          🌿 NDVI
        </button>
        <button
          className={`tool-btn ${layers.umidade ? "active" : ""}`}
          onClick={() => toggleLayer("umidade")}
        >
          💧 Umidade
        </button>
      </div>
    </div>
  );
}
