import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { Resend } from "resend";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "activation-data.json");
const TRIAL_HOURS = 2;
const SUBSCRIPTION_AMOUNT = "KES 5,000 per month";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const starter = {
      trials: {},
      activationCodes: {},
      licenses: {},
      usedCodes: {},
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(starter, null, 2));
    return starter;
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {
      trials: {},
      activationCodes: {},
      licenses: {},
      usedCodes: {},
    };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  let value = String(phone || "").trim().replace(/\s/g, "");

  if (value.startsWith("07")) {
    value = "+254" + value.substring(1);
  } else if (value.startsWith("254")) {
    value = "+" + value;
  }

  return value;
}

function userKey(email, phone) {
  return `${normalizeEmail(email)}__${normalizePhone(phone)}`;
}

function generateCode(name) {
  const cleanName = String(name || "AGENT")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);

  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `JAMBO-${cleanName}-${random}`;
}

function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString("en-KE", {
    maximumFractionDigits: 0,
  });
}

function calculatePackage(body) {
  const adults = Number(body.adults || 0);
  const children = Number(body.children || 0);
  const totalTravellers = Math.max(adults + children, 1);

  const nights = Number(body.nights || body.totalNights || 0);
  const days = Number(body.days || 0);

  const hotels = Array.isArray(body.hotels) ? body.hotels : [];
  const activities = Array.isArray(body.activities) ? body.activities : [];

  const hotelTotal = hotels.reduce((sum, hotel) => {
    const adultRate = Number(hotel.adultRate || 0);
    const childRate = Number(hotel.childRate || 0);
    return sum + adultRate * adults + childRate * children;
  }, 0);

  const activitiesTotal = activities.reduce((sum, activity) => {
    const adultRate = Number(activity.adultRate || 0);
    const childRate = Number(activity.childRate || 0);
    return sum + adultRate * adults + childRate * children;
  }, 0);

  const mainTransportPrice = Number(body.mainTransportPrice || body.transportPrice || 0);
  const transportDays = Number(body.transportDays || days || 0);
  const mainTransportTotal = mainTransportPrice * transportDays;

  const parkFeeAdult = Number(body.parkFeeAdult || 0);
  const parkFeeChild = Number(body.parkFeeChild || 0);
  const parkFeeNights = Number(body.parkFeeNights || nights || 0);
  const parkFeesTotal = (parkFeeAdult * adults + parkFeeChild * children) * parkFeeNights;

  const mealsTotal = Number(body.mealsTotal || 0);
  const otherTransportTotal = Number(body.otherTransportTotal || 0);
  const fuelTotal = Number(body.fuelTotal || 0);
  const driverTotal = Number(body.driverTotal || 0);

  const subtotal =
    hotelTotal +
    activitiesTotal +
    mainTransportTotal +
    parkFeesTotal +
    mealsTotal +
    otherTransportTotal +
    fuelTotal +
    driverTotal;

  const markupType = body.markupType || "amount";
  const markupValue = Number(body.markupValue || body.markup || 0);
  const markupAmount =
    markupType === "percent" ? subtotal * (markupValue / 100) : markupValue;

  const finalTotal = subtotal + markupAmount;
  const pricePerPerson = finalTotal / totalTravellers;

  return {
    success: true,
    totalTravellers,
    totalNights: nights,
    hotelTotal,
    mainTransportTotal,
    parkFeesTotal,
    activitiesTotal,
    mealsTotal,
    otherTransportTotal,
    fuelTotal,
    driverTotal,
    markupAmount,
    finalTotal,
    pricePerPerson,
    includes: body.includes || [],
  };
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY in Render Environment Variables");
  }

  return resend.emails.send({
    from: "Jambo Trip 360 <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}

app.get("/", (req, res) => {
  res.send("Jambo Trip 360 backend is running securely");
});

app.post("/calculate", (req, res) => {
  try {
    const calculation = calculatePackage(req.body);
    res.json(calculation);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Calculation failed",
      error: error.message,
    });
  }
});

app.post("/trial/start", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);

    if (!name || !email || !email.includes("@") || !phone.startsWith("+2547")) {
      return res.status(400).json({
        success: false,
        message: "Valid name, email, and +2547 phone number are required.",
      });
    }

    const data = readData();
    const key = userKey(email, phone);

    if (data.licenses[key]?.active) {
      return res.json({
        success: true,
        allowed: true,
        unlocked: true,
        message: "Account already activated.",
      });
    }

    if (data.trials[key]) {
      const trial = data.trials[key];
      const startedAt = Number(trial.startedAt);
      const expiresAt = startedAt + TRIAL_HOURS * 60 * 60 * 1000;
      const now = Date.now();

      if (now > expiresAt) {
        return res.status(403).json({
          success: false,
          allowed: false,
          expired: true,
          message: "Trial expired. Please activate your account.",
        });
      }

      return res.json({
        success: true,
        allowed: true,
        unlocked: false,
        name: trial.name,
        email,
        phone,
        startedAt,
        expiresAt,
        trialHours: TRIAL_HOURS,
      });
    }

    const startedAt = Date.now();
    const expiresAt = startedAt + TRIAL_HOURS * 60 * 60 * 1000;

    data.trials[key] = {
      name,
      email,
      phone,
      startedAt,
      expiresAt,
    };

    saveData(data);

    res.json({
      success: true,
      allowed: true,
      unlocked: false,
      name,
      email,
      phone,
      startedAt,
      expiresAt,
      trialHours: TRIAL_HOURS,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to start trial",
      error: error.message,
    });
  }
});

app.post("/trial/check", (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const data = readData();
    const key = userKey(email, phone);

    if (data.licenses[key]?.active) {
      return res.json({
        success: true,
        allowed: true,
        unlocked: true,
        message: "Account active.",
      });
    }

    const trial = data.trials[key];

    if (!trial) {
      return res.json({
        success: true,
        allowed: false,
        trialStarted: false,
      });
    }

    const now = Date.now();
    const startedAt = Number(trial.startedAt);
    const expiresAt = startedAt + TRIAL_HOURS * 60 * 60 * 1000;

    if (now > expiresAt) {
      return res.json({
        success: true,
        allowed: false,
        expired: true,
        startedAt,
        expiresAt,
      });
    }

    res.json({
      success: true,
      allowed: true,
      unlocked: false,
      name: trial.name,
      email,
      phone,
      startedAt,
      expiresAt,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Trial check failed",
      error: error.message,
    });
  }
});

app.post("/admin/generate-code", async (req, res) => {
  try {
    const adminSecret = String(req.headers["x-admin-secret"] || "");
    const expectedSecret = String(process.env.ADMIN_SECRET || "");

    if (!expectedSecret || adminSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const name = String(req.body.name || "Agent").trim();
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);

    if (!email || !email.includes("@") || !phone.startsWith("+2547")) {
      return res.status(400).json({
        success: false,
        message: "Valid email and +2547 phone are required.",
      });
    }

    const data = readData();
    const key = userKey(email, phone);
    const code = generateCode(name);

    data.activationCodes[code] = {
      code,
      name,
      email,
      phone,
      key,
      active: true,
      used: false,
      createdAt: Date.now(),
      amount: SUBSCRIPTION_AMOUNT,
    };

    saveData(data);

    try {
      await sendEmail({
        to: email,
        subject: "Your Jambo Trip 360 Activation Code",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
            <h2>Jambo Trip 360 Activation Code</h2>
            <p>Hello ${name},</p>
            <p>Your activation code is:</p>
            <h1 style="color:#0057B8;letter-spacing:1px">${code}</h1>
            <p>Use this code to unlock your Jambo Trip 360 account.</p>
            <p><strong>Subscription:</strong> ${SUBSCRIPTION_AMOUNT}</p>
          </div>
        `,
      });
    } catch (emailError) {
      return res.json({
        success: true,
        emailSent: false,
        code,
        name,
        email,
        phone,
        message: "Activation code generated, but email failed.",
        emailError: emailError.message,
      });
    }

    res.json({
      success: true,
      emailSent: true,
      code,
      name,
      email,
      phone,
      message: "Activation code generated and emailed successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not generate activation code.",
      error: error.message,
    });
  }
});

app.post("/activate", (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code || "").trim().toUpperCase();

    const data = readData();
    const key = userKey(email, phone);
    const activation = data.activationCodes[code];

    if (!activation || !activation.active) {
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

    if (activation.email !== email || activation.phone !== phone) {
      return res.status(400).json({
        success: false,
        message: "Activation details do not match.",
      });
    }

    activation.used = true;
    activation.usedAt = Date.now();

    data.licenses[key] = {
      active: true,
      email,
      phone,
      activatedAt: Date.now(),
      code,
      amount: SUBSCRIPTION_AMOUNT,
    };

    data.activationCodes[code] = activation;
    saveData(data);

    res.json({
      success: true,
      unlocked: true,
      message: "Activation successful.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Activation failed.",
      error: error.message,
    });
  }
});

app.post("/send-quotation", async (req, res) => {
  try {
    const to = normalizeEmail(req.body.to || req.body.clientEmail);
    const subject = req.body.subject || "Your Safari Quotation - Jambo Trip 360";

    if (!to || !to.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Valid client email is required.",
      });
    }

    const calculation = calculatePackage(req.body);

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.6">
        <h2>Safari Package Quotation</h2>
        <p>Thank you for your enquiry. Please find your package summary below.</p>
        <h3>Total Package Price: KES ${money(calculation.finalTotal)}</h3>
        <h3>Price Per Person: KES ${money(calculation.pricePerPerson)}</h3>
        <p>This quotation was prepared using Jambo Trip 360.</p>
      </div>
    `;

    await sendEmail({
      to,
      subject,
      html,
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
    await sendEmail({
      to: "jambotrip360@gmail.com",
      subject: "Jambo Trip 360 Test Email",
      html: "<h2>Email is working perfectly ✅</h2><p>Resend is connected successfully.</p>",
    });

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});