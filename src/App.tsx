import React, { useEffect, useMemo, useState } from "react";

const TRIAL_HOURS = 2;
const TRIAL_MS = TRIAL_HOURS * 60 * 60 * 1000;
const WHATSAPP_URL = "https://wa.me/254710996021";

const HOTEL_RATES = {
  budget: {
    "Miti Mingi Eco Camp": 7000,
    "Enkorok Mara Camp": 9500,
    "Mara Sopa Lodge": 12000,
  },
  midrange: {
    "Mara Leisure Camp": 18000,
    "Zebra Plains Mara": 22000,
    "Ashnil Mara Camp": 26000,
  },
  luxury: {
    "Sarova Mara Game Camp": 32000,
    "Mara Serena Safari Lodge": 35000,
    "Neptune Mara Rianta": 42000,
  },
};

const PARK_FEES = {
  resident: 3000,
  "non-resident": 13000,
};

const TRANSPORT_RATES = {
  Van: 18000,
  Landcruiser: 35000,
};

type HotelCategory = "budget" | "midrange" | "luxury";
type TransportType = "Van" | "Landcruiser";
type ParkType = "resident" | "non-resident";
type TabType = "results" | "quotation" | "deployment";

function formatKES(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatTimer(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}`;
}

const BRAND = {
  primary: "#0057B8",
  primaryHover: "#4DA6FF",
  header: "#003366",
  background: "#F5F5F5",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "24px",
  boxShadow: "0 18px 50px rgba(0,51,102,0.08)",
  padding: "24px",
  border: "1px solid #e6eef7",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #cfd8e3",
  fontSize: "15px",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#334155",
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: BRAND.primary,
  color: "white",
  border: "none",
  borderRadius: "14px",
  padding: "12px 18px",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
};

const outlineButtonStyle: React.CSSProperties = {
  backgroundColor: "white",
  color: BRAND.header,
  border: `1px solid ${BRAND.primary}`,
  borderRadius: "14px",
  padding: "12px 18px",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
};

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: "20px",
        boxShadow: "0 10px 30px rgba(0,51,102,0.06)",
      }}
    >
      <div
        style={{
          height: "4px",
          width: "60px",
          borderRadius: "999px",
          backgroundColor: BRAND.primary,
          marginBottom: "16px",
        }}
      />
      <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>{title}</p>
      <p
        style={{
          fontSize: "24px",
          fontWeight: 700,
          color: BRAND.header,
          marginTop: "10px",
          marginBottom: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("results");
  const [showPhonePayment, setShowPhonePayment] = useState(true);

  const [clientName, setClientName] = useState("");
  const [pax, setPax] = useState(2);
  const [nights, setNights] = useState(2);
  const [days, setDays] = useState(3);

  const [category, setCategory] = useState<HotelCategory>("midrange");
  const [hotelName, setHotelName] = useState("Mara Leisure Camp");
  const [transport, setTransport] = useState<TransportType>("Landcruiser");
  const [parkType, setParkType] = useState<ParkType>("resident");

  const [markup, setMarkup] = useState(30);
  const [fuelCost, setFuelCost] = useState(8000);
  const [driverAllowance, setDriverAllowance] = useState(3000);

  const [trialStartedAt, setTrialStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const saved = localStorage.getItem("jambo_trip_trial_started_at");
    if (saved) setTrialStartedAt(Number(saved));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const availableHotels = Object.keys(HOTEL_RATES[category]);
    if (!availableHotels.includes(hotelName)) {
      setHotelName(availableHotels[0]);
    }
  }, [category, hotelName]);

  const startTrial = () => {
    const ts = Date.now();
    localStorage.setItem("jambo_trip_trial_started_at", String(ts));
    setTrialStartedAt(ts);
  };

  const hotelRate =
    HOTEL_RATES[category][hotelName as keyof (typeof HOTEL_RATES)[typeof category]] || 0;
  const transportRate = TRANSPORT_RATES[transport] || 0;
  const parkFee = PARK_FEES[parkType] || 0;

  const hotelTotal = hotelRate * nights * pax;
  const transportTotal = transportRate * days;
  const driverTotal = driverAllowance * days;
  const parkTotal = parkFee * pax * days;
  const baseTotal = hotelTotal + transportTotal + driverTotal + fuelCost + parkTotal;
  const finalTotal = Math.round(baseTotal * (1 + markup / 100));
  const perPerson = pax > 0 ? Math.round(finalTotal / pax) : 0;
  const profit = finalTotal - baseTotal;

  const trialRemaining = useMemo(() => {
    if (!trialStartedAt) return TRIAL_MS;
    return Math.max(0, trialStartedAt + TRIAL_MS - now);
  }, [trialStartedAt, now]);

  const trialActive = Boolean(trialStartedAt) && trialRemaining > 0;
  const trialExpired = Boolean(trialStartedAt) && trialRemaining <= 0;

  const quotationText = `JAMBO TRIP 360°
Smart Safari Pricing & Quotation System

Client: ${clientName || "Client Name"}
Destination: Masai Mara
Hotel: ${hotelName}
Category: ${category}
Transport: ${transport}
Pax: ${pax}
Nights: ${nights}
Days: ${days}

Total Package Price: ${formatKES(finalTotal)}
Price Per Person: ${formatKES(perPerson)}

Includes:
- Accommodation
- Transport
- Park fees
- Driver guide

Call / WhatsApp: +254710996021`;

  const downloadQuote = () => {
    const blob = new Blob([quotationText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Jambo_Trip_360_Quote_${(clientName || "Client").replace(
      /\s+/g,
      "_"
    )}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (trialExpired) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(to bottom right, #fff8e7, #ffffff, #f0fdf4)",
          padding: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ ...cardStyle, maxWidth: "800px", width: "100%" }}>
          <h1 style={{ fontSize: "34px", marginTop: 0, marginBottom: "8px" }}>
            Trial Ended
          </h1>
          <p style={{ color: "#475569" }}>
            Your 2-hour free trial has ended.
          </p>

          <div
            style={{
              border: `1px solid ${BRAND.primary}`,
              borderRadius: "18px",
              padding: "18px",
              marginTop: "20px",
            }}
          >
            <p style={{ fontWeight: 700, marginTop: 0 }}>Unlock the full system</p>
            <p style={{ fontSize: "14px", color: "#475569" }}>
              To continue using Jambo Trip 360°, make payment and send your
              confirmation on WhatsApp to activate your full access.
            </p>
            <div style={{ fontSize: "14px", color: "#334155" }}>
              <p><strong>Product:</strong> Jambo Trip 360° Smart Safari Pricing & Quotation System</p>
              <p><strong>Access:</strong> Full version unlock</p>
              <p><strong>Support:</strong> Setup help available after payment</p>
            </div>
          </div>

          <div
            style={{
              borderRadius: "18px",
              backgroundColor: "#f8fafc",
              padding: "18px",
              marginTop: "16px",
              color: "#475569",
            }}
          >
            To continue using <strong>Jambo Trip 360° Smart Safari Pricing & Quotation System</strong>, contact us to unlock the full version.
          </div>

          <div
            style={{
              borderRadius: "18px",
              backgroundColor: "#f8fafc",
              padding: "18px",
              marginTop: "16px",
              color: "#475569",
              fontSize: "14px",
            }}
          >
            <p style={{ fontWeight: 700, color: "#0f172a" }}>Payment instructions</p>
            <p>Pay to unlock the full version, then send your payment confirmation on WhatsApp.</p>
            <p><strong>Subscription:</strong> KES 5,000 per month</p>
            {showPhonePayment && (
              <p><strong>Pay via M-Pesa (Send Money):</strong> +254710996021</p>
            )}
            <p><strong>M-Pesa Paybill:</strong> __________</p>

            <button
              onClick={() => setShowPhonePayment(!showPhonePayment)}
              style={{ ...outlineButtonStyle, marginTop: "8px" }}
            >
              {showPhonePayment ? "Hide Phone Payment Option" : "Show Phone Payment Option"}
            </button>

            <p style={{ marginTop: "12px" }}>
              <strong>Message to send:</strong> Hello, I have paid for Jambo Trip 360° and need activation.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              marginTop: "18px",
            }}
          >
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                ...primaryButtonStyle,
                textDecoration: "none",
                textAlign: "center",
                display: "inline-block",
              }}
            >
              Send Payment Confirmation
            </a>
            <a
              href="tel:+254710996021"
              style={{
                ...outlineButtonStyle,
                textDecoration: "none",
                textAlign: "center",
                display: "inline-block",
              }}
            >
              Call to Unlock
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "16px",
        background: "linear-gradient(135deg, #f8fbff 0%, #ffffff 55%, #f3f6fa 100%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "2fr 1fr",
          }}
        >
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "20px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "999px",
                      backgroundColor: "#e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      color: "#6b7280",
                    }}
                  >
                    Logo
                  </div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "34px",
                      fontWeight: 700,
                      color: BRAND.header,
                    }}
                  >
                    Jambo Trip 360°
                  </h1>
                </div>
                <p style={{ color: "#4B647D", marginTop: "8px", marginBottom: 0 }}>
                  Smart Safari Pricing & Quotation System
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    backgroundColor: BRAND.primary,
                    color: "white",
                    padding: "8px 14px",
                    borderRadius: "999px",
                    fontSize: "14px",
                  }}
                >
                  2-Hour Trial
                </span>
                <span
                  style={{
                    border: `1px solid ${BRAND.primary}`,
                    color: BRAND.header,
                    padding: "8px 14px",
                    borderRadius: "999px",
                    fontSize: "14px",
                  }}
                >
                  MacBook + Android
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: "16px",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              }}
            >
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Client Name</label>
                <input
                  style={inputStyle}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name"
                />
              </div>

              <div>
                <label style={labelStyle}>No. of Pax</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={pax}
                  onChange={(e) => setPax(Number(e.target.value || 0))}
                />
              </div>

              <div>
                <label style={labelStyle}>Markup %</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={markup}
                  onChange={(e) => setMarkup(Number(e.target.value || 0))}
                />
              </div>

              <div>
                <label style={labelStyle}>Nights</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={nights}
                  onChange={(e) => setNights(Number(e.target.value || 0))}
                />
              </div>

              <div>
                <label style={labelStyle}>Days</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value || 0))}
                />
              </div>

              <div>
                <label style={labelStyle}>Hotel Category</label>
                <select
                  style={inputStyle}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as HotelCategory)}
                >
                  <option value="budget">Budget</option>
                  <option value="midrange">Midrange</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Hotel Name</label>
                <select
                  style={inputStyle}
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                >
                  {Object.keys(HOTEL_RATES[category]).map((hotel) => (
                    <option key={hotel} value={hotel}>
                      {hotel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Transport</label>
                <select
                  style={inputStyle}
                  value={transport}
                  onChange={(e) => setTransport(e.target.value as TransportType)}
                >
                  <option value="Van">Van</option>
                  <option value="Landcruiser">Landcruiser</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Park Fee Type</label>
                <select
                  style={inputStyle}
                  value={parkType}
                  onChange={(e) => setParkType(e.target.value as ParkType)}
                >
                  <option value="resident">Resident</option>
                  <option value="non-resident">Non-Resident</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Fuel Cost</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={fuelCost}
                  onChange={(e) => setFuelCost(Number(e.target.value || 0))}
                />
              </div>

              <div>
                <label style={labelStyle}>Driver Allowance / Day</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={driverAllowance}
                  onChange={(e) => setDriverAllowance(Number(e.target.value || 0))}
                />
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, color: BRAND.header }}>Trial Access</h2>
            <div
              style={{
                borderRadius: "18px",
                padding: "16px",
                backgroundColor: "#F8FAFC",
                border: "1px solid #E5EDF5",
              }}
            >
              {!trialStartedAt && (
                <p style={{ fontSize: "14px", color: "#475569" }}>
                  Start your free 2-hour trial.
                </p>
              )}
              {trialActive && (
                <p style={{ fontSize: "14px", color: "#475569" }}>
                  Trial active. Remaining time:
                </p>
              )}
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "32px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                }}
              >
                {formatTimer(trialRemaining)}
              </div>
            </div>

            {!trialStartedAt && (
              <button
                onClick={startTrial}
                style={{ ...primaryButtonStyle, width: "100%", marginTop: "16px" }}
              >
                Start 2-Hour Free Trial
              </button>
            )}

            <div
              style={{
                border: "1px solid #E5EDF5",
                borderRadius: "18px",
                padding: "16px",
                marginTop: "16px",
                fontSize: "14px",
                color: "#475569",
              }}
            >
              <p style={{ fontWeight: 700, color: "#1e293b" }}>How to sell it</p>
              <p>Share this link with travel agents. The timer starts on first launch in their browser.</p>
              <p>When the trial ends, they contact you to unlock the full system.</p>
            </div>
          </div>
        </div>

<div style={{ marginTop: "18px" }}>
  <div
    style={{
      borderRadius: "16px",
      padding: "14px",
      backgroundColor: "#F8FAFC",
      border: "1px solid #E5EDF5",
    }}
  >
    <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
      Per Person
    </p>
    <p style={{ fontSize: "22px", fontWeight: 700, marginTop: "8px" }}>
      {formatKES(perPerson)}
    </p>
  </div>
</div>
                <div
                  style={{
                    borderRadius: "16px",
                    padding: "14px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E5EDF5",
                  }}
                >
<p style={{ color: "#64748b", fontSize: "14px" }}>
  Price per person
</p>

<p
  style={{
    fontSize: "22px",
    fontWeight: 700,
    marginTop: "8px",
    textTransform: "capitalize",
  }}
>
  {formatKES(perPerson)}
</p>
{activeTab === "deployment" && (
        <div style={{ ...cardStyle, marginTop: "16px" }}>
          <h2 style={{ color: BRAND.header, marginTop: 0 }}>Deployment</h2>

          <p style={{ color: "#475569" }}>
            Your app is live on Vercel and can be shared with clients.
          </p>

          <p style={{ color: "#475569" }}>
            Each time you update your code and run Git push, the live site updates automatically.
          </p>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              ...primaryButtonStyle,
              display: "inline-block",
              textDecoration: "none",
              marginTop: "8px",
            }}
          >
            Share on WhatsApp
          </a>
        </div>
      )}
</div>
  </div>
</div>
);
}      