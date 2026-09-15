import { useState } from 'react';
import { Image, type ImageProps } from 'expo-image';
import { DEFAULT_IMAGE } from '@/utils/imageUrl';

type Props = Omit<ImageProps, 'source'> & {
  uri?: string | null;
  /** Shown when the uri is empty or the load fails. */
  fallback?: string;
};

/**
 * Remote image with caching and a visible failure state.
 *
 * Two things a bare `<Image>` does not do here:
 *
 * Caching. expo-image defaults to a disk cache only, so a scrolling list
 * re-decodes every bitmap it passes. The originals in this bucket are large —
 * unresized, and until recently served with no Cache-Control at all — so the
 * cost of getting that wrong is high.
 *
 * Failure. A remote image that 404s or times out renders as an empty box with
 * no indication anything was meant to be there, which is what "images are not
 * displaying" looks like from the outside. Falling back to the placeholder at
 * least shows the frame.
 */
export function RemoteImage({ uri, fallback = DEFAULT_IMAGE, ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  const source = !uri || failed ? fallback : uri;

  return (
    <Image
      {...rest}
      source={{ uri: source }}
      cachePolicy="memory-disk"
      // Keeps the frame occupied while the bytes arrive.
      placeholder={{ uri: DEFAULT_IMAGE }}
      placeholderContentFit="contain"
      // `recyclingKey` tells expo-image to drop the previous bitmap when a
      // list row is reused, instead of briefly showing the wrong image.
      recyclingKey={uri ?? 'placeholder'}
      onError={() => setFailed(true)}
    />
  );
}
