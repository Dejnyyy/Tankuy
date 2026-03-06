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
        dark: "#FF9500", // Orange - matches app primary
        light: "#FFFFFF",
      },
    });

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tankuy - Connect with Expo Go</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background: #0D0D0D;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                overflow: hidden;
            }
            body::before {
                content: '';
                position: fixed;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(ellipse at 30% 20%, rgba(255, 149, 0, 0.08) 0%, transparent 50%),
                            radial-gradient(ellipse at 70% 80%, rgba(255, 149, 0, 0.05) 0%, transparent 50%);
                z-index: 0;
            }
            .container {
                position: relative;
                z-index: 1;
                width: 100%;
                max-width: 380px;
            }
            .card {
                background: rgba(28, 28, 30, 0.8);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 149, 0, 0.15);
                border-radius: 24px;
                padding: 32px 24px;
                text-align: center;
            }
            .logo { font-size: 2.5rem; margin-bottom: 4px; }
            h1 {
                color: #FFFFFF;
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 6px;
            }
            h1 span { color: #FF9500; }
            .subtitle {
                color: #8E8E93;
                font-size: 0.85rem;
                line-height: 1.5;
                margin-bottom: 24px;
            }
            .subtitle strong { color: #FF9500; font-weight: 600; }
            .qr-container {
                position: relative;
                display: inline-block;
                padding: 20px;
                background: #FFFFFF;
                border-radius: 20px;
                box-shadow: 0 0 40px rgba(255, 149, 0, 0.15), 0 8px 32px rgba(0, 0, 0, 0.4);
            }
            .qr-container img {
                width: 220px;
                height: 220px;
                display: block;
            }
            .divider {
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(255, 149, 0, 0.3), transparent);
                margin: 24px 0;
            }
            .url-box {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                background: rgba(255, 149, 0, 0.08);
                border: 1px solid rgba(255, 149, 0, 0.15);
                border-radius: 12px;
            }
            .url-icon { font-size: 1rem; flex-shrink: 0; }
            .url-text {
                font-family: 'SF Mono', 'Fira Code', monospace;
                color: #FF9500;
                font-size: 0.78rem;
                word-break: break-all;
                text-align: left;
            }
            .badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-top: 20px;
                padding: 6px 14px;
                background: rgba(48, 209, 88, 0.1);
                border: 1px solid rgba(48, 209, 88, 0.2);
                border-radius: 20px;
                color: #30D158;
                font-size: 0.75rem;
                font-weight: 500;
            }
            .badge::before { content: ''; width: 6px; height: 6px; background: #30D158; border-radius: 50%; animation: pulse 2s infinite; }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            @media (max-width: 400px) {
                .card { padding: 24px 18px; border-radius: 20px; }
                .qr-container img { width: 180px; height: 180px; }
                .qr-container { padding: 16px; }
                h1 { font-size: 1.3rem; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <h1><span>Tankuy</span> is ready!</h1>
                <p class="subtitle">Scan with <strong>Expo Go</strong> on Android or the Camera app on iOS</p>
                <div class="qr-container">
                    <img src="${qrDataUrl}" alt="Expo QR Code" />
                </div>
                <div class="badge">Server running</div>
            </div>
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
