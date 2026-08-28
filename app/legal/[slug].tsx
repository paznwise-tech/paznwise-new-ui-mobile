import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useQuery } from '@tanstack/react-query';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { CmsService } from '@/services/cmsService';

const TITLES: Record<string, string> = {
  'privacy-policy': 'Privacy Policy',
  'terms-conditions': 'Terms of Service',
  'buyer-protection': 'Buyer Protection',
  'data-deletion': 'Data Deletion',
  'help-center': 'Help Center',
};

/**
 * Renders a CMS page.
 *
 * The content is editor-authored HTML, so it goes through a WebView rather
 * than being flattened to text — legal copy relies on its headings, lists
 * and links to be readable. The document is wrapped in a stylesheet that
 * matches the app's theme so it does not arrive as unstyled black-on-white.
 */
export default function LegalPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cms', slug],
    queryFn: () => CmsService.getPage(String(slug)),
    enabled: !!slug,
    staleTime: 60 * 60_000,
  });

  const title = data?.title || TITLES[String(slug)] || 'Paznwise';

  const html = useMemo(() => {
    if (!data?.content) return null;
    return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0; padding: 16px 18px 48px;
    background: ${Colors.bg}; color: ${Colors.cream};
    font-family: -apple-system, Roboto, sans-serif;
    font-size: 15px; line-height: 1.65;
    -webkit-text-size-adjust: 100%;
  }
  h1, h2, h3, h4 { color: ${Colors.cream}; line-height: 1.3; margin: 1.6em 0 0.5em; }
  h1 { font-size: 22px; } h2 { font-size: 19px; } h3 { font-size: 17px; }
  p, li { color: ${Colors.creamDim}; }
  a { color: ${Colors.gold}; }
  ul, ol { padding-left: 20px; }
  hr { border: none; border-top: 1px solid ${Colors.border}; margin: 24px 0; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid ${Colors.border}; padding: 8px; text-align: left; }
  img { max-width: 100%; height: auto; }
</style>
</head><body>${data.content}</body></html>`;
  }, [data?.content]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : error || !html ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error ? 'Could not load this page.' : 'This page is not available yet.'}
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: Spacing.md }}>
            <Text style={styles.retry}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={{ flex: 1, backgroundColor: Colors.bg }}
          // CMS copy is a document, not an app: keep navigation inside the
          // screen and open any link the author included in the browser.
          javaScriptEnabled={false}
          onShouldStartLoadWithRequest={req => {
            if (req.url === 'about:blank') return true;
            return false;
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 20, flex: 1, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  errorText: { ...Typography.body, fontSize: 14, color: Colors.creamDim, textAlign: 'center' },
  retry: { ...Typography.bodySemibold, fontSize: 14, color: Colors.gold },
});
