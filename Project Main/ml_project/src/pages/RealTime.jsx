// src/pages/RealTime.jsx
export default function RealTime() {
    return (
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <h2>Real-Time Traffic and Incident Detection</h2>
        <iframe
          src="/traffic_page/traffic.html"
          title="Real-Time Traffic"
          style={{
            width: "100%",
            height: "90vh",
            border: "none",
            marginTop: "20px",
          }}
        />
      </div>
    );
  }
  