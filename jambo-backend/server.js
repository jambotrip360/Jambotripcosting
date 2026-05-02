const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const TRIAL_HOURS = 2;

app.use(cors());
app.use(express.json({ limit: "25mb" }));

const trials = {};

function toNumber(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function safeText(value, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeJoin(values) {
  const clean = safeArray(values).map((v) => String(v).trim()).filter(Boolean);
  return clean.length ? clean.join(", ") : "-";
}

function formatMoney(value, currency = "KES") {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function getNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

function hexToRgb(hex) {
  const clean = String(hex || "").replace("#", "");
  if (clean.length !== 6) return { r: 15, g: 76, b: 129 };
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

app.post("/trial/start", (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();

  if (!email) {
    return res.status(400).json({
      allowed: false,
      message: "Email is required",
    });
  }

  const now = Date.now();
  const trialMs = TRIAL_HOURS * 60 * 60 * 1000;

  if (!trials[email]) {
    trials[email] = {
      startedAt: now,
      unlocked: false,
    };
  }

  const trial = trials[email];
  const remainingMs = trialMs - (now - trial.startedAt);

  if (trial.unlocked || remainingMs > 0) {
    return res.json({
      allowed: true,
      email,
      unlocked: trial.unlocked,
      remainingMs: Math.max(0, remainingMs),
    });
  }

  return res.json({
    allowed: false,
    email,
    unlocked: false,
    remainingMs: 0,
    message: "Trial ended. Please unlock full version.",
  });
});

app.get("/trial/status", (req, res) => {
  const email = String(req.query.email || "").toLowerCase().trim();

  if (!email || !trials[email]) {
    return res.json({
      allowed: false,
      email,
      unlocked: false,
      remainingMs: 0,
      message: "No trial found.",
    });
  }

  const now = Date.now();
  const trialMs = TRIAL_HOURS * 60 * 60 * 1000;
  const trial = trials[email];
  const remainingMs = trialMs - (now - trial.startedAt);

  res.json({
    allowed: trial.unlocked || remainingMs > 0,
    email,
    unlocked: trial.unlocked,
    remainingMs: Math.max(0, remainingMs),
    message: remainingMs > 0 ? "" : "Trial ended. Please unlock full version.",
  });
});

function buildCalculation(body) {
  const adults = Math.max(0, toNumber(body.adults));
  const children = Math.max(0, toNumber(body.children));
  const totalTravellers = adults + children;

  const currencyMode = body.clientType === "USD" ? "USD" : "KES";
  const isDayTrip = body.baseTripType === "Day Trip" || body.tripType === "Day Trip";

  const hotels = isDayTrip ? [] : safeArray(body.hotels);
  const activities = safeArray(body.activities);

  const nightsFromHotels = hotels.reduce(
    (sum, hotel) => sum + getNights(hotel.checkIn, hotel.checkOut),
    0
  );

  const totalNights = isDayTrip
    ? 0
    : nightsFromHotels > 0
    ? nightsFromHotels
    : Math.max(0, toNumber(body.numberOfDays) - 1);

  const hotelTotal = isDayTrip
    ? 0
    : hotels.reduce((sum, hotel) => {
        const nights = getNights(hotel.checkIn, hotel.checkOut) || totalNights;
        const roomTotal = toNumber(hotel.doubleRoomRate) * nights;
        const childTotal = toNumber(hotel.childRate) * children * nights;
        return sum + roomTotal + childTotal;
      }, 0);

  const transportRate = toNumber(body.transportPricePerDay);
  const transportDays = isDayTrip ? 1 : toNumber(body.numberOfDays);
  const mainTransportTotal = isDayTrip ? transportRate : transportRate * transportDays;

  const adultParkRate =
    currencyMode === "USD"
      ? toNumber(body.nonResidentAdultFee)
      : toNumber(body.residentAdultFee);

  const childParkRate =
    currencyMode === "USD"
      ? toNumber(body.nonResidentChildFee)
      : toNumber(body.residentChildFee);

  const parkBase = adultParkRate * adults + childParkRate * children;

  const parkFeesTotal = isDayTrip ? parkBase : parkBase * totalNights;

  const activitiesTotal = activities.reduce((sum, activity) => {
    return (
      sum +
      toNumber(activity.adultRate) * adults +
      toNumber(activity.childRate) * children
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

  const extrasTotal = activitiesTotal + mealsTotal + otherTransportTotal;

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

  const hotelNames = hotels.map((h) => safeText(h.name, "")).filter(Boolean);

  const includes = [
    hotelNames.length ? "Accommodation" : "",
    safeText(body.mainTransport, "") && body.mainTransport !== "None"
      ? `Transport (${safeText(body.mainTransport)})`
      : "",
    parkFeesTotal > 0 ? "Park Fees" : "",
    activitiesTotal > 0 ? "Activities" : "",
    mealsTotal > 0 ? "Meals" : "",
    "Professional Driver Guide",
  ].filter(Boolean);

  const transportCalculationText = isDayTrip
    ? `Day Trip Transport: ${formatMoney(mainTransportTotal, currencyMode)} fixed total`
    : `Transport: ${formatMoney(transportRate, currencyMode)} × ${transportDays} day(s) = ${formatMoney(
        mainTransportTotal,
        currencyMode
      )}`;

  return {
    success: true,
    currencyMode,
    totalTravellers,
    totalNights,

    hotelTotal,
    hotelPerPerson: totalTravellers > 0 ? hotelTotal / totalTravellers : 0,

    mainTransportTotal,
    transportPerPerson: totalTravellers > 0 ? mainTransportTotal / totalTravellers : 0,

    parkFeesTotal,
    parkFeePerPerson: totalTravellers > 0 ? parkFeesTotal / totalTravellers : 0,

    activitiesTotal,
    mealsTotal,
    otherTransportTotal,
    extrasTotal,

    markupAmount,
    finalTotal,
    pricePerPerson,

    displayFinalTotal: finalTotal,
    displayPricePerPerson: pricePerPerson,

    includes,
    transportCalculationText,
  };
}

function buildPdfBuffer(data) {
  return new Promise((resolve, reject) => {
    try {
      const calculation =
        data.calculation && typeof data.calculation === "object"
          ? data.calculation
          : buildCalculation(data);

      const currencyMode =
        calculation.currencyMode || (data.clientType === "USD" ? "USD" : "KES");

      const displayFinalTotal =
        calculation.displayFinalTotal ?? calculation.finalTotal;

      const displayPricePerPerson =
        calculation.displayPricePerPerson ?? calculation.pricePerPerson;

      const doc = new PDFDocument({
        size: "A4",
        margin: 36,
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const primary = safeText(data.themePrimary, "#0F4C81");
      const secondary = safeText(data.themeSecondary, "#EAF4FF");
      const rgb = hexToRgb(primary);

      const pageWidth = doc.page.width;
      const usableWidth = pageWidth - 72;

      doc.roundedRect(36, 28, usableWidth, 90, 16).fill(primary);

      doc.roundedRect(48, 42, 74, 62, 10).fill("#ffffff");

      if (data.companyLogo && typeof data.companyLogo === "string") {
        try {
          const base64Data = data.companyLogo.replace(/^data:image\/\w+;base64,/, "");
          const logoBuffer = Buffer.from(base64Data, "base64");
          doc.image(logoBuffer, 53, 47, {
            fit: [64, 52],
            align: "center",
            valign: "center",
          });
        } catch {
          doc.font("Helvetica-Bold").fontSize(10).fillColor(primary).text("Logo", 72, 66);
        }
      } else {
        doc.font("Helvetica-Bold").fontSize(10).fillColor(primary).text("Logo", 72, 66);
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor("#ffffff")
        .text(safeText(data.companyName, "Jambo Trip 360"), 138, 44);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#ffffff")
        .text(
          `${safeText(data.companyPhone)} | ${safeText(data.companyEmail)} | ${safeText(
            data.companyWebsite
          )}`,
          138,
          72,
          { width: 370 }
        );

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#ffffff")
        .text(`Prepared by: ${safeText(data.preparedBy)}`, 138, 88);

      let y = 145;

      doc
        .font("Helvetica-Bold")
        .fontSize(19)
        .fillColor(primary)
        .text("Client Travel Quotation", 36, y);

      y += 32;

      const hotelText = safeJoin(
        safeArray(data.hotels)
          .map((hotel) => safeText(hotel.name, ""))
          .filter(Boolean)
      );

      const details = [
        ["Lead Client", safeText(data.leadClientName)],
        ["Destination", safeJoin(data.destinations)],
        ["Trip Type", safeText(data.tripType)],
        ["Client Type", currencyMode === "USD" ? "Non-Resident" : "Resident"],
        ["Currency", currencyMode],
        ["Adults", String(toNumber(data.adults))],
        ["Children", String(toNumber(data.children))],
        ["Total Travellers", String(calculation.totalTravellers)],
        ["Additional Clients", safeJoin(data.otherClients)],
      ];

      if (safeText(data.tripType, "") !== "Day Trip") {
        details.push(["Hotel(s)", hotelText]);
        details.push(["Total Nights", String(calculation.totalNights)]);
      }

      details.forEach(([label, value]) => {
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#334155").text(label, 36, y, {
          width: 155,
        });

        doc.font("Helvetica").fontSize(10).fillColor("#334155").text(value, 210, y, {
          width: 330,
        });

        y += 20;
      });

      y += 16;

      doc.roundedRect(36, y, usableWidth, 100, 14).fill(secondary);

      doc.font("Helvetica-Bold").fontSize(16).fillColor(primary).text("Package Summary", 52, y + 16);

      doc.font("Helvetica-Bold").fontSize(12).fillColor("#334155").text("Total Package Price", 52, y + 50);

      doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor(primary)
        .text(formatMoney(displayFinalTotal, currencyMode), 320, y + 48, {
          width: 160,
          align: "right",
        });

      doc.font("Helvetica-Bold").fontSize(12).fillColor("#334155").text("Price Per Person", 52, y + 74);

      doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor(primary)
        .text(formatMoney(displayPricePerPerson, currencyMode), 320, y + 72, {
          width: 160,
          align: "right",
        });

      y += 130;

      doc.font("Helvetica-Bold").fontSize(15).fillColor(primary).text("Includes", 36, y);
      y += 24;

      const includes = safeArray(calculation.includes).filter(Boolean);
      (includes.length ? includes : ["Transport"]).forEach((item) => {
        doc.font("Helvetica").fontSize(11).fillColor("#334155").text(`• ${item}`, 46, y);
        y += 18;
      });

      y += 14;

      doc.font("Helvetica-Bold").fontSize(15).fillColor(primary).text("Excludes", 36, y);
      y += 24;

      const excludes = safeArray(data.excludes).filter(Boolean);
      (excludes.length ? excludes : ["Anything not mentioned above"]).forEach((item) => {
        doc.font("Helvetica").fontSize(11).fillColor("#334155").text(`• ${item}`, 46, y);
        y += 18;
      });

      y += 28;

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(`rgb(${Math.max(0, rgb.r - 20)},${Math.max(0, rgb.g - 20)},${Math.max(0, rgb.b - 20)})`)
        .text(`Thank you for choosing ${safeText(data.companyName, "our company")}.`, 36, y, {
          width: usableWidth,
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Missing EMAIL_USER or EMAIL_PASS in .env");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

app.post("/calculate", (req, res) => {
  try {
    const calculation = buildCalculation(req.body);
    res.json(calculation);
  } catch (error) {
    console.error("CALCULATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating quotation",
      error: error.message,
    });
  }
});

app.post("/send-quotation", async (req, res) => {
  try {
    const data = req.body;
    const clientEmail = safeText(data.clientEmail, "");

    if (!clientEmail || !clientEmail.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Valid client email is required",
      });
    }

    const calculation =
      data.calculation && typeof data.calculation === "object"
        ? data.calculation
        : buildCalculation(data);

    const pdfBuffer = await buildPdfBuffer({
      ...data,
      calculation,
    });

    const transporter = createTransporter();

    const currencyMode =
      calculation.currencyMode || (data.clientType === "USD" ? "USD" : "KES");

    const displayFinalTotal =
      calculation.displayFinalTotal ?? calculation.finalTotal;

    const displayPricePerPerson =
      calculation.displayPricePerPerson ?? calculation.pricePerPerson;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: clientEmail,
      subject: `${safeText(data.companyName, "Jambo Trip 360")} Travel Package Quotation`,
      text: `Hello ${safeText(data.leadClientName, "")},

Please find attached your travel package quotation.

Total Package Price: ${formatMoney(displayFinalTotal, currencyMode)}
Price Per Person: ${formatMoney(displayPricePerPerson, currencyMode)}

Thank you.`,
      attachments: [
        {
          filename: "quotation.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.json({
      success: true,
      message: "Quotation sent successfully",
    });
  } catch (error) {
    console.error("SEND QUOTATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Error sending quotation",
      error: error.message,
    });
  }
});

app.get("/test-email", async (req, res) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    res.json({ success: true, message: "Email is ready" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Email setup failed",
      error: error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("Jambo Trip 360 backend is running");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});