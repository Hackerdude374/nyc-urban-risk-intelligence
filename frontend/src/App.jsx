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
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8000";

function App() {
  const [riskSummary, setRiskSummary] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [error, setError] = useState("");

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

  if (loading) {
    return (
      <main className="page">
        <p>Loading NYC risk dashboard...</p>
      </main>
    );
  }

  if (error && !riskSummary) {
    return (
      <main className="page">
        <h1>NYC Urban Risk Intelligence</h1>
        <p className="error">{error}</p>
      </main>
    );
  }

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
              <BarChart data={riskSummary.boroughs}>
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="risk_score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="card map-card">
        <div className="card-title">
          <AlertTriangle />
          <h2>Map Placeholder</h2>
        </div>

        <div className="map-placeholder">
          <p>NYC geospatial heatmap will go here.</p>
          <span>
            Later we’ll connect Mapbox or Leaflet and visualize borough-level
            risk data.
          </span>
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