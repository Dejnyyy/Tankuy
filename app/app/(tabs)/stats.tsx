import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useData } from '@/context/DataContext';
import { useFormat } from '@/hooks/useFormat';
import { AppText, Button, Chip, Figure, Screen, Section, Segmented, Skeleton, StatTable, StationMark, useLayout } from '@/components/ui';
import { TrendChart } from '@/components/charts/TrendChart';
import { DistributionBars, RankList } from '@/components/charts/MiniCharts';
import { stationColors } from '@/constants/Brands';
import { spacing } from '@/constants/Theme';
import { bucketLabel, plural, WEEKDAYS_SHORT } from '@/lib/format';
import {
  buildSeries,
  computeStats,
  filterEntries,
  parseDate,
  priceSeries,
  rangeFrom,
  yearProjection,
  ymd,
  type RangeKey,
} from '@/lib/stats';

function Columns({ wide, children }: { wide: boolean; children: React.ReactNode }) {
  if (!wide) return <View style={{ gap: spacing.huge }}>{children}</View>;
  return (
    <View style={{ flexDirection: 'row', gap: spacing.huge, alignItems: 'flex-start' }}>
      {React.Children.map(children, (c) => (c ? <View style={{ flex: 1, minWidth: 0 }}>{c}</View> : null))}
    </View>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <AppText variant="caption" tone="secondary" style={{ maxWidth: 520 }}>
      {children}
    </AppText>
  );
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { entries, vehicles, loading, loaded, refreshing, refresh } = useData();
  const f = useFormat();
  const { isWide } = useLayout();
  const [range, setRange] = useState<RangeKey>('12m');
  const [vehicleId, setVehicleId] = useState<string>('all');

  const now = useMemo(() => new Date(), [entries]);
  const from = rangeFrom(range, now);
  const scoped = useMemo(() => filterEntries(entries, { vehicleId, from }), [entries, vehicleId, from]);
  const vehicleScoped = useMemo(() => filterEntries(entries, { vehicleId }), [entries, vehicleId]);
  const s = useMemo(() => computeStats(scoped, now), [scoped, now]);
  const proj = useMemo(() => yearProjection(vehicleScoped, now), [vehicleScoped, now]);

  const monthsCount = useMemo(() => {
    const start = from ?? scoped[0]?.date ?? ymd(now);
    const d = parseDate(start);
    return Math.min(60, Math.max(1, (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth() + 1));
  }, [from, scoped, now]);
  const monthly = useMemo(() => buildSeries(scoped, 'cost', 'month', now, monthsCount), [scoped, now, monthsCount]);
  const prices = useMemo(() => priceSeries(scoped), [scoped]);

  const daysWord = (n: number) => plural(n, [t('units.day1'), t('units.day2'), t('units.day5')], f.lang);
  const weekdayIn = t('stats.weekdayIn', { returnObjects: true }) as string[];
  const dayparts = t('stats.dayparts', { returnObjects: true }) as string[];

  const ranges = [
    { value: '3m' as const, label: t('stats.range.3m') },
    { value: '6m' as const, label: t('stats.range.6m') },
    { value: '12m' as const, label: t('stats.range.12m') },
    { value: 'ytd' as const, label: t('stats.range.ytd') },
    { value: 'all' as const, label: t('stats.range.all') },
  ];

  const filters = (
    <View style={{ gap: spacing.md }}>
      <Segmented options={ranges} value={range} onChange={setRange} style={{ maxWidth: 420 }} />
      {vehicles.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          <Chip label={t('stats.allVehicles')} active={vehicleId === 'all'} onPress={() => setVehicleId('all')} />
          {vehicles.map((v) => (
            <Chip key={v.id} label={v.name} active={vehicleId === v.id} onPress={() => setVehicleId(v.id)} />
          ))}
        </ScrollView>
      )}
    </View>
  );

  if (loading && !loaded) {
    return (
      <Screen title={t('nav.stats')}>
        <View style={{ gap: spacing.xl }}>
          <Skeleton height={36} />
          <Skeleton height={64} width="60%" />
          <Skeleton height={240} />
        </View>
      </Screen>
    );
  }

  if (s.count === 0) {
    return (
      <Screen title={t('nav.stats')} refreshing={refreshing} onRefresh={() => refresh()}>
        {filters}
        <View style={{ gap: spacing.md, paddingTop: spacing.huge, maxWidth: 420 }}>
          <AppText variant="heading">{entries.length ? t('stats.emptyRange') : t('stats.empty')}</AppText>
          <AppText tone="secondary">{t('stats.emptyHint')}</AppText>
          {!entries.length && (
            <View style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}>
              <Button title={t('dash.scan')} icon="camera" onPress={() => router.push('/scan')} />
            </View>
          )}
        </View>
      </Screen>
    );
  }

  const topWd = s.weekday.top;
  const topDp = s.dayparts.top;
  const cons = s.consumption;
  const trend = s.priceTrendPerMonth;
  const withStation = (date: string, station: string | null | undefined, long = true) => `${f.date(date, long)}${station ? `, ${station}` : ''}`;

  // ── Summary: one hero number + three supporting figures ──
  const summary = isWide ? (
    <View style={{ flexDirection: 'row', gap: spacing.huge, alignItems: 'flex-end' }}>
      <View style={{ flex: 1.4 }}>
        <Figure size="lg" label={t('stats.totalSpent')} value={f.money(s.totalCost)} sub={t('stats.avgPerFill', { value: f.money(s.avgCost) })} />
      </View>
      <View style={{ flex: 2, flexDirection: 'row', gap: spacing.xl }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Figure label={t('stats.fillups')} value={f.n(s.count)} sub={s.avgMonthlyFills ? t('stats.perMonth', { value: f.n(s.avgMonthlyFills, 1) }) : null} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Figure label={t('stats.totalLiters')} value={f.volume(s.totalLiters, 0)} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Figure label={t('stats.distance')} value={cons.totalKm ? f.distance(cons.totalKm) : '–'} />
        </View>
      </View>
    </View>
  ) : (
    <View style={{ gap: spacing.lg }}>
      <Figure size="lg" label={t('stats.totalSpent')} value={f.money(s.totalCost)} sub={t('stats.avgPerFill', { value: f.money(s.avgCost) })} />
      <StatTable
        rows={[
          { label: t('stats.fillups'), value: f.n(s.count), sub: s.avgMonthlyFills ? t('stats.perMonth', { value: f.n(s.avgMonthlyFills, 1) }) : null },
          { label: t('stats.totalLiters'), value: f.volume(s.totalLiters, 0) },
          { label: t('stats.distance'), value: cons.totalKm ? f.distance(cons.totalKm) : '–' },
        ]}
      />
    </View>
  );

  const spend = (
    <Section title={t('stats.sec.spend')}>
      <TrendChart
        alwaysTooltip
        kind="bar"
        height={isWide ? 240 : 200}
        animationKey={`m-${range}-${vehicleId}`}
        points={monthly.map((p) => ({
          label: bucketLabel(p.start, 'month', f.lang),
          longLabel: bucketLabel(p.start, 'month', f.lang, true),
          value: f.moneyValue(p.value),
        }))}
        formatAxis={(v) => (v >= 1000 ? `${f.n(v / 1000, v % 1000 ? 1 : 0)}k` : f.n(v))}
        formatValue={(v) => (v === null ? '–' : `${f.n(v)} ${f.currencySymbol}`)}
        formatMeta={(i) => (monthly[i]?.count ? `${monthly[i].count}× ${t('dash.fillups')}` : null)}
      />
      <StatTable
        rows={[
          { label: t('stats.avgMonth'), value: f.money(s.avgMonthlyCost) },
          { label: t('stats.projection', { year: proj.year }), value: f.money(proj.projected), sub: t('stats.ytd', { value: f.money(proj.ytd) }) },
          { label: t('stats.perYear'), value: f.money((s.avgMonthlyCost ?? 0) * 12), sub: t('stats.basedOnAvg') },
          { label: t('stats.priciestMonth'), value: s.priciestMonth ? f.money(s.priciestMonth.cost) : '–', sub: s.priciestMonth ? f.month(s.priciestMonth.key) : null },
        ]}
      />
    </Section>
  );

  const price = (
    <Section title={t('stats.sec.price')}>
      {prices.length >= 2 ? (
        <TrendChart
          alwaysTooltip
          kind="line"
          height={isWide ? 240 : 200}
          animationKey={`p-${range}-${vehicleId}`}
          points={prices.map((p) => ({ label: f.date(p.date, false), longLabel: withStation(p.date, p.station), value: f.units.formatPricePerVolume(p.value) }))}
          pointColors={prices.map((p) => stationColors(p.station, colors).fill)}
          formatAxis={(v) => f.n(v, Number.isInteger(v) ? 0 : 1)}
          formatValue={(v) => (v === null ? '–' : `${f.n(v, 2)} ${f.metricUnit('price')}`)}
        />
      ) : null}
      <StatTable
        rows={[
          { label: t('stats.avgPrice'), value: f.price(s.avgPrice), sub: t('stats.weighted') },
          { label: t('stats.minPrice'), value: f.price(s.minPrice?.value), sub: s.minPrice ? withStation(s.minPrice.date, s.minPrice.station) : null },
          { label: t('stats.maxPrice'), value: f.price(s.maxPrice?.value), sub: s.maxPrice ? withStation(s.maxPrice.date, s.maxPrice.station) : null },
          {
            label: t('stats.trend'),
            value: trend === null ? '–' : `${trend > 0 ? '+' : trend < 0 ? '−' : ''}${f.n(Math.abs(f.units.formatPricePerVolume(trend) ?? 0), 2)}`,
            sub: trend === null ? t('stats.trendNeed') : t('stats.trendSub', { unit: f.metricUnit('price') }),
          },
        ]}
      />
    </Section>
  );

  const okSegments = cons.segments.filter((sg) => !sg.outlier);
  const consumption = (
    <Section title={t('stats.sec.consumption')}>
      {okSegments.length >= 2 ? (
        <TrendChart
          alwaysTooltip
          kind="line"
          height={isWide ? 240 : 200}
          animationKey={`c-${range}-${vehicleId}`}
          points={okSegments.map((sg) => ({
            label: f.date(sg.date, false),
            longLabel: `${f.date(sg.fromDate, false)} – ${f.date(sg.date, false)}, ${f.distance(sg.km)}`,
            value: f.metricValue('consumption', sg.l100),
          }))}
          formatAxis={(v) => f.n(v, Number.isInteger(v) ? 0 : 1)}
          formatValue={(v) => (v === null ? '–' : `${f.n(v, 1)} ${f.consumptionUnit}`)}
        />
      ) : (
        <Note>{t('stats.consumptionNeed')}</Note>
      )}
      <StatTable
        rows={[
          { label: t('stats.avgConsumption'), value: f.consumption(cons.avgL100), sub: cons.segments.length ? t('stats.fromSegments', { count: cons.segments.length }) : null },
          { label: t('stats.costPerKm'), value: f.costPerKm(cons.costPerKm), sub: cons.costPerKm ? t('stats.per100', { value: f.money((cons.costPerKm ?? 0) * 100) }) : null },
          { label: t('stats.best'), value: f.consumption(cons.best?.l100), sub: cons.best ? `${f.date(cons.best.fromDate, false)} – ${f.date(cons.best.date)}` : null },
          { label: t('stats.worst'), value: f.consumption(cons.worst?.l100), sub: cons.worst ? `${f.date(cons.worst.fromDate, false)} – ${f.date(cons.worst.date)}` : null },
          { label: t('stats.kmMonth'), value: f.distance(s.kmPerMonth), sub: s.kmPerMonth ? t('stats.kmYear', { value: f.distance((s.kmPerMonth ?? 0) * 12) }) : null },
          { label: t('stats.kmBetween'), value: f.distance(s.avgKmBetween) },
        ]}
      />
      {okSegments.length >= 2 ? <Note>{t('stats.sec.consumptionCaption')}</Note> : null}
    </Section>
  );

  const habits = (
    <Section title={t('stats.sec.habits')}>
      {topWd !== null && (
        <AppText variant="bodyBold">
          {topDp !== null && s.dayparts.withTime >= 3
            ? t('stats.habitSentence', { day: weekdayIn[topWd], part: dayparts[topDp].toLowerCase() })
            : t('stats.habitSentenceDay', { day: weekdayIn[topWd] })}
        </AppText>
      )}
      <View style={{ flexDirection: isWide ? 'row' : 'column', gap: isWide ? spacing.huge : spacing.xxl }}>
        <View style={{ flex: 1, gap: spacing.md }}>
          <AppText variant="caption" tone="secondary">
            {t('stats.byWeekday')}
          </AppText>
          <DistributionBars labels={WEEKDAYS_SHORT[f.lang]} values={s.weekday.counts} highlight={topWd} height={96} format={(v) => (v ? `${v}` : '')} />
        </View>
        <View style={{ flex: 1, gap: spacing.md }}>
          <AppText variant="caption" tone="secondary">
            {t('stats.byDaypart')}
            {s.topHour !== null ? `, ${t('stats.topHour', { from: `${s.topHour}:00`, to: `${s.topHour + 1}:00` }).toLowerCase()}` : ''}
          </AppText>
          {s.dayparts.withTime > 0 ? (
            <DistributionBars labels={t('stats.daypartsShort', { returnObjects: true }) as string[]} values={s.dayparts.counts} highlight={topDp} height={96} format={(v) => (v ? `${v}` : '')} />
          ) : (
            <AppText tone="secondary">{t('stats.noTimes')}</AppText>
          )}
        </View>
      </View>
      <StatTable
        rows={[
          { label: t('stats.interval'), value: s.avgIntervalDays ? `${f.n(s.avgIntervalDays, 1)} ${daysWord(Math.round(s.avgIntervalDays))}` : '–', sub: s.medianIntervalDays !== null ? t('stats.median', { value: f.n(s.medianIntervalDays, 0) }) : null },
          { label: t('stats.longestGap'), value: s.longestGap ? `${s.longestGap.days} ${daysWord(s.longestGap.days)}` : '–', sub: s.longestGap ? `${f.date(s.longestGap.from, false)} – ${f.date(s.longestGap.to)}` : null },
          { label: t('stats.shortestGap'), value: s.shortestGap ? `${s.shortestGap.days} ${daysWord(s.shortestGap.days)}` : '–', sub: s.shortestGap ? `${f.date(s.shortestGap.from, false)} – ${f.date(s.shortestGap.to)}` : null },
          { label: t('stats.busiestMonth'), value: s.busiestMonth ? `${s.busiestMonth.count}×` : '–', sub: s.busiestMonth ? f.month(s.busiestMonth.key) : null },
        ]}
      />
    </Section>
  );

  const top = s.stations.slice(0, 6);
  const stations = (
    <Section
      title={t('stats.sec.stations')}
      right={
        <AppText variant="caption" tone="muted">
          {t('stats.sec.stationsCaption', { count: s.stations.length })}
        </AppText>
      }
    >
      {top.length ? (
        <RankList
          rows={top.map((st) => ({
            key: st.key,
            title: st.name,
            right: `${st.count}×`,
            value: st.count,
            color: stationColors(st.name, colors).fill,
            sub: `${f.money(st.totalCost)} ø ${f.price(st.avgPrice)} ${f.percent(st.share, false)}`,
          }))}
        />
      ) : (
        <Note>{t('stats.noStations')}</Note>
      )}
      <StatTable
        rows={[
          {
            label: t('stats.cheapestStation'),
            value: s.cheapestStation ? f.price(s.cheapestStation.avgPrice) : '–',
            sub: s.cheapestStation ? `${s.cheapestStation.name}, ${s.cheapestStation.count}×` : null,
            lead: s.cheapestStation ? <StationMark name={s.cheapestStation.name} height={36} /> : undefined,
          },
          {
            label: t('stats.priciestStation'),
            value: s.priciestStation ? f.price(s.priciestStation.avgPrice) : '–',
            sub: s.priciestStation ? `${s.priciestStation.name}, ${s.priciestStation.count}×` : null,
            lead: s.priciestStation ? <StationMark name={s.priciestStation.name} height={36} /> : undefined,
          },
          s.potentialSavings !== null && s.potentialSavings > 1
            ? { label: t('stats.savingsLabel'), value: `~${f.money(s.potentialSavings)}`, sub: t('stats.savingsSub') }
            : null,
        ]}
      />
    </Section>
  );

  const tank = (
    <Section title={t('stats.sec.tank')}>
      <StatTable
        rows={[
          { label: t('stats.avgFill'), value: f.volume(s.avgLiters), sub: t('stats.avgPerFill', { value: f.money(s.avgCost) }) },
          { label: t('stats.typicalFill'), value: f.volume(s.medianLiters), sub: t('stats.medianNote') },
          { label: t('stats.maxFill'), value: f.volume(s.maxLiters), sub: s.biggestFill ? f.date(s.biggestFill.date) : null },
          { label: t('stats.tankSize'), value: s.estimatedTank ? `~${f.volume(s.estimatedTank, 0)}` : '–', sub: t('stats.tankNote') },
        ]}
      />
    </Section>
  );

  const recs = [
    s.mostExpensiveFill && { label: t('stats.rec.mostExpensive'), value: f.money(s.mostExpensiveFill.cost), sub: withStation(s.mostExpensiveFill.date, s.mostExpensiveFill.station) },
    s.biggestFill && { label: t('stats.rec.biggest'), value: f.volume(s.biggestFill.liters), sub: withStation(s.biggestFill.date, s.biggestFill.station) },
    s.smallestFill && { label: t('stats.rec.smallest'), value: f.volume(s.smallestFill.liters), sub: withStation(s.smallestFill.date, s.smallestFill.station) },
    s.cheapestFill && { label: t('stats.rec.cheapest'), value: f.price(s.cheapestFill.price), sub: withStation(s.cheapestFill.date, s.cheapestFill.station) },
    s.maxPrice && { label: t('stats.rec.priciest'), value: f.price(s.maxPrice.value), sub: withStation(s.maxPrice.date, s.maxPrice.station) },
    s.firstDate && { label: t('stats.rec.tracking'), value: `${s.daysTracked} ${daysWord(s.daysTracked)}`, sub: t('stats.rec.since', { date: f.date(s.firstDate) }) },
  ];

  const records = (
    <Section title={t('stats.sec.records')}>
      <StatTable rows={recs} />
    </Section>
  );

  return (
    <Screen title={t('nav.stats')} refreshing={refreshing} onRefresh={() => refresh()}>
      <View style={{ gap: spacing.huge }}>
        <View style={{ gap: spacing.xxxl }}>
          {filters}
          {summary}
        </View>
        <Columns wide={isWide}>
          {spend}
          {price}
        </Columns>
        <Columns wide={isWide}>
          {consumption}
          {stations}
        </Columns>
        {habits}
        <Columns wide={isWide}>
          {tank}
          {records}
        </Columns>
      </View>
    </Screen>
  );
}
