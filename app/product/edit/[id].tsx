import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { ProductService } from '@/services/productService';
import { useProductDetail } from '@/hooks/useProducts';
import { ProductType, ProductStatus, EditionType, ShippingPreference } from '@/types';

type PickedImage = { uri: string; name: string; type: string; isExisting?: boolean };

export default function EditProduct() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { product, loading: loadingProduct, error: fetchError } = useProductDetail(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Images — existing ones shown as previews, new ones appended
  const [images, setImages] = useState<PickedImage[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [stock, setStock] = useState('');
  const [productType, setProductType] = useState<ProductType>('PHYSICAL');
  const [status, setStatus] = useState<ProductStatus>('PUBLISHED');
  const [sku, setSku] = useState('');
  const [brand, setBrand] = useState('');
  const [medium, setMedium] = useState('');
  const [artStyle, setArtStyle] = useState('');
  const [yearCreated, setYearCreated] = useState('');
  const [editionType, setEditionType] = useState<EditionType | ''>('');
  const [includeCertificate, setIncludeCertificate] = useState(false);
  const [tags, setTags] = useState('');
  const [weight, setWeight] = useState('');
  const [dimLength, setDimLength] = useState('');
  const [dimWidth, setDimWidth] = useState('');
  const [dimHeight, setDimHeight] = useState('');
  const [dimUnit, setDimUnit] = useState<'cm' | 'in'>('cm');
  const [shippingCharge, setShippingCharge] = useState('');
  const [shippingPreference, setShippingPreference] = useState<ShippingPreference>('FREE_SHIPPING');
  const [cashOnDelivery, setCashOnDelivery] = useState(true);
  const [returnPolicy, setReturnPolicy] = useState('');
  const [warranty, setWarranty] = useState('');

  // Populate form when product loads
  useEffect(() => {
    if (!product) return;
    setTitle(product.title ?? '');
    setDescription(product.description ?? '');
    setPrice(product.price?.toString() ?? '');
    setComparePrice(product.comparePrice?.toString() ?? '');
    setStock(product.stock?.toString() ?? '');
    setProductType(product.productType ?? 'PHYSICAL');
    setStatus(product.status ?? 'PUBLISHED');
    setSku(product.sku ?? '');
    setBrand(product.brand ?? '');
    setMedium(product.medium ?? '');
    setArtStyle(product.artStyle ?? '');
    setYearCreated(product.yearCreated?.toString() ?? '');
    setEditionType((product.editionType as EditionType | '') ?? '');
    setIncludeCertificate(product.includeCertificate ?? false);
    setTags(product.tags?.join(', ') ?? '');
    setWeight(product.weight?.toString() ?? '');
    setDimLength(product.dimensions?.length?.toString() ?? '');
    setDimWidth(product.dimensions?.width?.toString() ?? '');
    setDimHeight(product.dimensions?.height?.toString() ?? '');
    setDimUnit((product.dimensions?.unit as 'cm' | 'in') ?? 'cm');
    setShippingCharge(product.shippingCharge?.toString() ?? '');
    setShippingPreference((product.shippingPreference as ShippingPreference) ?? 'FREE_SHIPPING');
    setCashOnDelivery(product.cashOnDelivery ?? true);
    setReturnPolicy(product.returnPolicy ?? '');
    setWarranty(product.warranty ?? '');

    // Load existing images as preview tiles
    const existing = (product.productImages ?? product.images ?? []).map(uri => ({
      uri, name: '', type: 'image/jpeg', isExisting: true,
    }));
    setImages(existing);
  }, [product]);

  const pickImages = useCallback(async () => {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
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
        isExisting: false,
      }));
      setImages(prev => [...prev, ...picked].slice(0, 6));
    }
  }, []);

  const removeImage = useCallback((uri: string) => {
    setImages(prev => prev.filter(i => i.uri !== uri));
  }, []);

  const submitUpdate = async () => {
    if (!title.trim() || !price || !stock) {
      Alert.alert('Required fields', 'Please fill in title, price, and stock.');
      return;
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
      formData.append('status', status);

      // Only append new (non-existing) images
      const newImages = images.filter(i => !i.isExisting);
      newImages.forEach(img => {
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
      if (shippingCharge) formData.append('shippingCharge', shippingCharge);
      formData.append('shippingPreference', shippingPreference);
      formData.append('cashOnDelivery', String(cashOnDelivery));
      if (returnPolicy)   formData.append('returnPolicy', returnPolicy.trim());
      if (warranty)       formData.append('warranty', warranty.trim());

      const res = await ProductService.updateProduct(id, formData);
      if (res.success) {
        Alert.alert('Updated', 'Your listing has been updated.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        setError('Update failed. Please try again.');
      }
    } catch (err: any) {
      const msg: string = err.message || 'An error occurred.';
      if (msg.toLowerCase().includes('limit exceeded') || msg.toLowerCase().includes('tier')) {
        Alert.alert('Plan Limit Reached', msg + '\n\nUpgrade your plan to manage more listings.', [{ text: 'OK' }]);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingProduct) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (fetchError || !product) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.error, marginBottom: Spacing.md }}>{fetchError || 'Product not found'}</Text>
        <GoldButton label="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Listing</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          {/* Status */}
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.chipRow}>
            {(['PUBLISHED', 'DRAFT', 'OUT_OF_STOCK'] as ProductStatus[]).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, status === s && styles.chipActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                  {s.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Photos */}
          <Text style={styles.sectionTitle}>Photos</Text>
          <Text style={styles.sectionSub}>Tap × to remove. Tap "+ Add" to upload new photos.</Text>
          <View style={styles.imageGrid}>
            {images.map((img, idx) => (
              <View key={img.uri} style={styles.imageTile}>
                <Image source={{ uri: img.uri }} style={styles.imageTileImg} contentFit="cover" />
                {idx === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>COVER</Text>
                  </View>
                )}
                {!img.isExisting && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
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
                <Text style={styles.addImageLabel}>Add Photos</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Basic fields */}
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>TITLE *</Text>
            <TextInput value={title} onChangeText={setTitle} placeholderTextColor={Colors.creamFaint} style={styles.input} />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <TextInput value={description} onChangeText={setDescription} multiline placeholderTextColor={Colors.creamFaint} style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>PRICE (₹) *</Text>
              <TextInput value={price} onChangeText={setPrice} keyboardType="numeric" placeholderTextColor={Colors.creamFaint} style={styles.input} />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>COMPARE PRICE (₹)</Text>
              <TextInput value={comparePrice} onChangeText={setComparePrice} keyboardType="numeric" placeholderTextColor={Colors.creamFaint} style={styles.input} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>STOCK *</Text>
              <TextInput value={stock} onChangeText={setStock} keyboardType="numeric" placeholderTextColor={Colors.creamFaint} style={styles.input} />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>SKU</Text>
              <TextInput value={sku} onChangeText={setSku} placeholderTextColor={Colors.creamFaint} style={styles.input} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>BRAND / STUDIO</Text>
              <TextInput value={brand} onChangeText={setBrand} placeholderTextColor={Colors.creamFaint} style={styles.input} />
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
              <TextInput value={yearCreated} onChangeText={setYearCreated} keyboardType="numeric" placeholderTextColor={Colors.creamFaint} style={styles.input} />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>TAGS</Text>
              <TextInput value={tags} onChangeText={setTags} placeholder="oil, abstract" placeholderTextColor={Colors.creamFaint} style={styles.input} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>EDITION TYPE</Text>
            <View style={styles.chipRow}>
              {(['', 'LIMITED_EDITION', 'OPEN_EDITION', 'UNIQUE'] as const).map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.chip, editionType === e && styles.chipActive]}
                  onPress={() => setEditionType(e as EditionType | '')}
                >
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

          <View style={styles.divider} />
          <Text style={styles.sectionSubHead}>Shipping & Policies</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>SHIPPING PREFERENCE</Text>
            <View style={styles.chipRow}>
              {(['FREE_SHIPPING', 'BUYER_PAYS_SHIPPING', 'LOCAL_PICKUP'] as ShippingPreference[]).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, shippingPreference === s && styles.chipActive]}
                  onPress={() => setShippingPreference(s)}
                >
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
              <TextInput value={shippingCharge} onChangeText={setShippingCharge} keyboardType="numeric" placeholderTextColor={Colors.creamFaint} style={styles.input} />
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
            <TextInput value={returnPolicy} onChangeText={setReturnPolicy} placeholder="e.g. 7-day return window" multiline placeholderTextColor={Colors.creamFaint} style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WARRANTY</Text>
            <TextInput value={warranty} onChangeText={setWarranty} placeholder="e.g. 1-year quality guarantee" placeholderTextColor={Colors.creamFaint} style={styles.input} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {loading ? (
          <ActivityIndicator color={Colors.gold} />
        ) : (
          <GoldButton label="Save Changes" onPress={submitUpdate} size="lg" fullWidth />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  headerTitle: { ...Typography.display, fontSize: 20 },
  errorBanner: {
    margin: Spacing.md, padding: Spacing.md,
    backgroundColor: Colors.error + '22', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.error,
  },
  errorText: { ...Typography.caption, color: Colors.error },
  section: { padding: Spacing.md, gap: Spacing.md },
  sectionTitle: { ...Typography.heading, fontSize: 20 },
  sectionSub: { ...Typography.caption, color: Colors.creamDim, marginTop: -8 },
  sectionSubHead: { ...Typography.label, fontSize: 11, color: Colors.gold },
  divider: { height: 1, backgroundColor: Colors.border },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  imageTile: { width: '31%', aspectRatio: 1, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  imageTileImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: Colors.gold, borderRadius: 3,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  coverBadgeText: { ...Typography.label, fontSize: 7, color: Colors.bg },
  newBadge: {
    position: 'absolute', bottom: 4, right: 24,
    backgroundColor: Colors.success ?? '#4CAF50', borderRadius: 3,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  newBadgeText: { ...Typography.label, fontSize: 7, color: '#fff' },
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
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.bgElevated, borderTopWidth: 1,
    borderTopColor: Colors.borderGold, padding: Spacing.md, paddingBottom: 28,
  },
});
