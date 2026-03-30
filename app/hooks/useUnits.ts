import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

const LITERS_PER_GALLON = 3.78541;
const KM_PER_MILE = 1.60934;

export type CurrencyType = "CZK" | "USD";
export type UnitSystemType = "metric" | "imperial";

export interface Units {
  // Symbols & labels
  currencySymbol: string;
  volumeUnit: string;
  distanceUnit: string;
  pricePerVolumeUnit: string;
  costPerDistanceUnit: string;

  // Display labels for stats
  volumeUnitLabel: string; // "Liters" / "Gallons"
  distanceUnitLabel: string; // "Kilometers" / "Miles"

  // Conversion helpers (from metric DB values to display values)
  formatVolume: (liters: number | null | undefined) => number | null;
  formatDistance: (km: number | null | undefined) => number | null;
  formatPricePerVolume: (
    pricePerLiter: number | null | undefined,
  ) => number | null;
  formatCostPerDistance: (
    costPerKm: number | null | undefined,
  ) => number | null;

  // Currency conversion (from CZK DB values to display currency)
  convertCurrency: (czkAmount: number | null | undefined) => number | null;

  // Inverse conversion helpers (from display values to metric DB values)
  toMetricVolume: (displayVolume: number | null | undefined) => number | null;
  toMetricDistance: (
    displayDistance: number | null | undefined,
  ) => number | null;
  toMetricPrice: (displayPrice: number | null | undefined) => number | null;

  // Raw state
  currency: CurrencyType;
  unitSystem: UnitSystemType;
  isImperial: boolean;
  exchangeRate: number; // CZK_TO_USD rate (1 if CZK)
  rateLoaded: boolean;
}

// Module-level cache so we don't refetch on every component mount
let cachedRates: { CZK_TO_USD: number; USD_TO_CZK: number } | null = null;
let fetchPromise: Promise<any> | null = null;

export function useUnits(): Units {
  const { user } = useAuth();
  const [rates, setRates] = useState(cachedRates);

  useEffect(() => {
    if (cachedRates) {
      setRates(cachedRates);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = api
        .getExchangeRates()
        .then((data) => {
          cachedRates = {
            CZK_TO_USD: data.CZK_TO_USD,
            USD_TO_CZK: data.USD_TO_CZK,
          };
          return cachedRates;
        })
        .catch((err) => {
          console.warn("Failed to fetch exchange rates, using fallback:", err);
          cachedRates = { CZK_TO_USD: 0.042, USD_TO_CZK: 23.8 };
          return cachedRates;
        })
        .finally(() => {
          fetchPromise = null;
        });
    }

    fetchPromise.then((r) => setRates(r));
  }, []);

  return useMemo(() => {
    const currency = (user?.currency as CurrencyType) || "CZK";
    const unitSystem = (user?.unitSystem as UnitSystemType) || "metric";
    const isImperial = unitSystem === "imperial";
    const isUSD = currency === "USD";

    const czkToUsd = rates?.CZK_TO_USD ?? 0.042;
    const currencyRate = isUSD ? czkToUsd : 1;

    const currencySymbol = isUSD ? "$" : "Kč";
    const volumeUnit = isImperial ? "gal" : "L";
    const distanceUnit = isImperial ? "mi" : "km";
    const pricePerVolumeUnit = `${currencySymbol}/${volumeUnit}`;
    const costPerDistanceUnit = `${currencySymbol}/${distanceUnit}`;
    const volumeUnitLabel = isImperial ? "Gallons" : "Liters";
    const distanceUnitLabel = isImperial ? "Miles" : "Kilometers";

    // Currency conversion: DB stores CZK amounts
    const convertCurrency = (
      czkAmount: number | null | undefined,
    ): number | null => {
      if (czkAmount == null) return null;
      return czkAmount * currencyRate;
    };

    const formatVolume = (liters: number | null | undefined): number | null => {
      if (liters == null) return null;
      return isImperial ? liters / LITERS_PER_GALLON : liters;
    };

    const formatDistance = (km: number | null | undefined): number | null => {
      if (km == null) return null;
      return isImperial ? km / KM_PER_MILE : km;
    };

    const formatPricePerVolume = (
      pricePerLiter: number | null | undefined,
    ): number | null => {
      if (pricePerLiter == null) return null;
      let price = pricePerLiter;
      // Convert currency first
      price = price * currencyRate;
      // Then convert volume unit: price/gal = price/L * L/gal
      return isImperial ? price * LITERS_PER_GALLON : price;
    };

    const formatCostPerDistance = (
      costPerKm: number | null | undefined,
    ): number | null => {
      if (costPerKm == null) return null;
      let cost = costPerKm;
      // Convert currency
      cost = cost * currencyRate;
      // cost/mi = cost/km * km/mi
      return isImperial ? cost * KM_PER_MILE : cost;
    };

    // Inverse helpers: from display values back to metric + CZK for DB
    const toMetricVolume = (
      displayVolume: number | null | undefined,
    ): number | null => {
      if (displayVolume == null) return null;
      return isImperial ? displayVolume * LITERS_PER_GALLON : displayVolume;
    };

    const toMetricDistance = (
      displayDistance: number | null | undefined,
    ): number | null => {
      if (displayDistance == null) return null;
      return isImperial ? displayDistance * KM_PER_MILE : displayDistance;
    };

    const toMetricPrice = (
      displayPrice: number | null | undefined,
    ): number | null => {
      if (displayPrice == null) return null;
      // Convert back to CZK: price_czk = price_display / currencyRate
      let price = displayPrice / currencyRate;
      // Convert back to per-liter: price/L = price/gal / (L/gal)
      return isImperial ? price / LITERS_PER_GALLON : price;
    };

    return {
      currencySymbol,
      volumeUnit,
      distanceUnit,
      pricePerVolumeUnit,
      costPerDistanceUnit,
      volumeUnitLabel,
      distanceUnitLabel,
      formatVolume,
      formatDistance,
      formatPricePerVolume,
      formatCostPerDistance,
      convertCurrency,
      toMetricVolume,
      toMetricDistance,
      toMetricPrice,
      currency,
      unitSystem,
      isImperial,
      exchangeRate: currencyRate,
      rateLoaded: !!rates,
    };
  }, [user?.currency, user?.unitSystem, rates]);
}
