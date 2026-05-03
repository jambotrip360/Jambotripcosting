import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "activation-data.json");
const TRIAL_HOURS = 2;
const SUBSCRIPTION_AMOUNT = "KES 5,000 per month";

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://jambotripcosting.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json({ limit: "25mb" }));

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const starter = { trials: {}, activationCodes: {}, licenses: {} };
    fs.writeFileSync(DATA_FILE, JSON.stringify(starter, null, 2));
    return starter;
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { trials: {}, activationCodes: {}, licenses: {} };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\s+/g, "").trim();
}

function userKey(email, phone) {
  return `${normalizeEmail(email)}__${normalizePhone(phone)}`;
}

function generateActivationCode(name = "AGENT") {
  const cleanName = String(name || "AGENT")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10);

  const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `JAMBO-${cleanName}-${randomPart}`;
}

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;

  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;

  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function formatMoney(value, currency = "KES") {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function calculatePackage(body) {
  const adults = toNumber(body.adults);
  const children = toNumber(body.children);
  const totalTravellers = adults + children;

  const isDayTrip = Boolean(body.isDayTrip);
  const clientType = body.clientType === "USD" ? "USD" : "KES";

  const hotels = Array.isArray(body.hotels) ? body.hotels : [];
  const activities = Array.isArray(body.activities) ? body.activities : [];

  const numberOfDays = toNumber(body.numberOfDays);

  const totalNights = isDayTrip
    ? 0
    : hotels.reduce((sum, hotel) => {
        return sum + calculateNights(hotel.checkIn, hotel.checkOut);
      }, 0) || Math.max(0, numberOfDays - 1);

  const hotelTotal = isDayTrip
    ? 0
    : hotels.reduce((sum, hotel) => {
        const nights = calculateNights(hotel.checkIn, hotel.checkOut) || totalNights;
        return (
          sum +
          toNumber(hotel.doubleRoomRate) * nights +
          toNumber(hotel.childRate) * children * nights
        );
      }, 0);

  const mainTransportTotal = isDayTrip
    ? toNumber(body.transportPricePerDay)
    : toNumber(body.transportPricePerDay) * numberOfDays;

  const adultParkRate =
    clientType === "USD"
      ? toNumber(body.nonResidentAdultFee)
      : toNumber(body.residentAdultFee);

  const childParkRate =
    clientType === "USD"
      ? toNumber(body.nonResidentChildFee)
      : toNumber(body.residentChildFee);

  const parkFeesTotal = isDayTrip
    ? adultParkRate * adults + childParkRate * children
    : (adultParkRate * adults + childParkRate * children) * totalNights;

  const activitiesTotal = activities.reduce((sum, item) => {
    return (
      sum +
      toNumber(item.adultRate) * adults +
      toNumber(item.childRate) * children
    );
  }, 0);

  const mealsTotal =
    toNumber(body.mealsAdultRate) * adults +
    toNumber(body.mealsChildRate) * children +
    toNumber(body.groupMealBuffetRate);

  const otherTransportTotal =
    toNumber(body.trainAdultRate) * adults +
    toNumber(body.trainChildRate) * children +
    toNumber(body.balloonAdultRate) * adults +
    toNumber(body.balloonChildRate) * children +
    toNumber(body.flightAdultRate) * adults +
    toNumber(body.flightChildRate) * children +
    toNumber(body.boatAdultRate) * adults +
    toNumber(body.boatChildRate) * children;

  const subtotal =
    hotelTotal +
    mainTransportTotal +
    parkFeesTotal +
    activitiesTotal +
    mealsTotal +
    otherTransportTotal;

  const markupAmount = subtotal * (toNumber(body.markupPercent) / 100);
  const finalTotal = subtotal + markupAmount;
  const pricePerPerson = totalTravellers > 0 ? finalTotal / totalTravellers : 0;

  const activityNames = activities
    .map((item) => String(item.name || "").trim())
    .filter(Boolean);

  const includes = [
    !isDayTrip && hotelTotal > 0 ? "Accommodation" : "",
    body.mainTransport && body.mainTransport !== "None"
      ? `Transport by ${body.mainTransport}`
      : "",
    parkFeesTotal > 0 ? "Park Fees" : "",
    activityNames.length ? `Activities: ${activityNames.join(", ")}` : "",
    mealsTotal > 0 ? "Meals" : "",
    "Professional driver guide",
  ].filter(Boolean);

  return {
    success: true,
    currencyMode: clientType,
    totalTravellers,
    totalNights,
    hotelTotal,
    hotelPerPerson: totalTravellers > 0 ? hotelTotal / totalTravellers : 0,
    mainTransportTotal,
    transportPerPerson:
      totalTravellers > 0 ? mainTransportTotal / totalTravellers : 0,
    parkFeesTotal,
    parkFeePerPerson:
      totalTravellers > 0 ? parkFeesTotal / totalTravellers : 0,
    activitiesTotal,
    mealsTotal,
    otherTransportTotal,
    extrasTotal: mealsTotal + otherTransportTotal,
    markupAmount,
    finalTotal,
    pricePerPerson,
    displayFinalTotal: finalTotal,
    displayPricePerPerson: pricePerPerson,
    includes,
    transportCalculationText: "",
  };
}

function buildQuotationText(body, calculation) {
  const currency = calculation.currencyMode || body.clientType || "KES";

  const includesText = (calculation.includes || [])
    .map((item) => `• ${item}`)
    .join("\n");

  const excludes = Array.isArray(body.excludes) ? body.excludes : [];
  const excludesText = excludes.length
    ? excludes.map((item) => `• ${item}`).join("\n")
    : "• Anything not mentioned above";

  return `
${body.companyName || "Jambo Trip 360"}
Travel Package Quotation

Prepared by: ${body.preparedBy || "-"}
Phone: ${body.companyPhone || "-"}
Email: ${body.companyEmail || "-"}
Website: ${body.companyWebsite || "-"}

Lead Client: ${body.leadClientName || "-"}
Travellers: ${calculation.totalTravellers}
Adults: ${body.adults || "0"}
Children: ${body.children || "0"}
Trip Type: ${body.tripType || "-"}
Client Type: ${currency === "USD" ? "Non-Resident" : "Resident"}
Destination(s): ${(body.destinations || []).join(", ") || "-"}
Hotel(s): ${(body.hotels || []).map((h) => h.name).filter(Boolean).join(", ") || "-"}

Total Package Price: ${formatMoney(calculation.displayFinalTotal, currency)}
Price Per Person: ${formatMoney(calculation.displayPricePerPerson, currency)}

Includes
${includesText || "• Transport"}

Excludes
${excludesText}
  `.trim();
}

const transporter =
  process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      })
    : null;

app.get("/", (req, res) => {
  res.send("Jambo Trip 360 backend is running securely");
});

app.post("/trial/start", (req, res) => {
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);

  if (!email || !email.includes("@") || !phone) {
    return res.status(400).json({
      allowed: false,
      message: "Valid email and phone are required.",
    });
  }

  const data = readData();
  const key = userKey(email, phone);

  if (data.licenses[key]?.active) {
    return res.json({
      allowed: true,
      unlocked: true,
      email,
      phone,
      remainingMs: 0,
      message: "Subscription active.",
    });
  }

  if (!data.trials[key]) {
    data.trials[key] = {
      email,
      phone,
      startedAt: Date.now(),
    };
    writeData(data);
  }

  const trial = data.trials[key];
  const expiresAt = trial.startedAt + TRIAL_HOURS * 60 * 60 * 1000;
  const remainingMs = Math.max(0, expiresAt - Date.now());

  if (remainingMs <= 0) {
    return res.json({
      allowed: false,
      unlocked: false,
      email,
      phone,
      remainingMs: 0,
      message: "Trial ended. Please activate subscription.",
    });
  }

  res.json({
    allowed: true,
    unlocked: false,
    email,
    phone,
    remainingMs,
    message: "Trial active.",
  });
});

app.get("/trial/status", (req, res) => {
  const email = normalizeEmail(req.query.email);
  const phone = normalizePhone(req.query.phone);

  if (!email || !phone) {
    return res.status(400).json({
      allowed: false,
      message: "Email and phone are required.",
    });
  }

  const data = readData();
  const key = userKey(email, phone);

  if (data.licenses[key]?.active) {
    return res.json({
      allowed: true,
      unlocked: true,
      email,
      phone,
      remainingMs: 0,
      message: "Subscription active.",
    });
  }

  const trial = data.trials[key];

  if (!trial) {
    return res.json({
      allowed: false,
      unlocked: false,
      email,
      phone,
      remainingMs: 0,
      message: "No trial found.",
    });
  }

  const expiresAt = trial.startedAt + TRIAL_HOURS * 60 * 60 * 1000;
  const remainingMs = Math.max(0, expiresAt - Date.now());

  res.json({
    allowed: remainingMs > 0,
    unlocked: false,
    email,
    phone,
    remainingMs,
    message:
      remainingMs > 0
        ? "Trial active."
        : "Trial ended. Please activate subscription.",
  });
});

app.post("/activate", (req, res) => {
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const code = String(req.body.code || "").trim().toUpperCase();

  if (!email || !phone || !code) {
    return res.status(400).json({
      success: false,
      message: "Email, phone, and activation code are required.",
    });
  }

  const data = readData();
  const key = userKey(email, phone);
  const activation = data.activationCodes[code];

  if (!activation) {
    return res.status(400).json({
      success: false,
      message: "Invalid activation code.",
    });
  }

  if (activation.used) {
    return res.status(400).json({
      success: false,
      message: "This activation code has already been used.",
    });
  }

  if (
    normalizeEmail(activation.email) !== email ||
    normalizePhone(activation.phone) !== phone
  ) {
    return res.status(403).json({
      success: false,
      message: "This code does not belong to this email and phone number.",
    });
  }

  activation.used = true;
  activation.usedAt = Date.now();

  data.licenses[key] = {
    email,
    phone,
    active: true,
    activatedAt: Date.now(),
    code,
    subscription: SUBSCRIPTION_AMOUNT,
  };

  writeData(data);

  res.json({
    success: true,
    unlocked: true,
    message: "Activation successful.",
  });
});

app.post("/admin/generate-code", (req, res) => {
  const adminSecret = String(req.headers["x-admin-secret"] || "");
  const expectedSecret = String(process.env.ADMIN_SECRET || "");

  if (!expectedSecret || adminSecret !== expectedSecret) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const name = String(req.body.name || "Agent").trim();

  if (!email || !email.includes("@") || !phone) {
    return res.status(400).json({
      success: false,
      message: "Valid email and phone are required.",
    });
  }

  const data = readData();
  let code = generateActivationCode(name);

  while (data.activationCodes[code]) {
    code = generateActivationCode(name);
  }

  data.activationCodes[code] = {
    email,
    phone,
    name,
    used: false,
    createdAt: Date.now(),
  };

  writeData(data);

  res.json({
    success: true,
    code,
    email,
    phone,
    message: "Activation code generated successfully.",
  });
});

app.post("/calculate", (req, res) => {
  try {
    const result = calculatePackage(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Calculation failed.",
      error: error.message,
    });
  }
});

app.post("/send-quotation", async (req, res) => {
  try {
    if (!transporter) {
      return res.status(500).json({
        success: false,
        message: "Email is not configured. Add EMAIL_USER and EMAIL_PASS.",
      });
    }

    const calculation = req.body.calculation || calculatePackage(req.body);
    const quoteText = req.body.quoteText || buildQuotationText(req.body, calculation);

    const clientEmail = normalizeEmail(req.body.clientEmail);

    if (!clientEmail) {
      return res.status(400).json({
        success: false,
        message: "Client email is required.",
      });
    }

    await transporter.sendMail({
      from: `"${req.body.companyName || "Jambo Trip 360"}" <${process.env.EMAIL_USER}>`,
      to: clientEmail,
      subject: `Travel Quotation - ${req.body.leadClientName || "Client"}`,
      text: quoteText,
    });

    res.json({
      success: true,
      message: "Quotation sent successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send quotation.",
      error: error.message,
    });
  }
});

app.get("/test-email", async (req, res) => {
  try {
    if (!transporter) {
      return res.status(500).json({
        success: false,
        message: "Email setup failed. EMAIL_USER or EMAIL_PASS missing.",
      });
    }

    await transporter.verify();

    res.json({
      success: true,
      message: "Email is ready.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Email setup failed.",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});