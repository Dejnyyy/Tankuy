import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import qrcode from "qrcode";
import { testConnection } from "./db/connection.js";

// Import routes
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import vehiclesRoutes from "./routes/vehicles.js";
import entriesRoutes from "./routes/entries.js";
import receiptsRoutes from "./routes/receipts.js";
import stationsRoutes from "./routes/stations.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/entries", entriesRoutes);
app.use("/api/receipts", receiptsRoutes);
app.use("/api/stations", stationsRoutes);

// QR Code route for Expo
app.get("/qr", async (req, res) => {
  try {
    const vpsIp = process.env.VPS_PUBLIC_IP || "localhost";
    const expoPort = process.env.EXPO_PORT || "8085";
    const expoUrl = `exp://${vpsIp}:${expoPort}`;

    const qrDataUrl = await qrcode.toDataURL(expoUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#F97316", // Orange color
        light: "#FFFFFF",
      },
    });

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tankuy - Expo Connection</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #1a1a2e; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
            .card { background: #16213e; padding: 24px; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); text-align: center; width: 100%; max-width: 400px; }
            h1 { color: #ffffff; font-size: 1.4rem; margin-bottom: 8px; }
            p { color: #a0a0b8; margin-bottom: 16px; font-size: 0.9rem; line-height: 1.4; }
            .qr-wrapper { background: white; border-radius: 12px; padding: 16px; display: inline-block; }
            img { width: 100%; max-width: 280px; height: auto; display: block; }
            .url { margin-top: 16px; padding: 10px 12px; background: #0f3460; border-radius: 8px; font-family: monospace; color: #F97316; font-size: 0.8rem; word-break: break-all; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>🚙 Tankuy is ready!</h1>
            <p>Scan this QR code with the <strong>Expo Go</strong> app on your Android or the Camera app on your iOS device.</p>
            <div class="qr-wrapper">
                <img src="${qrDataUrl}" alt="Expo QR Code" />
            </div>
            <div class="url">${expoUrl}</div>
        </div>
    </body>
    </html>
    `;

    res.send(html);
  } catch (error) {
    console.error("QR Generator Error:", error);
    res.status(500).send("Error generating QR code");
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Start server
const startServer = async () => {
  // Test database connection
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.warn(
      "⚠️  Starting without database connection. Some features may not work.",
    );
  }

  app.listen(PORT, () => {
    console.log(`🚗 Tankuy API running on http://localhost:${PORT}`);
  });
};

startServer();
