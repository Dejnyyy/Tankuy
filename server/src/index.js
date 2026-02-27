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
        dark: "#22C55E", // Green color
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
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
            h1 { color: #111827; font-size: 1.5rem; margin-bottom: 0.5rem; }
            p { color: #4B5563; margin-bottom: 1.5rem; max-width: 350px; }
            img { border: 4px solid white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .url { margin-top: 1.5rem; padding: 0.75rem; background: #f3f4f6; border-radius: 6px; font-family: monospace; color: #374151; font-size: 0.875rem; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>🚙 Tankuy is ready!</h1>
            <p>Scan this QR code with the <strong>Expo Go</strong> app on your Android or the Camera app on your iOS device.</p>
            <img src="${qrDataUrl}" alt="Expo QR Code" />
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
