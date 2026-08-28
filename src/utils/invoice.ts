import { Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AuthStorage } from '@/services/authStorage';
import { orderService } from '@/services/orderService';

/**
 * Downloads an authenticated PDF and hands it to the system share sheet.
 *
 * These endpoints sit behind `authenticate`, so the file cannot be opened
 * with a plain link — the request has to carry the Bearer token. It is
 * fetched to the cache directory first, then shared, which is also what
 * lets the user save it or send it on.
 */
export async function downloadFileWithAuth(url: string, fileName: string): Promise<void> {
  const token = await AuthStorage.getAccessToken();
  if (!token) throw new Error('Please sign in again to download this file.');

  const target = new File(Paths.cache, fileName);
  // A stale file from a previous attempt would be shared instead of the
  // fresh download, so clear it first.
  try {
    if (target.exists) target.delete();
  } catch {
    // Non-fatal: the download below overwrites or fails loudly on its own.
  }

  const file = await File.downloadFileAsync(url, target, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' },
  });

  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Saved', `Saved to ${file.uri}`);
    return;
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Document',
    UTI: 'com.adobe.pdf',
  });
}

export function downloadInvoice(orderId: string | number): Promise<void> {
  return downloadFileWithAuth(orderService.invoiceUrl(orderId), `paznwise-invoice-${orderId}.pdf`);
}
