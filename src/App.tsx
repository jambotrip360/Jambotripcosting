import React, { useState } from "react";

export default function App() {
  const [destination, setDestination] = useState("");
  const [budget, setBudget] = useState("");

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f4f8fc",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ color: "#0a4fa3", marginBottom: "10px" }}>
          Jambo Trip 360
        </h1>

        <p style={{ color: "#555", fontSize: "18px", marginBottom: "24px" }}>
          Smart Travel Costing System
        </p>

        <div style={{ display: "grid", gap: "12px" }}>
          <input
            type="text"
            placeholder="Enter destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              fontSize: "16px",
            }}
          />

          <input
            type="number"
            placeholder="Enter budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              fontSize: "16px",
            }}
          />

          <button
            style={{
              backgroundColor: "#0a4fa3",
              color: "white",
              border: "none",
              padding: "12px 20px",
              borderRadius: "10px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Calculate
          </button>
        </div>

        {(destination || budget) && (
          <div style={{ marginTop: "24px" }}>
            <p><strong>Destination:</strong> {destination || "-"}</p>
            <p><strong>Budget:</strong> {budget || "-"}</p>
          </div>
        )}
      </div>
    </div>
  );
}