// src/pages/Home.jsx
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Traffic Congestion Prediction System</h1>
      <button onClick={() => navigate("/realtime")} style={{ margin: "20px", padding: "10px 20px" }}>
        Real-time traffic and traffic incidents detection
      </button>
      <button onClick={() => navigate("/forecast")} style={{ margin: "20px", padding: "10px 20px" }}>
        Forecast / Predict traffic congestion
      </button>
    </div>
  );
}
