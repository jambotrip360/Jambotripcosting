import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { Resend } from "resend";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "activation-data.json");
const TRIAL_HOURS = 2;
const SUBSCRIPTION_AMOUNT = "KES 5,000 per month";

const resend = new Resend(process.env.RESEND_API_KEY);

const ALLOWED_ORIGINS = [
  "https://jambotrip360.com",
  "https://www.jambotrip360.com",
  "http://localhost:5173",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked origin: ${origin}`));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "25mb" }));

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return {
      trials: {},
      unlocks: {},
    };
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {
      trials: {},
      unlocks: {},
    };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function nowMs() {
  return Date.now();
}

function addHours(dateMs, hours) {
  return dateMs + hours * 60 * 60 * 1000;
}

function isTrialExpired(startedAt) {
  return nowMs() > addHours(startedAt, TRIAL_HOURS);
}

function formatMoney(amount, currency = "KES") {
  const num = Number(amount || 0);
  const safeCurrency = currency || "KES";

  if (safeCurrency === "USD") {
    return `USD ${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `Ksh ${num.toLocaleString("en-KE", {
    maximumFractionDigits: 0,
  })}`;
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getThemeColor(data) {
  return (
    data?.agencyBranding?.themeColor ||
    data?.agencyThemeColor ||
    data?.themeColor ||
    data?.primaryColor ||
    "#0F4C81"
  );
}

function getAgency(data) {
  const branding = data?.agencyBranding || data?.branding || {};

  return {
    name:
      cleanText(branding.companyName) ||
      cleanText(data?.agencyName) ||
      cleanText(data?.companyName) ||
      "Travel Agency",
    logo:
      branding.logo ||
      data?.agencyLogo ||
      data?.companyLogo ||
      data?.logo ||
      "",
    phone:
      cleanText(branding.phone) ||
      cleanText(data?.agencyPhone) ||
      cleanText(data?.companyPhone) ||
      "",
    email:
      cleanText(branding.email) ||
      cleanText(data?.agencyEmail) ||
      cleanText(data?.companyEmail) ||
      "",
    website:
      cleanText(branding.website) ||
      cleanText(data?.agencyWebsite) ||
      cleanText(data?.companyWebsite) ||
      "",
    preparedBy:
      cleanText(branding.preparedBy) ||
      cleanText(data?.preparedBy) ||
      cleanText(data?.agentName) ||
      "",
    themePrimary:
  data?.themePrimary ||
  branding.themePrimary ||
  "#0F4C81",

themeSecondary:
  data?.themeSecondary ||
  branding.themeSecondary ||
  "#EAF4FF",

themeAccent:
  data?.themeAccent ||
  branding.themeAccent ||
  "#1D8BFF",
  };
}

function getClientName(data) {
  return (
    cleanText(data?.leadClientName) ||
    cleanText(data?.clientName) ||
    cleanText(data?.clientEmail) ||
    "Client"
  );
}

function drawRoundedRect(doc, x, y, w, h, r, fillColor) {
  doc
    .roundedRect(x, y, w, h, r)
    .fill(fillColor);
}

function addLogo(doc, logoData, x, y, size) {
  if (!logoData || typeof logoData !== "string") return false;

  try {
    if (logoData.startsWith("data:image")) {
      const base64 = logoData.split(",")[1];
      const buffer = Buffer.from(base64, "base64");
      doc.image(buffer, x, y, {
        fit: [size, size],
        align: "center",
        valign: "center",
      });
      return true;
    }

    if (fs.existsSync(logoData)) {
      doc.image(logoData, x, y, {
        fit: [size, size],
        align: "center",
        valign: "center",
      });
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function buildQuotationPdfBuffer(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 36,
      });

      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const agency = getAgency(data);

      const calculation =
        data.calculation && typeof data.calculation === "object"
          ? data.calculation
          : {};

      const currency =
        data.currency ||
        calculation.currencyMode ||
        "KES";

      const finalTotal =
        calculation.displayFinalTotal ??
        calculation.finalTotal ??
        data.finalTotal ??
        0;

      const pricePerPerson =
        calculation.displayPricePerPerson ??
        calculation.pricePerPerson ??
        data.pricePerPerson ??
        0;

      const totalTravellers =
        calculation.totalTravellers ??
        data.totalTravellers ??
        "";

      const totalNights =
        calculation.totalNights ??
        data.totalNights ??
        "";

      const theme = agency.themePrimary || "#0F4C81";
      const secondary = agency.themeSecondary || "#EAF4FF";

      const usableWidth = doc.page.width - 72;

      doc.roundedRect(36, 28, usableWidth, 90, 16).fill(theme);

      doc.roundedRect(48, 42, 74, 62, 10).fill("#ffffff");

      const logoAdded = addLogo(doc, agency.logo, 53, 47, 58);

      if (!logoAdded) {
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(theme)
          .text("Logo", 72, 66);
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor("#ffffff")
        .text(agency.name, 138, 44);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#ffffff")
        .text(
          `${agency.phone} | ${agency.email} | ${agency.website}`,
          138,
          72,
          { width: 370 }
        );

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#ffffff")
        .text(`Prepared by: ${agency.preparedBy}`, 138, 88);

      let y = 145;

      doc
        .font("Helvetica-Bold")
        .fontSize(19)
        .fillColor(theme)
        .text("Client Travel Quotation", 36, y);

      y += 32;

      const hotelText = safeArray(data.hotels)
        .map((hotel) => {
          if (typeof hotel === "string") return hotel;
          return hotel?.name || "";
        })
        .filter(Boolean)
        .join(", ");

      const details = [
        ["Client Name", getClientName(data)],
        ["Destination", safeJoin(data.destinations)],
        ["Trip Type", cleanText(data.tripType)],
        ["Client Type", currency === "USD" ? "Non-Resident" : "Resident"],
        ["Currency", currency],
        ["Adults", String(data.adults || 0)],
        ["Children", String(data.children || 0)],
        ["Total Travellers", String(totalTravellers)],
        ["Additional Clients", safeJoin(data.otherClients)],
      ];

      if (hotelText) {
        details.push(["Hotel(s)", hotelText]);
      }

      if (totalNights) {
        details.push(["Total Nights", String(totalNights)]);
      }

      details.forEach(([label, value]) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#334155")
          .text(label, 36, y, {
            width: 140,
          });

        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#334155")
          .text(value, 165, y, {
            width: 350,
          });

        y += 20;
      });

      y += 20;

      doc.roundedRect(36, y, usableWidth, 100, 14).fill(secondary);

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor(theme)
        .text("Package Summary", 52, y + 16);

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#334155")
        .text("Total Package Price", 52, y + 50);

      doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor(theme)
        .text(formatMoney(finalTotal, currency), 320, y + 48, {
          width: 160,
          align: "right",
        });

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#334155")
        .text("Price Per Person", 52, y + 74);

      doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor(theme)
        .text(formatMoney(pricePerPerson, currency), 320, y + 72, {
          width: 160,
          align: "right",
        });

      y += 130;

      doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor(theme)
        .text("Includes", 36, y);

      y += 24;

      const includes = safeArray(
        calculation.includes || data.includes
      ).filter(Boolean);

      (includes.length ? includes : ["Transport"]).forEach((item) => {
        doc
          .font("Helvetica")
          .fontSize(11)
          .fillColor("#334155")
          .text(`• ${item}`, 46, y);

        y += 18;
      });

      y += 14;

      doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor(theme)
        .text("Excludes", 36, y);

      y += 24;

      const excludes = safeArray(data.excludes).filter(Boolean);

      (excludes.length
        ? excludes
        : ["Anything not mentioned above"]
      ).forEach((item) => {
        doc
          .font("Helvetica")
          .fontSize(11)
          .fillColor("#334155")
          .text(`• ${item}`, 46, y);

        y += 18;
      });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(theme)
        .text(
          `Thank you for choosing ${agency.name}.`,
          36,
          760,
          {
            width: usableWidth,
            align: "center",
          }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function buildEmailHtml(data) {
  const agency = getAgency(data);
  const currency = data?.currency || "KES";
  const finalTotal =
    data?.finalTotal ??
    data?.totalPackagePrice ??
    data?.total ??
    data?.calculation?.finalTotal ??
    0;

  const pricePerPerson =
    data?.pricePerPerson ??
    data?.calculation?.pricePerPerson ??
    0;

  const theme = agency.themePrimary || "#0F4C81";
const secondary = agency.themeSecondary || "#EAF4FF";
const accent = agency.themeAccent || "#1D8BFF";

  return `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.6;max-width:640px;margin:auto;">
      <div style="background:${theme};color:white;padding:22px;border-radius:14px;">
        <h2 style="margin:0;">${agency.name}</h2>
        <p style="margin:6px 0 0 0;">Safari Package Quotation</p>
      </div>

      <div style="padding:20px 0;">
        <p>Dear ${getClientName(data)},</p>
        <p>Thank you for your enquiry. Please find your safari package quotation attached as a PDF.</p>

        <div style="background:#f3f7fb;padding:16px;border-radius:12px;margin:18px 0;">
          <p style="margin:0;"><strong>Total Package Price:</strong> ${formatMoney(finalTotal, currency)}</p>
          <p style="margin:6px 0 0 0;"><strong>Price Per Person:</strong> ${formatMoney(pricePerPerson, currency)}</p>
        </div>

        <p>Kind regards,<br/>
        ${agency.preparedBy ? agency.preparedBy + "<br/>" : ""}
        <strong>${agency.name}</strong></p>
      </div>
    </div>
  `;
}

app.get("/", (req, res) => {
  res.send("Jambo Trip 360 backend is running securely");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is healthy",
    time: new Date().toISOString(),
  });
});

app.post("/trial/start", (req, res) => {
  const { name, email, phone } = req.body || {};
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail) {
    return res.status(400).json({
      success: false,
      message: "Email is required.",
    });
  }

  const data = readData();

  if (!data.trials) data.trials = {};
  if (!data.unlocks) data.unlocks = {};

  if (data.unlocks[cleanEmail]?.unlocked) {
    return res.json({
      success: true,
      unlocked: true,
      trialActive: false,
      message: "Account already unlocked.",
    });
  }

  const existingTrial = data.trials[cleanEmail];

  if (existingTrial) {
    const expired = isTrialExpired(existingTrial.startedAt);

    if (expired) {
      return res.status(403).json({
        success: false,
        trialExpired: true,
        message: "Your 2-hour trial has expired. Please subscribe to continue.",
        subscriptionAmount: SUBSCRIPTION_AMOUNT,
      });
    }

    return res.json({
      success: true,
      trialActive: true,
      startedAt: existingTrial.startedAt,
      expiresAt: addHours(existingTrial.startedAt, TRIAL_HOURS),
      message: "Trial already active.",
    });
  }

  const startedAt = nowMs();

  data.trials[cleanEmail] = {
    name: cleanText(name),
    email: cleanEmail,
    phone: cleanText(phone),
    startedAt,
  };

  writeData(data);

  res.json({
    success: true,
    trialActive: true,
    startedAt,
    expiresAt: addHours(startedAt, TRIAL_HOURS),
    remainingMs: TRIAL_HOURS * 60 * 60 * 1000,
    message: "Trial started successfully.",
  });
});

app.post("/trial/status", (req, res) => {
  const { email } = req.body || {};
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail) {
    return res.status(400).json({
      success: false,
      message: "Email is required.",
    });
  }

  const data = readData();

  if (data.unlocks?.[cleanEmail]?.unlocked) {
    return res.json({
      success: true,
      unlocked: true,
      trialActive: false,
    });
  }

  const trial = data.trials?.[cleanEmail];

  if (!trial) {
    return res.json({
      success: true,
      trialActive: false,
      trialExpired: false,
    });
  }

  const expired = isTrialExpired(trial.startedAt);

  res.json({
    success: true,
    trialActive: !expired,
    trialExpired: expired,
    startedAt: trial.startedAt,
    expiresAt: addHours(trial.startedAt, TRIAL_HOURS),
    subscriptionAmount: SUBSCRIPTION_AMOUNT,
  });
});

app.get("/trial/status", (req, res) => {
  const email = normalizeEmail(req.query.email || "");

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required.",
    });
  }

  const data = readData();

  if (data.unlocks?.[email]?.unlocked) {
    return res.json({
      success: true,
      unlocked: true,
      allowed: true,
      remainingMs: 0,
    });
  }

  const trial = data.trials?.[email];

  if (!trial) {
    return res.json({
      success: false,
      allowed: false,
      remainingMs: 0,
      message: "No active trial found.",
    });
  }

  const expiresAt = addHours(trial.startedAt, TRIAL_HOURS);
  const remainingMs = Math.max(0, expiresAt - nowMs());

  if (remainingMs <= 0) {
    return res.json({
      success: false,
      allowed: false,
      remainingMs: 0,
      message: "Trial expired.",
    });
  }

  return res.json({
    success: true,
    allowed: true,
    unlocked: false,
    remainingMs,
    startedAt: trial.startedAt,
    expiresAt,
  });
});

app.post("/unlock", (req, res) => {
  const { email, code } = req.body || {};
  const cleanEmail = normalizeEmail(email);
  const cleanCode = cleanText(code);

  const adminCode = process.env.ADMIN_UNLOCK_CODE || "JAMBO360";

  if (!cleanEmail || !cleanCode) {
    return res.status(400).json({
      success: false,
      message: "Email and unlock code are required.",
    });
  }

  if (cleanCode !== adminCode) {
    return res.status(403).json({
      success: false,
      message: "Invalid unlock code.",
    });
  }

  const data = readData();

  if (!data.unlocks) data.unlocks = {};

  data.unlocks[cleanEmail] = {
    unlocked: true,
    unlockedAt: nowMs(),
  };

  writeData(data);

  res.json({
    success: true,
    unlocked: true,
    message: "Account unlocked successfully.",
  });
});

app.post("/send-quotation", async (req, res) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY in Render Environment Variables");
    }

    const data = req.body || {};
    const clientEmail =
      cleanText(data.clientEmail) ||
      cleanText(data.email) ||
      cleanText(data.to);

    if (!clientEmail) {
      return res.status(400).json({
        success: false,
        message: "Client email is required.",
      });
    }

    const agency = getAgency(data);
    const pdfBuffer = await buildQuotationPdfBuffer(data);

    const fromEmail = process.env.RESEND_FROM_EMAIL || "quotes@jambotrip360.com";
    const fromName = agency.name || "Travel Quotation";

    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [clientEmail],
      subject: `Your Safari Quotation - ${agency.name}`,
      html: buildEmailHtml(data),
      attachments: [
        {
          filename: "Safari-Quotation.pdf",
          content: pdfBuffer,
        },
      ],
    });

    console.log(`Quotation email sent to: ${clientEmail}`);

    res.json({
      success: true,
      message: "Quotation email sent successfully.",
      resendId: result?.data?.id || null,
    });
  } catch (error) {
    console.error("Send quotation error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to send quotation email.",
    });
  }
});

app.post("/test-email", async (req, res) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY in Render Environment Variables");
    }

    const to = cleanText(req.body?.to) || "jambotrip360@gmail.com";

    const result = await resend.emails.send({
      from: `Jambo Trip 360 <${process.env.RESEND_FROM_EMAIL || "quotes@jambotrip360.com"}>`,
      to: [to],
      subject: "Jambo Trip 360 Test Email",
      html: `
        <div style="font-family:Arial,sans-serif;">
          <h2>Jambo Trip 360 Test Email</h2>
          <p>Your Resend email setup is working.</p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: "Test email sent successfully.",
      resendId: result?.data?.id || null,
    });
  } catch (error) {
    console.error("Test email error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to send test email.",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});