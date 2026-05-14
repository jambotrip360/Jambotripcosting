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
    themeColor: getThemeColor(data),
  };
}

function getClientName(data) {
  return (
    cleanText(data?.leadClient) ||
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
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
    });

    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

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

    const totalTravellers =
      data?.totalTravellers ??
      data?.travellers ??
      data?.calculation?.totalTravellers ??
      "";

    const totalNights =
      data?.totalNights ??
      data?.nights ??
      data?.calculation?.totalNights ??
      "";

    const tripDays =
      data?.tripDays ??
      data?.days ??
      data?.numberOfDays ??
      "";

    const theme = agency.themeColor || "#0F4C81";
    const lightBg = "#F3F7FB";
    const darkText = "#1F2937";
    const mutedText = "#6B7280";

    let y = 45;

    drawRoundedRect(doc, 50, y, 495, 85, 14, theme);

    const logoBoxX = 65;
    const logoBoxY = y + 15;

    doc.roundedRect(logoBoxX, logoBoxY, 58, 58, 10).fill("#FFFFFF");

    const logoAdded = addLogo(doc, agency.logo, logoBoxX + 6, logoBoxY + 6, 46);

    if (!logoAdded) {
      doc
        .fontSize(18)
        .fillColor(theme)
        .font("Helvetica-Bold")
        .text("360", logoBoxX + 12, logoBoxY + 20);
    }

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(22)
      .text(agency.name, 140, y + 18, { width: 370 });

    const contactLine = [agency.phone, agency.email, agency.website]
      .filter(Boolean)
      .join(" | ");

    if (contactLine) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#FFFFFF")
        .text(contactLine, 140, y + 48, { width: 370 });
    }

    if (agency.preparedBy) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#FFFFFF")
        .text(`Prepared by: ${agency.preparedBy}`, 140, y + 64, {
          width: 370,
        });
    }

    y += 120;

    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor(theme)
      .text("Client Travel Quotation", 50, y);

    y += 38;

    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor("#E5E7EB")
      .stroke();

    y += 22;

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(darkText)
      .text("Client Details", 50, y);

    y += 25;

    const leftX = 50;
    const rightX = 310;
    const labelW = 120;
    const valueW = 170;

    function detailRow(label, value, x, rowY) {
      if (!value && value !== 0) return;
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(darkText)
        .text(label, x, rowY, { width: labelW });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(darkText)
        .text(String(value), x + labelW, rowY, { width: valueW });
    }

    const additionalClients = safeArray(data?.otherClients || data?.additionalClients)
      .map((c) => (typeof c === "string" ? c : c?.name))
      .filter(Boolean)
      .join(", ");

    const hotels = safeArray(data?.hotels)
      .map((h) => {
        if (typeof h === "string") return h;
        const hotelName = cleanText(h?.name);
        const mealPlan = cleanText(h?.mealPlan);
        return [hotelName, mealPlan].filter(Boolean).join(" - ");
      })
      .filter(Boolean)
      .join(", ");

    detailRow("Client Name", getClientName(data), leftX, y);
    detailRow("Destination", cleanText(data?.destination || data?.destinations?.[0]?.name), leftX, y + 20);
    detailRow("Client Type", cleanText(data?.clientType), leftX, y + 40);
    detailRow("Currency", currency, leftX, y + 60);
    detailRow("Adults", data?.adults ?? data?.adultCount ?? "", leftX, y + 80);
    detailRow("Children", data?.children ?? data?.childCount ?? "", leftX, y + 100);
    detailRow("Total Travellers", totalTravellers, leftX, y + 120);

    detailRow("Trip Days", tripDays, rightX, y);
    detailRow("Trip Type", cleanText(data?.tripType), rightX, y + 20);
    detailRow("Additional Clients", additionalClients, rightX, y + 40);
    detailRow("Hotel(s)", hotels, rightX, y + 60);
    detailRow("Total Nights", totalNights, rightX, y + 80);

    y += 165;

    drawRoundedRect(doc, 50, y, 495, 78, 12, lightBg);

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(theme)
      .text("Package Summary", 70, y + 16);

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(darkText)
      .text("Total Package Price", 70, y + 43);

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(theme)
      .text(formatMoney(finalTotal, currency), 385, y + 39, {
        width: 130,
        align: "right",
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(darkText)
      .text("Price Per Person", 70, y + 62);

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(theme)
      .text(formatMoney(pricePerPerson, currency), 385, y + 58, {
        width: 130,
        align: "right",
      });

    y += 110;

    function sectionList(title, items, startY) {
      let sectionY = startY;

      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(theme)
        .text(title, 50, sectionY);

      sectionY += 22;

      const cleanItems = safeArray(items)
        .map((item) => {
          if (typeof item === "string") return item;
          return item?.text || item?.name || "";
        })
        .filter(Boolean);

      if (cleanItems.length === 0) {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(mutedText)
          .text("Not specified", 50, sectionY);
        return sectionY + 20;
      }

      cleanItems.forEach((item, index) => {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(darkText)
          .text(`${index + 1}. ${item}`, 50, sectionY, { width: 460 });
        sectionY += 16;
      });

      return sectionY + 12;
    }

    y = sectionList(
      "Includes",
      data?.includes || data?.calculation?.includes || [],
      y
    );

    y = sectionList(
      "Excludes",
      data?.excludes || data?.excludeItems || [],
      y
    );

    const activities = safeArray(data?.activities)
      .map((a) => (typeof a === "string" ? a : a?.name))
      .filter(Boolean);

    if (activities.length > 0) {
      y = sectionList("Activities", activities, y);
    }

    if (y > 680) {
      doc.addPage();
      y = 60;
    }

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(mutedText)
      .text(`Thank you for choosing ${agency.name}.`, 50, 750, {
        width: 495,
        align: "center",
      });

    doc.end();
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

  const theme = agency.themeColor || "#0F4C81";

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