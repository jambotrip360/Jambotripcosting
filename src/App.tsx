import React, { ChangeEvent, useEffect, useMemo, useState } from "react";

type ClientItem = { id: string; name: string };
type DestinationItem = { id: string; name: string };

type HotelItem = {
  id: string;
  name: string;
  mealPlan: string;
  doubleRoomRate: string;
  childRate: string;
  checkIn: string;
  checkOut: string;
};

type ActivityItem = {
  id: string;
  name: string;
  adultRate: string;
  childRate: string;
};

type ExcludeItem = { id: string; text: string };
type CurrencyMode = "KES" | "USD";
type AgentInfo = { name: string; email: string };

type CalculationResponse = {
  success?: boolean;
  currencyMode?: CurrencyMode;
  totalTravellers: number;
  totalNights: number;
  hotelTotal: number;
  hotelPerPerson: number;
  mainTransportTotal: number;
  transportPerPerson: number;
  parkFeesTotal: number;
  parkFeePerPerson: number;
  activitiesTotal: number;
  mealsTotal: number;
  otherTransportTotal: number;
  fuelTotal: number;
  driverTotal: number;
  extrasTotal: number;
  markupAmount: number;
  finalTotal: number;
  pricePerPerson: number;
  displayFinalTotal?: number;
  displayPricePerPerson?: number;
  includes?: string[];
  transportCalculationText?: string;
};

const TRIAL_HOURS = 2;
const AGENT_STORAGE_KEY = "jambo_trip_agent_info";
const TRIAL_STORAGE_KEY = "jambo_trip_trial_started_at";
const UNLOCK_STORAGE_KEY = "jambo_trip_unlocked";
const SUBSCRIPTION_EXPIRY_KEY = "jambo_trip_subscription_expiry";
const ACTIVATION_CODE = "JAMBO30";
const PAYMENT_AMOUNT = "KES 5,000 per month";
const WHATSAPP_NUMBER = ""; // later add 2547XXXXXXXX

const emptyCalculation: CalculationResponse = {
  currencyMode: "KES",
  totalTravellers: 0,
  totalNights: 0,
  hotelTotal: 0,
  hotelPerPerson: 0,
  mainTransportTotal: 0,
  transportPerPerson: 0,
  parkFeesTotal: 0,
  parkFeePerPerson: 0,
  activitiesTotal: 0,
  mealsTotal: 0,
  otherTransportTotal: 0,
  fuelTotal: 0,
  driverTotal: 0,
  extrasTotal: 0,
  markupAmount: 0,
  finalTotal: 0,
  pricePerPerson: 0,
  displayFinalTotal: 0,
  displayPricePerPerson: 0,
  includes: [],
  transportCalculationText: "",
};

const themeOptions = [
  { name: "Blue", primary: "#0F4C81", secondary: "#EAF4FF", accent: "#1D8BFF" },
  { name: "Green", primary: "#4F7D2B", secondary: "#F2F8EC", accent: "#7FB43C" },
  { name: "Gold", primary: "#8A6A14", secondary: "#FFF9E8", accent: "#D6A400" },
  { name: "Burgundy", primary: "#7B1E3A", secondary: "#FFF1F5", accent: "#D44A72" },
];

function makeId() {
  return crypto.randomUUID();
}

function createClient(): ClientItem {
  return { id: makeId(), name: "" };
}

function createDestination(): DestinationItem {
  return { id: makeId(), name: "" };
}

function createHotel(): HotelItem {
  return {
    id: makeId(),
    name: "",
    mealPlan: "Full Board",
    doubleRoomRate: "",
    childRate: "",
    checkIn: "",
    checkOut: "",
  };
}

function createActivity(): ActivityItem {
  return {
    id: makeId(),
    name: "Giraffe Centre",
    adultRate: "",
    childRate: "",
  };
}

function createExclude(): ExcludeItem {
  return { id: makeId(), text: "" };
}

function formatMoney(value: number, currency: CurrencyMode = "KES") {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function safeJoin(values: string[]) {
  const clean = values.map((v) => v.trim()).filter(Boolean);
  return clean.length ? clean.join(", ") : "-";
}

function formatTimeLeft(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatDate(value: number | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function App() {
  const [agentName, setAgentName] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);

  const [companyName, setCompanyName] = useState("Jambo Trip 360");
  const [preparedBy, setPreparedBy] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [themeName, setThemeName] = useState("Blue");

  const [clientEmail, setClientEmail] = useState("");
  const [leadClientName, setLeadClientName] = useState("");
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [tripType, setTripType] = useState("Safari");
  const [clientType, setClientType] = useState<CurrencyMode>("KES");

  const [otherClients, setOtherClients] = useState<ClientItem[]>([]);
  const [destinations, setDestinations] = useState<DestinationItem[]>([createDestination()]);
  const [hotels, setHotels] = useState<HotelItem[]>([createHotel()]);
  const [activities, setActivities] = useState<ActivityItem[]>([createActivity()]);
  const [excludes, setExcludes] = useState<ExcludeItem[]>([createExclude()]);

  const [mainTransport, setMainTransport] = useState("Landcruiser");
  const [transportPricePerDay, setTransportPricePerDay] = useState("");
  const [numberOfDays, setNumberOfDays] = useState("3");

  const [residentAdultFee, setResidentAdultFee] = useState("");
  const [residentChildFee, setResidentChildFee] = useState("");
  const [nonResidentAdultFee, setNonResidentAdultFee] = useState("");
  const [nonResidentChildFee, setNonResidentChildFee] = useState("");

  const [mealsAdultRate, setMealsAdultRate] = useState("");
  const [mealsChildRate, setMealsChildRate] = useState("");
  const [groupMealBuffetRate, setGroupMealBuffetRate] = useState("");

  const [trainAdultRate, setTrainAdultRate] = useState("");
  const [trainChildRate, setTrainChildRate] = useState("");
  const [balloonAdultRate, setBalloonAdultRate] = useState("");
  const [balloonChildRate, setBalloonChildRate] = useState("");
  const [flightAdultRate, setFlightAdultRate] = useState("");
  const [flightChildRate, setFlightChildRate] = useState("");
  const [boatAdultRate, setBoatAdultRate] = useState("");
  const [boatChildRate, setBoatChildRate] = useState("");

  const [fuelCost, setFuelCost] = useState("");
  const [driverAllowancePerDay, setDriverAllowancePerDay] = useState("");
  const [markupPercent, setMarkupPercent] = useState("0");

  const [calculation, setCalculation] = useState<CalculationResponse>(emptyCalculation);
  const [isCalculating, setIsCalculating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [subscriptionExpiry, setSubscriptionExpiry] = useState<number | null>(null);
  const [trialStartedAt, setTrialStartedAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [trialExpired, setTrialExpired] = useState(false);

  const selectedTheme =
    themeOptions.find((theme) => theme.name === themeName) || themeOptions[0];

  const displayCurrency: CurrencyMode = calculation.currencyMode || clientType;
  const displayFinalTotal = calculation.displayFinalTotal ?? calculation.finalTotal;
  const displayPricePerPerson = calculation.displayPricePerPerson ?? calculation.pricePerPerson;

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f9ff 0%, #eef4fb 45%, #ffffff 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.96)",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    boxShadow: "0 12px 34px rgba(15,23,42,0.06)",
    padding: 22,
    marginBottom: 18,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 8,
    fontWeight: 700,
    fontSize: 14,
    color: "#334155",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 16,
    border: "1px solid #dbe4f0",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    background: "#ffffff",
  };

  const primaryButton: React.CSSProperties = {
    background: `linear-gradient(135deg, ${selectedTheme.primary} 0%, ${selectedTheme.accent} 100%)`,
    color: "#ffffff",
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 800,
    cursor: "pointer",
  };

  const secondaryButton: React.CSSProperties = {
    background: "#ffffff",
    color: "#1e293b",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 700,
    cursor: "pointer",
  };

  useEffect(() => {
    const savedAgent = localStorage.getItem(AGENT_STORAGE_KEY);
    if (savedAgent) {
      try {
        const parsed = JSON.parse(savedAgent) as AgentInfo;
        setAgentInfo(parsed);
        setAgentName(parsed.name || "");
        setAgentEmail(parsed.email || "");
      } catch {
        localStorage.removeItem(AGENT_STORAGE_KEY);
      }
    }

    const savedExpiry = localStorage.getItem(SUBSCRIPTION_EXPIRY_KEY);
    const expiryNumber = savedExpiry ? Number(savedExpiry) : 0;

    if (expiryNumber && expiryNumber > Date.now()) {
      setIsUnlocked(true);
      setSubscriptionExpiry(expiryNumber);
    } else {
      localStorage.removeItem(UNLOCK_STORAGE_KEY);
      localStorage.removeItem(SUBSCRIPTION_EXPIRY_KEY);
      setIsUnlocked(false);
      setSubscriptionExpiry(null);
    }

    const savedTrial = localStorage.getItem(TRIAL_STORAGE_KEY);
    if (savedTrial) {
      setTrialStartedAt(Number(savedTrial));
    }
  }, []);

  useEffect(() => {
    if (!trialStartedAt) return;

    const timer = setInterval(() => {
      const expiry = trialStartedAt + TRIAL_HOURS * 60 * 60 * 1000;
      const remaining = expiry - Date.now();

      if (remaining <= 0) {
        setTimeLeft("00:00:00");
        setTrialExpired(!isUnlocked);
        clearInterval(timer);
        return;
      }

      setTimeLeft(formatTimeLeft(remaining));
      setTrialExpired(false);
    }, 1000);

    return () => clearInterval(timer);
  }, [trialStartedAt, isUnlocked]);

  const startTrial = () => {
    if (!agentName.trim() || !agentEmail.trim()) {
      alert("Please enter agent name and email");
      return;
    }

    const info = { name: agentName.trim(), email: agentEmail.trim() };
    const start = Date.now();

    localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(info));
    localStorage.setItem(TRIAL_STORAGE_KEY, String(start));

    setAgentInfo(info);
    setTrialStartedAt(start);
    setTrialExpired(false);
  };

  const activateSubscription = () => {
    if (activationCode.trim().toUpperCase() !== ACTIVATION_CODE) {
      alert("Invalid activation code");
      return;
    }

    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;

    localStorage.setItem(UNLOCK_STORAGE_KEY, "true");
    localStorage.setItem(SUBSCRIPTION_EXPIRY_KEY, String(expiry));

    setIsUnlocked(true);
    setTrialExpired(false);
    setSubscriptionExpiry(expiry);
    setActivationCode("");

    alert("✅ Activated for 30 days");
  };

  const resetDemoTrial = () => {
    localStorage.removeItem(AGENT_STORAGE_KEY);
    localStorage.removeItem(TRIAL_STORAGE_KEY);
    localStorage.removeItem(SUBSCRIPTION_EXPIRY_KEY);
    localStorage.removeItem(UNLOCK_STORAGE_KEY);

    setAgentInfo(null);
    setAgentName("");
    setAgentEmail("");
    setTrialStartedAt(null);
    setIsUnlocked(false);
    setTrialExpired(false);
    setSubscriptionExpiry(null);
    setTimeLeft("00:00:00");
  };

  const whatsappMessage = encodeURIComponent(
    `Hello, I have completed payment for Jambo Trip 360 activation.\n\nAgent Name: ${
      agentInfo?.name || agentName
    }\nAgent Email: ${agentInfo?.email || agentEmail}\nAmount: ${PAYMENT_AMOUNT}`
  );

  const whatsappLink = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`
    : "";

  const additionalClientNames = useMemo(
    () => otherClients.map((client) => client.name.trim()).filter(Boolean),
    [otherClients]
  );

  const destinationNames = useMemo(
    () => destinations.map((destination) => destination.name.trim()).filter(Boolean),
    [destinations]
  );

  const hotelNames = useMemo(
    () => hotels.map((hotel) => hotel.name.trim()).filter(Boolean),
    [hotels]
  );

  const payloadForBackend = useMemo(
    () => ({
      companyName,
      preparedBy,
      companyPhone,
      companyEmail,
      companyWebsite,
      companyLogo,
      themePrimary: selectedTheme.primary,
      themeSecondary: selectedTheme.secondary,
      themeAccent: selectedTheme.accent,
      agentName: agentInfo?.name || agentName,
      agentEmail: agentInfo?.email || agentEmail,
      clientEmail,
      leadClientName,
      adults,
      children,
      tripType,
      clientType,
      otherClients: additionalClientNames,
      destinations: destinationNames,
      hotels: hotels.map((hotel) => ({
        name: hotel.name,
        mealPlan: hotel.mealPlan,
        doubleRoomRate: hotel.doubleRoomRate,
        childRate: hotel.childRate,
        checkIn: hotel.checkIn,
        checkOut: hotel.checkOut,
      })),
      mainTransport,
      transportPricePerDay,
      numberOfDays,
      residentAdultFee,
      residentChildFee,
      nonResidentAdultFee,
      nonResidentChildFee,
      activities: activities
        .filter((item) => item.name.trim() || item.adultRate || item.childRate)
        .map((item) => ({
          name: item.name.trim(),
          adultRate: item.adultRate,
          childRate: item.childRate,
        })),
      mealsAdultRate,
      mealsChildRate,
      groupMealBuffetRate,
      trainAdultRate,
      trainChildRate,
      balloonAdultRate,
      balloonChildRate,
      flightAdultRate,
      flightChildRate,
      boatAdultRate,
      boatChildRate,
      fuelCost,
      driverAllowancePerDay,
      markupPercent,
      excludes: excludes.map((item) => item.text.trim()).filter(Boolean),
    }),
    [
      companyName,
      preparedBy,
      companyPhone,
      companyEmail,
      companyWebsite,
      companyLogo,
      selectedTheme,
      agentInfo,
      agentName,
      agentEmail,
      clientEmail,
      leadClientName,
      adults,
      children,
      tripType,
      clientType,
      additionalClientNames,
      destinationNames,
      hotels,
      mainTransport,
      transportPricePerDay,
      numberOfDays,
      residentAdultFee,
      residentChildFee,
      nonResidentAdultFee,
      nonResidentChildFee,
      activities,
      mealsAdultRate,
      mealsChildRate,
      groupMealBuffetRate,
      trainAdultRate,
      trainChildRate,
      balloonAdultRate,
      balloonChildRate,
      flightAdultRate,
      flightChildRate,
      boatAdultRate,
      boatChildRate,
      fuelCost,
      driverAllowancePerDay,
      markupPercent,
      excludes,
    ]
  );

  useEffect(() => {
    const runCalculation = async () => {
      try {
        setIsCalculating(true);

        const response = await fetch("http://localhost:5000/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadForBackend),
        });

        const data = await response.json();

        if (!response.ok || data?.success === false) {
          setCalculation(emptyCalculation);
          return;
        }

        setCalculation({ ...emptyCalculation, ...data });
      } catch (error) {
        console.error("CALCULATION ERROR:", error);
        setCalculation(emptyCalculation);
      } finally {
        setIsCalculating(false);
      }
    };

    if (agentInfo && !trialExpired) {
      runCalculation();
    }
  }, [payloadForBackend, agentInfo, trialExpired]);

  const quoteText = useMemo(() => {
    const excludesText = payloadForBackend.excludes.length
      ? payloadForBackend.excludes.map((item: string) => `• ${item}`).join("\n")
      : "• Anything not mentioned above";

    const includesText = (calculation.includes || []).map((item) => `• ${item}`).join("\n");

    return `
${companyName}
Safari Package Quotation

Prepared by: ${preparedBy || "-"}
Phone: ${companyPhone || "-"}
Email: ${companyEmail || "-"}
Website: ${companyWebsite || "-"}

Lead Client: ${leadClientName || "-"}
Additional Clients: ${safeJoin(additionalClientNames)}
Travellers: ${calculation.totalTravellers}
Adults: ${adults || "0"}
Children: ${children || "0"}
Trip Type: ${tripType || "-"}
Client Type: ${clientType === "USD" ? "Non-Resident" : "Resident"}
Destination(s): ${safeJoin(destinationNames)}
Hotel(s): ${safeJoin(hotelNames)}

Total Package Price: ${formatMoney(displayFinalTotal, displayCurrency)}
Price Per Person: ${formatMoney(displayPricePerPerson, displayCurrency)}

Includes
${includesText || "• Accommodation"}

Excludes
${excludesText}
    `.trim();
  }, [
    companyName,
    preparedBy,
    companyPhone,
    companyEmail,
    companyWebsite,
    leadClientName,
    additionalClientNames,
    calculation,
    adults,
    children,
    tripType,
    clientType,
    destinationNames,
    hotelNames,
    payloadForBackend.excludes,
    displayCurrency,
    displayFinalTotal,
    displayPricePerPerson,
  ]);

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setCompanyLogo(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const addClient = () => setOtherClients((prev) => [...prev, createClient()]);
  const addDestination = () => setDestinations((prev) => [...prev, createDestination()]);
  const addHotel = () => setHotels((prev) => [...prev, createHotel()]);
  const addActivity = () => setActivities((prev) => [...prev, createActivity()]);
  const addExclude = () => setExcludes((prev) => [...prev, createExclude()]);

  const handlePrint = () => window.print();

  const handleDownloadQuote = () => {
    const blob = new Blob([quoteText], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "quotation.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleCopyQuote = async () => {
    try {
      await navigator.clipboard.writeText(quoteText);
      alert("Quotation copied successfully");
    } catch {
      alert("Unable to copy quotation");
    }
  };

  const sendQuotationEmail = async () => {
    if (!clientEmail.trim()) {
      alert("Please enter client email");
      return;
    }

    try {
      setSendingEmail(true);

      const response = await fetch("http://localhost:5000/send-quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payloadForBackend, calculation, quoteText }),
      });

      const data = await response.json();

      if (data?.success) {
        alert(data.message || "Quotation sent successfully");
      } else {
        alert(data?.error || data?.message || "Failed to send quotation");
      }
    } catch {
      alert("Failed to send quotation");
    } finally {
      setSendingEmail(false);
    }
  };

  if (!agentInfo) {
    return (
      <div style={pageStyle}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ ...cardStyle, maxWidth: 560, width: "100%", padding: 32 }}>
            <div
              style={{
                display: "inline-block",
                background: "#EAF4FF",
                color: "#0F4C81",
                padding: "8px 14px",
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              2-HOUR FREE TRIAL
            </div>

            <h1 style={{ marginTop: 0, color: "#0F4C81", fontSize: 46 }}>Jambo Trip 360</h1>
            <p style={{ color: "#64748b", lineHeight: 1.7 }}>
              Create your agent account to start the 2-hour trial.
            </p>

            <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
              <div>
                <label style={labelStyle}>Agent Name</label>
                <input
                  style={inputStyle}
                  value={agentName}
                  placeholder="Enter travel agent name"
                  onChange={(e) => setAgentName(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Agent Email</label>
                <input
                  style={inputStyle}
                  value={agentEmail}
                  placeholder="agent@email.com"
                  onChange={(e) => setAgentEmail(e.target.value)}
                />
              </div>

              <button style={{ ...primaryButton, width: "100%", marginTop: 8 }} onClick={startTrial}>
                Start 2-Hour Trial
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (trialExpired && !isUnlocked) {
    return (
      <div style={pageStyle}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ ...cardStyle, maxWidth: 620, width: "100%", padding: 32, textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                background: "#FFF1F5",
                color: "#7B1E3A",
                padding: "8px 14px",
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              TRIAL ENDED
            </div>

            <h1 style={{ marginTop: 0, color: "#0F4C81" }}>Unlock Jambo Trip 360</h1>
            <p style={{ color: "#64748b", lineHeight: 1.7 }}>
              Your 2-hour free trial has ended. Subscribe to continue using the quotation system.
            </p>

            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: 22,
                padding: 20,
                marginTop: 18,
                textAlign: "left",
              }}
            >
              <p style={{ margin: 0, fontWeight: 800, color: "#0F4C81" }}>
                Subscription: {PAYMENT_AMOUNT}
              </p>
              <p style={{ margin: "10px 0 0", color: "#475569" }}>
                Agent: <strong>{agentInfo.name}</strong>
              </p>
              <p style={{ margin: "6px 0 0", color: "#475569" }}>
                Email: <strong>{agentInfo.email}</strong>
              </p>
              <p style={{ margin: "12px 0 0", color: "#475569" }}>
                Pay via M-Pesa. Paybill/Till will be added here.
              </p>
            </div>

            <div style={{ marginTop: 16, textAlign: "left" }}>
              <label style={labelStyle}>Activation Code</label>
              <input
                style={inputStyle}
                placeholder="Enter activation code"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
              />

              <button
                style={{ ...primaryButton, width: "100%", marginTop: 10 }}
                onClick={activateSubscription}
              >
                Activate 30 Days
              </button>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
              {whatsappLink ? (
                <a href={whatsappLink} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <button style={primaryButton}>Send Payment Confirmation</button>
                </a>
              ) : (
                <button style={primaryButton} onClick={() => alert("Add your WhatsApp number in WHATSAPP_NUMBER first.")}>
                  Send Payment Confirmation
                </button>
              )}

              <button style={secondaryButton} onClick={resetDemoTrial}>
                Reset Demo Trial
              </button>
            </div>

            <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 18 }}>
              Enter activation code after payment confirmation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 1520, margin: "0 auto", padding: 18 }}>
        <div style={{ ...cardStyle, padding: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div
                style={{
                  display: "inline-block",
                  background: selectedTheme.secondary,
                  color: selectedTheme.primary,
                  padding: "7px 14px",
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: 12,
                  letterSpacing: 0.5,
                  marginBottom: 12,
                }}
              >
                SMART SAFARI PRICING & QUOTATION SYSTEM
              </div>
              <h1 style={{ margin: 0, fontSize: 50, fontWeight: 900, color: selectedTheme.primary, lineHeight: 1.05 }}>
                Jambo Trip 360
              </h1>
              <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 20 }}>
                Premium safari costing, branded quotation preview, and client delivery.
              </p>
              <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14 }}>
                Agent: <strong>{agentInfo.name}</strong> | Trial time left: <strong>{timeLeft}</strong>
                {isUnlocked && (
                  <>
                    {" "} | Activated until: <strong>{formatDate(subscriptionExpiry)}</strong>
                  </>
                )}
              </p>
            </div>

            <div
              style={{
                minWidth: 250,
                background: `linear-gradient(135deg, ${selectedTheme.primary} 0%, ${selectedTheme.accent} 100%)`,
                color: "#ffffff",
                borderRadius: 22,
                padding: 18,
                boxShadow: "0 14px 34px rgba(0,0,0,0.12)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.95 }}>
                {isUnlocked ? "SUBSCRIPTION ACTIVE" : "TRIAL TIME LEFT"}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>
                {isUnlocked ? "30 Days" : timeLeft}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(390px, 0.85fr)", gap: 20, alignItems: "start" }}>
          <div>
            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Agency Details</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Company Name</label>
                  <input style={inputStyle} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Prepared By</label>
                  <input style={inputStyle} value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Website</label>
                  <input style={inputStyle} value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Company Colour Theme</label>
                  <select style={inputStyle} value={themeName} onChange={(e) => setThemeName(e.target.value)}>
                    {themeOptions.map((theme) => (
                      <option key={theme.name} value={theme.name}>{theme.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>Company Logo</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Client Details</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Lead Client Name</label>
                  <input style={inputStyle} value={leadClientName} onChange={(e) => setLeadClientName(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Client Type / Currency</label>
                  <select style={inputStyle} value={clientType} onChange={(e) => setClientType(e.target.value as CurrencyMode)}>
                    <option value="KES">Resident - KES</option>
                    <option value="USD">Non-Resident - USD</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Adults</label>
                  <input style={inputStyle} type="number" min="0" value={adults} onChange={(e) => setAdults(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Children</label>
                  <input style={inputStyle} type="number" min="0" value={children} onChange={(e) => setChildren(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Trip Type</label>
                  <input style={inputStyle} value={tripType} onChange={(e) => setTripType(e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <strong>Destinations</strong>
                  <button style={primaryButton} onClick={addDestination}>Add Destination</button>
                </div>

                {destinations.map((destination) => (
                  <div key={destination.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
                    <input
                      style={inputStyle}
                      placeholder="Destination"
                      value={destination.name}
                      onChange={(e) =>
                        setDestinations((prev) =>
                          prev.map((item) => item.id === destination.id ? { ...item, name: e.target.value } : item)
                        )
                      }
                    />
                    <button style={secondaryButton} onClick={() => setDestinations((prev) => prev.length === 1 ? prev : prev.filter((item) => item.id !== destination.id))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <strong>Additional Clients</strong>
                  <button style={primaryButton} onClick={addClient}>Add Client</button>
                </div>

                {otherClients.length === 0 && <div style={{ color: "#64748b", fontSize: 14 }}>No additional clients added.</div>}

                {otherClients.map((client) => (
                  <div key={client.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
                    <input
                      style={inputStyle}
                      placeholder="Additional client name"
                      value={client.name}
                      onChange={(e) =>
                        setOtherClients((prev) =>
                          prev.map((item) => item.id === client.id ? { ...item, name: e.target.value } : item)
                        )
                      }
                    />
                    <button style={secondaryButton} onClick={() => setOtherClients((prev) => prev.filter((item) => item.id !== client.id))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>Hotel Details</h2>
                <button style={primaryButton} onClick={addHotel}>Add Hotel</button>
              </div>

              {hotels.map((hotel, index) => (
                <div key={hotel.id} style={{ border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 20, padding: 16, marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <strong>Hotel {index + 1}</strong>
                    <button style={secondaryButton} onClick={() => setHotels((prev) => prev.length === 1 ? prev : prev.filter((item) => item.id !== hotel.id))}>
                      Remove
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Hotel Name</label>
                      <input
                        style={inputStyle}
                        value={hotel.name}
                        onChange={(e) =>
                          setHotels((prev) => prev.map((item) => item.id === hotel.id ? { ...item, name: e.target.value } : item))
                        }
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Meal Plan</label>
                      <select
                        style={inputStyle}
                        value={hotel.mealPlan}
                        onChange={(e) =>
                          setHotels((prev) => prev.map((item) => item.id === hotel.id ? { ...item, mealPlan: e.target.value } : item))
                        }
                      >
                        <option value="BB">BB</option>
                        <option value="Half Board">Half Board</option>
                        <option value="Full Board">Full Board</option>
                        <option value="All Inclusive">All Inclusive</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Double Room Rate</label>
                      <input
                        style={inputStyle}
                        type="number"
                        min="0"
                        value={hotel.doubleRoomRate}
                        onChange={(e) =>
                          setHotels((prev) => prev.map((item) => item.id === hotel.id ? { ...item, doubleRoomRate: e.target.value } : item))
                        }
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Child Rate</label>
                      <input
                        style={inputStyle}
                        type="number"
                        min="0"
                        value={hotel.childRate}
                        onChange={(e) =>
                          setHotels((prev) => prev.map((item) => item.id === hotel.id ? { ...item, childRate: e.target.value } : item))
                        }
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Check In</label>
                      <input
                        style={inputStyle}
                        type="date"
                        value={hotel.checkIn}
                        onChange={(e) =>
                          setHotels((prev) => prev.map((item) => item.id === hotel.id ? { ...item, checkIn: e.target.value } : item))
                        }
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Check Out</label>
                      <input
                        style={inputStyle}
                        type="date"
                        value={hotel.checkOut}
                        onChange={(e) =>
                          setHotels((prev) => prev.map((item) => item.id === hotel.id ? { ...item, checkOut: e.target.value } : item))
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Transport</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Main Transport</label>
                  <input style={inputStyle} value={mainTransport} onChange={(e) => setMainTransport(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Transport Price Per Day</label>
                  <input style={inputStyle} type="number" min="0" value={transportPricePerDay} onChange={(e) => setTransportPricePerDay(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Number of Days</label>
                  <input style={inputStyle} type="number" min="0" value={numberOfDays} onChange={(e) => setNumberOfDays(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Park Fees</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Resident Adult Fee (KES)</label>
                  <input style={inputStyle} type="number" min="0" value={residentAdultFee} onChange={(e) => setResidentAdultFee(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Resident Child Fee (KES)</label>
                  <input style={inputStyle} type="number" min="0" value={residentChildFee} onChange={(e) => setResidentChildFee(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Non-Resident Adult Fee (USD)</label>
                  <input style={inputStyle} type="number" min="0" value={nonResidentAdultFee} onChange={(e) => setNonResidentAdultFee(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Non-Resident Child Fee (USD)</label>
                  <input style={inputStyle} type="number" min="0" value={nonResidentChildFee} onChange={(e) => setNonResidentChildFee(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>Activities</h2>
                <button style={primaryButton} onClick={addActivity}>Add Activity</button>
              </div>

              {activities.map((activity) => (
                <div key={activity.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 0.8fr auto", gap: 10, marginBottom: 10 }}>
                  <input
                    style={inputStyle}
                    placeholder="Activity name"
                    value={activity.name}
                    onChange={(e) =>
                      setActivities((prev) => prev.map((item) => item.id === activity.id ? { ...item, name: e.target.value } : item))
                    }
                  />
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    placeholder="Adult Rate"
                    value={activity.adultRate}
                    onChange={(e) =>
                      setActivities((prev) => prev.map((item) => item.id === activity.id ? { ...item, adultRate: e.target.value } : item))
                    }
                  />
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    placeholder="Child Rate"
                    value={activity.childRate}
                    onChange={(e) =>
                      setActivities((prev) => prev.map((item) => item.id === activity.id ? { ...item, childRate: e.target.value } : item))
                    }
                  />
                  <button style={secondaryButton} onClick={() => setActivities((prev) => prev.filter((item) => item.id !== activity.id))}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Meals & Other Extras</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <InputField label="Meals Adult Rate" value={mealsAdultRate} setValue={setMealsAdultRate} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Meals Child Rate" value={mealsChildRate} setValue={setMealsChildRate} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Group Buffet Rate" value={groupMealBuffetRate} setValue={setGroupMealBuffetRate} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Train Adult Rate" value={trainAdultRate} setValue={setTrainAdultRate} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Train Child Rate" value={trainChildRate} setValue={setTrainChildRate} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Balloon Adult Rate" value={balloonAdultRate} setValue={setBalloonAdultRate} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Balloon Child Rate" value={balloonChildRate} setValue={setBalloonChildRate} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Flight Adult Rate" value={flightAdultRate} setValue={setFlightAdultRate} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Flight Child Rate" value={flightChildRate} setValue={setFlightChildRate} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Boat Adult Rate" value={boatAdultRate} setValue={setBoatAdultRate} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Boat Child Rate" value={boatChildRate} setValue={setBoatChildRate} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Fuel Cost" value={fuelCost} setValue={setFuelCost} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Driver Allowance Per Day" value={driverAllowancePerDay} setValue={setDriverAllowancePerDay} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Markup %" value={markupPercent} setValue={setMarkupPercent} inputStyle={inputStyle} labelStyle={labelStyle} />
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>Excludes</h2>
                <button style={primaryButton} onClick={addExclude}>Add Exclude</button>
              </div>

              {excludes.map((item) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
                  <input
                    style={inputStyle}
                    placeholder="Excluded item"
                    value={item.text}
                    onChange={(e) =>
                      setExcludes((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, text: e.target.value } : entry))
                    }
                  />
                  <button style={secondaryButton} onClick={() => setExcludes((prev) => prev.length === 1 ? prev : prev.filter((entry) => entry.id !== item.id))}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ position: "sticky", top: 18 }}>
              <div style={cardStyle}>
                <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 22 }}>Client Quotation</h2>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <button style={primaryButton} onClick={handlePrint}>Print / Save PDF</button>
                  <button style={secondaryButton} onClick={handleDownloadQuote}>Download Quote</button>
                  <button style={secondaryButton} onClick={handleCopyQuote}>Copy Quote</button>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Client Email</label>
                  <input style={inputStyle} value={clientEmail} placeholder="client@email.com" onChange={(e) => setClientEmail(e.target.value)} />
                </div>

                <button style={{ ...primaryButton, width: "100%", opacity: sendingEmail ? 0.7 : 1 }} onClick={sendQuotationEmail} disabled={sendingEmail}>
                  {sendingEmail ? "Sending..." : "Send Quotation Email"}
                </button>
              </div>

              <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                <div style={{ background: `linear-gradient(135deg, ${selectedTheme.primary} 0%, ${selectedTheme.accent} 100%)`, color: "#ffffff", padding: 24 }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ width: 82, height: 82, background: "#ffffff", borderRadius: 12, overflow: "hidden", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {companyLogo ? (
                        <img src={companyLogo} alt="Company Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
                      ) : (
                        <span style={{ color: selectedTheme.primary, fontWeight: 800 }}>Logo</span>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900 }}>{companyName || "Company Name"}</div>
                      <div style={{ fontSize: 13, marginTop: 5, opacity: 0.95 }}>
                        {companyPhone || "-"} | {companyEmail || "-"} | {companyWebsite || "-"}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 5, opacity: 0.95 }}>Prepared by: {preparedBy || "-"}</div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: 22 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 20, color: selectedTheme.primary }}>
                    Client Travel Quotation
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid #e2e8f0" }}>
                    <div><strong>Lead Client</strong><br />{leadClientName || "-"}</div>
                    <div><strong>Additional Clients</strong><br />{safeJoin(additionalClientNames)}</div>
                    <div><strong>Destination</strong><br />{safeJoin(destinationNames)}</div>
                    <div><strong>Trip Type</strong><br />{tripType || "-"}</div>
                    <div><strong>Client Type</strong><br />{clientType === "USD" ? "Non-Resident" : "Resident"}</div>
                    <div><strong>Currency</strong><br />{displayCurrency}</div>
                    <div><strong>Adults</strong><br />{adults || "0"}</div>
                    <div><strong>Children</strong><br />{children || "0"}</div>
                    <div><strong>Total Travellers</strong><br />{calculation.totalTravellers}</div>
                    <div><strong>Trip Days</strong><br />{numberOfDays || "0"}</div>
                    <div><strong>Hotel(s)</strong><br />{safeJoin(hotelNames)}</div>
                    <div><strong>Total Nights</strong><br />{calculation.totalNights}</div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ color: selectedTheme.primary, marginBottom: 10 }}>Package Summary</h4>
                    <div style={{ display: "grid", gap: 8, background: selectedTheme.secondary, borderRadius: 18, padding: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center", fontSize: 18 }}>
                        <span><strong>Total Package Price</strong></span>
                        <strong style={{ color: selectedTheme.primary, textAlign: "right", minWidth: 120, maxWidth: 165, wordBreak: "break-word" }}>
                          {formatMoney(displayFinalTotal, displayCurrency)}
                        </strong>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center", fontSize: 17 }}>
                        <span><strong>Price Per Person</strong></span>
                        <strong style={{ color: selectedTheme.accent, textAlign: "right", minWidth: 120, maxWidth: 165, wordBreak: "break-word" }}>
                          {formatMoney(displayPricePerPerson, displayCurrency)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: selectedTheme.secondary, border: `1px solid ${selectedTheme.accent}33`, padding: 14, borderRadius: 18, marginBottom: 16, color: selectedTheme.primary, fontWeight: 700 }}>
                    {isCalculating ? "Calculating..." : calculation.transportCalculationText || "Transport Calculation: -"}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <h4 style={{ color: selectedTheme.primary, marginBottom: 8 }}>Includes</h4>
                      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                        {(calculation.includes || []).map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 style={{ color: selectedTheme.primary, marginBottom: 8 }}>Excludes</h4>
                      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                        {payloadForBackend.excludes.length > 0 ? (
                          payloadForBackend.excludes.map((item: string, index: number) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))
                        ) : (
                          <li>Anything not mentioned above</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <strong style={{ color: selectedTheme.primary }}>System Status</strong>
                <div style={{ marginTop: 10, color: "#475569" }}>
                  {isCalculating ? "Calculating quotation..." : "Ready"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  setValue,
  inputStyle,
  labelStyle,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        style={inputStyle}
        type="number"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}