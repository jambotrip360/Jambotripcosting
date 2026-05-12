import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { Resend } from "resend";
import PDFDocument from "pdfkit";

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
      "https://jambotrip360.com",
      "https://www.jambotrip360.com",
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

  if (value.startsWith("07")) value = "+254" + value.substring(1);
  else if (value.startsWith("7")) value = "+254" + value;
  else if (value.startsWith("2547")) value = "+" + value;

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
    const adultRate = Number(hotel.adultRate || hotel.doubleRate || 0);
    const childRate = Number(hotel.childRate || 0);
    return sum + adultRate * adults + childRate * children;
  }, 0);

  const activitiesTotal = activities.reduce((sum, activity) => {
    const adultRate = Number(activity.adultRate || 0);
    const childRate = Number(activity.childRate || 0);
    return sum + adultRate * adults + childRate * children;
  }, 0);

  const mainTransportPrice = Number(
    body.mainTransportPrice || body.transportPrice || 0
  );
  const transportDays = Number(body.transportDays || days || 0);
  const mainTransportTotal = mainTransportPrice * transportDays;

  const parkFeeAdult = Number(body.parkFeeAdult || 0);
  const parkFeeChild = Number(body.parkFeeChild || 0);
  const parkFeeNights = Number(body.parkFeeNights || nights || 0);
  const parkFeesTotal =
    (parkFeeAdult * adults + parkFeeChild * children) * parkFeeNights;

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
    excludes: body.excludes || [],
  };
}

async function sendEmail({ to, subject, html, attachments = [] }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY in Render Environment Variables");
  }

  return resend.emails.send({
    from: "Jambo Trip 360 <quotes@jambotrip360.com>",
    to,
    subject,
    html,
    attachments,
  });
}

function generateQuotationPDF({ to, calculation, body }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).text("Jambo Trip 360", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(18).text("Safari Package Quotation", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Client Email: ${to}`);
    doc.text(`Total Travellers: ${calculation.totalTravellers}`);
    doc.text(`Total Nights: ${calculation.totalNights}`);
    doc.moveDown();

    doc.fontSize(15).text("Client Quotation Summary", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(13).text(`Total Package Price: KES ${money(calculation.finalTotal)}`);
    doc.text(`Price Per Person: KES ${money(calculation.pricePerPerson)}`);
    doc.moveDown();

    if (Array.isArray(body.hotels) && body.hotels.length > 0) {
      doc.fontSize(15).text("Hotels", { underline: true });
      doc.moveDown(0.5);
      body.hotels.forEach((hotel, index) => {
        doc.fontSize(12).text(
          `${index + 1}. ${hotel.name || "Hotel"} - ${hotel.mealPlan || ""}`
        );
      });
      doc.moveDown();
    }

    if (Array.isArray(body.activities) && body.activities.length > 0) {
      doc.fontSize(15).text("Activities", { underline: true });
      doc.moveDown(0.5);
      body.activities.forEach((activity, index) => {
        doc.fontSize(12).text(`${index + 1}. ${activity.name || "Activity"}`);
      });
      doc.moveDown();
    }

    if (Array.isArray(calculation.includes) && calculation.includes.length > 0) {
      doc.fontSize(15).text("Includes", { underline: true });
      doc.moveDown(0.5);
      calculation.includes.forEach((item) => {
        doc.fontSize(12).text(`• ${item}`);
      });
      doc.moveDown();
    }

    if (Array.isArray(calculation.excludes) && calculation.excludes.length > 0) {
      doc.fontSize(15).text("Excludes", { underline: true });
      doc.moveDown(0.5);
      calculation.excludes.forEach((item) => {
        doc.fontSize(12).text(`• ${item}`);
      });
      doc.moveDown();
    }

    doc.fontSize(15).text("Internal Cost Breakdown", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Hotel Total: KES ${money(calculation.hotelTotal)}`);
    doc.text(`Transport Total: KES ${money(calculation.mainTransportTotal)}`);
    doc.text(`Park Fees Total: KES ${money(calculation.parkFeesTotal)}`);
    doc.text(`Activities Total: KES ${money(calculation.activitiesTotal)}`);
    doc.text(`Meals Total: KES ${money(calculation.mealsTotal)}`);
    doc.text(`Other Transport Total: KES ${money(calculation.otherTransportTotal)}`);
    doc.text(`Fuel Total: KES ${money(calculation.fuelTotal)}`);
    doc.text(`Driver Total: KES ${money(calculation.driverTotal)}`);
    doc.text(`Markup Amount: KES ${money(calculation.markupAmount)}`);
    doc.moveDown();

    doc.fontSize(10).text("This quotation was prepared using Jambo Trip 360.", {
      align: "center",
    });

    doc.end();
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

    if (!name || !email || !email.includes("@") || !/^\+2547\d{8}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter name, email, and phone number.",
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
        remainingMs: expiresAt - now,
        expiresAt,
        unlocked: false,
        name: trial.name,
        email,
        phone,
        startedAt,
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

app.get("/trial/status", (req, res) => {
  try {
    const email = normalizeEmail(req.query.email);
    const phone = normalizePhone(req.query.phone);

    const data = readData();
    const key = userKey(email, phone);

    if (data.licenses[key]?.active) {
      return res.json({
        success: true,
        allowed: true,
        unlocked: true,
        remainingMs: 0,
        message: "Account active.",
      });
    }

    const trial = data.trials[key];

    if (!trial) {
      return res.json({
        success: true,
        allowed: false,
        unlocked: false,
        trialStarted: false,
        remainingMs: 0,
      });
    }

    const now = Date.now();
    const startedAt = Number(trial.startedAt);
    const expiresAt = startedAt + TRIAL_HOURS * 60 * 60 * 1000;
    const remainingMs = Math.max(0, expiresAt - now);

    if (remainingMs <= 0) {
      return res.json({
        success: true,
        allowed: false,
        expired: true,
        unlocked: false,
        remainingMs: 0,
        startedAt,
        expiresAt,
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
      remainingMs,
      trialHours: TRIAL_HOURS,
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

    if (!email || !email.includes("@") || !phone) {
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
    const pdfBuffer = await generateQuotationPDF({
      to,
      calculation,
      body: req.body,
    });

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.6">
        <h2>Safari Package Quotation</h2>
        <p>Thank you for your enquiry. Please find your quotation PDF attached.</p>
        <h3>Total Package Price: KES ${money(calculation.finalTotal)}</h3>
        <h3>Price Per Person: KES ${money(calculation.pricePerPerson)}</h3>
        <p>This quotation was prepared using Jambo Trip 360.</p>
      </div>
    `;

    await sendEmail({
      to,
      subject,
      html,
      attachments: [
        {
          filename: "Jambo-Trip-360-Quotation.pdf",
          content: pdfBuffer,
        },
      ],
    });

    console.log("Quotation email with PDF sent to:", to);

    res.json({
      success: true,
      message: "Quotation sent successfully with PDF attachment.",
    });
  } catch (error) {
    console.error("Quotation email failed:", error);

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