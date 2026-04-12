import React, { useEffect, useMemo, useState } from "react";

type TripType = "Day Trip" | "Overnight Trip";
type DayTripType = "Full-day Trip" | "Half-day Trip";
type HotelCategory = "None" | "Budget" | "Midrange" | "Luxury";
type MealMode = "None" | "Adult/Child Rates" | "Buffet / Group Rate";
type MainTransport =
  | "None"
  | "Van"
  | "Landcruiser"
  | "Coast Bus"
  | "Overland Truck";
type QuotePriceMode = "Auto" | "Per Person" | "Per Person Sharing Room";

type HotelBlock = {
  id: string;
  category: HotelCategory;
  hotelName: string;
  adultRate: string;
  childRate: string;
  checkIn: string;
  checkOut: string;
};

type ActivityRow = {
  id: string;
  name: string;
  adultRate: string;
  childRate: string;
};

const BRAND = {
  primary: "#0057B8",
  primaryHover: "#4DA6FF",
  header: "#003366",
  background: "#F5F5F5",
};

function numberOrZero(value: string | number) {
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function formatKES(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function splitLines(text: string) {
  return text
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dateDiffNights(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createHotelBlock(): HotelBlock {
  return {
    id: makeId("hotel"),
    category: "None",
    hotelName: "",
    adultRate: "",
    childRate: "",
    checkIn: "",
    checkOut: "",
  };
}

function createActivityRow(name = ""): ActivityRow {
  return {
    id: makeId("activity"),
    name,
    adultRate: "",
    childRate: "",
  };
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f8fbff 0%, #ffffff 55%, #f3f6fa 100%)",
  padding: "20px",
  fontFamily: "Arial, sans-serif",
};

const wrapperStyle: React.CSSProperties = {
  maxWidth: "1280px",
  margin: "0 auto",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "24px",
  boxShadow: "0 18px 50px rgba(0,51,102,0.08)",
  border: "1px solid #e6eef7",
  padding: "24px",
};

const smallCardStyle: React.CSSProperties = {
  ...cardStyle,
  padding: "18px",
  boxShadow: "0 10px 30px rgba(0,51,102,0.06)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#334155",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #cfd8e3",
  fontSize: "15px",
  boxSizing: "border-box",
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
    <div style={smallCardStyle}>
      <div
        style={{
          height: "4px",
          width: "56px",
          borderRadius: "999px",
          backgroundColor: BRAND.primary,
          marginBottom: "14px",
        }}
      />
      <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>{title}</p>
      <p
        style={{
          marginTop: "10px",
          marginBottom: 0,
          color: BRAND.header,
          fontSize: "24px",
          fontWeight: 700,
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "pricing" | "results" | "quotation"
  >("pricing");

  const [companyName, setCompanyName] = useState("");
  const [travelAgentName, setTravelAgentName] = useState("");
  const [leadClientName, setLeadClientName] = useState("");
  const [additionalClientNames, setAdditionalClientNames] = useState("");

  const [destination, setDestination] = useState("");
  const [tripType, setTripType] = useState<TripType>("Overnight Trip");
  const [dayTripType, setDayTripType] = useState<DayTripType>("Full-day Trip");

  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [quotePriceMode, setQuotePriceMode] = useState<QuotePriceMode>("Auto");

  const [hotels, setHotels] = useState<HotelBlock[]>([createHotelBlock()]);
  const [activities, setActivities] = useState<ActivityRow[]>([
    createActivityRow("Giraffe Centre"),
  ]);

  const [mealMode, setMealMode] = useState<MealMode>("None");
  const [mealAdultRate, setMealAdultRate] = useState("");
  const [mealChildRate, setMealChildRate] = useState("");
  const [mealBuffetRate, setMealBuffetRate] = useState("");

  const [mainTransport, setMainTransport] = useState<MainTransport>("None");
  const [mainTransportPrice, setMainTransportPrice] = useState("");

  const [trainAdult, setTrainAdult] = useState("");
  const [trainChild, setTrainChild] = useState("");
  const [balloonAdult, setBalloonAdult] = useState("");
  const [balloonChild, setBalloonChild] = useState("");
  const [flightAdult, setFlightAdult] = useState("");
  const [flightChild, setFlightChild] = useState("");
  const [boatAdult, setBoatAdult] = useState("");
  const [boatChild, setBoatChild] = useState("");
  const [walkingAdult, setWalkingAdult] = useState("");
  const [walkingChild, setWalkingChild] = useState("");

  const [residentAdultFee, setResidentAdultFee] = useState("");
  const [residentChildFee, setResidentChildFee] = useState("");
  const [nonResidentAdultFee, setNonResidentAdultFee] = useState("");
  const [nonResidentChildFee, setNonResidentChildFee] = useState("");

  const [fuelCost, setFuelCost] = useState("");
  const [driverAllowance, setDriverAllowance] = useState("");
  const [markup, setMarkup] = useState("30");

  const [manualIncludes, setManualIncludes] = useState("");
  const [showExcludes, setShowExcludes] = useState(false);
  const [excludesText, setExcludesText] = useState("");

  const totalAdults = numberOrZero(adults);
  const totalChildren = numberOrZero(children);
  const totalTravellers = totalAdults + totalChildren;

  useEffect(() => {
    if (tripType === "Day Trip") {
      setHotels([createHotelBlock()]);
    }
  }, [tripType]);

  const hotelTotal = useMemo(() => {
    if (tripType !== "Overnight Trip") return 0;

    return hotels.reduce((sum, hotel) => {
      const nights = dateDiffNights(hotel.checkIn, hotel.checkOut);
      const adultRate = numberOrZero(hotel.adultRate);
      const childRate = numberOrZero(hotel.childRate);
      return (
        sum +
        adultRate * totalAdults * nights +
        childRate * totalChildren * nights
      );
    }, 0);
  }, [tripType, hotels, totalAdults, totalChildren]);

  const activityTotal = useMemo(() => {
    return activities.reduce((sum, item) => {
      const adultRate = numberOrZero(item.adultRate);
      const childRate = numberOrZero(item.childRate);
      return sum + adultRate * totalAdults + childRate * totalChildren;
    }, 0);
  }, [activities, totalAdults, totalChildren]);

  const mealsTotal = useMemo(() => {
    if (mealMode === "None") return 0;
    if (mealMode === "Buffet / Group Rate") return numberOrZero(mealBuffetRate);
    return (
      numberOrZero(mealAdultRate) * totalAdults +
      numberOrZero(mealChildRate) * totalChildren
    );
  }, [
    mealMode,
    mealAdultRate,
    mealChildRate,
    mealBuffetRate,
    totalAdults,
    totalChildren,
  ]);

  const mainTransportTotal =
    mainTransport === "None" ? 0 : numberOrZero(mainTransportPrice);

  const otherTransportTotal =
    numberOrZero(trainAdult) * totalAdults +
    numberOrZero(trainChild) * totalChildren +
    numberOrZero(balloonAdult) * totalAdults +
    numberOrZero(balloonChild) * totalChildren +
    numberOrZero(flightAdult) * totalAdults +
    numberOrZero(flightChild) * totalChildren +
    numberOrZero(boatAdult) * totalAdults +
    numberOrZero(boatChild) * totalChildren +
    numberOrZero(walkingAdult) * totalAdults +
    numberOrZero(walkingChild) * totalChildren;

  const parkFeesTotal =
    numberOrZero(residentAdultFee) * totalAdults +
    numberOrZero(residentChildFee) * totalChildren +
    numberOrZero(nonResidentAdultFee) * totalAdults +
    numberOrZero(nonResidentChildFee) * totalChildren;

  const subtotal =
    hotelTotal +
    activityTotal +
    mealsTotal +
    mainTransportTotal +
    otherTransportTotal +
    parkFeesTotal +
    numberOrZero(fuelCost) +
    numberOrZero(driverAllowance);

  const markupPercent = numberOrZero(markup);
  const finalTotal = Math.round(subtotal * (1 + markupPercent / 100));
  const profit = finalTotal - subtotal;
  const perPerson = totalTravellers > 0 ? Math.round(finalTotal / totalTravellers) : 0;

  const pricingLabel = useMemo(() => {
    if (quotePriceMode === "Per Person") return "Per Person";
    if (quotePriceMode === "Per Person Sharing Room") {
      return "Per Person Sharing Room";
    }
    if (totalTravellers === 1) return "Solo Traveller";
    return "Per Person Sharing Room";
  }, [quotePriceMode, totalTravellers]);

  const autoIncludes = useMemo(() => {
    const list: string[] = [];

    if (tripType === "Overnight Trip" && hotelTotal > 0) {
      list.push("Accommodation");
    }

    if (mainTransportTotal > 0 && mainTransport !== "None") {
      list.push(`Main Transport (${mainTransport})`);
    }

    if (numberOrZero(trainAdult) || numberOrZero(trainChild)) {
      list.push("Train");
    }
    if (numberOrZero(balloonAdult) || numberOrZero(balloonChild)) {
      list.push("Hot Air Balloon Safari");
    }
    if (numberOrZero(flightAdult) || numberOrZero(flightChild)) {
      list.push("Safari Flight");
    }
    if (numberOrZero(boatAdult) || numberOrZero(boatChild)) {
      list.push("Boat Ride");
    }
    if (numberOrZero(walkingAdult) || numberOrZero(walkingChild)) {
      list.push("Walking Tour");
    }

    if (activityTotal > 0) list.push("Activities");
    if (mealsTotal > 0) list.push("Meals");
    if (parkFeesTotal > 0) list.push("Park Fees");
    if (numberOrZero(driverAllowance) > 0) list.push("Driver / Guide");
    if (numberOrZero(fuelCost) > 0) list.push("Fuel / Logistics");

    return list;
  }, [
    tripType,
    hotelTotal,
    mainTransportTotal,
    mainTransport,
    trainAdult,
    trainChild,
    balloonAdult,
    balloonChild,
    flightAdult,
    flightChild,
    boatAdult,
    boatChild,
    walkingAdult,
    walkingChild,
    activityTotal,
    mealsTotal,
    parkFeesTotal,
    driverAllowance,
    fuelCost,
  ]);

  const includesList = [...autoIncludes, ...splitLines(manualIncludes)];
  const excludesList = splitLines(excludesText);

  const hotelSummary = hotels
    .filter((hotel) => hotel.hotelName.trim())
    .map((hotel) => {
      const nights = dateDiffNights(hotel.checkIn, hotel.checkOut);
      return `${hotel.hotelName}${nights > 0 ? ` (${nights} night${nights > 1 ? "s" : ""})` : ""}`;
    });

  const quotationText = `${companyName || "Company Name"}
Travel Agent: ${travelAgentName || "Travel Agent"}
Client: ${leadClientName || "Client Name"}
Additional Clients: ${additionalClientNames || "-"}
Destination: ${destination || "-"}
Trip Type: ${tripType}${tripType === "Day Trip" ? ` - ${dayTripType}` : ""}
Hotels: ${hotelSummary.length ? hotelSummary.join(", ") : "-"}
${pricingLabel}: ${formatKES(perPerson)}
Total Package Price: ${formatKES(finalTotal)}

Includes:
${includesList.length ? includesList.map((item) => `- ${item}`).join("\n") : "- Not specified"}

Excludes:
${excludesList.length ? excludesList.map((item) => `- ${item}`).join("\n") : "- Not specified"}
`;

  const updateHotel = (id: string, key: keyof HotelBlock, value: string) => {
    setHotels((current) =>
      current.map((hotel) =>
        hotel.id === id ? { ...hotel, [key]: value } : hotel
      )
    );
  };

  const addHotel = () => {
    setHotels((current) => [...current, createHotelBlock()]);
  };

  const removeHotel = (id: string) => {
    setHotels((current) =>
      current.length === 1 ? current : current.filter((hotel) => hotel.id !== id)
    );
  };

  const updateActivity = (
    id: string,
    key: keyof ActivityRow,
    value: string
  ) => {
    setActivities((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    );
  };

  const addActivity = () => {
    setActivities((current) => [...current, createActivityRow()]);
  };

  const removeActivity = (id: string) => {
    setActivities((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== id)
    );
  };

  const printQuote = () => {
    window.print();
  };

  return (
    <div style={pageStyle}>
      <div style={wrapperStyle}>
        <div
          style={{
            display: "grid",
            gap: "16px",
            gridTemplateColumns: "2fr 1fr",
            alignItems: "start",
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
                <h1
                  style={{
                    color: BRAND.header,
                    fontSize: "34px",
                    marginTop: 0,
                    marginBottom: "6px",
                  }}
                >
                  Jambo Trip 360°
                </h1>
                <p style={{ color: "#4B647D", margin: 0 }}>
                  Smart Safari Pricing & Quotation System
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    backgroundColor: BRAND.primary,
                    color: "white",
                    borderRadius: "999px",
                    padding: "8px 14px",
                    fontSize: "13px",
                  }}
                >
                  Agent Tool
                </span>
                <span
                  style={{
                    border: `1px solid ${BRAND.primary}`,
                    color: BRAND.header,
                    borderRadius: "999px",
                    padding: "8px 14px",
                    fontSize: "13px",
                  }}
                >
                  White-label Quotation
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                backgroundColor: "#EEF5FC",
                padding: "6px",
                borderRadius: "16px",
                marginBottom: "18px",
              }}
            >
              {(["pricing", "results", "quotation"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor:
                      activeTab === tab ? BRAND.primary : "transparent",
                    color: activeTab === tab ? "white" : BRAND.header,
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "pricing" && (
              <div style={{ display: "grid", gap: "22px" }}>
                <section>
                  <h2 style={{ color: BRAND.header, marginTop: 0 }}>
                    Agent & Client Details
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gap: "16px",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Company Name</label>
                      <input
                        style={inputStyle}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Enter company name"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Travel Agent Name</label>
                      <input
                        style={inputStyle}
                        value={travelAgentName}
                        onChange={(e) => setTravelAgentName(e.target.value)}
                        placeholder="Enter travel agent name"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Lead Client Name</label>
                      <input
                        style={inputStyle}
                        value={leadClientName}
                        onChange={(e) => setLeadClientName(e.target.value)}
                        placeholder="Enter lead client name"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Additional Client Names</label>
                      <textarea
                        style={{ ...inputStyle, minHeight: "48px" }}
                        value={additionalClientNames}
                        onChange={(e) => setAdditionalClientNames(e.target.value)}
                        placeholder="Add more client names, separated by commas or new lines"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Adults</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={adults}
                        onChange={(e) => setAdults(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Children</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={children}
                        onChange={(e) => setChildren(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Destination</label>
                      <input
                        style={inputStyle}
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Example: Nairobi National Park / Masai Mara"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Trip Type</label>
                      <select
                        style={inputStyle}
                        value={tripType}
                        onChange={(e) => setTripType(e.target.value as TripType)}
                      >
                        <option value="Day Trip">Day Trip</option>
                        <option value="Overnight Trip">Overnight Trip</option>
                      </select>
                    </div>

                    {tripType === "Day Trip" && (
                      <div>
                        <label style={labelStyle}>Day Trip Type</label>
                        <select
                          style={inputStyle}
                          value={dayTripType}
                          onChange={(e) =>
                            setDayTripType(e.target.value as DayTripType)
                          }
                        >
                          <option value="Full-day Trip">Full-day Trip</option>
                          <option value="Half-day Trip">Half-day Trip</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label style={labelStyle}>Client Price Label</label>
                      <select
                        style={inputStyle}
                        value={quotePriceMode}
                        onChange={(e) =>
                          setQuotePriceMode(e.target.value as QuotePriceMode)
                        }
                      >
                        <option value="Auto">Auto</option>
                        <option value="Per Person">Per Person</option>
                        <option value="Per Person Sharing Room">
                          Per Person Sharing Room
                        </option>
                      </select>
                    </div>
                  </div>
                </section>

                {tripType === "Overnight Trip" && (
                  <section>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <h2 style={{ color: BRAND.header, margin: 0 }}>
                        Hotel Details
                      </h2>
                      <button style={outlineButtonStyle} onClick={addHotel}>
                        Add Another Hotel
                      </button>
                    </div>

                    <div style={{ display: "grid", gap: "16px", marginTop: "14px" }}>
                      {hotels.map((hotel, index) => {
                        const nights = dateDiffNights(hotel.checkIn, hotel.checkOut);

                        return (
                          <div key={hotel.id} style={smallCardStyle}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "12px",
                                flexWrap: "wrap",
                                marginBottom: "14px",
                              }}
                            >
                              <strong style={{ color: BRAND.header }}>
                                Hotel {index + 1}
                              </strong>
                              {hotels.length > 1 && (
                                <button
                                  style={outlineButtonStyle}
                                  onClick={() => removeHotel(hotel.id)}
                                >
                                  Remove Hotel
                                </button>
                              )}
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gap: "16px",
                                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                              }}
                            >
                              <div>
                                <label style={labelStyle}>Hotel Category</label>
                                <select
                                  style={inputStyle}
                                  value={hotel.category}
                                  onChange={(e) =>
                                    updateHotel(
                                      hotel.id,
                                      "category",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="None">None</option>
                                  <option value="Budget">Budget</option>
                                  <option value="Midrange">Midrange</option>
                                  <option value="Luxury">Luxury</option>
                                </select>
                              </div>

                              <div>
                                <label style={labelStyle}>Hotel Name</label>
                                <input
                                  style={inputStyle}
                                  value={hotel.hotelName}
                                  onChange={(e) =>
                                    updateHotel(hotel.id, "hotelName", e.target.value)
                                  }
                                  placeholder="Example: Mara Sopa Lodge"
                                />
                              </div>

                              <div>
                                <label style={labelStyle}>Adult Rate</label>
                                <input
                                  style={inputStyle}
                                  type="number"
                                  value={hotel.adultRate}
                                  onChange={(e) =>
                                    updateHotel(hotel.id, "adultRate", e.target.value)
                                  }
                                  placeholder="Adult rate"
                                />
                              </div>

                              <div>
                                <label style={labelStyle}>Child Rate</label>
                                <input
                                  style={inputStyle}
                                  type="number"
                                  value={hotel.childRate}
                                  onChange={(e) =>
                                    updateHotel(hotel.id, "childRate", e.target.value)
                                  }
                                  placeholder="Child rate"
                                />
                              </div>

                              <div>
                                <label style={labelStyle}>Check-in</label>
                                <input
                                  style={inputStyle}
                                  type="date"
                                  value={hotel.checkIn}
                                  onChange={(e) =>
                                    updateHotel(hotel.id, "checkIn", e.target.value)
                                  }
                                />
                              </div>

                              <div>
                                <label style={labelStyle}>Check-out</label>
                                <input
                                  style={inputStyle}
                                  type="date"
                                  value={hotel.checkOut}
                                  onChange={(e) =>
                                    updateHotel(hotel.id, "checkOut", e.target.value)
                                  }
                                />
                              </div>
                            </div>

                            <p style={{ marginTop: "12px", color: "#64748b", fontSize: "14px" }}>
                              Nights: <strong>{nights}</strong>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <h2 style={{ color: BRAND.header, margin: 0 }}>Activities</h2>
                    <button style={outlineButtonStyle} onClick={addActivity}>
                      Add Activity
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: "16px", marginTop: "14px" }}>
                    {activities.map((activity, index) => (
                      <div key={activity.id} style={smallCardStyle}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                            marginBottom: "14px",
                          }}
                        >
                          <strong style={{ color: BRAND.header }}>
                            Activity {index + 1}
                          </strong>
                          {activities.length > 1 && (
                            <button
                              style={outlineButtonStyle}
                              onClick={() => removeActivity(activity.id)}
                            >
                              Remove Activity
                            </button>
                          )}
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gap: "16px",
                            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          }}
                        >
                          <div>
                            <label style={labelStyle}>Activity Name</label>
                            <input
                              style={inputStyle}
                              value={activity.name}
                              onChange={(e) =>
                                updateActivity(activity.id, "name", e.target.value)
                              }
                              placeholder="Example: Giraffe Centre"
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Adult Rate</label>
                            <input
                              style={inputStyle}
                              type="number"
                              value={activity.adultRate}
                              onChange={(e) =>
                                updateActivity(activity.id, "adultRate", e.target.value)
                              }
                              placeholder="Adult rate"
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Child Rate</label>
                            <input
                              style={inputStyle}
                              type="number"
                              value={activity.childRate}
                              onChange={(e) =>
                                updateActivity(activity.id, "childRate", e.target.value)
                              }
                              placeholder="Child rate"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 style={{ color: BRAND.header, marginTop: 0 }}>
                    Food / Meals
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gap: "16px",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Meal Option</label>
                      <select
                        style={inputStyle}
                        value={mealMode}
                        onChange={(e) => setMealMode(e.target.value as MealMode)}
                      >
                        <option value="None">None</option>
                        <option value="Adult/Child Rates">Adult/Child Rates</option>
                        <option value="Buffet / Group Rate">Buffet / Group Rate</option>
                      </select>
                    </div>

                    {mealMode === "Adult/Child Rates" && (
                      <>
                        <div>
                          <label style={labelStyle}>Adult Meal Rate</label>
                          <input
                            style={inputStyle}
                            type="number"
                            value={mealAdultRate}
                            onChange={(e) => setMealAdultRate(e.target.value)}
                            placeholder="Adult meal rate"
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Child Meal Rate</label>
                          <input
                            style={inputStyle}
                            type="number"
                            value={mealChildRate}
                            onChange={(e) => setMealChildRate(e.target.value)}
                            placeholder="Child meal rate"
                          />
                        </div>
                      </>
                    )}

                    {mealMode === "Buffet / Group Rate" && (
                      <div>
                        <label style={labelStyle}>Buffet / Group Rate</label>
                        <input
                          style={inputStyle}
                          type="number"
                          value={mealBuffetRate}
                          onChange={(e) => setMealBuffetRate(e.target.value)}
                          placeholder="Enter buffet rate"
                        />
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h2 style={{ color: BRAND.header, marginTop: 0 }}>
                    Main Transport
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gap: "16px",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Transport Option</label>
                      <select
                        style={inputStyle}
                        value={mainTransport}
                        onChange={(e) =>
                          setMainTransport(e.target.value as MainTransport)
                        }
                      >
                        <option value="None">None</option>
                        <option value="Van">Van</option>
                        <option value="Landcruiser">Landcruiser</option>
                        <option value="Coast Bus">Coast Bus</option>
                        <option value="Overland Truck">Overland Truck</option>
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Main Transport Price</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={mainTransportPrice}
                        onChange={(e) => setMainTransportPrice(e.target.value)}
                        placeholder="Optional total transport price"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h2 style={{ color: BRAND.header, marginTop: 0 }}>
                    Other Transport Means
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gap: "16px",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    {[
                      ["Train", trainAdult, setTrainAdult, trainChild, setTrainChild],
                      [
                        "Hot Air Balloon",
                        balloonAdult,
                        setBalloonAdult,
                        balloonChild,
                        setBalloonChild,
                      ],
                      [
                        "Safari Flight",
                        flightAdult,
                        setFlightAdult,
                        flightChild,
                        setFlightChild,
                      ],
                      ["Boat Ride", boatAdult, setBoatAdult, boatChild, setBoatChild],
                      [
                        "Walking Tour",
                        walkingAdult,
                        setWalkingAdult,
                        walkingChild,
                        setWalkingChild,
                      ],
                    ].map(([label, adultValue, setAdult, childValue, setChild]) => (
                      <div key={label} style={smallCardStyle}>
                        <strong style={{ color: BRAND.header }}>{label}</strong>

                        <div
                          style={{
                            display: "grid",
                            gap: "12px",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            marginTop: "12px",
                          }}
                        >
                          <div>
                            <label style={labelStyle}>Adult Rate</label>
                            <input
                              style={inputStyle}
                              type="number"
                              value={adultValue as string}
                              onChange={(e) =>
                                (setAdult as React.Dispatch<React.SetStateAction<string>>)(
                                  e.target.value
                                )
                              }
                              placeholder="Adult rate"
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Child Rate</label>
                            <input
                              style={inputStyle}
                              type="number"
                              value={childValue as string}
                              onChange={(e) =>
                                (setChild as React.Dispatch<React.SetStateAction<string>>)(
                                  e.target.value
                                )
                              }
                              placeholder="Child rate"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h2 style={{ color: BRAND.header, marginTop: 0 }}>
                    Park Fees (Optional)
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gap: "16px",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Resident Adult</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={residentAdultFee}
                        onChange={(e) => setResidentAdultFee(e.target.value)}
                        placeholder="Leave blank if not needed"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Resident Child</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={residentChildFee}
                        onChange={(e) => setResidentChildFee(e.target.value)}
                        placeholder="Leave blank if not needed"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Non-Resident Adult</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={nonResidentAdultFee}
                        onChange={(e) => setNonResidentAdultFee(e.target.value)}
                        placeholder="Leave blank if not needed"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Non-Resident Child</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={nonResidentChildFee}
                        onChange={(e) => setNonResidentChildFee(e.target.value)}
                        placeholder="Leave blank if not needed"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h2 style={{ color: BRAND.header, marginTop: 0 }}>
                    Internal Costs & Quote Notes
                  </h2>

                  <div
                    style={{
                      display: "grid",
                      gap: "16px",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Fuel Cost</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={fuelCost}
                        onChange={(e) => setFuelCost(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Driver Allowance</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={driverAllowance}
                        onChange={(e) => setDriverAllowance(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Markup %</label>
                      <input
                        style={inputStyle}
                        type="number"
                        value={markup}
                        onChange={(e) => setMarkup(e.target.value)}
                        placeholder="Markup percentage"
                      />
                    </div>

                    <div style={{ gridColumn: "span 3" }}>
                      <label style={labelStyle}>Additional Includes</label>
                      <textarea
                        style={{ ...inputStyle, minHeight: "80px" }}
                        value={manualIncludes}
                        onChange={(e) => setManualIncludes(e.target.value)}
                        placeholder="Add extra items to include, separated by commas or new lines"
                      />
                    </div>

                    <div style={{ gridColumn: "span 3" }}>
                      <button
                        style={outlineButtonStyle}
                        onClick={() => setShowExcludes(!showExcludes)}
                      >
                        {showExcludes ? "Hide Excludes" : "Add Excludes"}
                      </button>
                    </div>

                    {showExcludes && (
                      <div style={{ gridColumn: "span 3" }}>
                        <label style={labelStyle}>Excludes</label>
                        <textarea
                          style={{ ...inputStyle, minHeight: "80px" }}
                          value={excludesText}
                          onChange={(e) => setExcludesText(e.target.value)}
                          placeholder="Example: Water, Photography, Tips, Personal expenses"
                        />
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "results" && (
              <div>
                <div
                  style={{
                    display: "grid",
                    gap: "16px",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  }}
                >
                  <InfoCard title="Hotel Total" value={formatKES(hotelTotal)} />
                  <InfoCard title="Activities Total" value={formatKES(activityTotal)} />
                  <InfoCard title="Meals Total" value={formatKES(mealsTotal)} />
                  <InfoCard
                    title="Transport Total"
                    value={formatKES(mainTransportTotal + otherTransportTotal)}
                  />
                  <InfoCard title="Park Fees Total" value={formatKES(parkFeesTotal)} />
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "16px",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    marginTop: "16px",
                  }}
                >
                  <InfoCard title="Subtotal" value={formatKES(subtotal)} />
                  <InfoCard title="Profit" value={formatKES(profit)} />
                  <InfoCard title={pricingLabel} value={formatKES(perPerson)} />
                  <InfoCard title="Final Total" value={formatKES(finalTotal)} />
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "16px",
                    gridTemplateColumns: "1.2fr 0.8fr",
                    marginTop: "16px",
                  }}
                >
                  <div style={cardStyle}>
                    <h2 style={{ color: BRAND.header, marginTop: 0 }}>
                      Internal Cost Breakdown
                    </h2>

                    <div style={{ color: "#475569", fontSize: "14px" }}>
                      <p style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Hotels</span>
                        <span>{formatKES(hotelTotal)}</span>
                      </p>
                      <p style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Activities</span>
                        <span>{formatKES(activityTotal)}</span>
                      </p>
                      <p style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Meals</span>
                        <span>{formatKES(mealsTotal)}</span>
                      </p>
                      <p style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Main Transport</span>
                        <span>{formatKES(mainTransportTotal)}</span>
                      </p>
                      <p style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Other Transport</span>
                        <span>{formatKES(otherTransportTotal)}</span>
                      </p>
                      <p style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Park Fees</span>
                        <span>{formatKES(parkFeesTotal)}</span>
                      </p>
                      <p style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Fuel Cost</span>
                        <span>{formatKES(numberOrZero(fuelCost))}</span>
                      </p>
                      <p style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Driver Allowance</span>
                        <span>{formatKES(numberOrZero(driverAllowance))}</span>
                      </p>
                      <p style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Markup</span>
                        <span>{markupPercent}%</span>
                      </p>
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <h2 style={{ color: BRAND.header, marginTop: 0 }}>Summary</h2>
                    <div style={{ color: "#475569", fontSize: "14px" }}>
                      <p><strong>Company:</strong> {companyName || "-"}</p>
                      <p><strong>Travel Agent:</strong> {travelAgentName || "-"}</p>
                      <p><strong>Client:</strong> {leadClientName || "-"}</p>
                      <p><strong>Destination:</strong> {destination || "-"}</p>
                      <p>
                        <strong>Trip:</strong> {tripType}
                        {tripType === "Day Trip" ? ` - ${dayTripType}` : ""}
                      </p>
                      <p><strong>Total Travellers:</strong> {totalTravellers}</p>
                      <p><strong>Price Label:</strong> {pricingLabel}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "quotation" && (
              <div style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2 style={{ color: BRAND.header, marginTop: 0, marginBottom: "8px" }}>
                      Client Quotation
                    </h2>
                    <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                      White-label quotation view for clients
                    </p>
                  </div>

                  <button style={primaryButtonStyle} onClick={printQuote}>
                    Print / Save PDF
                  </button>
                </div>

                <div
                  style={{
                    marginTop: "20px",
                    borderRadius: "28px",
                    border: "1px solid #DCE8F5",
                    backgroundColor: "white",
                    padding: "24px",
                    boxShadow: "0 18px 45px rgba(0,51,102,0.08)",
                    maxWidth: "900px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                      borderBottom: "1px solid #E5EDF5",
                      paddingBottom: "16px",
                    }}
                  >
                    <div>
                      <h3 style={{ color: BRAND.header, margin: 0 }}>
                        {companyName || "Company Name"}
                      </h3>
                      <p style={{ color: "#475569", marginTop: "8px" }}>
                        Travel Agent: {travelAgentName || "Travel Agent"}
                      </p>
                    </div>

                    <div style={{ fontSize: "14px", color: "#475569" }}>
                      <p style={{ margin: "4px 0" }}>
                        Client: {leadClientName || "Client Name"}
                      </p>
                      <p style={{ margin: "4px 0" }}>
                        Destination: {destination || "-"}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      marginTop: "18px",
                      fontSize: "14px",
                      color: "#334155",
                    }}
                  >
                    <div>
                      <strong>Trip Type:</strong> {tripType}
                      {tripType === "Day Trip" ? ` - ${dayTripType}` : ""}
                    </div>
                    <div>
                      <strong>Adults:</strong> {totalAdults} | <strong>Children:</strong> {totalChildren}
                    </div>
                    <div>
                      <strong>Hotels:</strong>{" "}
                      {hotelSummary.length ? hotelSummary.join(", ") : "-"}
                    </div>
                    <div>
                      <strong>Additional Clients:</strong>{" "}
                      {additionalClientNames || "-"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "16px",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      marginTop: "18px",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: "16px",
                        padding: "16px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #E5EDF5",
                      }}
                    >
                      <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                        {pricingLabel}
                      </p>
                      <p style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}>
                        {formatKES(perPerson)}
                      </p>
                    </div>

                    <div
                      style={{
                        borderRadius: "16px",
                        padding: "16px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #E5EDF5",
                      }}
                    >
                      <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                        Total Package Price
                      </p>
                      <p style={{ fontSize: "24px", fontWeight: 700, marginTop: "8px" }}>
                        {formatKES(finalTotal)}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "16px",
                      gridTemplateColumns: "1fr 1fr",
                      marginTop: "20px",
                    }}
                  >
                    <div>
                      <h4 style={{ color: BRAND.header, marginBottom: "8px" }}>
                        Includes
                      </h4>
                      <div
                        style={{
                          borderRadius: "16px",
                          border: "1px solid #E5EDF5",
                          padding: "16px",
                          minHeight: "120px",
                        }}
                      >
                        {includesList.length ? (
                          includesList.map((item, index) => (
                            <p key={`${item}-${index}`} style={{ margin: "6px 0", color: "#475569" }}>
                              • {item}
                            </p>
                          ))
                        ) : (
                          <p style={{ color: "#64748b" }}>No includes added.</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 style={{ color: BRAND.header, marginBottom: "8px" }}>
                        Excludes
                      </h4>
                      <div
                        style={{
                          borderRadius: "16px",
                          border: "1px solid #E5EDF5",
                          padding: "16px",
                          minHeight: "120px",
                        }}
                      >
                        {excludesList.length ? (
                          excludesList.map((item, index) => (
                            <p key={`${item}-${index}`} style={{ margin: "6px 0", color: "#475569" }}>
                              • {item}
                            </p>
                          ))
                        ) : (
                          <p style={{ color: "#64748b" }}>No excludes added.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "20px" }}>
                    <h4 style={{ color: BRAND.header, marginBottom: "8px" }}>
                      Quotation Text Preview
                    </h4>
                    <textarea
                      readOnly
                      value={quotationText}
                      style={{
                        ...inputStyle,
                        minHeight: "220px",
                        backgroundColor: "#F8FAFC",
                        color: "#334155",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={{ color: BRAND.header, marginTop: 0 }}>Quick View</h2>

            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "16px",
              }}
            >
              <InfoCard title="Travellers" value={String(totalTravellers)} />
              <InfoCard title={pricingLabel} value={formatKES(perPerson)} />
              <InfoCard title="Final Total" value={formatKES(finalTotal)} />
            </div>

            <div
              style={{
                marginTop: "18px",
                borderRadius: "18px",
                padding: "16px",
                backgroundColor: "#F8FAFC",
                border: "1px solid #E5EDF5",
                color: "#475569",
                fontSize: "14px",
              }}
            >
              <p style={{ marginTop: 0 }}>
                This screen is for the travel agent only.
              </p>
              <p>
                The client quotation does not show Jambo Trip 360, markup, or profit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}