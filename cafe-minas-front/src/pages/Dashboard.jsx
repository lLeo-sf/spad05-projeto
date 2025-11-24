import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../index.css";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);


export default function Dashboard() {
  // === METRICAS ORIGINAIS (mantidas) ===
  const [metrics, setMetrics] = useState([
    { name: "Temperatura", value: "23°C", icon: "🌡️" },
    { name: "Umidade", value: "72%", icon: "💧" },
  ]);

  // === Historico da direita ===
  const [climaHistorico, setClimaHistorico] = useState([]);

  // === state para as layers ===
  const [layers, setLayers] = useState({
    cafes: true,
    clima: false,
  });

  const [cafesGeoJson, setCafesGeoJson] = useState(null);
  const [climaGeoJson, setClimaGeoJson] = useState(null);

  useEffect(() => {
    fetch("/clima_carmo_de_minas (1).csv")
      .then((res) => res.text())
      .then((text) => {
        const linhas = text.split(/\r?\n/).slice(1);

        const historico = linhas
          .map((l) => {
            if (!l.trim()) return null;

            // separa por vírgula e remove aspas
            const cols = l
              .split(",")
              .map(c => c.trim().replace(/"/g, "").replace("\ufeff", ""));

            const data = cols[2];
            const temperatura = parseFloat(cols[3]);
            const umidade = parseFloat(cols[4]);

            if (isNaN(temperatura) || isNaN(umidade)) {
              console.warn("Linha ignorada:", cols);
              return null;
            }

            return { data, temperatura, umidade };
          })
          .filter(Boolean);

        setClimaHistorico(historico);

        const atual = historico[historico.length - 1];

        // Atualiza temperatura e umidade dos cards
        setMetrics((prev) =>
          prev.map((m) => {
            if (m.name === "Temperatura")
              return { ...m, value: atual?.temperatura.toFixed(1) + "°C" };
            if (m.name === "Umidade")
              return { ...m, value: atual?.umidade.toFixed(1) + "%" };
            return m;
          })
        );
      });
  }, []);


  // === WFS: Fazendas ===
  useEffect(() => {
    fetch(
      "http://localhost:8080/geoserver/ne/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ne:Cafes_CarmoDeMinas&outputFormat=application/json"
    )
      .then((res) => res.json())
      .then((data) => setCafesGeoJson(data))
      .catch((err) => console.error("Erro ao carregar Cafes_CarmoDeMinas:", err));
  }, []);

  // === WFS: Clima ===
  useEffect(() => {
    fetch(
      "http://localhost:8080/geoserver/ne/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=ne:clima_carmo_de_minas_geom&outputFormat=application/json"
    )
      .then((res) => res.json())
      .then((data) => setClimaGeoJson(data))
      .catch((err) => console.error("Erro ao carregar clima:", err));
  }, []);

  const toggleLayer = (layer) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // === estilo das fazendas ===
  const defaultStyle = {
    color: "#22c55e",
    weight: 2,
    fillColor: "#22c55e",
    fillOpacity: 0.35,
  };

  // === estilo do clima geom ===
  const climaStyle = {
    color: "#2563eb",
    weight: 2,
    fillColor: "#3b82f6",
    fillOpacity: 0.4,
  };

  const highlightStyle = {
    color: "#166534",
    weight: 3,
    fillColor: "#15803d",
    fillOpacity: 0.55,
  };

  const onEachFeature = (feature, layer) => {
    layer.on({
      click: () => {
        layer.setStyle(highlightStyle);
        layer.bindPopup(`<b>Fazenda</b><br>ID: ${feature.id}`).openPopup();
      },
      mouseover: () => layer.setStyle(highlightStyle),
      mouseout: () => layer.setStyle(defaultStyle),
    });
  };

  return (
    <div className="layout">

      {/* === Barra lateral esquerda (INTACTA) === */}
      <div className="floating-left readonly">
        {metrics.map((m) => (
          <div key={m.name} className="metric-float readonly-item">
            <div className="metric-icon">{m.icon}</div>
            <div className="metric-value">{m.value}</div>
            <div className="metric-name">{m.name}</div>
          </div>
        ))}
      </div>

      {/* === Mapa === */}
      <MapContainer center={[-22.1176, -45.1314]} zoom={12} className="map">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />

        {layers.cafes && cafesGeoJson && (
          <GeoJSON data={cafesGeoJson} style={defaultStyle} onEachFeature={onEachFeature} />
        )}

        {layers.clima && climaGeoJson && (
          <GeoJSON data={climaGeoJson} style={climaStyle} />
        )}
      </MapContainer>

      {/* === Painel direito === */}
      <div className="floating-right">
        <h3>DADOS HISTÓRICOS</h3>

        <div style={{
          width: "100%",
          height: "320px",
          padding: "8px",
          boxSizing: "border-box"
        }}>
          {climaHistorico.length > 0 && (
            <Line
              data={{
                labels: climaHistorico.map(h => h.data),
                datasets: [
                  {
                    label: "Temperatura (°C)",
                    data: climaHistorico.map(h => h.temperatura),
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239, 68, 68, 0.3)",
                    tension: 0.3,
                    pointRadius: 2,
                  },
                  {
                    label: "Umidade (%)",
                    data: climaHistorico.map(h => h.umidade),
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.3)",
                    tension: 0.3,
                    pointRadius: 2,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true },
                },
                scales: {
                  x: {
                    ticks: { maxRotation: 45, minRotation: 45 },
                  },
                },
              }}
            />
          )}
        </div>
      </div>


      {/* === Toolbar === */}
      <div className="toolbar">
        <button
          className={`tool-btn ${layers.cafes ? "active" : ""}`}
          onClick={() => toggleLayer("cafes")}
        >
          🟩 Fazendas
        </button>

        <button
          className={`tool-btn ${layers.clima ? "active" : ""}`}
          onClick={() => toggleLayer("clima")}
        >
          🌦️ Clima (geom)
        </button>
      </div>
    </div>
  );
}
