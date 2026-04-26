import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity, AlertTriangle, MapPinned } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "./App.css";

/*
  API_BASE_URL is the local FastAPI backend URL.

  In production, this should NOT stay hardcoded.
  Later we will move this into an environment variable like:

    VITE_API_BASE_URL=https://your-api-domain.com

  For the local MVP, hardcoding localhost is fine because it keeps the setup simple.
*/
const API_BASE_URL = "http://127.0.0.1:8000";

/*
  Borough center coordinates.

  Leaflet needs latitude/longitude pairs to place markers on the map.
  These are approximate borough-center coordinates, not exact boundaries.

  Later upgrade:
  - Replace these points with real borough GeoJSON polygons.
  - Color each polygon based on risk score.
*/
const BOROUGH_COORDINATES = {
  Brooklyn: [40.6782, -73.9442],
  Queens: [40.7282, -73.7949],
  Manhattan: [40.7831, -73.9712],
  Bronx: [40.8448, -73.8648],
  "Staten Island": [40.5795, -74.1502],
};

function App() {
  /*
    riskSummary stores the main dashboard payload from FastAPI.

    Expected backend shape:

    {
      city: "New York City",
      overall_risk_score: 82,
      top_risk_categories: [...],
      boroughs: [
        {
          name: "Brooklyn",
          risk_score: 100,
          crash_count: 1200,
          injuries: 400,
          fatalities: 2
        }
      ]
    }

    This becomes the single source of truth for the dashboard.
  */
  const [riskSummary, setRiskSummary] = useState(null);

  /*
    aiExplanation stores the response from the /ai/explain endpoint.

    Right now this is a rule-based placeholder.
    Later it can be powered by AWS Bedrock or OpenAI.
  */
  const [aiExplanation, setAiExplanation] = useState(null);

  /*
    selectedBorough controls the user-selected borough filter.

    "All" means show every borough.
    Any borough name means filter the chart, map, and stat cards down to one borough.
  */
  const [selectedBorough, setSelectedBorough] = useState("All");

  /*
    loading controls the initial dashboard loading screen.
    explanationLoading controls only the AI explanation button.
    error stores user-facing API errors.
  */
  const [loading, setLoading] = useState(true);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [error, setError] = useState("");

  /*
    Fetch dashboard data once when the component first loads.

    useEffect with [] runs once on page load.
    This is where the frontend calls FastAPI and stores the response in React state.
  */
  useEffect(() => {
    async function fetchRiskSummary() {
      try {
        const response = await axios.get(`${API_BASE_URL}/risk/summary`);
        setRiskSummary(response.data);
      } catch (err) {
        setError("Could not load NYC risk summary from the backend.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRiskSummary();
  }, []);

  /*
    Fetch an AI-style explanation from the backend.

    Right now this returns a static/simple explanation.
    Later this same function can call an endpoint that uses:
    - AWS Bedrock
    - OpenAI
    - a local RAG pipeline
    - feature importance from the ML model
  */
  async function handleExplainRisk() {
    setExplanationLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/ai/explain`);
      setAiExplanation(response.data);
    } catch (err) {
      setError("Could not load AI explanation from the backend.");
      console.error(err);
    } finally {
      setExplanationLoading(false);
    }
  }

  /*
    Loading guard.

    We return early while the first API request is still running.
    This prevents the app from trying to access riskSummary.boroughs before data exists.
  */
  if (loading) {
    return (
      <main className="page">
        <p>Loading NYC risk dashboard...</p>
      </main>
    );
  }

  /*
    Error guard.

    If the backend fails completely and there is no riskSummary data,
    show a clean error screen instead of crashing.
  */
  if (error && !riskSummary) {
    return (
      <main className="page">
        <h1>NYC Urban Risk Intelligence</h1>
        <p className="error">{error}</p>
      </main>
    );
  }

  /*
    Build dropdown options dynamically from the backend data.

    This is better than hardcoding borough names because the UI adapts if the backend
    later adds another region type, like ZIP codes, community districts, or precincts.
  */
  const boroughOptions = [
    "All",
    ...riskSummary.boroughs.map((borough) => borough.name),
  ];

  /*
    visibleBoroughs is the filtered dataset used by the chart, map, and stat cards.

    This is an important frontend pattern:
    - Keep original API data unchanged.
    - Derive filtered data from state.
    - Render components from the derived data.
  */
  const visibleBoroughs =
    selectedBorough === "All"
      ? riskSummary.boroughs
      : riskSummary.boroughs.filter(
          (borough) => borough.name === selectedBorough
        );

  /*
    selectedBoroughDetails powers the compact summary pill next to the dropdown.

    If "All" is selected, there is no single borough summary to show.
  */
  const selectedBoroughDetails =
    selectedBorough === "All"
      ? null
      : riskSummary.boroughs.find(
          (borough) => borough.name === selectedBorough
        );

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">NYC AI + Geospatial Analytics</p>
          <h1>NYC Urban Risk Intelligence</h1>
          <p className="subtitle">
            A full-stack dashboard for analyzing crash, flood, and 311
            infrastructure risk across New York City.
          </p>
        </div>

        <div className="score-card">
          <p>Overall Risk Score</p>
          <strong>{riskSummary.overall_risk_score}</strong>
          <span>/ 100</span>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="card filter-card">
        <div>
          <p className="eyebrow">Interactive Filter</p>
          <h2>Select Borough</h2>
        </div>

        <select
          value={selectedBorough}
          onChange={(event) => setSelectedBorough(event.target.value)}
        >
          {boroughOptions.map((borough) => (
            <option key={borough} value={borough}>
              {borough}
            </option>
          ))}
        </select>

        {selectedBoroughDetails && (
          <div className="selected-summary">
            <strong>{selectedBoroughDetails.name}</strong>
            <span>Risk Score: {selectedBoroughDetails.risk_score}/100</span>
            <span>Crashes: {selectedBoroughDetails.crash_count}</span>
            <span>Injuries: {selectedBoroughDetails.injuries}</span>
            <span>Fatalities: {selectedBoroughDetails.fatalities}</span>
          </div>
        )}
      </section>

      <section className="grid">
        <article className="card">
          <div className="card-title">
            <Activity />
            <h2>Risk Categories</h2>
          </div>

          <ul className="category-list">
            {riskSummary.top_risk_categories.map((category) => (
              <li key={category}>{category}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <div className="card-title">
            <MapPinned />
            <h2>Borough Risk Ranking</h2>
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={visibleBoroughs}>
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="risk_score" fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="card map-card">
        <div className="card-title">
          <AlertTriangle />
          <h2>NYC Risk Map</h2>
        </div>

        <div className="map-container">
          <MapContainer
            center={[40.7128, -74.006]}
            zoom={10}
            scrollWheelZoom={false}
            className="leaflet-map"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {visibleBoroughs.map((borough) => {
              const position = BOROUGH_COORDINATES[borough.name];

              /*
                Defensive check.

                If the backend returns a borough name we do not have coordinates for,
                skip rendering that marker instead of crashing the app.
              */
              if (!position) {
                return null;
              }

              return (
                <CircleMarker
                  key={borough.name}
                  center={position}
                  radius={Math.max(10, borough.risk_score / 3)}
                  pathOptions={{
                    color: "#38bdf8",
                    fillColor: "#38bdf8",
                    fillOpacity: 0.45,
                  }}
                >
                  <Popup>
                    <strong>{borough.name}</strong>
                    <br />
                    Risk Score: {borough.risk_score}/100
                    <br />
                    Crashes: {borough.crash_count ?? "N/A"}
                    <br />
                    Injuries: {borough.injuries ?? "N/A"}
                    <br />
                    Fatalities: {borough.fatalities ?? "N/A"}
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </section>

      <section className="card borough-card">
        <div className="card-title">
          <Activity />
          <h2>Borough Crash Statistics</h2>
        </div>

        <div className="borough-grid">
          {visibleBoroughs.map((borough) => (
            <div className="borough-stat" key={borough.name}>
              <div className="borough-header">
                <h3>{borough.name}</h3>
                <span>{borough.risk_score}/100</span>
              </div>

              <div className="stat-row">
                <p>Crashes</p>
                <strong>{borough.crash_count ?? "N/A"}</strong>
              </div>

              <div className="stat-row">
                <p>Injuries</p>
                <strong>{borough.injuries ?? "N/A"}</strong>
              </div>

              <div className="stat-row">
                <p>Fatalities</p>
                <strong>{borough.fatalities ?? "N/A"}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-title">
          <AlertTriangle />
          <h2>AI Risk Explanation</h2>
        </div>

        <button onClick={handleExplainRisk} disabled={explanationLoading}>
          {explanationLoading ? "Generating explanation..." : "Explain risk"}
        </button>

        {aiExplanation && (
          <div className="explanation">
            <p className="question">{aiExplanation.question}</p>
            <p>{aiExplanation.explanation}</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;