import express from "express";
import { OAuth2Client } from "google-auth-library";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import pool from "../db/connection.js";
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../middleware/auth.js";

dotenv.config();

const router = express.Router();

// Initialize Google OAuth clients for different platforms
const webClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID_WEB,
  process.env.GOOGLE_CLIENT_SECRET,
);
const iosClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_IOS);
const androidClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_ANDROID);

// Verify Google ID token from mobile app
const verifyGoogleToken = async (idToken, platform = "web") => {
  try {
    const client =
      platform === "ios"
        ? iosClient
        : platform === "android"
          ? androidClient
          : webClient;

    const ticket = await client.verifyIdToken({
      idToken,
      audience: [
        process.env.GOOGLE_CLIENT_ID_WEB,
        process.env.GOOGLE_CLIENT_ID_IOS,
        process.env.GOOGLE_CLIENT_ID_ANDROID,
      ].filter(Boolean),
    });

    return ticket.getPayload();
  } catch (error) {
    console.error("Google token verification failed:", error);
    return null;
  }
};

// Helper to get the correct base URL (handles ngrok proxy)
const getBaseUrl = (req) => {
  const protocol = req.get("x-forwarded-proto") || req.protocol;
  return `${protocol}://${req.get("host")}`;
};

// GET /api/auth/google/start - Initiate OAuth flow (for Expo Go)
router.get("/google/start", (req, res) => {
  const { deviceId, deviceName, redirect } = req.query;
  const state = Buffer.from(
    JSON.stringify({ deviceId, deviceName, redirect: redirect || "exp" }),
  ).toString("base64");

  const callbackUrl = `${getBaseUrl(req)}/api/auth/google/callback`;
  console.log("OAuth start - callback URL:", callbackUrl);

  const authUrl = webClient.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    redirect_uri: callbackUrl,
    state,
  });

  res.redirect(authUrl);
});

// GET /api/auth/google/callback - Handle OAuth callback (for Expo Go)
router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const stateData = JSON.parse(Buffer.from(state, "base64").toString());
    const { deviceId, deviceName } = stateData;

    const callbackUrl = `${getBaseUrl(req)}/api/auth/google/callback`;
    const { tokens } = await webClient.getToken({
      code,
      redirect_uri: callbackUrl,
    });

    // Get user info from Google
    webClient.setCredentials(tokens);
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );
    const googleUser = await userInfoRes.json();
    const { id: googleId, email, name, picture } = googleUser;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      "SELECT * FROM users WHERE google_id = ?",
      [googleId],
    );

    let user;
    if (existingUsers.length > 0) {
      user = existingUsers[0];
      await pool.execute(
        "UPDATE users SET name = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?",
        [name, picture, user.id],
      );
    } else {
      const userId = uuidv4();
      await pool.execute(
        "INSERT INTO users (id, google_id, email, name, avatar_url) VALUES (?, ?, ?, ?, ?)",
        [userId, googleId, email, name, picture],
      );
      user = {
        id: userId,
        google_id: googleId,
        email,
        name,
        avatar_url: picture,
      };
    }

    const accessToken = generateToken(user.id, email);
    const refreshToken = generateRefreshToken(user.id);

    if (deviceId) {
      const tokenId = uuidv4();
      await pool.execute(
        `INSERT INTO device_tokens (id, user_id, device_id, refresh_token, device_name)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE refresh_token = ?, last_used_at = NOW()`,
        [
          tokenId,
          user.id,
          deviceId,
          refreshToken,
          deviceName || "Unknown Device",
          refreshToken,
        ],
      );
    }

    // Return an HTML page that shows success and provides data to the app
    const userData = encodeURIComponent(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email || email,
          name: user.name || name,
          avatarUrl: user.avatar_url || picture,
        },
        accessToken,
        refreshToken,
      }),
    );

    res.send(`
      <!DOCTYPE html>
      <html><head><title>Sign In Successful</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #1a1a2e; color: white; }
        .container { text-align: center; padding: 24px; }
        h1 { color: #FF9500; }
        p { color: #aaa; }
      </style>
      </head><body>
      <div class="container">
        <h1>✅ Signed In!</h1>
        <p>You can close this window and return to Tankuy.</p>
        <script>
          // Try to pass data back via URL scheme
          window.location.href = 'tankuy://auth?data=${userData}';
        </script>
      </div>
      </body></html>
    `);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html><head><title>Sign In Failed</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #1a1a2e; color: white; }
        .container { text-align: center; padding: 24px; }
        h1 { color: #FF375F; }
      </style>
      </head><body>
      <div class="container">
        <h1>❌ Sign In Failed</h1>
        <p>${error.message}</p>
      </div>
      </body></html>
    `);
  }
});

router.post("/google", async (req, res) => {
  try {
    const { idToken, platform, deviceId, deviceName } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "ID token is required" });
    }

    // Verify the Google token
    const googleUser = await verifyGoogleToken(idToken, platform);

    if (!googleUser) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    // ... (rest of the Google sign-in logic is preserved implicitly via this replacement scope, but to be safe, I'm just replacing the whole block or inserting before/after. Wait, the tool replaces lines. I need to be careful not to delete logic I don't see in the context, but I have the full file view. The user wants to ADD a route.)
    // I will use replace_file_content to INSERT the new route BEFORE the native google route or after.

    // ... keeping the existing google route ...
    const { sub: googleId, email, name, picture } = googleUser;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      "SELECT * FROM users WHERE google_id = ?",
      [googleId],
    );

    let user;

    if (existingUsers.length > 0) {
      // User exists, update their info
      user = existingUsers[0];
      await pool.execute(
        "UPDATE users SET name = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?",
        [name, picture, user.id],
      );
    } else {
      // Create new user
      const userId = uuidv4();
      await pool.execute(
        "INSERT INTO users (id, google_id, email, name, avatar_url) VALUES (?, ?, ?, ?, ?)",
        [userId, googleId, email, name, picture],
      );
      user = { id: userId, google_id: googleId, email, name, picture }; // fix variable name picture
    }

    // Generate tokens
    const accessToken = generateToken(user.id, email);
    const refreshToken = generateRefreshToken(user.id);

    // Store device token for remember me functionality
    if (deviceId) {
      const tokenId = uuidv4();
      await pool.execute(
        `INSERT INTO device_tokens (id, user_id, device_id, refresh_token, device_name)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE refresh_token = ?, last_used_at = NOW()`,
        [
          tokenId,
          user.id,
          deviceId,
          refreshToken,
          deviceName || "Unknown Device",
          refreshToken,
        ],
      );
    }

    res.json({
      user: {
        id: user.id,
        email: user.email || email,
        name: user.name || name,
        avatarUrl: user.avatar_url || picture,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// POST /api/auth/guest - Guest Login (Bypass Google)
router.post("/guest", async (req, res) => {
  try {
    const { deviceId, deviceName } = req.body;
    const guestId = "guest_user_123";
    const guestEmail = "guest@tankuy.app";
    const guestName = "Guest User";
    const guestPicture =
      "https://ui-avatars.com/api/?name=Guest+User&background=random";

    // Check if guest user exists
    const [existingUsers] = await pool.execute(
      "SELECT * FROM users WHERE google_id = ?",
      [guestId],
    );

    let user;
    if (existingUsers.length > 0) {
      user = existingUsers[0];
    } else {
      const userId = uuidv4();
      await pool.execute(
        "INSERT INTO users (id, google_id, email, name, avatar_url) VALUES (?, ?, ?, ?, ?)",
        [userId, guestId, guestEmail, guestName, guestPicture],
      );
      user = {
        id: userId,
        email: guestEmail,
        name: guestName,
        avatar_url: guestPicture,
      };
    }

    const accessToken = generateToken(user.id, guestEmail);
    const refreshToken = generateRefreshToken(user.id);

    if (deviceId) {
      const tokenId = uuidv4();
      await pool.execute(
        `INSERT INTO device_tokens (id, user_id, device_id, refresh_token, device_name)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE refresh_token = ?, last_used_at = NOW()`,
        [
          tokenId,
          user.id,
          deviceId,
          refreshToken,
          deviceName || "Guest Session",
          refreshToken,
        ],
      );
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Guest auth error:", error);
    res.status(500).json({ error: "Guest login failed" });
  }
});

// POST /api/auth/google/web - Sign in with Google (Web - uses access token)
router.post("/google/web", async (req, res) => {
  try {
    const {
      googleAccessToken,
      googleUser: gUser,
      platform,
      deviceId,
      deviceName,
    } = req.body;

    if (!googleAccessToken || !gUser) {
      return res
        .status(400)
        .json({ error: "Google access token and user info required" });
    }

    const { id: googleId, email, name, picture } = gUser;

    if (!googleId || !email) {
      return res.status(400).json({ error: "Invalid Google user data" });
    }

    // Check if user exists
    const [existingUsers] = await pool.execute(
      "SELECT * FROM users WHERE google_id = ?",
      [googleId],
    );

    let user;

    if (existingUsers.length > 0) {
      // User exists, update their info
      user = existingUsers[0];
      await pool.execute(
        "UPDATE users SET name = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?",
        [name, picture, user.id],
      );
    } else {
      // Create new user
      const userId = uuidv4();
      await pool.execute(
        "INSERT INTO users (id, google_id, email, name, avatar_url) VALUES (?, ?, ?, ?, ?)",
        [userId, googleId, email, name, picture],
      );
      user = {
        id: userId,
        google_id: googleId,
        email,
        name,
        avatar_url: picture,
      };
    }

    // Generate tokens
    const accessToken = generateToken(user.id, email);
    const refreshToken = generateRefreshToken(user.id);

    // Store device token for remember me functionality
    if (deviceId) {
      const tokenId = uuidv4();
      await pool.execute(
        `INSERT INTO device_tokens (id, user_id, device_id, refresh_token, device_name)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE refresh_token = ?, last_used_at = NOW()`,
        [
          tokenId,
          user.id,
          deviceId,
          refreshToken,
          deviceName || "Web Browser",
          refreshToken,
        ],
      );
    }

    res.json({
      user: {
        id: user.id,
        email: user.email || email,
        name: user.name || name,
        avatarUrl: user.avatar_url || picture,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Web auth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// POST /api/auth/refresh - Refresh access token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken, deviceId } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // Check if device token is valid
    const [deviceTokens] = await pool.execute(
      "SELECT dt.*, u.email FROM device_tokens dt JOIN users u ON dt.user_id = u.id WHERE dt.refresh_token = ? AND dt.device_id = ?",
      [refreshToken, deviceId],
    );

    if (deviceTokens.length === 0) {
      return res.status(401).json({ error: "Device not recognized" });
    }

    const deviceToken = deviceTokens[0];

    // Generate new access token
    const newAccessToken = generateToken(
      deviceToken.user_id,
      deviceToken.email,
    );

    // Update last used timestamp
    await pool.execute(
      "UPDATE device_tokens SET last_used_at = NOW() WHERE id = ?",
      [deviceToken.id],
    );

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ error: "Token refresh failed" });
  }
});

// POST /api/auth/logout - Logout and invalidate device token
router.post("/logout", async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (deviceId) {
      await pool.execute("DELETE FROM device_tokens WHERE device_id = ?", [
        deviceId,
      ]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

export default router;
