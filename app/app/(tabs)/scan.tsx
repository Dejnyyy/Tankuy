import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useData, type EntryInput } from '@/context/DataContext';
import { useFormat } from '@/hooks/useFormat';
import api, { type ReceiptScanResult } from '@/services/api';
import { AppText, Button, PressableScale, Rule, Screen, StationMark } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { EntryForm, emptyForm, type FieldKey, type FormState } from '@/components/EntryForm';
import { fonts, radii, spacing, typography } from '@/constants/Theme';
import { haptics } from '@/lib/haptics';
import { saveWithDuplicateCheck } from '@/lib/entryHelpers';
import { stationStats, toNum } from '@/lib/stats';

type Phase = 'idle' | 'scanning' | 'review' | 'saved' | 'error';

interface Picked {
  uri: string;
  mime: string;
  base64?: string;
  file?: any;
}

/** Map the API's parsed receipt onto the form + note which fields AI filled. */
function fromScan(res: ReceiptScanResult, base: FormState) {
  const p = (res?.parsed ?? {}) as ReceiptScanResult['parsed'];
  const ai = new Set<FieldKey>();
  const missing = new Set<FieldKey>();
  const form = { ...base };
  const num = (a: unknown, b?: unknown) => toNum(a) ?? toNum(b);
  const liters = num(p.totalUnits, p.totalLiters);
  const price = num(p.pricePerUnit, p.pricePerLiter);
  let cost = toNum(p.totalCost);
  if (p.stationName) {
    form.station = String(p.stationName);
    ai.add('station');
  } else missing.add('station');
  if (p.date && /^\d{4}-\d{2}-\d{2}/.test(String(p.date))) {
    form.date = String(p.date).slice(0, 10);
    ai.add('date');
  } else missing.add('date');
  if (p.time && /^\d{1,2}:\d{2}/.test(String(p.time))) {
    form.time = String(p.time).slice(0, 5);
    ai.add('time');
  }
  if (!cost && liters && price) cost = +(liters * price).toFixed(2);
  if (liters) {
    form.liters = String(liters);
    ai.add('liters');
  } else missing.add('liters');
  if (price) {
    form.price = String(price);
    ai.add('price');
  } else missing.add('price');
  if (cost) {
    form.cost = String(cost);
    ai.add('cost');
  } else missing.add('cost');
  return { form, ai, missing, readable: ai.size >= 2 };
}

function ScanningView({ uri, step }: { uri: string; step: string }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  const [h, setH] = useState(320);
  useEffect(() => {
    if (reduce) return;
    y.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [y, reduce]);
  const line = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * (h - 2) }] }));
  return (
    <View style={{ gap: spacing.xl, width: '100%', maxWidth: 320 }}>
      <View
        onLayout={(e) => setH(e.nativeEvent.layout.height)}
        style={{ width: '100%', aspectRatio: 0.75, borderRadius: radii.sm, overflow: 'hidden', backgroundColor: colors.sunken }}
      >
        <Image source={{ uri }} style={{ width: '100%', height: '100%', opacity: 0.85 }} resizeMode="cover" />
        {!reduce && <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: colors.text }, line]} />}
      </View>
      <Animated.View key={step} entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
        <AppText variant="bodyBold">{step}</AppText>
      </Animated.View>
    </View>
  );
}

export default function ScanScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const f = useFormat();
  const toast = useToast();
  const { entries, vehicles, addEntry } = useData();
  const { mode, ts } = useLocalSearchParams<{ mode?: string; ts?: string }>();
  const [phase, setPhase] = useState<Phase>('idle');
  const [picked, setPicked] = useState<Picked | null>(null);
  const [result, setResult] = useState<ReceiptScanResult | null>(null);
  const [scan, setScan] = useState<ReturnType<typeof fromScan> | null>(null);
  const [saved, setSaved] = useState<EntryInput | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const token = useRef(0);
  const stations = useMemo(() => stationStats(entries), [entries]);
  const steps = t('scan.steps', { returnObjects: true }) as string[];

  // Legacy deep link: /scan?mode=manual opens the manual form.
  useEffect(() => {
    if (mode === 'manual') router.replace('/entry');
  }, [mode, ts]);

  useEffect(() => {
    if (phase !== 'scanning') return;
    setStepIdx(0);
    const id = setInterval(() => setStepIdx((i) => Math.min(i + 1, steps.length - 1)), 1700);
    return () => clearInterval(id);
  }, [phase, steps.length]);

  const baseForm = () => emptyForm(entries.length ? entries[entries.length - 1].vehicleId ?? vehicles[0]?.id ?? null : vehicles[0]?.id ?? null);

  const run = async (p: Picked) => {
    const my = ++token.current;
    setPicked(p);
    setPhase('scanning');
    setErrorMsg(null);
    haptics.light();
    try {
      const res = await api.scanReceipt(p.base64 ?? '', p.mime, p.uri, p.file);
      if (my !== token.current) return;
      const mapped = fromScan(res, baseForm());
      setResult(res);
      setScan(mapped);
      if (!mapped.readable) {
        haptics.warning();
        setErrorMsg(t('scan.unreadable'));
        setPhase('error');
        return;
      }
      haptics.success();
      setPhase('review');
    } catch (e: any) {
      if (my !== token.current) return;
      haptics.error();
      setErrorMsg(String(e?.message ?? '').includes('401') ? t('scan.errAuth') : t('scan.errNetwork'));
      setPhase('error');
    }
  };

  // Coming back to the tab after a successful save starts fresh.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  useFocusEffect(
    useCallback(() => {
      if (phaseRef.current === 'saved') reset();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const pickWeb = (capture: boolean) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) (input as any).capture = 'environment';
    input.onchange = (e: any) => {
      const file: File | undefined = e.target.files?.[0];
      if (!file) return;
      run({ uri: URL.createObjectURL(file), mime: file.type || 'image/jpeg', file });
    };
    input.click();
  };

  const pickNative = async (camera: boolean) => {
    try {
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          toast(t('scan.noCamera'), 'error');
          return;
        }
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
      const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets?.length) return;
      const a = r.assets[0];
      run({ uri: a.uri, mime: a.mimeType || 'image/jpeg' });
    } catch {
      toast(t('scan.errNetwork'), 'error');
    }
  };

  const pick = (camera: boolean) => (Platform.OS === 'web' ? pickWeb(camera) : pickNative(camera));

  const reset = () => {
    token.current++;
    setPhase('idle');
    setPicked(null);
    setResult(null);
    setScan(null);
    setSaved(null);
  };

  const onSubmit = async (data: EntryInput) => {
    try {
      const ok = await saveWithDuplicateCheck(addEntry, data, t);
      if (!ok) return;
      haptics.success();
      setSaved(data);
      setPhase('saved');
    } catch {
      haptics.error();
      toast(t('entry.saveError'), 'error');
    }
  };

  // ── Phases ──
  if (phase === 'scanning' && picked) {
    return (
      <Screen title={t('scan.title')}>
        <View style={{ gap: spacing.xl, alignItems: 'flex-start', maxWidth: 560, width: '100%' }}>
          <ScanningView uri={picked.uri} step={steps[stepIdx] ?? ''} />
          <AppText tone="secondary">{t('scan.scanningHint')}</AppText>
          <Button title={t('common.cancel')} variant="secondary" onPress={reset} />
        </View>
      </Screen>
    );
  }

  if (phase === 'review' && scan) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen
          title={t('scan.reviewTitle')}
          right={<Button title={t('scan.rescan')} size="sm" variant="secondary" onPress={reset} />}
        >
          <View style={{ maxWidth: 640, width: '100%', gap: spacing.xxl }}>
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
              {picked ? <Image source={{ uri: picked.uri }} style={{ width: 40, height: 52, borderRadius: radii.xs, backgroundColor: colors.sunken }} /> : null}
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold">{t('scan.reviewOverline', { count: scan.ai.size })}</AppText>
                <AppText variant="caption" tone="secondary">
                  {scan.missing.size ? t('scan.reviewMissing') : t('scan.reviewAll')}
                </AppText>
              </View>
            </View>
            <EntryForm
              initial={scan.form}
              aiFields={scan.ai}
              missingFields={scan.missing}
              vehicles={vehicles}
              stations={stations}
              entries={entries}
              receiptImageUrl={result?.imageUrl}
              submitLabel={t('entry.save')}
              onSubmit={onSubmit}
            />
          </View>
        </Screen>
      </KeyboardAvoidingView>
    );
  }

  if (phase === 'saved' && saved) {
    return (
      <Screen title={t('scan.savedTitle')}>
        <View style={{ gap: spacing.xxl, maxWidth: 480, width: '100%' }}>
          <View style={{ gap: spacing.md }}>
            <Rule strong />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <StationMark name={saved.stationName} height={40} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold" numberOfLines={1}>
                  {saved.stationName ?? t('entry.unknownStation')}
                </AppText>
                <AppText variant="mono" tone="muted">
                  {f.date(saved.date)}
                  {saved.time ? `, ${saved.time}` : ''}
                </AppText>
              </View>
            </View>
            <AppText style={typography.display}>{f.money(saved.totalCost).replace(/\u202F/g, '\u00A0')}</AppText>
            <AppText variant="statSm" tone="secondary">
              {[saved.totalLiters ? f.volume(saved.totalLiters) : null, saved.pricePerLiter ? f.price(saved.pricePerLiter) : null].filter(Boolean).join(' ')}
            </AppText>
          </View>
          <View style={{ gap: spacing.sm }}>
            <Button title={t('scan.done')} size="lg" onPress={() => { reset(); router.navigate('/'); }} />
            <Button title={t('scan.another')} size="lg" variant="secondary" onPress={reset} />
          </View>
        </View>
      </Screen>
    );
  }

  if (phase === 'error') {
    return (
      <Screen title={t('scan.title')}>
        <View style={{ maxWidth: 480, width: '100%', gap: spacing.xxl }}>
          <View style={{ gap: spacing.sm }}>
            <AppText variant="heading">{t('scan.errTitle')}</AppText>
            <AppText tone="secondary">{errorMsg}</AppText>
          </View>
          <View style={{ gap: spacing.sm }}>
            {picked && <Button title={t('scan.retry')} size="lg" onPress={() => run(picked)} />}
            <Button title={t('scan.newPhoto')} icon="camera" variant="secondary" size="lg" onPress={() => pick(true)} />
            <Button
              title={t('scan.fillManually')}
              variant="ghost"
              onPress={() => {
                // Keep whatever was read (and the uploaded receipt) and let the user finish.
                const mapped = scan ?? { form: baseForm(), ai: new Set<FieldKey>(), missing: new Set<FieldKey>(), readable: false };
                setScan(mapped);
                setPhase('review');
              }}
            />
          </View>
        </View>
      </Screen>
    );
  }

  // idle
  const tips = t('scan.tips', { returnObjects: true }) as string[];
  return (
    <Screen title={t('scan.title')}>
      <View style={{ maxWidth: 560, width: '100%', gap: spacing.xxxl }}>
        <PressableScale
          onPress={() => pick(true)}
          haptic="medium"
          accessibilityRole="button"
          accessibilityLabel={t('scan.takePhoto')}
          style={{
            backgroundColor: colors.buttonPrimary,
            borderRadius: radii.lg,
            padding: spacing.xxl,
            minHeight: 220,
            justifyContent: 'space-between',
          }}
        >
          <FontAwesome name="camera" size={28} color={colors.buttonPrimaryText} />
          <View style={{ gap: spacing.sm }}>
            <AppText style={{ fontFamily: fonts.heavy, fontSize: 32, lineHeight: 34, letterSpacing: -1.2, color: colors.buttonPrimaryText }}>
              {t('scan.takePhoto')}
            </AppText>
            <AppText variant="body" style={{ color: colors.buttonPrimaryText, opacity: 0.7 }}>
              {t('scan.heroText')}
            </AppText>
          </View>
        </PressableScale>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title={t('scan.fromGallery')} variant="secondary" size="lg" onPress={() => pick(false)} style={{ flex: 1 }} />
          <Button title={t('scan.manual')} variant="secondary" size="lg" onPress={() => router.push('/entry')} style={{ flex: 1 }} />
        </View>
        <View style={{ gap: spacing.md }}>
          <AppText variant="bodyBold">{t('scan.tipsTitle')}</AppText>
          <View>
            {tips.map((tip, i) => (
              <View key={i} style={{ paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
                <AppText tone="secondary">{tip}</AppText>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}
