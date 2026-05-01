import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import "./App.css";

type ClientItem = {
  id: string;
  name: string;
  type: "Adult" | "Child";
};

type DestinationItem = {
  id: string;
  name: string;
};

type HotelItem = {
  id: string;
  name: string;
  mealPlan: string;
  adultRate: string;
  childRate: string;
  nights: string;
};

type ActivityItem = {
  id: string;
  name: string;
  adultRate: string;
  childRate: string;
};

type ExtraItem = {
  id: string;
  name: string;
  adultRate: string;
  childRate: string;
};

type ExcludeItem = {
  id: string;
  text: string;
};

type TrialStatus = {
  allowed: boolean;
  email?: string;
  unlocked?: boolean;
  remainingMs?: number;
  message?: string;
};

type TripType = "Safari" | "Day Trip" | "Vacation" | "Honeymoon" | "Others";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const TRIAL_EMAIL_KEY = "jambo_trip_trial_email";

const makeId = () => Math.random().toString(36).slice(2, 10);

const formatKES = (value: number) =>
  `Ksh ${Math.round(value || 0).toLocaleString("en-KE")}`;

export default function App() {
  const [trialEmail, setTrialEmail] = useState("");
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState("");

  const [tripType, setTripType] = useState<TripType>("Safari");
  const [customTripType, setCustomTripType] = useState("");

  const [agencyName, setAgencyName] = useState("");
  const [agencyEmail, setAgencyEmail] = useState("");
  const [agencyPhone, setAgencyPhone] = useState("");
  const [clientName, setClientName] = useState("");

  const [clients, setClients] = useState<ClientItem[]>([
    { id: makeId(), name: "", type: "Adult" },
  ]);

  const [destinations, setDestinations] = useState<DestinationItem[]>([
    { id: makeId(), name: "" },
  ]);

  const [hotels, setHotels] = useState<HotelItem[]>([
    {
      id: makeId(),
      name: "",
      mealPlan: "Breakfast",
      adultRate: "",
      childRate: "",
      nights: "",
    },
  ]);

  const [activities, setActivities] = useState<ActivityItem[]>([
    { id: makeId(), name: "", adultRate: "", childRate: "" },
  ]);

  const [extras, setExtras] = useState<ExtraItem[]>([
    { id: makeId(), name: "", adultRate: "", childRate: "" },
  ]);

  const [transportType, setTransportType] = useState("Land Cruiser");
  const [transportCostPerDay, setTransportCostPerDay] = useState("");
  const [transportDays, setTransportDays] = useState("");

  const [parkFeeAdult, setParkFeeAdult] = useState("");
  const [parkFeeChild, setParkFeeChild] = useState("");

  const [mealType, setMealType] = useState("None");
  const [mealAdultRate, setMealAdultRate] = useState("");
  const [mealChildRate, setMealChildRate] = useState("");

  const [markupType, setMarkupType] = useState<"Amount" | "Percentage">("Amount");
  const [markupValue, setMarkupValue] = useState("");

  const [excludes, setExcludes] = useState<ExcludeItem[]>([
    { id: makeId(), text: "International flights" },
    { id: makeId(), text: "Visa fees" },
    { id: makeId(), text: "Personal expenses" },
  ]);

  const toNumber = (value: string) => Number(value) || 0;

  const activeTripType =
    tripType === "Others" && customTripType.trim()
      ? customTripType.trim()
      : tripType;

  const isDayTrip = tripType === "Day Trip";
  const hasHotelLogic = tripType !== "Day Trip";

  useEffect(() => {
    const savedEmail = localStorage.getItem(TRIAL_EMAIL_KEY);
    if (savedEmail) {
      setTrialEmail(savedEmail);
      checkTrialStatus(savedEmail);
    }
  }, []);

  const checkTrialStatus = async (email: string) => {
    try {
      setTrialLoading(true);
      setTrialError("");

      const response = await fetch(
        `${API_BASE}/trial/status?email=${encodeURIComponent(email)}`
      );

      const data = await response.json();
      setTrialStatus(data);
    } catch {
      setTrialError("Unable to connect to trial server. Make sure backend is running.");
    } finally {
      setTrialLoading(false);
    }
  };

  const startTrial = async () => {
    if (!trialEmail.trim() || !trialEmail.includes("@")) {
      setTrialError("Please enter a valid email address.");
      return;
    }

    try {
      setTrialLoading(true);
      setTrialError("");

      const cleanEmail = trialEmail.trim().toLowerCase();

      const response = await fetch(`${API_BASE}/trial/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await response.json();

      localStorage.setItem(TRIAL_EMAIL_KEY, cleanEmail);
      setTrialStatus(data);
    } catch {
      setTrialError("Unable to start trial. Make sure backend is running.");
    } finally {
      setTrialLoading(false);
    }
  };

  const adults = clients.filter((c) => c.type === "Adult").length;
  const children = clients.filter((c) => c.type === "Child").length;
  const totalTravellers = adults + children;

  const totalNights = useMemo(() => {
    if (isDayTrip) return 0;
    return hotels.reduce((sum, hotel) => sum + toNumber(hotel.nights), 0);
  }, [hotels, isDayTrip]);

  const totals = useMemo(() => {
    let hotelTotal = 0;
    let transportTotal = 0;
    let parkFeesTotal = 0;
    let activitiesTotal = 0;
    let mealsTotal = 0;
    let extrasTotal = 0;

    if (isDayTrip) {
      transportTotal = toNumber(transportCostPerDay);

      parkFeesTotal =
        toNumber(parkFeeAdult) * adults + toNumber(parkFeeChild) * children;

      activitiesTotal = activities.reduce((sum, activity) => {
        return (
          sum +
          toNumber(activity.adultRate) * adults +
          toNumber(activity.childRate) * children
        );
      }, 0);

      mealsTotal =
        mealType === "None"
          ? 0
          : toNumber(mealAdultRate) * adults + toNumber(mealChildRate) * children;

      extrasTotal = extras.reduce((sum, extra) => {
        return (
          sum +
          toNumber(extra.adultRate) * adults +
          toNumber(extra.childRate) * children
        );
      }, 0);
    } else {
      hotelTotal = hotels.reduce((sum, hotel) => {
        const nights = toNumber(hotel.nights);
        return (
          sum +
          toNumber(hotel.adultRate) * adults * nights +
          toNumber(hotel.childRate) * children * nights
        );
      }, 0);

      transportTotal = toNumber(transportCostPerDay) * toNumber(transportDays);

      parkFeesTotal =
        toNumber(parkFeeAdult) * adults * totalNights +
        toNumber(parkFeeChild) * children * totalNights;

      activitiesTotal = activities.reduce((sum, activity) => {
        return (
          sum +
          toNumber(activity.adultRate) * adults +
          toNumber(activity.childRate) * children
        );
      }, 0);

      mealsTotal =
        mealType === "None"
          ? 0
          : toNumber(mealAdultRate) * adults + toNumber(mealChildRate) * children;

      extrasTotal = extras.reduce((sum, extra) => {
        return (
          sum +
          toNumber(extra.adultRate) * adults +
          toNumber(extra.childRate) * children
        );
      }, 0);
    }

    const subtotal =
      hotelTotal +
      transportTotal +
      parkFeesTotal +
      activitiesTotal +
      mealsTotal +
      extrasTotal;

    const markupAmount =
      markupType === "Percentage"
        ? subtotal * (toNumber(markupValue) / 100)
        : toNumber(markupValue);

    const finalTotal = subtotal + markupAmount;
    const pricePerPerson = totalTravellers > 0 ? finalTotal / totalTravellers : 0;

    return {
      hotelTotal,
      transportTotal,
      parkFeesTotal,
      activitiesTotal,
      mealsTotal,
      extrasTotal,
      subtotal,
      markupAmount,
      finalTotal,
      pricePerPerson,
    };
  }, [
    isDayTrip,
    hotels,
    activities,
    extras,
    adults,
    children,
    totalTravellers,
    totalNights,
    transportCostPerDay,
    transportDays,
    parkFeeAdult,
    parkFeeChild,
    mealType,
    mealAdultRate,
    mealChildRate,
    markupType,
    markupValue,
  ]);

  const remainingText = useMemo(() => {
    if (!trialStatus?.remainingMs) return "";
    const minutes = Math.max(0, Math.floor(trialStatus.remainingMs / 60000));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m remaining`;
  }, [trialStatus]);

  const isAllowed = trialStatus?.allowed || trialStatus?.unlocked;

  const updateClient = (id: string, field: keyof ClientItem, value: string) => {
    setClients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const updateDestination = (id: string, value: string) => {
    setDestinations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: value } : item))
    );
  };

  const updateHotel = (id: string, field: keyof HotelItem, value: string) => {
    setHotels((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const updateActivity = (id: string, field: keyof ActivityItem, value: string) => {
    setActivities((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const updateExtra = (id: string, field: keyof ExtraItem, value: string) => {
    setExtras((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const updateExclude = (id: string, value: string) => {
    setExcludes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text: value } : item))
    );
  };

  const includes = [
    hasHotelLogic &&
      hotels.some((h) => h.name || h.adultRate || h.childRate) &&
      "Accommodation",
    transportType !== "None" && transportCostPerDay && `Transport by ${transportType}`,
    parkFeeAdult || parkFeeChild ? "Park fees" : "",
    activities.some((a) => a.name) &&
      `Activities: ${activities.map((a) => a.name).filter(Boolean).join(", ")}`,
    mealType !== "None" && `${mealType} meals`,
    extras.some((e) => e.name) &&
      `Other extras: ${extras.map((e) => e.name).filter(Boolean).join(", ")}`,
    "Professional driver guide",
  ].filter(Boolean);

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-6">
          <h1 className="text-2xl font-bold text-blue-900 mb-2">
            Jambo Trip 360°
          </h1>
          <p className="text-slate-600 mb-5">
            Enter your email to start your 2-hour free trial.
          </p>

          <input
            type="email"
            value={trialEmail}
            onChange={(e) => setTrialEmail(e.target.value)}
            placeholder="Enter your email address"
            className="w-full border rounded-xl p-3 mb-3"
          />

          {trialError && <p className="text-red-600 text-sm mb-3">{trialError}</p>}

          {trialStatus?.message && (
            <p className="text-red-600 text-sm mb-3">{trialStatus.message}</p>
          )}

          <button
            onClick={startTrial}
            disabled={trialLoading}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white rounded-xl py-3 font-semibold"
          >
            {trialLoading ? "Checking..." : "Start Free Trial"}
          </button>

          <div className="mt-5 border-t pt-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800 mb-1">
              Trial protection active
            </p>
            <p>
              Each email can only receive one free trial. After trial expiry,
              payment unlock is required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-blue-900 text-white p-5 shadow">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Jambo Trip 360°</h1>
            <p className="text-blue-100">
              Smart Safari Pricing & Quotation System
            </p>
          </div>
          <div className="text-sm bg-white/10 rounded-xl px-4 py-2">
            {trialStatus?.unlocked ? "Full version unlocked" : remainingText}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 grid lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-xl font-bold mb-4">Trip Type</h2>

            <select
              value={tripType}
              onChange={(e) => setTripType(e.target.value as TripType)}
              className="border rounded-xl p-3 w-full"
            >
              <option>Safari</option>
              <option>Day Trip</option>
              <option>Vacation</option>
              <option>Honeymoon</option>
              <option>Others</option>
            </select>

            {tripType === "Others" && (
              <input
                value={customTripType}
                onChange={(e) => setCustomTripType(e.target.value)}
                placeholder="Write custom trip type"
                className="border rounded-xl p-3 w-full mt-3"
              />
            )}

            <p className="text-sm text-slate-600 mt-3">
              {isDayTrip
                ? "Day Trip: Transport is fixed. Park fees, activities, meals and extras are multiplied by travellers."
                : "Safari/Vacation/Honeymoon/Others: Hotels use nights. Park fees are multiplied by total nights and travellers."}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-xl font-bold mb-4">Agency & Client Details</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Agency name" className="border rounded-xl p-3" />
              <input value={agencyEmail} onChange={(e) => setAgencyEmail(e.target.value)} placeholder="Agency email" className="border rounded-xl p-3" />
              <input value={agencyPhone} onChange={(e) => setAgencyPhone(e.target.value)} placeholder="Agency phone" className="border rounded-xl p-3" />
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" className="border rounded-xl p-3" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Clients</h2>
              <button
                onClick={() =>
                  setClients([...clients, { id: makeId(), name: "", type: "Adult" }])
                }
                className="bg-blue-700 text-white px-4 py-2 rounded-xl"
              >
                Add Client
              </button>
            </div>

            <div className="space-y-3">
              {clients.map((client) => (
                <div key={client.id} className="grid md:grid-cols-3 gap-3">
                  <input
                    value={client.name}
                    onChange={(e) => updateClient(client.id, "name", e.target.value)}
                    placeholder="Client name"
                    className="border rounded-xl p-3"
                  />
                  <select
                    value={client.type}
                    onChange={(e) =>
                      updateClient(client.id, "type", e.target.value as "Adult" | "Child")
                    }
                    className="border rounded-xl p-3"
                  >
                    <option>Adult</option>
                    <option>Child</option>
                  </select>
                  <button
                    onClick={() => setClients(clients.filter((c) => c.id !== client.id))}
                    className="border rounded-xl p-3"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Destinations</h2>
              <button
                onClick={() => setDestinations([...destinations, { id: makeId(), name: "" }])}
                className="bg-blue-700 text-white px-4 py-2 rounded-xl"
              >
                Add Destination
              </button>
            </div>

            <div className="space-y-3">
              {destinations.map((destination) => (
                <input
                  key={destination.id}
                  value={destination.name}
                  onChange={(e) => updateDestination(destination.id, e.target.value)}
                  placeholder="Example: Masai Mara"
                  className="border rounded-xl p-3 w-full"
                />
              ))}
            </div>
          </div>

          {hasHotelLogic && (
            <div className="bg-white rounded-2xl shadow p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Hotel Details</h2>
                <button
                  onClick={() =>
                    setHotels([
                      ...hotels,
                      {
                        id: makeId(),
                        name: "",
                        mealPlan: "Breakfast",
                        adultRate: "",
                        childRate: "",
                        nights: "",
                      },
                    ])
                  }
                  className="bg-blue-700 text-white px-4 py-2 rounded-xl"
                >
                  Add Hotel
                </button>
              </div>

              <div className="space-y-4">
                {hotels.map((hotel) => (
                  <div key={hotel.id} className="border rounded-2xl p-4">
                    <div className="grid md:grid-cols-2 gap-3">
                      <input value={hotel.name} onChange={(e) => updateHotel(hotel.id, "name", e.target.value)} placeholder="Hotel name e.g. Mara Sopa Lodge" className="border rounded-xl p-3" />
                      <select value={hotel.mealPlan} onChange={(e) => updateHotel(hotel.id, "mealPlan", e.target.value)} className="border rounded-xl p-3">
                        <option>Breakfast</option>
                        <option>Half board</option>
                        <option>Full board</option>
                      </select>
                      <input value={hotel.adultRate} onChange={(e) => updateHotel(hotel.id, "adultRate", e.target.value)} placeholder="Adult rate per night" className="border rounded-xl p-3" />
                      <input value={hotel.childRate} onChange={(e) => updateHotel(hotel.id, "childRate", e.target.value)} placeholder="Child rate per night" className="border rounded-xl p-3" />
                      <input value={hotel.nights} onChange={(e) => updateHotel(hotel.id, "nights", e.target.value)} placeholder="Number of nights" className="border rounded-xl p-3" />
                      <button onClick={() => setHotels(hotels.filter((h) => h.id !== hotel.id))} className="border rounded-xl p-3">
                        Remove Hotel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-xl font-bold mb-4">Transport</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <select value={transportType} onChange={(e) => setTransportType(e.target.value)} className="border rounded-xl p-3">
                <option>None</option>
                <option>Land Cruiser</option>
                <option>Tour Van</option>
                <option>Coaster Bus</option>
                <option>Overland Truck</option>
              </select>
              <input
                value={transportCostPerDay}
                onChange={(e) => setTransportCostPerDay(e.target.value)}
                placeholder={isDayTrip ? "Transport total cost" : "Transport cost per day"}
                className="border rounded-xl p-3"
              />
              {!isDayTrip && (
                <input
                  value={transportDays}
                  onChange={(e) => setTransportDays(e.target.value)}
                  placeholder="Number of transport days"
                  className="border rounded-xl p-3"
                />
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-xl font-bold mb-4">Park Fees</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <input value={parkFeeAdult} onChange={(e) => setParkFeeAdult(e.target.value)} placeholder="Adult park fee per person" className="border rounded-xl p-3" />
              <input value={parkFeeChild} onChange={(e) => setParkFeeChild(e.target.value)} placeholder="Child park fee per person" className="border rounded-xl p-3" />
            </div>
            <p className="text-sm text-slate-600 mt-3">
              {isDayTrip
                ? "Day Trip formula: Park fee × number of clients."
                : "Safari formula: Park fee × total nights × number of clients."}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-xl font-bold mb-4">Meals</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="border rounded-xl p-3">
                <option>None</option>
                <option>Buffet</option>
                <option>Per Person</option>
                <option>Group Meal - Buffet Rates</option>
              </select>
              <input value={mealAdultRate} onChange={(e) => setMealAdultRate(e.target.value)} placeholder="Adult meal rate per person" className="border rounded-xl p-3" />
              <input value={mealChildRate} onChange={(e) => setMealChildRate(e.target.value)} placeholder="Child meal rate per person" className="border rounded-xl p-3" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Activities</h2>
              <button
                onClick={() =>
                  setActivities([...activities, { id: makeId(), name: "", adultRate: "", childRate: "" }])
                }
                className="bg-blue-700 text-white px-4 py-2 rounded-xl"
              >
                Add Activity
              </button>
            </div>

            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="grid md:grid-cols-4 gap-3">
                  <input value={activity.name} onChange={(e) => updateActivity(activity.id, "name", e.target.value)} placeholder="Activity name" className="border rounded-xl p-3" />
                  <input value={activity.adultRate} onChange={(e) => updateActivity(activity.id, "adultRate", e.target.value)} placeholder="Adult rate per person" className="border rounded-xl p-3" />
                  <input value={activity.childRate} onChange={(e) => updateActivity(activity.id, "childRate", e.target.value)} placeholder="Child rate per person" className="border rounded-xl p-3" />
                  <button onClick={() => setActivities(activities.filter((a) => a.id !== activity.id))} className="border rounded-xl p-3">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Other Extras</h2>
              <button
                onClick={() => setExtras([...extras, { id: makeId(), name: "", adultRate: "", childRate: "" }])}
                className="bg-blue-700 text-white px-4 py-2 rounded-xl"
              >
                Add Extra
              </button>
            </div>

            <div className="space-y-3">
              {extras.map((extra) => (
                <div key={extra.id} className="grid md:grid-cols-4 gap-3">
                  <input value={extra.name} onChange={(e) => updateExtra(extra.id, "name", e.target.value)} placeholder="Extra name" className="border rounded-xl p-3" />
                  <input value={extra.adultRate} onChange={(e) => updateExtra(extra.id, "adultRate", e.target.value)} placeholder="Adult rate per person" className="border rounded-xl p-3" />
                  <input value={extra.childRate} onChange={(e) => updateExtra(extra.id, "childRate", e.target.value)} placeholder="Child rate per person" className="border rounded-xl p-3" />
                  <button onClick={() => setExtras(extras.filter((x) => x.id !== extra.id))} className="border rounded-xl p-3">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-xl font-bold mb-4">Markup</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <select value={markupType} onChange={(e) => setMarkupType(e.target.value as "Amount" | "Percentage")} className="border rounded-xl p-3">
                <option>Amount</option>
                <option>Percentage</option>
              </select>
              <input value={markupValue} onChange={(e) => setMarkupValue(e.target.value)} placeholder="Markup value" className="border rounded-xl p-3" />
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="bg-white rounded-2xl shadow p-5 sticky top-4">
            <h2 className="text-xl font-bold mb-4">Price Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Trip Type</span>
                <strong>{activeTripType}</strong>
              </div>
              <div className="flex justify-between">
                <span>Travellers</span>
                <strong>{totalTravellers}</strong>
              </div>

              {!isDayTrip && (
                <>
                  <div className="flex justify-between">
                    <span>Total Nights</span>
                    <strong>{totalNights}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Accommodation</span>
                    <strong>{formatKES(totals.hotelTotal)}</strong>
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <span>Transport</span>
                <strong>{formatKES(totals.transportTotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Park Fees</span>
                <strong>{formatKES(totals.parkFeesTotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Activities</span>
                <strong>{formatKES(totals.activitiesTotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Meals</span>
                <strong>{formatKES(totals.mealsTotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Other Extras</span>
                <strong>{formatKES(totals.extrasTotal)}</strong>
              </div>

              {totals.markupAmount > 0 && (
                <div className="flex justify-between">
                  <span>Markup</span>
                  <strong>{formatKES(totals.markupAmount)}</strong>
                </div>
              )}

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between text-lg">
                  <span>Total Package Price</span>
                  <strong>{formatKES(totals.finalTotal)}</strong>
                </div>
                <div className="flex justify-between text-lg mt-2">
                  <span>Price Per Person</span>
                  <strong>{formatKES(totals.pricePerPerson)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-xl font-bold mb-4">Client Quotation View</h2>

            <div className="border rounded-2xl p-4 bg-slate-50">
              <h3 className="text-lg font-bold text-blue-900">
                {agencyName || "Your Travel Agency"}
              </h3>
              <p className="text-sm text-slate-600">
                {agencyEmail} {agencyPhone && `| ${agencyPhone}`}
              </p>

              <div className="mt-4">
                <p className="text-sm text-slate-500">Prepared for</p>
                <p className="font-semibold">{clientName || "Client Name"}</p>
              </div>

              <div className="mt-4">
                <p className="text-sm text-slate-500">Trip Type</p>
                <p className="font-semibold">{activeTripType}</p>
              </div>

              <div className="mt-4">
                <p className="text-sm text-slate-500">Destination</p>
                <p className="font-semibold">
                  {destinations.map((d) => d.name).filter(Boolean).join(", ") ||
                    "Destination"}
                </p>
              </div>

              <div className="mt-5 bg-white rounded-xl p-4 border">
                <p className="text-sm text-slate-500">Total Package Price</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatKES(totals.finalTotal)}
                </p>

                <p className="text-sm text-slate-500 mt-3">Price Per Person</p>
                <p className="text-xl font-bold text-blue-900">
                  {formatKES(totals.pricePerPerson)}
                </p>
              </div>

              <div className="mt-5">
                <h4 className="font-bold mb-2">Includes</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {includes.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <h4 className="font-bold mb-2">Excludes</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {excludes
                    .map((e) => e.text)
                    .filter(Boolean)
                    .map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Excludes</h2>
              <button
                onClick={() => setExcludes([...excludes, { id: makeId(), text: "" }])}
                className="bg-blue-700 text-white px-4 py-2 rounded-xl"
              >
                Add
              </button>
            </div>

            <div className="space-y-3">
              {excludes.map((item) => (
                <input
                  key={item.id}
                  value={item.text}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    updateExclude(item.id, e.target.value)
                  }
                  placeholder="Exclude item"
                  className="border rounded-xl p-3 w-full"
                />
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}