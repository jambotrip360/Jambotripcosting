import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import "./App.css";

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
type TripType = "Safari" | "Day Trip" | "Vacation" | "Honeymoon" | "Others";

type AgentInfo = {
  name: string;
  email: string;
};

type TrialStatus = {
  allowed: boolean;
  email?: string;
  unlocked?: boolean;
  remainingMs?: number;
  message?: string;
};

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
  extrasTotal: number;
  markupAmount: number;
  finalTotal: number;
  pricePerPerson: number;
  displayFinalTotal?: number;
  displayPricePerPerson?: number;
  includes?: string[];
  transportCalculationText?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const AGENT_STORAGE_KEY = "jambo_trip_agent_info";
const TRIAL_EMAIL_KEY = "jambo_trip_trial_email";
const ACTIVATION_CODE = "JAMBO30";
const PAYMENT_AMOUNT = "KES 5,000 per month";
const WHATSAPP_NUMBER = "";

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
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
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
    name: "",
    adultRate: "",
    childRate: "",
  };
}

function createExclude(): ExcludeItem {
  return { id: makeId(), text: "" };
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
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

function calculateNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

const responsiveTwo = "repeat(auto-fit, minmax(220px, 1fr))";
const responsiveThree = "repeat(auto-fit, minmax(180px, 1fr))";

export default function App() {
  const [agentName, setAgentName] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);

  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState("");
  const [timeLeft, setTimeLeft] = useState("00:00:00");
  const [trialExpired, setTrialExpired] = useState(false);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activationCode, setActivationCode] = useState("");

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
  const [tripType, setTripType] = useState<TripType>("Safari");
  const [customTripType, setCustomTripType] = useState("");
  const [clientType, setClientType] = useState<CurrencyMode>("KES");

  const [otherClients, setOtherClients] = useState<ClientItem[]>([]);
  const [destinations, setDestinations] = useState<DestinationItem[]>([createDestination()]);
  const [hotels, setHotels] = useState<HotelItem[]>([createHotel()]);
  const [activities, setActivities] = useState<ActivityItem[]>([createActivity()]);
  const [excludes, setExcludes] = useState<ExcludeItem[]>([
    { id: makeId(), text: "" },
    { id: makeId(), text: "" },
    { id: makeId(), text: "" },
  ]);

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

  const [markupPercent, setMarkupPercent] = useState("0");

  const [calculation, setCalculation] = useState<CalculationResponse>(emptyCalculation);
  const [isCalculating, setIsCalculating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const selectedTheme =
    themeOptions.find((theme) => theme.name === themeName) || themeOptions[0];

  const isDayTrip = tripType === "Day Trip";
  const displayTripType =
    tripType === "Others" && customTripType.trim()
      ? customTripType.trim()
      : tripType;

  const displayCurrency: CurrencyMode = calculation.currencyMode || clientType;
  const displayFinalTotal = calculation.displayFinalTotal ?? calculation.finalTotal;
  const displayPricePerPerson = calculation.displayPricePerPerson ?? calculation.pricePerPerson;

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f9ff 0%, #eef4fb 45%, #ffffff 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
    overflowX: "hidden",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.96)",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    boxShadow: "0 12px 34px rgba(15,23,42,0.06)",
    padding: 22,
    marginBottom: 18,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
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
    minWidth: 0,
  };

  const primaryButton: React.CSSProperties = {
    background: `linear-gradient(135deg, ${selectedTheme.primary} 0%, ${selectedTheme.accent} 100%)`,
    color: "#ffffff",
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "normal",
  };

  const secondaryButton: React.CSSProperties = {
    background: "#ffffff",
    color: "#1e293b",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "normal",
  };

  const additionalClientNames = useMemo(
    () => otherClients.map((client) => client.name.trim()).filter(Boolean),
    [otherClients]
  );

  const destinationNames = useMemo(
    () => destinations.map((destination) => destination.name.trim()).filter(Boolean),
    [destinations]
  );

  const hotelNames = useMemo(
    () => (isDayTrip ? [] : hotels.map((hotel) => hotel.name.trim()).filter(Boolean)),
    [hotels, isDayTrip]
  );

  const totalNights = useMemo(() => {
    if (isDayTrip) return 0;

    const nightsFromHotels = hotels.reduce((sum, hotel) => {
      return sum + calculateNights(hotel.checkIn, hotel.checkOut);
    }, 0);

    if (nightsFromHotels > 0) return nightsFromHotels;

    return Math.max(0, toNumber(numberOfDays) - 1);
  }, [hotels, isDayTrip, numberOfDays]);

  const getParkFeeRates = () => {
    if (clientType === "USD") {
      return {
        adultRate: toNumber(nonResidentAdultFee),
        childRate: toNumber(nonResidentChildFee),
      };
    }

    return {
      adultRate: toNumber(residentAdultFee),
      childRate: toNumber(residentChildFee),
    };
  };

  const frontendCalculation = useMemo<CalculationResponse>(() => {
    const adultCount = toNumber(adults);
    const childCount = toNumber(children);
    const travellers = adultCount + childCount;

    const parkRates = getParkFeeRates();

    const hotelTotal = isDayTrip
      ? 0
      : hotels.reduce((sum, hotel) => {
          const nights = calculateNights(hotel.checkIn, hotel.checkOut) || totalNights;
          return (
            sum +
            toNumber(hotel.doubleRoomRate) * nights +
            toNumber(hotel.childRate) * childCount * nights
          );
        }, 0);

    const mainTransportTotal = isDayTrip
      ? toNumber(transportPricePerDay)
      : toNumber(transportPricePerDay) * toNumber(numberOfDays);

    const parkFeesTotal = isDayTrip
      ? parkRates.adultRate * adultCount + parkRates.childRate * childCount
      : (parkRates.adultRate * adultCount + parkRates.childRate * childCount) * totalNights;

    const activitiesTotal = activities.reduce((sum, item) => {
      return sum + toNumber(item.adultRate) * adultCount + toNumber(item.childRate) * childCount;
    }, 0);

    const mealsTotal =
      toNumber(mealsAdultRate) * adultCount +
      toNumber(mealsChildRate) * childCount +
      toNumber(groupMealBuffetRate);

    const otherTransportTotal =
      toNumber(trainAdultRate) * adultCount +
      toNumber(trainChildRate) * childCount +
      toNumber(balloonAdultRate) * adultCount +
      toNumber(balloonChildRate) * childCount +
      toNumber(flightAdultRate) * adultCount +
      toNumber(flightChildRate) * childCount +
      toNumber(boatAdultRate) * adultCount +
      toNumber(boatChildRate) * childCount;

    const subtotal =
      hotelTotal +
      mainTransportTotal +
      parkFeesTotal +
      activitiesTotal +
      mealsTotal +
      otherTransportTotal;

    const markupAmount = subtotal * (toNumber(markupPercent) / 100);
    const finalTotal = subtotal + markupAmount;
    const pricePerPerson = travellers > 0 ? finalTotal / travellers : 0;

    const includes = [
      !isDayTrip && hotelNames.length ? "Accommodation" : "",
      mainTransport !== "None" && mainTransport ? `Transport by ${mainTransport}` : "",
      parkFeesTotal > 0 ? "Park Fees" : "",
      activities.filter((a) => a.name.trim()).length
        ? `Activities: ${activities.map((a) => a.name.trim()).filter(Boolean).join(", ")}`
        : "",
      mealsTotal > 0 ? "Meals" : "",
      "Professional driver guide",
    ].filter(Boolean) as string[];

    return {
      ...emptyCalculation,
      success: true,
      currencyMode: clientType,
      totalTravellers: travellers,
      totalNights,
      hotelTotal,
      hotelPerPerson: travellers > 0 ? hotelTotal / travellers : 0,
      mainTransportTotal,
      transportPerPerson: travellers > 0 ? mainTransportTotal / travellers : 0,
      parkFeesTotal,
      parkFeePerPerson: travellers > 0 ? parkFeesTotal / travellers : 0,
      activitiesTotal,
      mealsTotal,
      otherTransportTotal,
      extrasTotal: otherTransportTotal + mealsTotal,
      markupAmount,
      finalTotal,
      pricePerPerson,
      displayFinalTotal: finalTotal,
      displayPricePerPerson: pricePerPerson,
      includes,
      transportCalculationText: "",
    };
  }, [
    adults,
    children,
    clientType,
    residentAdultFee,
    residentChildFee,
    nonResidentAdultFee,
    nonResidentChildFee,
    hotels,
    totalNights,
    isDayTrip,
    transportPricePerDay,
    numberOfDays,
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
    markupPercent,
    hotelNames,
    mainTransport,
  ]);

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
      tripType: displayTripType,
      baseTripType: tripType,
      customTripType,
      isDayTrip,
      clientType,
      otherClients: additionalClientNames,
      destinations: destinationNames,
      hotels: isDayTrip
        ? []
        : hotels.map((hotel) => ({
            name: hotel.name,
            mealPlan: hotel.mealPlan,
            doubleRoomRate: hotel.doubleRoomRate,
            childRate: hotel.childRate,
            checkIn: hotel.checkIn,
            checkOut: hotel.checkOut,
          })),
      totalNights,
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
      displayTripType,
      tripType,
      customTripType,
      isDayTrip,
      clientType,
      additionalClientNames,
      destinationNames,
      hotels,
      totalNights,
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
      markupPercent,
      excludes,
    ]
  );

  useEffect(() => {
    const savedAgent = localStorage.getItem(AGENT_STORAGE_KEY);
    const savedEmail = localStorage.getItem(TRIAL_EMAIL_KEY);

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

    if (savedEmail) {
      checkTrialStatus(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (!trialStatus?.remainingMs) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, (trialStatus.remainingMs || 0) - 1000);
      setTrialStatus((prev) => (prev ? { ...prev, remainingMs: remaining } : prev));
      setTimeLeft(formatTimeLeft(remaining));

      if (remaining <= 0 && !isUnlocked) {
        setTrialExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [trialStatus?.remainingMs, isUnlocked]);

  useEffect(() => {
    const runCalculation = async () => {
      try {
        setIsCalculating(true);

        const response = await fetch(`${API_BASE}/calculate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadForBackend),
        });

        const data = await response.json();

        if (!response.ok || data?.success === false) {
          setCalculation(frontendCalculation);
          return;
        }

        setCalculation({ ...frontendCalculation, ...data, transportCalculationText: "" });
      } catch (error) {
        console.error("CALCULATION ERROR:", error);
        setCalculation(frontendCalculation);
      } finally {
        setIsCalculating(false);
      }
    };

    if (agentInfo && !trialExpired) {
      runCalculation();
    }
  }, [payloadForBackend, agentInfo, trialExpired, frontendCalculation]);

  const checkTrialStatus = async (email: string) => {
    try {
      setTrialLoading(true);
      setTrialError("");

      const response = await fetch(
        `${API_BASE}/trial/status?email=${encodeURIComponent(email)}`
      );

      const data = await response.json();
      setTrialStatus(data);

      if (data.allowed || data.unlocked) {
        setIsUnlocked(Boolean(data.unlocked));
        setTrialExpired(false);
        setTimeLeft(formatTimeLeft(data.remainingMs || 0));
      } else {
        setTrialExpired(true);
      }
    } catch {
      setTrialError("Unable to connect to trial server. Make sure backend is running.");
    } finally {
      setTrialLoading(false);
    }
  };

  const startTrial = async () => {
    if (!agentName.trim() || !agentEmail.trim() || !agentEmail.includes("@")) {
      setTrialError("Please enter agent name and a valid email.");
      return;
    }

    try {
      setTrialLoading(true);
      setTrialError("");

      const cleanEmail = agentEmail.trim().toLowerCase();

      const response = await fetch(`${API_BASE}/trial/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await response.json();

      if (data.allowed || data.unlocked) {
        const info = { name: agentName.trim(), email: cleanEmail };
        localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(info));
        localStorage.setItem(TRIAL_EMAIL_KEY, cleanEmail);

        setAgentInfo(info);
        setTrialStatus(data);
        setIsUnlocked(Boolean(data.unlocked));
        setTrialExpired(false);
        setTimeLeft(formatTimeLeft(data.remainingMs || 0));
      } else {
        setTrialStatus(data);
        setTrialExpired(true);
        setTrialError(data.message || "Trial ended. Please unlock full version.");
      }
    } catch {
      setTrialError("Unable to start trial. Make sure backend is running.");
    } finally {
      setTrialLoading(false);
    }
  };

  const activateSubscription = () => {
    if (activationCode.trim().toUpperCase() !== ACTIVATION_CODE) {
      alert("Invalid activation code");
      return;
    }

    setIsUnlocked(true);
    setTrialExpired(false);
    setActivationCode("");
    alert("✅ Activated");
  };

  const resetDemoTrial = () => {
    localStorage.removeItem(AGENT_STORAGE_KEY);
    localStorage.removeItem(TRIAL_EMAIL_KEY);

    setAgentInfo(null);
    setAgentName("");
    setAgentEmail("");
    setTrialStatus(null);
    setIsUnlocked(false);
    setTrialExpired(false);
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

  const quoteText = useMemo(() => {
    const excludesText = payloadForBackend.excludes.length
      ? payloadForBackend.excludes.map((item: string) => `• ${item}`).join("\n")
      : "• Anything not mentioned above";

    const includesText = (calculation.includes || []).map((item) => `• ${item}`).join("\n");

    return `
${companyName}
Travel Package Quotation

Prepared by: ${preparedBy || "-"}
Phone: ${companyPhone || "-"}
Email: ${companyEmail || "-"}
Website: ${companyWebsite || "-"}

Lead Client: ${leadClientName || "-"}
Additional Clients: ${safeJoin(additionalClientNames)}
Travellers: ${calculation.totalTravellers}
Adults: ${adults || "0"}
Children: ${children || "0"}
Trip Type: ${displayTripType || "-"}
Client Type: ${clientType === "USD" ? "Non-Resident" : "Resident"}
Destination(s): ${safeJoin(destinationNames)}
Hotel(s): ${isDayTrip ? "-" : safeJoin(hotelNames)}

Total Package Price: ${formatMoney(displayFinalTotal, displayCurrency)}
Price Per Person: ${formatMoney(displayPricePerPerson, displayCurrency)}

Includes
${includesText || "• Transport"}

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
    displayTripType,
    clientType,
    destinationNames,
    hotelNames,
    payloadForBackend.excludes,
    displayCurrency,
    displayFinalTotal,
    displayPricePerPerson,
    isDayTrip,
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

      const response = await fetch(`${API_BASE}/send-quotation`, {
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

            <h1 style={{ marginTop: 0, color: "#0F4C81", fontSize: "clamp(32px, 8vw, 46px)" }}>Jambo Trip 360°</h1>
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

              {trialError && <p style={{ color: "#dc2626", margin: 0 }}>{trialError}</p>}

              <button
                style={{ ...primaryButton, width: "100%", marginTop: 8, opacity: trialLoading ? 0.7 : 1 }}
                onClick={startTrial}
                disabled={trialLoading}
              >
                {trialLoading ? "Checking..." : "Start 2-Hour Trial"}
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

            <h1 style={{ marginTop: 0, color: "#0F4C81" }}>Unlock Jambo Trip 360°</h1>
            <p style={{ color: "#64748b", lineHeight: 1.7 }}>
              Your free trial has ended. Subscribe to continue using the quotation system.
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
                Activate
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 1520, margin: "0 auto", padding: "14px", boxSizing: "border-box" }}>
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
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
              <h1 style={{ margin: 0, fontSize: "clamp(34px, 7vw, 50px)", fontWeight: 900, color: selectedTheme.primary, lineHeight: 1.05 }}>
                Jambo Trip 360°
              </h1>
              <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: "clamp(15px, 4vw, 20px)" }}>
                Premium safari costing, branded quotation preview, and client delivery.
              </p>
              <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14 }}>
                Agent: <strong>{agentInfo.name}</strong> | Trial time left: <strong>{isUnlocked ? "Unlocked" : timeLeft}</strong>
              </p>
            </div>

            <div
              style={{
                minWidth: 220,
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
                {isUnlocked ? "Unlocked" : timeLeft}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 520px), 1fr))", gap: 20, alignItems: "start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Agency Details</h2>

              <div style={{ display: "grid", gridTemplateColumns: responsiveTwo, gap: 14 }}>
                <InputText label="Company Name" value={companyName} setValue={setCompanyName} inputStyle={inputStyle} labelStyle={labelStyle} placeholder="Company name" />
                <InputText label="Prepared By" value={preparedBy} setValue={setPreparedBy} inputStyle={inputStyle} labelStyle={labelStyle} placeholder="Prepared by" />
                <InputText label="Phone" value={companyPhone} setValue={setCompanyPhone} inputStyle={inputStyle} labelStyle={labelStyle} placeholder="Phone number" />
                <InputText label="Email" value={companyEmail} setValue={setCompanyEmail} inputStyle={inputStyle} labelStyle={labelStyle} placeholder="Company email" />
                <InputText label="Website" value={companyWebsite} setValue={setCompanyWebsite} inputStyle={inputStyle} labelStyle={labelStyle} placeholder="Website" />
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

              <div style={{ display: "grid", gridTemplateColumns: responsiveThree, gap: 14 }}>
                <InputText label="Lead Client Name" value={leadClientName} setValue={setLeadClientName} inputStyle={inputStyle} labelStyle={labelStyle} placeholder="Lead client name" />

                <div>
                  <label style={labelStyle}>Client Type / Currency</label>
                  <select style={inputStyle} value={clientType} onChange={(e) => setClientType(e.target.value as CurrencyMode)}>
                    <option value="KES">Resident - KES</option>
                    <option value="USD">Non-Resident - USD</option>
                  </select>
                </div>

                <InputField label="Adults" value={adults} setValue={setAdults} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Children" value={children} setValue={setChildren} inputStyle={inputStyle} labelStyle={labelStyle} />

                <div>
                  <label style={labelStyle}>Trip Type</label>
                  <select style={inputStyle} value={tripType} onChange={(e) => setTripType(e.target.value as TripType)}>
                    <option value="Safari">Safari</option>
                    <option value="Day Trip">Day Trip</option>
                    <option value="Vacation">Vacation</option>
                    <option value="Honeymoon">Honeymoon</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                {tripType === "Others" && (
                  <InputText label="Custom Trip Type" value={customTripType} setValue={setCustomTripType} inputStyle={inputStyle} labelStyle={labelStyle} placeholder="Write custom trip type" />
                )}
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <strong>Destinations</strong>
                  <button style={primaryButton} onClick={addDestination}>Add Destination</button>
                </div>

                {destinations.map((destination) => (
                  <div key={destination.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, marginBottom: 10 }}>
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
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <strong>Additional Clients</strong>
                  <button style={primaryButton} onClick={addClient}>Add Client</button>
                </div>

                {otherClients.length === 0 && <div style={{ color: "#64748b", fontSize: 14 }}>No additional clients added.</div>}

                {otherClients.map((client) => (
                  <div key={client.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, marginBottom: 10 }}>
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

            {!isDayTrip && (
              <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  <h2 style={{ margin: 0, fontSize: 22 }}>Hotel Details</h2>
                  <button style={primaryButton} onClick={addHotel}>Add Hotel</button>
                </div>

                {hotels.map((hotel, index) => (
                  <div key={hotel.id} style={{ border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 20, padding: 16, marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                      <strong>Hotel {index + 1}</strong>
                      <button style={secondaryButton} onClick={() => setHotels((prev) => prev.length === 1 ? prev : prev.filter((item) => item.id !== hotel.id))}>
                        Remove
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: responsiveTwo, gap: 14 }}>
                      <HotelInput label="Hotel Name" value={hotel.name} hotelId={hotel.id} field="name" setHotels={setHotels} inputStyle={inputStyle} labelStyle={labelStyle} placeholder="Mara Sopa Lodge" />
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
                      <HotelInput label="Double Room Rate" type="number" value={hotel.doubleRoomRate} hotelId={hotel.id} field="doubleRoomRate" setHotels={setHotels} inputStyle={inputStyle} labelStyle={labelStyle} />
                      <HotelInput label="Child Rate" type="number" value={hotel.childRate} hotelId={hotel.id} field="childRate" setHotels={setHotels} inputStyle={inputStyle} labelStyle={labelStyle} />
                      <HotelInput label="Check In" type="date" value={hotel.checkIn} hotelId={hotel.id} field="checkIn" setHotels={setHotels} inputStyle={inputStyle} labelStyle={labelStyle} />
                      <HotelInput label="Check Out" type="date" value={hotel.checkOut} hotelId={hotel.id} field="checkOut" setHotels={setHotels} inputStyle={inputStyle} labelStyle={labelStyle} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Transport</h2>
              <div style={{ display: "grid", gridTemplateColumns: responsiveTwo, gap: 14 }}>
                <InputText label="Main Transport" value={mainTransport} setValue={setMainTransport} inputStyle={inputStyle} labelStyle={labelStyle} placeholder="Landcruiser" />
                <InputField label={isDayTrip ? "Transport Total Cost" : "Transport Price Per Day"} value={transportPricePerDay} setValue={setTransportPricePerDay} inputStyle={inputStyle} labelStyle={labelStyle} />
                {!isDayTrip && (
                  <InputField label="Number of Days" value={numberOfDays} setValue={setNumberOfDays} inputStyle={inputStyle} labelStyle={labelStyle} />
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Park Fees</h2>
              <div style={{ display: "grid", gridTemplateColumns: responsiveTwo, gap: 14 }}>
                <InputField label="Resident Adult Fee (KES)" value={residentAdultFee} setValue={setResidentAdultFee} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Resident Child Fee (KES)" value={residentChildFee} setValue={setResidentChildFee} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Non-Resident Adult Fee (USD)" value={nonResidentAdultFee} setValue={setNonResidentAdultFee} inputStyle={inputStyle} labelStyle={labelStyle} />
                <InputField label="Non-Resident Child Fee (USD)" value={nonResidentChildFee} setValue={setNonResidentChildFee} inputStyle={inputStyle} labelStyle={labelStyle} />
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>Activities</h2>
                <button style={primaryButton} onClick={addActivity}>Add Activity</button>
              </div>

              {activities.map((activity) => (
                <div key={activity.id} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 10, marginBottom: 10 }}>
                  <input
                    style={inputStyle}
                    placeholder="Giraffe Centre"
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
                  <button style={secondaryButton} onClick={() => setActivities((prev) => setSafeRemove(prev, activity.id, createActivity))}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 22 }}>Meals & Other Extras</h2>
              <div style={{ display: "grid", gridTemplateColumns: responsiveTwo, gap: 14 }}>
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
                <InputField label="Markup %" value={markupPercent} setValue={setMarkupPercent} inputStyle={inputStyle} labelStyle={labelStyle} />
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>Excludes</h2>
                <button style={primaryButton} onClick={addExclude}>Add Exclude</button>
              </div>

              {excludes.map((item, index) => {
                const defaultPlaceholders = ["International flights", "Visa fees", "Personal expenses"];
                return (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, marginBottom: 10 }}>
                    <input
                      style={inputStyle}
                      placeholder={defaultPlaceholders[index] || "Excluded item"}
                      value={item.text}
                      onChange={(e) =>
                        setExcludes((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, text: e.target.value } : entry))
                      }
                    />
                    <button style={secondaryButton} onClick={() => setExcludes((prev) => prev.length === 1 ? prev : prev.filter((entry) => entry.id !== item.id))}>
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
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
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ width: 82, height: 82, background: "#ffffff", borderRadius: 12, overflow: "hidden", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {companyLogo ? (
                        <img src={companyLogo} alt="Company Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
                      ) : (
                        <span style={{ color: selectedTheme.primary, fontWeight: 800 }}>Logo</span>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, wordBreak: "break-word" }}>{companyName || "Company Name"}</div>
                      <div style={{ fontSize: 13, marginTop: 5, opacity: 0.95, wordBreak: "break-word" }}>
                        {companyPhone || "-"} | {companyEmail || "-"} | {companyWebsite || "-"}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 5, opacity: 0.95 }}>Prepared by: {preparedBy || "-"}</div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: 18 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 20, color: selectedTheme.primary }}>
                    Client Travel Quotation
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: responsiveTwo, gap: 12, marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid #e2e8f0", wordBreak: "break-word" }}>
                    <div><strong>Lead Client</strong><br />{leadClientName || "-"}</div>
                    <div><strong>Additional Clients</strong><br />{safeJoin(additionalClientNames)}</div>
                    <div><strong>Destination</strong><br />{safeJoin(destinationNames)}</div>
                    <div><strong>Trip Type</strong><br />{displayTripType || "-"}</div>
                    <div><strong>Client Type</strong><br />{clientType === "USD" ? "Non-Resident" : "Resident"}</div>
                    <div><strong>Currency</strong><br />{displayCurrency}</div>
                    <div><strong>Adults</strong><br />{adults || "0"}</div>
                    <div><strong>Children</strong><br />{children || "0"}</div>
                    <div><strong>Total Travellers</strong><br />{calculation.totalTravellers}</div>
                    {!isDayTrip && <div><strong>Trip Days</strong><br />{numberOfDays || "0"}</div>}
                    {!isDayTrip && <div><strong>Hotel(s)</strong><br />{safeJoin(hotelNames)}</div>}
                    {!isDayTrip && <div><strong>Total Nights</strong><br />{calculation.totalNights}</div>}
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ color: selectedTheme.primary, marginBottom: 10 }}>Package Summary</h4>
                    <div style={{ display: "grid", gap: 8, background: selectedTheme.secondary, borderRadius: 18, padding: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center", fontSize: 17 }}>
                        <span><strong>Total Package Price</strong></span>
                        <strong style={{ color: selectedTheme.primary, textAlign: "right", wordBreak: "break-word" }}>
                          {formatMoney(displayFinalTotal, displayCurrency)}
                        </strong>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "center", fontSize: 16 }}>
                        <span><strong>Price Per Person</strong></span>
                        <strong style={{ color: selectedTheme.accent, textAlign: "right", wordBreak: "break-word" }}>
                          {formatMoney(displayPricePerPerson, displayCurrency)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: responsiveTwo, gap: 14 }}>
                    <div>
                      <h4 style={{ color: selectedTheme.primary, marginBottom: 8 }}>Includes</h4>
                      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, wordBreak: "break-word" }}>
                        {(calculation.includes || []).map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 style={{ color: selectedTheme.primary, marginBottom: 8 }}>Excludes</h4>
                      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, wordBreak: "break-word" }}>
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

function setSafeRemove<T extends { id: string }>(
  list: T[],
  id: string,
  createItem: () => T
): T[] {
  const next = list.filter((item) => item.id !== id);
  return next.length ? next : [createItem()];
}

function InputText({
  label,
  value,
  setValue,
  inputStyle,
  labelStyle,
  placeholder = "",
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} />
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

function HotelInput({
  label,
  value,
  hotelId,
  field,
  setHotels,
  inputStyle,
  labelStyle,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  hotelId: string;
  field: keyof HotelItem;
  setHotels: React.Dispatch<React.SetStateAction<HotelItem[]>>;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        style={inputStyle}
        type={type}
        min={type === "number" ? "0" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          setHotels((prev) =>
            prev.map((item) => item.id === hotelId ? { ...item, [field]: e.target.value } : item)
          )
        }
      />
    </div>
  );
}