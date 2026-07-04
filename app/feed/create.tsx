import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { GoldButton } from '@/components/ui/GoldButton';
import { FeedService, PickedImage } from '@/services/feedService';

export default function CreateFeedPost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [images, setImages] = useState<PickedImage[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('');
  const [tags, setTags] = useState('');

  const pickImages = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 10,
    });
    if (!result.canceled && result.assets.length > 0) {
      const picked: PickedImage[] = result.assets.map((a, i) => ({
        uri: a.uri,
        name: a.fileName ?? `post_${Date.now()}_${i}.jpg`,
        type: a.mimeType ?? 'image/jpeg',
      }));
      setImages(prev => [...prev, ...picked].slice(0, 10));
    }
  }, []);

  const removeImage = useCallback((uri: string) => {
    setImages(prev => prev.filter(i => i.uri !== uri));
  }, []);

  const handleSubmit = async () => {
    if (images.length === 0) {
      Alert.alert('Image required', 'Please add at least one image to your post.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await FeedService.createPost({
        images,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        style: style.trim() || undefined,
        tags: tags.trim() || undefined,
      });
      Alert.alert('Posted!', 'Your post has been shared.', [
        { text: 'View My Posts', onPress: () => router.replace('/feed/my-posts' as any) },
      ]);
    } catch (err: any) {
      const msg = err.message || 'Failed to create post. Please try again.';
      setError(msg);
      Alert.alert('Post Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          {/* Images */}
          <Text style={styles.sectionTitle}>Photos</Text>
          <Text style={styles.sectionSub}>Add up to 10 images. At least one is required.</Text>

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
            {images.length < 10 && (
              <TouchableOpacity style={styles.addImageTile} onPress={pickImages}>
                <Text style={styles.addImageIcon}>+</Text>
                <Text style={styles.addImageLabel}>{images.length === 0 ? 'Add Photos' : 'Add More'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>TITLE</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Give your post a title…"
              placeholderTextColor={Colors.creamFaint}
              style={styles.input}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>DESCRIPTION</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your artwork, technique, inspiration…"
              placeholderTextColor={Colors.creamFaint}
              multiline
              style={[styles.input, styles.inputMulti]}
            />
          </View>

          {/* Style */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>STYLE</Text>
            <TextInput
              value={style}
              onChangeText={setStyle}
              placeholder="e.g. Impressionism, Abstract, Realism…"
              placeholderTextColor={Colors.creamFaint}
              style={styles.input}
            />
          </View>

          {/* Tags */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>TAGS (comma separated)</Text>
            <TextInput
              value={tags}
              onChangeText={setTags}
              placeholder="e.g. sunset, ocean, art"
              placeholderTextColor={Colors.creamFaint}
              style={styles.input}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {loading ? (
          <ActivityIndicator color={Colors.gold} size="large" />
        ) : (
          <GoldButton
            label="Share Post"
            onPress={handleSubmit}
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
  errorBanner: {
    margin: Spacing.md, padding: Spacing.md,
    backgroundColor: Colors.error + '22', borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.error,
  },
  errorText: { ...Typography.caption, color: Colors.error },
  section: { padding: Spacing.md, gap: Spacing.md },
  sectionTitle: { ...Typography.heading, fontSize: 22, marginBottom: 2 },
  sectionSub: { ...Typography.caption, color: Colors.creamDim, marginBottom: Spacing.sm },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  imageTile: {
    width: '31%', aspectRatio: 1, borderRadius: Radius.md,
    overflow: 'hidden', position: 'relative',
  },
  imageTileImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: Colors.gold, borderRadius: 3,
    paddingHorizontal: 5, paddingVertical: 2,
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
  inputMulti: { minHeight: 100, textAlignVertical: 'top' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.bgElevated, borderTopWidth: 1,
    borderTopColor: Colors.borderGold, padding: Spacing.md, paddingBottom: 28,
  },
});
