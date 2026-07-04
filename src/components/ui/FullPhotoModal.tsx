import { Modal, View, TouchableOpacity, StyleSheet, Dimensions, Text } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

interface Props {
  uri: string | undefined;
  visible: boolean;
  onClose: () => void;
}

export function FullPhotoModal({ uri, visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </View>
        {uri ? (
          <Image source={{ uri }} style={styles.image} contentFit="contain" />
        ) : (
          <View style={styles.placeholder} />
        )}
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width,
    height: width,
  },
  placeholder: {
    width,
    height: width,
    backgroundColor: Colors.bgCard,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: { color: '#fff', fontSize: 16 },
});
