import express from "express";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Cache exchange rates for 1 hour
let rateCache = {
  rates: null,
  timestamp: 0,
};
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const fetchRates = async () => {
  const now = Date.now();
  if (rateCache.rates && now - rateCache.timestamp < CACHE_DURATION) {
    return rateCache.rates;
  }

  try {
    // Frankfurter API — free, no key needed, European Central Bank data
    const response = await fetch(
      "https://api.frankfurter.app/latest?from=CZK&to=USD",
    );
    const data = await response.json();

    // data.rates = { USD: 0.042... } (1 CZK = ~0.042 USD)
    const czkToUsd = data.rates.USD;

    const rates = {
      CZK_TO_USD: czkToUsd,
      USD_TO_CZK: 1 / czkToUsd,
      date: data.date,
    };

    rateCache = { rates, timestamp: now };
    console.log(
      `Exchange rates cached: 1 CZK = ${czkToUsd} USD (${data.date})`,
    );
    return rates;
  } catch (error) {
    console.error("Failed to fetch exchange rates:", error.message);
    // Fallback rates if API fails
    const fallback = {
      CZK_TO_USD: 0.042,
      USD_TO_CZK: 23.8,
      date: "fallback",
    };
    if (!rateCache.rates) {
      rateCache = { rates: fallback, timestamp: now - CACHE_DURATION + 300000 }; // retry in 5 min
    }
    return rateCache.rates || fallback;
  }
};

// Pre-fetch on startup
fetchRates();

router.use(authMiddleware);

// GET /api/exchange-rates
router.get("/", async (req, res) => {
  try {
    const rates = await fetchRates();
    res.json(rates);
  } catch (error) {
    console.error("Exchange rate error:", error);
    res.status(500).json({ error: "Failed to get exchange rates" });
  }
});

export default router;
