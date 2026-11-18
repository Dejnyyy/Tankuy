import React, { useMemo, useRef, useState } from 'react';
import { Image, ScrollView, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useFormat } from '@/hooks/useFormat';
import { AppText, Button, Chip, PressableScale } from '@/components/ui';
import { fonts, radii, spacing } from '@/constants/Theme';
import { WEEKDAYS, formatDateLong } from '@/lib/format';
import { parseDate, toNum, ymd, type Entry, type StationStat } from '@/lib/stats';
import type { Vehicle } from '@/services/api';
import type { EntryInput } from '@/context/DataContext';

export interface FormState {
  station: string;
  address: string;
  date: string;
  time: string;
  liters: string;
  price: string;
  cost: string;
  mileage: string;
  notes: string;
  vehicleId: string | null;
}

export type FieldKey = 'station' | 'date' | 'time' | 'liters' | 'price' | 'cost';

export const emptyForm = (vehicleId: string | null = null): FormState => ({
  station: '',
  address: '',
  date: ymd(new Date()),
  time: '',
  liters: '',
  price: '',
  cost: '',
  mileage: '',
  notes: '',
  vehicleId,
});

const trimNum = (n: number, d: number) => String(+n.toFixed(d));

/**
 * Keep liters × price = cost consistent. Price per litre is the derived value
 * when both other numbers are known (receipts round it), otherwise derive
 * whichever single value is missing.
 */
export function reconcile(form: FormState, changed: 'liters' | 'price' | 'cost'): { form: FormState; auto: Set<string> } {
  const next = { ...form };
  const auto = new Set<string>();
  const l = toNum(next.liters);
  const p = toNum(next.price);
  const c = toNum(next.cost);
  const ok = (v: number | null) => v !== null && v > 0;
  if (changed === 'liters' && ok(l)) {
    if (ok(c)) {
      next.price = trimNum(c! / l!, 2);
      auto.add('price');
    } else if (ok(p)) {
      next.cost = trimNum(l! * p!, 2);
      auto.add('cost');
    }
  } else if (changed === 'cost' && ok(c)) {
    if (ok(l)) {
      next.price = trimNum(c! / l!, 2);
      auto.add('price');
    } else if (ok(p)) {
      next.liters = trimNum(c! / p!, 2);
      auto.add('liters');
    }
  } else if (changed === 'price' && ok(p)) {
    if (ok(l)) {
      next.cost = trimNum(l! * p!, 2);
      auto.add('cost');
    } else if (ok(c)) {
      next.liters = trimNum(c! / p!, 2);
      auto.add('liters');
    }
  }
  return { form: next, auto };
}

function Field({
  label,
  icon,
  suffix,
  badge,
  error,
  hint,
  big,
  inputRef,
  ...input
}: TextInputProps & {
  label: string;
  icon?: string;
  suffix?: string;
  badge?: 'ai' | 'auto' | 'missing' | null;
  error?: string | null;
  hint?: string | null;
  big?: boolean;
  inputRef?: React.Ref<TextInput>;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [focus, setFocus] = useState(false);
  const borderColor = error ? colors.negative : focus ? colors.text : badge === 'missing' ? colors.warning : colors.border;
  return (
    <View style={{ gap: 6, minWidth: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <AppText variant="label" tone="muted">
          {label}
        </AppText>
        {badge === 'ai' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radii.full, backgroundColor: colors.tintSoft }}>
            <FontAwesome name="magic" size={9} color={colors.tint} />
            <AppText style={{ fontSize: 9, fontWeight: '800', color: colors.tint }}>AI</AppText>
          </View>
        )}
        {badge === 'auto' && (
          <AppText style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.6 }}>{t('entry.auto')}</AppText>
        )}
        {badge === 'missing' && (
          <AppText style={{ fontSize: 9, fontWeight: '800', color: colors.warning, letterSpacing: 0.6 }}>{t('entry.fillIn')}</AppText>
        )}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          height: big ? 60 : 50,
          paddingHorizontal: spacing.md,
          borderRadius: radii.md,
          backgroundColor: colors.inputBackground,
          borderWidth: 1.5,
          borderColor,
        }}
      >
        {icon ? <FontAwesome name={icon as any} size={14} color={colors.textMuted} /> : null}
        <TextInput
          ref={inputRef}
          placeholderTextColor={colors.placeholder}
          {...input}
          onFocus={(e) => {
            setFocus(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            input.onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              height: '100%',
              color: colors.text,
              fontSize: big ? 22 : 16,
              fontFamily: big ? fonts.displayBold : undefined,
              fontWeight: big ? undefined : '500',
            },
            { outlineStyle: 'none' } as any,
          ]}
        />
        {suffix ? (
          <AppText variant="captionBold" tone="muted">
            {suffix}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="negative">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

interface Props {
  initial: FormState;
  vehicles: Vehicle[];
  stations: StationStat[];
  entries: Entry[];
  /** Fields pre-filled by the receipt scanner. */
  aiFields?: Set<FieldKey>;
  /** Fields the scanner could not read. */
  missingFields?: Set<FieldKey>;
  submitLabel: string;
  onSubmit: (data: EntryInput) => Promise<void>;
  receiptImageUrl?: string | null;
  excludeId?: string;
  footer?: React.ReactNode;
}

export function EntryForm({ initial, vehicles, stations, entries, aiFields, missingFields, submitLabel, onSubmit, receiptImageUrl, excludeId, footer }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const f = useFormat();
  const [form, setForm] = useState<FormState>(initial);
  const [auto, setAuto] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [stationFocus, setStationFocus] = useState(false);
  const costRef = useRef<TextInput>(null);

  const set = (k: keyof FormState, v: string | null) => {
    setTouched((s) => new Set(s).add(k));
    if (k === 'liters' || k === 'price' || k === 'cost') {
      const r = reconcile({ ...form, [k]: v ?? '' }, k);
      setForm(r.form);
      setAuto((prev) => {
        const n = new Set([...prev].filter((x) => x !== k));
        r.auto.forEach((x) => n.add(x));
        return n;
      });
    } else {
      setForm((p) => ({ ...p, [k]: v }));
    }
  };

  // Last odometer reading for the selected vehicle (hint + sanity check).
  const lastMileage = useMemo(() => {
    const list = entries.filter((e) => e.id !== excludeId && e.mileage && (!form.vehicleId || e.vehicleId === form.vehicleId) && e.date <= (form.date || '9999'));
    return list.length ? list[list.length - 1] : null;
  }, [entries, form.vehicleId, form.date, excludeId]);

  const suggestions = useMemo(() => {
    const q = form.station.trim().toLowerCase();
    const list = q ? stations.filter((s) => s.name.toLowerCase().includes(q) && s.name.toLowerCase() !== q) : stations;
    return list.slice(0, 6);
  }, [stations, form.station]);

  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(form.date) && !Number.isNaN(parseDate(form.date).getTime());
  const timeOk = !form.time || /^\d{1,2}:\d{2}$/.test(form.time);
  const cost = toNum(form.cost);
  const liters = toNum(form.liters);
  const price = toNum(form.price);
  const mileage = toNum(form.mileage);
  const lastM = lastMileage?.mileage ? f.units.formatDistance(lastMileage.mileage) : null;

  const errors = {
    date: !dateOk ? t('entry.err.date') : null,
    time: !timeOk ? t('entry.err.time') : null,
    cost: !cost || cost <= 0 ? t('entry.err.cost') : null,
    liters: form.liters && (!liters || liters <= 0 || liters > 400) ? t('entry.err.liters') : null,
    price: form.price && (!price || price <= 0) ? t('entry.err.price') : null,
  };
  const mileageWarn = mileage && lastM && mileage < lastM ? t('entry.warn.mileageLower', { value: f.n(lastM) }) : null;
  const priceWarn = liters && price && cost && Math.abs(liters * price - cost) / cost > 0.04 ? t('entry.warn.mismatch') : null;
  const valid = !Object.values(errors).some(Boolean);

  const show = (k: keyof typeof errors) => (submitted || touched.has(k) ? errors[k] : null);
  const badge = (k: FieldKey): 'ai' | 'auto' | 'missing' | null =>
    auto.has(k) ? 'auto' : aiFields?.has(k) && !touched.has(k) ? 'ai' : missingFields?.has(k) && !form[k as keyof FormState] ? 'missing' : null;

  const submit = async () => {
    setSubmitted(true);
    if (!valid) return;
    const u = f.units;
    const data: EntryInput = {
      vehicleId: form.vehicleId,
      stationName: form.station.trim() || null,
      stationAddress: form.address.trim() || null,
      stationLat: null,
      stationLng: null,
      date: form.date,
      time: form.time ? form.time.padStart(5, '0') : null,
      pricePerLiter: price ? u.toMetricPrice(price) : null,
      totalLiters: liters ? u.toMetricVolume(liters) : null,
      // DB stores CZK; convert back when the user works in USD
      totalCost: u.currency === 'USD' ? (cost as number) / (u.exchangeRate || 1) : (cost as number),
      mileage: mileage ? Math.round(u.toMetricDistance(mileage) as number) : null,
      receiptImageUrl: receiptImageUrl ?? null,
      notes: form.notes.trim() || null,
    };
    try {
      setSaving(true);
      await onSubmit(data);
    } finally {
      setSaving(false);
    }
  };

  const today = ymd(new Date());
  const yesterday = ymd(new Date(Date.now() - 86400000));
  const dateCaption = dateOk
    ? `${WEEKDAYS[f.lang][(parseDate(form.date).getDay() + 6) % 7]} ${formatDateLong(form.date, f.lang, true)}`
    : null;

  return (
    <View style={{ gap: spacing.xl }}>
      {/* Amount block */}
      <Animated.View entering={FadeInDown.duration(380)} style={{ gap: spacing.md }}>
        <Field
          inputRef={costRef}
          label={t('entry.cost')}
          big
          value={form.cost}
          onChangeText={(v) => set('cost', v)}
          keyboardType="decimal-pad"
          placeholder="0"
          suffix={f.currencySymbol}
          badge={badge('cost')}
          error={show('cost')}
        />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
          <Field
            label={t('entry.liters')}
            value={form.liters}
            onChangeText={(v) => set('liters', v)}
            keyboardType="decimal-pad"
            placeholder="0,00"
            suffix={f.volumeUnit}
            badge={badge('liters')}
            error={show('liters')}
          />
          </View>
          <View style={{ flex: 1 }}>
          <Field
            label={t('entry.price')}
            value={form.price}
            onChangeText={(v) => set('price', v)}
            keyboardType="decimal-pad"
            placeholder="0,00"
            suffix={f.metricUnit('price')}
            badge={badge('price')}
            error={show('price')}
          />
          </View>
        </View>
        {priceWarn ? (
          <Animated.View entering={FadeIn} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <FontAwesome name="exclamation-triangle" size={12} color={colors.warning} />
            <AppText variant="caption" style={{ color: colors.warning, flex: 1 }}>
              {priceWarn}
            </AppText>
          </Animated.View>
        ) : null}
      </Animated.View>

      {/* Station */}
      <Animated.View entering={FadeInDown.delay(60).duration(380)} style={{ gap: spacing.sm }}>
        <Field
          label={t('entry.station')}
          icon="tint"
          value={form.station}
          onChangeText={(v) => set('station', v)}
          onFocus={() => setStationFocus(true)}
          onBlur={() => setTimeout(() => setStationFocus(false), 150)}
          placeholder={t('entry.stationPlaceholder')}
          badge={badge('station')}
          autoCapitalize="words"
        />
        {(stationFocus || !form.station) && suggestions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.sm }}>
            {suggestions.map((s) => (
              <Chip key={s.key} label={s.name} icon="history" onPress={() => set('station', s.name)} />
            ))}
          </ScrollView>
        )}
        <Field label={t('entry.address')} icon="map-marker" value={form.address} onChangeText={(v) => set('address', v)} placeholder={t('entry.addressPlaceholder')} />
      </Animated.View>

      {/* When */}
      <Animated.View entering={FadeInDown.delay(120).duration(380)} style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 3 }}>
            <Field
              label={t('entry.date')}
              icon="calendar"
              value={form.date}
              onChangeText={(v) => set('date', v)}
              placeholder="RRRR-MM-DD"
              badge={badge('date')}
              error={show('date')}
              hint={dateCaption}
              keyboardType={'numbers-and-punctuation' as KeyboardTypeOptions}
            />
          </View>
          <View style={{ flex: 2 }}>
            <Field
              label={t('entry.time')}
              icon="clock-o"
              value={form.time}
              onChangeText={(v) => set('time', v)}
              placeholder="14:30"
              badge={badge('time')}
              error={show('time')}
              keyboardType={'numbers-and-punctuation' as KeyboardTypeOptions}
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Chip label={t('common.today')} active={form.date === today} onPress={() => set('date', today)} />
          <Chip label={t('common.yesterday')} active={form.date === yesterday} onPress={() => set('date', yesterday)} />
        </View>
      </Animated.View>

      {/* Vehicle + odometer */}
      <Animated.View entering={FadeInDown.delay(180).duration(380)} style={{ gap: spacing.sm }}>
        <AppText variant="label" tone="muted">
          {t('entry.vehicle')}
        </AppText>
        {vehicles.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {vehicles.map((v) => (
              <Chip key={v.id} label={v.name} icon="car" active={form.vehicleId === v.id} onPress={() => set('vehicleId', form.vehicleId === v.id ? null : v.id)} />
            ))}
          </ScrollView>
        ) : (
          <AppText variant="caption" tone="secondary">
            {t('entry.noVehicles')}
          </AppText>
        )}
        <Field
          label={t('entry.mileage')}
          icon="tachometer"
          value={form.mileage}
          onChangeText={(v) => set('mileage', v.replace(/[^\d]/g, ''))}
          keyboardType="number-pad"
          placeholder={lastM ? f.n(lastM) : '0'}
          suffix={f.distanceUnit}
          hint={mileageWarn ?? (lastM ? t('entry.lastMileage', { value: f.n(lastM), date: f.date(lastMileage!.date) }) : t('entry.mileageHint'))}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(380)}>
        <Field label={t('entry.notes')} icon="sticky-note-o" value={form.notes} onChangeText={(v) => set('notes', v)} placeholder={t('entry.notesPlaceholder')} />
      </Animated.View>

      <View style={{ gap: spacing.sm }}>
        <Button title={submitLabel} icon="check" variant="accent" size="lg" loading={saving} onPress={submit} />
        {submitted && !valid ? (
          <AppText variant="caption" tone="negative" align="center">
            {t('entry.err.fix')}
          </AppText>
        ) : null}
        {footer}
      </View>
    </View>
  );
}

/** Small receipt thumbnail with tap-to-zoom handled by caller. */
export function ReceiptThumb({ uri, size = 56, onPress }: { uri: string; size?: number; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} style={{ width: size, height: size * 1.3, borderRadius: radii.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.sunken }}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </PressableScale>
  );
}
