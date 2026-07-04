import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { ProductService } from '@/services/productService';
import { ProductType, EditionType, ShippingPreference } from '@/types';

const STEPS = ['Photos', 'Details', 'Policies'];

type PickedImage = { uri: string; name: string; type: string };

export default function CreateProduct() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Images
  const [images, setImages] = useState<PickedImage[]>([]);

  // Step 0 — Basics
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');

  // Step 1 — Details
  const [productType, setProductType] = useState<ProductType>('PHYSICAL');
  const [stock, setStock] = useState('1');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('');
  const [weight, setWeight] = useState('');
  const [dimLength, setDimLength] = useState('');
  const [dimWidth, setDimWidth] = useState('');
  const [dimHeight, setDimHeight] = useState('');
  const [dimUnit, setDimUnit] = useState<'cm' | 'in'>('cm');
  const [medium, setMedium] = useState('');
  const [artStyle, setArtStyle] = useState('');
  const [yearCreated, setYearCreated] = useState('');
  const [editionType, setEditionType] = useState<EditionType | ''>('');
  const [includeCertificate, setIncludeCertificate] = useState(false);
  const [tags, setTags] = useState('');

  // Step 2 — Policies
  const [shippingPreference, setShippingPreference] = useState<ShippingPreference>('FREE_SHIPPING');
  const [shippingCharge, setShippingCharge] = useState('');
  const [cashOnDelivery, setCashOnDelivery] = useState(true);
  const [returnPolicy, setReturnPolicy] = useState('');
  const [warranty, setWarranty] = useState('');

  const pickImages = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to upload product images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 6,
    });
    if (!result.canceled && result.assets.length > 0) {
      const picked: PickedImage[] = result.assets.map((a, i) => ({
        uri: a.uri,
        name: a.fileName ?? `image_${Date.now()}_${i}.jpg`,
        type: a.mimeType ?? 'image/jpeg',
      }));
      setImages(prev => [...prev, ...picked].slice(0, 6));
    }
  }, []);

  const removeImage = useCallback((uri: string) => {
    setImages(prev => prev.filter(i => i.uri !== uri));
  }, []);

  const canProceed = () => {
    if (step === 0) return images.length > 0 && title.trim() !== '' && price.trim() !== '';
    if (step === 1) return stock.trim() !== '';
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) {
      Alert.alert(
        'Required fields',
        step === 0 ? 'Please add at least 1 photo, a title, and a price.' : 'Please fill in stock quantity.',
      );
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      submitProduct();
    }
  };

  const submitProduct = async () => {
    if (yearCreated) {
      const yr = parseInt(yearCreated, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(yr) || yr > currentYear) {
        const msg = `Year created cannot be in the future. Enter a year up to ${currentYear}.`;
        setError(msg);
        Alert.alert('Invalid Year', msg);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('price', price);
      formData.append('stock', stock);
      formData.append('productType', productType);

      images.forEach(img => {
        formData.append('images', { uri: img.uri, name: img.name, type: img.type } as any);
      });

      if (comparePrice)   formData.append('comparePrice', comparePrice);
      if (sku)            formData.append('sku', sku);
      if (brand)          formData.append('brand', brand);
      if (weight)         formData.append('weight', weight);

      if (dimLength || dimWidth || dimHeight) {
        formData.append('dimensions', JSON.stringify({
          length: dimLength ? Number(dimLength) : undefined,
          width:  dimWidth  ? Number(dimWidth)  : undefined,
          height: dimHeight ? Number(dimHeight) : undefined,
          unit: dimUnit,
        }));
      }

      if (medium)         formData.append('medium', medium);
      if (artStyle)       formData.append('artStyle', artStyle);
      if (yearCreated)    formData.append('yearCreated', yearCreated);
      if (editionType)    formData.append('editionType', editionType);
      formData.append('includeCertificate', String(includeCertificate));

      if (tags.trim()) {
        tags.split(',').map(t => t.trim()).filter(Boolean)
          .forEach(t => formData.append('tags', t));
      }

      formData.append('shippingPreference', shippingPreference);
      if (shippingPreference === 'BUYER_PAYS_SHIPPING' && shippingCharge) {
        formData.append('shippingCharge', shippingCharge);
      }
      formData.append('cashOnDelivery', String(cashOnDelivery));
      if (returnPolicy)   formData.append('returnPolicy', returnPolicy.trim());
      if (warranty)       formData.append('warranty', warranty.trim());

      const res = await ProductService.createProduct(formData);
      if (res.success) {
        Alert.alert('Published!', 'Your product is now listed.', [
          { text: 'View My Listings', onPress: () => router.replace('/product/my-listings' as any) },
        ]);
      } else {
        const msg = 'Failed to create product. Please try again.';
        setError(msg);
        Alert.alert('Publish Failed', msg);
      }
    } catch (err: any) {
      const msg: string = err.message || 'An error occurred while creating the product.';
      setError(msg);
      if (msg.toLowerCase().includes('limit exceeded') || msg.toLowerCase().includes('tier')) {
        Alert.alert(
          'Listing Limit Reached',
          msg + '\n\nUpgrade your plan to list more products.',
          [{ text: 'OK' }],
        );
      } else {
        Alert.alert('Publish Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (step > 0 ? setStep(s => s - 1) : router.back())}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>List a Product</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.stepBar}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, i === step && { color: Colors.gold }]}>{s}</Text>
              {i < STEPS.length - 1 && (
                <View style={[styles.stepLine, i < step && { backgroundColor: Colors.gold }]} />
              )}
            </View>
          ))}
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── STEP 0: Photos + basics ── */}
        {step === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Photos</Text>
            <Text style={styles.sectionSub}>Add up to 6 photos. First photo is the cover.</Text>

            <View style={styles.imageGrid}>
              {images.map((img, idx) => (
                <View key={img.uri} style={styles.imageTile}>
                  <Image source={{ uri: img.uri }} style={styles.imageTileImg} contentFit="cover" />
                  {idx === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>COVER</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(img.uri)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 6 && (
                <TouchableOpacity style={styles.addImageTile} onPress={pickImages}>
                  <Text style={styles.addImageIcon}>+</Text>
                  <Text style={styles.addImageLabel}>{images.length === 0 ? 'Add Photos' : 'Add More'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>TITLE *</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Royal Bengal Tiger Painting" placeholderTextColor={Colors.creamFaint} style={styles.input} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Describe the artwork, technique, inspiration…" placeholderTextColor={Colors.creamFaint} multiline style={[styles.input, styles.inputMulti]} />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>PRICE (₹) *</Text>
                <TextInput value={price} onChangeText={setPrice} placeholder="5000" placeholderTextColor={Colors.creamFaint} keyboardType="numeric" style={styles.input} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>COMPARE PRICE (₹)</Text>
                <TextInput value={comparePrice} onChangeText={setComparePrice} placeholder="6500" placeholderTextColor={Colors.creamFaint} keyboardType="numeric" style={styles.input} />
              </View>
            </View>
          </View>
        )}

        {/* ── STEP 1: Details ── */}
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Details</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PRODUCT TYPE</Text>
              <View style={styles.chipRow}>
                {(['PHYSICAL', 'DIGITAL'] as ProductType[]).map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, productType === t && styles.chipActive]} onPress={() => setProductType(t)}>
                    <Text style={[styles.chipText, productType === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>STOCK QTY *</Text>
                <TextInput value={stock} onChangeText={setStock} placeholder="1" placeholderTextColor={Colors.creamFaint} keyboardType="numeric" style={styles.input} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>SKU</Text>
                <TextInput value={sku} onChangeText={setSku} placeholder="ART-001" placeholderTextColor={Colors.creamFaint} style={styles.input} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>BRAND / STUDIO</Text>
                <TextInput value={brand} onChangeText={setBrand} placeholder="Priya Arts Studio" placeholderTextColor={Colors.creamFaint} style={styles.input} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>WEIGHT (kg)</Text>
                <TextInput value={weight} onChangeText={setWeight} placeholder="1.2" placeholderTextColor={Colors.creamFaint} keyboardType="decimal-pad" style={styles.input} />
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionSubHead}>Dimensions</Text>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>LENGTH</Text>
                <TextInput value={dimLength} onChangeText={setDimLength} placeholder="24" placeholderTextColor={Colors.creamFaint} keyboardType="decimal-pad" style={styles.input} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>WIDTH</Text>
                <TextInput value={dimWidth} onChangeText={setDimWidth} placeholder="30" placeholderTextColor={Colors.creamFaint} keyboardType="decimal-pad" style={styles.input} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>HEIGHT</Text>
                <TextInput value={dimHeight} onChangeText={setDimHeight} placeholder="2" placeholderTextColor={Colors.creamFaint} keyboardType="decimal-pad" style={styles.input} />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>UNIT</Text>
              <View style={styles.chipRow}>
                {(['cm', 'in'] as const).map(u => (
                  <TouchableOpacity key={u} style={[styles.chip, dimUnit === u && styles.chipActive]} onPress={() => setDimUnit(u)}>
                    <Text style={[styles.chipText, dimUnit === u && styles.chipTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />
            <Text style={styles.sectionSubHead}>Art Details</Text>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>MEDIUM</Text>
                <TextInput value={medium} onChangeText={setMedium} placeholder="Oil on Canvas" placeholderTextColor={Colors.creamFaint} style={styles.input} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>ART STYLE</Text>
                <TextInput value={artStyle} onChangeText={setArtStyle} placeholder="Impressionism" placeholderTextColor={Colors.creamFaint} style={styles.input} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>YEAR CREATED</Text>
                <TextInput value={yearCreated} onChangeText={setYearCreated} placeholder="2024" placeholderTextColor={Colors.creamFaint} keyboardType="numeric" style={styles.input} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>TAGS (comma separated)</Text>
                <TextInput value={tags} onChangeText={setTags} placeholder="oil, abstract, blue" placeholderTextColor={Colors.creamFaint} style={styles.input} />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EDITION TYPE</Text>
              <View style={styles.chipRow}>
                {(['', 'LIMITED_EDITION', 'OPEN_EDITION', 'UNIQUE'] as const).map(e => (
                  <TouchableOpacity key={e} style={[styles.chip, editionType === e && styles.chipActive]} onPress={() => setEditionType(e as EditionType | '')}>
                    <Text style={[styles.chipText, editionType === e && styles.chipTextActive]}>
                      {e === '' ? 'None' : e.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.toggleRow} onPress={() => setIncludeCertificate(v => !v)}>
              <View style={[styles.toggle, includeCertificate && styles.toggleActive]}>
                {includeCertificate && <View style={styles.toggleKnob} />}
              </View>
              <Text style={styles.toggleLabel}>Include Certificate of Authenticity</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: Policies ── */}
        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping & Policies</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>SHIPPING PREFERENCE</Text>
              <View style={styles.chipRow}>
                {(['FREE_SHIPPING', 'BUYER_PAYS_SHIPPING', 'LOCAL_PICKUP_ONLY'] as ShippingPreference[]).map(s => (
                  <TouchableOpacity key={s} style={[styles.chip, shippingPreference === s && styles.chipActive]} onPress={() => setShippingPreference(s)}>
                    <Text style={[styles.chipText, shippingPreference === s && styles.chipTextActive]}>
                      {s === 'FREE_SHIPPING' ? 'Free Shipping' : s === 'BUYER_PAYS_SHIPPING' ? 'Buyer Pays' : 'Local Pickup'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {shippingPreference === 'BUYER_PAYS_SHIPPING' && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>SHIPPING CHARGE (₹)</Text>
                <TextInput value={shippingCharge} onChangeText={setShippingCharge} placeholder="150" placeholderTextColor={Colors.creamFaint} keyboardType="numeric" style={styles.input} />
              </View>
            )}

            <TouchableOpacity style={styles.toggleRow} onPress={() => setCashOnDelivery(v => !v)}>
              <View style={[styles.toggle, cashOnDelivery && styles.toggleActive]}>
                {cashOnDelivery && <View style={styles.toggleKnob} />}
              </View>
              <Text style={styles.toggleLabel}>Cash on Delivery available</Text>
            </TouchableOpacity>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>RETURN POLICY</Text>
              <TextInput value={returnPolicy} onChangeText={setReturnPolicy} placeholder="e.g. 7-day return window, unused condition" placeholderTextColor={Colors.creamFaint} multiline style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>WARRANTY</Text>
              <TextInput value={warranty} onChangeText={setWarranty} placeholder="e.g. 1-year quality guarantee" placeholderTextColor={Colors.creamFaint} style={styles.input} />
            </View>

            <LinearGradient colors={['#1C2F45', '#152236']} style={styles.summaryCard}>
              <View style={styles.summaryGoldLine} />
              <Text style={styles.summaryTitle}>Listing Summary</Text>
              {[
                ['Title',   title || '—'],
                ['Price',   price ? `₹${Number(price).toLocaleString('en-IN')}` : '—'],
                ['Photos',  `${images.length} selected`],
                ['Type',    productType],
                ['Stock',   stock || '—'],
                ...(medium ? [['Medium', medium]] : []),
                ...(dimLength ? [['Dimensions', `${dimLength}×${dimWidth}×${dimHeight} ${dimUnit}`]] : []),
              ].map(([k, v]) => (
                <View key={k} style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>{k}</Text>
                  <Text style={styles.summaryVal}>{v}</Text>
                </View>
              ))}
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        {loading ? (
          <ActivityIndicator color={Colors.gold} size="large" />
        ) : (
          <GoldButton
            label={step === STEPS.length - 1 ? 'Publish Product' : `Continue to ${STEPS[step + 1]} →`}
            onPress={handleNext}
            size="lg"
            fullWidth
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  headerTitle: { ...Typography.display, fontSize: 20 },
  stepBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  stepItem: { alignItems: 'center', gap: 4, flex: 1, position: 'relative' },
  stepDot: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  stepNum: { ...Typography.bodyBold, fontSize: 13, color: Colors.creamDim },
  stepNumActive: { color: Colors.bg },
  stepLabel: { ...Typography.caption, fontSize: 10, color: Colors.creamDim, textAlign: 'center' },
  stepLine: {
    position: 'absolute', top: 15, left: '55%', right: '-45%',
    height: 1.5, backgroundColor: Colors.border,
  },
  errorBanner: {
    margin: Spacing.md, padding: Spacing.md,
    backgroundColor: Colors.error + '22', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.error,
  },
  errorText: { ...Typography.caption, color: Colors.error },
  section: { padding: Spacing.md, gap: Spacing.md },
  sectionTitle: { ...Typography.heading, fontSize: 22, marginBottom: 2 },
  sectionSub: { ...Typography.caption, color: Colors.creamDim, marginBottom: Spacing.sm },
  sectionSubHead: { ...Typography.label, fontSize: 11, color: Colors.gold, marginBottom: 4 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  imageTile: { width: '31%', aspectRatio: 1, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  imageTileImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: Colors.gold, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2,
  },
  coverBadgeText: { ...Typography.label, fontSize: 7, color: Colors.bg },
  removeBtn: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  addImageTile: {
    width: '31%', aspectRatio: 1, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.borderGold, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: Colors.bgCard,
  },
  addImageIcon: { fontSize: 26, color: Colors.gold },
  addImageLabel: { ...Typography.caption, fontSize: 10, color: Colors.gold },
  field: { gap: 6 },
  fieldLabel: { ...Typography.label, fontSize: 9, color: Colors.creamDim },
  input: {
    backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md,
    ...Typography.body, fontSize: 14, color: Colors.cream,
  },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.bgCard,
  },
  chipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '22' },
  chipText: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  chipTextActive: { color: Colors.gold, fontFamily: 'Inter_600SemiBold' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 4 },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleActive: { backgroundColor: Colors.gold + '55', borderColor: Colors.gold },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.gold, alignSelf: 'flex-end' },
  toggleLabel: { ...Typography.body, fontSize: 14, color: Colors.cream, flex: 1 },
  summaryCard: {
    borderRadius: Radius.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderGold, marginTop: Spacing.sm,
  },
  summaryGoldLine: { width: 32, height: 2, backgroundColor: Colors.gold, marginBottom: Spacing.md },
  summaryTitle: { ...Typography.heading, fontSize: 18, marginBottom: Spacing.md },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  summaryKey: { ...Typography.caption, fontSize: 12, color: Colors.creamDim },
  summaryVal: { ...Typography.bodySemibold, fontSize: 13, color: Colors.cream },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.bgElevated, borderTopWidth: 1,
    borderTopColor: Colors.borderGold, padding: Spacing.md, paddingBottom: 28,
  },
});
