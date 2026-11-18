import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnits } from '@/hooks/useUnits';
import {
  asLang,
  formatDate,
  formatDateLong,
  formatMonth,
  formatNumber,
  formatPercent,
  type Lang,
} from '@/lib/format';
import type { Metric } from '@/lib/stats';

const MPG_FACTOR = 235.215;

/** Display formatting that respects the user's language, currency and unit system. */
export function useFormat() {
  const units = useUnits();
  const { i18n } = useTranslation();
  const lang: Lang = asLang(i18n.language);

  return useMemo(() => {
    const {
      currencySymbol,
      volumeUnit,
      distanceUnit,
      isImperial,
      convertCurrency,
      formatVolume,
      formatDistance,
      formatPricePerVolume,
      formatCostPerDistance,
    } = units;
    const isUSD = units.currency === 'USD';
    const n = (v: number | null | undefined, d = 0) => formatNumber(v ?? null, d, lang);
    const withCurrency = (s: string) => (isUSD ? `$${s}` : `${s} ${currencySymbol}`);

    const moneyValue = (czk: number | null | undefined) => convertCurrency(czk ?? null);
    const priceValue = (p: number | null | undefined) => formatPricePerVolume(p ?? null);
    const volumeValue = (l: number | null | undefined) => formatVolume(l ?? null);
    const distanceValue = (km: number | null | undefined) => formatDistance(km ?? null);
    const consumptionValue = (l100: number | null | undefined) =>
      l100 == null ? null : isImperial ? MPG_FACTOR / l100 : l100;

    const money = (czk: number | null | undefined, d?: number) => {
      const v = moneyValue(czk);
      if (v === null) return '–';
      const dec = d ?? (isUSD ? 2 : 0);
      return withCurrency(n(v, dec));
    };
    const price = (p: number | null | undefined) => {
      const v = priceValue(p);
      return v === null ? '–' : `${n(v, 2)} ${isUSD ? '$' : currencySymbol}/${volumeUnit}`;
    };
    const volume = (l: number | null | undefined, d = 1) => {
      const v = volumeValue(l);
      return v === null ? '–' : `${n(v, d)} ${volumeUnit}`;
    };
    const distance = (km: number | null | undefined, d = 0) => {
      const v = distanceValue(km);
      return v === null ? '–' : `${n(v, d)} ${distanceUnit}`;
    };
    const consumptionUnit = isImperial ? 'mpg' : 'l/100 km';
    const consumption = (l100: number | null | undefined) => {
      const v = consumptionValue(l100);
      return v === null ? '–' : `${n(v, 1)} ${consumptionUnit}`;
    };
    const costPerKm = (c: number | null | undefined) => {
      const v = formatCostPerDistance(c ?? null);
      return v === null ? '–' : `${n(v, 2)} ${isUSD ? '$' : currencySymbol}/${distanceUnit}`;
    };

    /** Convert a metric/CZK stat value for charting. */
    const metricValue = (m: Metric, v: number | null) =>
      m === 'cost' ? moneyValue(v) : m === 'liters' ? volumeValue(v) : m === 'price' ? priceValue(v) : consumptionValue(v);
    const metricFormat = (m: Metric, displayValue: number | null, compact = false) => {
      if (displayValue === null) return '–';
      if (m === 'cost') return withCurrency(n(displayValue, isUSD ? (compact ? 0 : 2) : 0));
      if (m === 'liters') return `${n(displayValue, compact ? 0 : 1)} ${volumeUnit}`;
      if (m === 'price') return `${n(displayValue, compact ? 1 : 2)}`;
      return `${n(displayValue, 1)}`;
    };
    const metricUnit = (m: Metric) =>
      m === 'cost'
        ? isUSD
          ? '$'
          : currencySymbol
        : m === 'liters'
          ? volumeUnit
          : m === 'price'
            ? `${isUSD ? '$' : currencySymbol}/${volumeUnit}`
            : consumptionUnit;

    return {
      lang,
      n,
      money,
      price,
      volume,
      distance,
      consumption,
      consumptionUnit,
      costPerKm,
      percent: (r: number | null | undefined, signed = true) => formatPercent(r, lang, signed),
      date: (iso: string, withYear = true) => formatDate(iso, lang, withYear),
      dateLong: (iso: string, withYear = false) => formatDateLong(iso, lang, withYear),
      month: (key: string, withYear = true) => formatMonth(key, lang, withYear),
      moneyValue,
      metricValue,
      metricFormat,
      metricUnit,
      currencySymbol: isUSD ? '$' : currencySymbol,
      volumeUnit,
      distanceUnit,
      isImperial,
      /** Higher-is-better flips for imperial mpg. */
      consumptionHigherIsWorse: !isImperial,
      units,
    };
  }, [units, lang]);
}

export type Formatter = ReturnType<typeof useFormat>;
