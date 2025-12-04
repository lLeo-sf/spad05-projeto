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

  // === Métricas automáticas ===
  const [metrics, setMetrics] = useState([
    { name: "Temperatura Média", value: "—", icon: "🌡️" },
    { name: "Umidade Média", value: "—", icon: "💧" },
    { name: "NDVI Médio", value: "—", icon: "🌿" }
  ]);

  const [alertaGlobal, setAlertaGlobal] = useState("—");
  const [alertaCor, setAlertaCor] = useState("#475569");

  const [climaHistorico, setClimaHistorico] = useState([]);

  const [layers, setLayers] = useState({
    fazendas: true,
  });

  const toggleLayer = l => setLayers(prev => ({ ...prev, [l]: !prev[l] }));

  const [fazendasGeoJson, setFazendasGeoJson] = useState(null);
  const [climaGeoJson, setClimaGeoJson] = useState(null);

  // === 1) Fazendas ===
  useEffect(() => {
    fetch(
      "http://localhost:8080/geoserver/ne/ows?" +
      "service=WFS&version=1.0.0&request=GetFeature&" +
      "typeName=ne:SHPSigefFinal&outputFormat=application/json"
    )
      .then(res => res.json())
      .then(data => {
        const filtrado = {
          ...data,
          features: data.features.filter(f => f.properties.tem_cafe === "S")
        };
        setFazendasGeoJson(filtrado);
      });
      
  }, []);

  // === 2) Clima ===
  useEffect(() => {
    fetch(
      "http://localhost:8080/geoserver/ne/ows?" +
      "service=WFS&version=1.0.0&request=GetFeature&" +
      "typeName=ne:vw_clima_sigeffinal_geom&outputFormat=application/json"
    )
      .then(res => res.json())
      .then(data => setClimaGeoJson(data));
  }, []);

  // ============================
  // CLASSIFICAÇÃO DO RISCO
  // ============================
  function riscoFerrugem(temp, umi) {
    if (temp >= 20 && temp <= 25 && umi > 90)
      return { risco: "Crítico", cor: "#dc2626" };

    if (temp >= 18 && temp <= 28 && umi > 80)
      return { risco: "Alto", cor: "#ea580c" };

    if (temp >= 18 && temp <= 28 && umi >= 60)
      return { risco: "Médio", cor: "#eab308" };

    return { risco: "Baixo", cor: "#22c55e" };
  }

  function riscoToNumber(risco) {
    if (risco === "Crítico") return 4;
    if (risco === "Alto") return 3;
    if (risco === "Médio") return 2;
    if (risco === "Baixo") return 1;
    return 0;
  }

  // ============================
  // ALERTA GLOBAL + MÉTRICAS
  // ============================
  useEffect(() => {
    if (!climaGeoJson || climaGeoJson.features.length === 0) return;

    const features = climaGeoJson.features;

    // pegar o último registro de cada fazenda
    const ultimos = [];

    const porFazenda = {};
    for (const f of features) {
      const area = Number(f.properties.area_id);
      if (!porFazenda[area]) porFazenda[area] = [];
      porFazenda[area].push(f);
    }

    for (const area of Object.keys(porFazenda)) {
      const lista = porFazenda[area];
      lista.sort((a, b) => new Date(a.properties.data) - new Date(b.properties.data));
      ultimos.push(lista[lista.length - 1].properties);
    }

    // ---- risco global ----
    const riscos = ultimos.map(c => riscoFerrugem(c.temperatura, c.umidade).risco);

    const prioridade = ["Crítico", "Alto", "Médio", "Baixo"];
    const encontrado = prioridade.find(r => riscos.includes(r)) || "Sem dados";

    setAlertaGlobal(encontrado);

    const cor =
      encontrado === "Crítico" ? "#dc2626" :
        encontrado === "Alto" ? "#ea580c" :
          encontrado === "Médio" ? "#eab308" :
            encontrado === "Baixo" ? "#22c55e" :
              "#475569";

    setAlertaCor(cor);

    // ---- métricas globais ----
    const tempMedia = ultimos.reduce((s, c) => s + c.temperatura, 0) / ultimos.length;
    const umiMedia = ultimos.reduce((s, c) => s + c.umidade, 0) / ultimos.length;

    const ndviValidos = ultimos.filter(c => c.ndvi !== null);
    const ndviMedia = ndviValidos.length > 0
      ? ndviValidos.reduce((s, c) => s + c.ndvi, 0) / ndviValidos.length
      : null;

    setMetrics([
      { name: "Temperatura Média", value: tempMedia.toFixed(1) + "°C", icon: "🌡️" },
      { name: "Umidade Média", value: umiMedia.toFixed(1) + "%", icon: "💧" },
      { name: "NDVI Médio", value: ndviMedia ? ndviMedia.toFixed(2) : "—", icon: "🌿" }
    ]);

  }, [climaGeoJson]);

  // ============================
  // RENDERIZAÇÃO DE CADA FAZENDA
  // ============================
  const onEachFazenda = (feature, layer) => {
    const p = feature.properties;
    const fazendaId = Number(feature.id.split(".")[1]);

    const climaFazenda = climaGeoJson
      ? climaGeoJson.features.filter(c => c.properties.area_id === fazendaId)
      : [];

    let climaAtual = null;

    if (climaFazenda.length > 0) {
      climaFazenda.sort((a, b) => new Date(a.properties.data) - new Date(b.properties.data));
      climaAtual = climaFazenda[climaFazenda.length - 1].properties;
    }

    // === COLORIR ===
    let finalColor = "#000";
    let finalFill = "#d1d5db";
    let finalOpacity = 0.25;

    if (climaAtual) {
      const r = riscoFerrugem(climaAtual.temperatura, climaAtual.umidade);
      finalColor = r.cor;
      finalFill = r.cor;
      finalOpacity = 0.45;
    }

    layer.setStyle({
      color: finalColor,
      fillColor: finalFill,
      fillOpacity: finalOpacity,
      weight: 2,
    });

    // === TOOLTIP CRUA ===
    let tt = `<b>FAZENDA</b><br>`;
    for (const k of Object.keys(p)) tt += `${k}: ${p[k]}<br>`;

    if (climaAtual) {
      tt += `<br><b>CLIMA</b><br>`;
      for (const k of Object.keys(climaAtual)) tt += `${k}: ${climaAtual[k]}<br>`;
    }

    layer.bindTooltip(tt, { sticky: true, className: "fazenda-tooltip" });

    // CLICK → painel lateral
    layer.on("click", () => {
      if (!climaAtual) return;

      setClimaHistorico(
        climaFazenda.map(f => {
          const props = f.properties;
          const r = riscoFerrugem(props.temperatura, props.umidade);
          return {
            data: props.data,
            temperatura: props.temperatura,
            umidade: props.umidade,
            ndvi: props.ndvi,
            risco: r.risco,
            riscoNum: riscoToNumber(r.risco)
          };
        })
      );


    });
  };

  useEffect(() => {
  if (fazendasGeoJson) {
    console.log("FAZENDAS (WFS):", fazendasGeoJson.features[0].properties);
  }
}, [fazendasGeoJson]);

useEffect(() => {
  if (climaGeoJson) {
    console.log("CLIMA (WFS):", climaGeoJson.features[0].properties);
  }
}, [climaGeoJson]);

  // ============================
  // RENDER FINAL
  // ============================
  return (
    <div className="layout">

      {/* === ALERTA GLOBAL === */}
      <div className="alert-card" style={{
        position: "absolute",
        top: "14px",
        left: "50%",
        transform: "translateX(-50%)",
        background: alertaCor,
        color: "white",
        padding: "10px 28px",
        borderRadius: "12px",
        fontSize: "17px",
        fontWeight: 600,
        zIndex: 9999,
        boxShadow: "0 4px 14px rgba(0,0,0,0.35)"
      }}>
        ⚠️ Risco de Ferrugem na Região: <b>{alertaGlobal}</b>
      </div>

      {/* === METRICS LEFT === */}
      <div className="floating-left readonly">
        {metrics.map((m) => (
          <div key={m.name} className="metric-float readonly-item">
            <div className="metric-icon">{m.icon}</div>
            <div className="metric-value">{m.value}</div>
            <div className="metric-name">{m.name}</div>
          </div>
        ))}
      </div>

      {/* === MAP === */}
      <MapContainer center={[-22.1176, -45.1314]} zoom={12} className="map">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {layers.fazendas && fazendasGeoJson && (
          <GeoJSON data={fazendasGeoJson} onEachFeature={onEachFazenda} />
        )}
      </MapContainer>

      {/* === HISTÓRICO === */}
      <div className="floating-right">
        <h3>Histórico Climático</h3>

        <div style={{ width: "100%", height: "300px" }}>
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
                    yAxisID: "y1",
                  },
                  {
                    label: "Umidade (%)",
                    data: climaHistorico.map(h => h.umidade),
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.3)",
                    yAxisID: "y1",
                  },
                  {
                    label: "Nível de Ferrugem (1–4)",
                    data: climaHistorico.map(h => h.riscoNum),
                    borderColor: "#eab308",
                    backgroundColor: "rgba(234, 179, 8, 0.3)",
                    tension: 0.3,
                    pointRadius: 3,
                    yAxisID: "y2",
                  }
                ],
              }}

              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y1: {    // temperatura/umidade
                    position: "left",
                    beginAtZero: false,
                  },
                  y2: {    // ferrugem
                    position: "right",
                    min: 0,
                    max: 4,
                    ticks: {
                      callback: (v) => {
                        return ["—", "Baixo", "Médio", "Alto", "Crítico"][v];
                      }
                    }
                  }
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        if (ctx.dataset.label.includes("Ferrugem"))
                          return `Risco: ${["—", "Baixo", "Médio", "Alto", "Crítico"][ctx.raw]}`;
                        return `${ctx.dataset.label}: ${ctx.raw}`;
                      }
                    }
                  }
                }
              }}
            />

          )}
        </div>
      </div>

      {/* === TOOLBAR === */}
      <div className="toolbar">
        <button
          className={`tool-btn ${layers.fazendas ? "active" : ""}`}
          onClick={() => toggleLayer("fazendas")}
        >
          🟩 Fazendas
        </button>
      </div>

    </div>
  );
}
