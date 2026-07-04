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
import { FeedService, PickedImage } from '@/services/feedService';

type ImageItem = { uri: string; name: string; type: string; isExisting?: boolean };

export default function EditFeedPost() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = parseInt(id, 10);

  const [loadingPost, setLoadingPost] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<ImageItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    FeedService.getPostById(postId)
      .then(post => {
        setTitle(post.title ?? '');
        setDescription(post.description ?? '');
        setStyle(post.style ?? '');
        setTags(post.tags?.join(', ') ?? '');
        setExistingImages(post.imageUrls ?? []);
      })
      .catch(err => setFetchError(err.message || 'Failed to load post'))
      .finally(() => setLoadingPost(false));
  }, [postId]);

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
      const picked: ImageItem[] = result.assets.map((a, i) => ({
        uri: a.uri,
        name: a.fileName ?? `post_${Date.now()}_${i}.jpg`,
        type: a.mimeType ?? 'image/jpeg',
        isExisting: false,
      }));
      setNewImages(prev => [...prev, ...picked].slice(0, 10));
    }
  }, []);

  const removeNew = useCallback((uri: string) => {
    setNewImages(prev => prev.filter(i => i.uri !== uri));
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      const images: PickedImage[] = newImages.map(i => ({
        uri: i.uri, name: i.name, type: i.type,
      }));
      await FeedService.updatePost(postId, {
        images: images.length > 0 ? images : undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        style: style.trim() || undefined,
        tags: tags.trim() || undefined,
      });
      Alert.alert('Updated!', 'Your post has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err.message || 'Failed to update post.';
      setError(msg);
      Alert.alert('Update Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingPost) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.error, marginBottom: Spacing.md }}>{fetchError}</Text>
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
          <Text style={styles.headerTitle}>Edit Post</Text>
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
          {/* Existing images (read-only preview) */}
          {existingImages.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Current Photos</Text>
              <Text style={styles.sectionSub}>Existing images. Upload new photos below to replace them.</Text>
              <View style={styles.imageGrid}>
                {existingImages.map((uri, idx) => (
                  <View key={uri + idx} style={styles.imageTile}>
                    <Image source={{ uri }} style={styles.imageTileImg} contentFit="cover" />
                    {idx === 0 && (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>COVER</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* New images */}
          <Text style={styles.sectionTitle}>New Photos</Text>
          <Text style={styles.sectionSub}>
            {newImages.length === 0
              ? 'Add new images to replace the current ones (optional).'
              : `${newImages.length} new image(s) will replace the existing ones.`}
          </Text>
          <View style={styles.imageGrid}>
            {newImages.map((img, idx) => (
              <View key={img.uri} style={styles.imageTile}>
                <Image source={{ uri: img.uri }} style={styles.imageTileImg} contentFit="cover" />
                {idx === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>COVER</Text>
                  </View>
                )}
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeNew(img.uri)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {newImages.length < 10 && (
              <TouchableOpacity style={styles.addImageTile} onPress={pickImages}>
                <Text style={styles.addImageIcon}>+</Text>
                <Text style={styles.addImageLabel}>{newImages.length === 0 ? 'Add Photos' : 'Add More'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Fields */}
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
          <GoldButton label="Save Changes" onPress={handleSave} size="lg" fullWidth />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg,
  },
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
  sectionTitle: { ...Typography.heading, fontSize: 18 },
  sectionSub: { ...Typography.caption, color: Colors.creamDim, marginTop: -8 },
  divider: { height: 1, backgroundColor: Colors.border },
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
  newBadge: {
    position: 'absolute', bottom: 4, right: 24,
    backgroundColor: Colors.success, borderRadius: 3,
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
  inputMulti: { minHeight: 100, textAlignVertical: 'top' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.bgElevated, borderTopWidth: 1,
    borderTopColor: Colors.borderGold, padding: Spacing.md, paddingBottom: 28,
  },
});
