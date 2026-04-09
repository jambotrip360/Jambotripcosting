import React from "react";

export default function App() {
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
          Start Planning
        </button>
      </div>
    </div>
  );
}