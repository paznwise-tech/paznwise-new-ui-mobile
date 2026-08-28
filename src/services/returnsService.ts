import { fetchApi } from './api';

/**
 * Returns and refunds — src/returns/returns.routes.js (clientRouter),
 * all behind `authenticate`.
 *
 * A return is raised against specific order *items*, not a whole order:
 * each line carries its own quantity, reason and evidence photos.
 */

export type ReturnStatus =
  | 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
  | 'PICKUP_SCHEDULED' | 'PICKUP_IN_PROGRESS' | 'PICKED_UP'
  | 'RECEIVED_AT_WAREHOUSE' | 'QC_IN_PROGRESS' | 'QC_PASSED' | 'QC_FAILED'
  | 'RESOLUTION_IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ResolutionType = 'REFUND' | 'REPLACEMENT' | 'EXCHANGE';

/** Mirrors the Joi enum in src/returns/returns.validation.js. */
export const REASON_CATEGORIES = [
  { value: 'DAMAGED_IN_TRANSIT',       label: 'Damaged in transit' },
  { value: 'DEFECTIVE_PRODUCT',        label: 'Defective product' },
  { value: 'WRONG_ITEM_DELIVERED',     label: 'Wrong item delivered' },
  { value: 'NOT_AS_DESCRIBED',         label: 'Not as described' },
  { value: 'SIZE_FIT_ISSUE',           label: 'Size or fit issue' },
  { value: 'QUALITY_NOT_EXPECTED',     label: 'Quality not as expected' },
  { value: 'MISSING_PARTS_ACCESSORIES',label: 'Missing parts or accessories' },
  { value: 'LATE_DELIVERY',            label: 'Delivered too late' },
  { value: 'CHANGED_MIND',             label: 'Changed my mind' },
  { value: 'OTHER',                    label: 'Something else' },
] as const;

export type ReasonCategory = (typeof REASON_CATEGORIES)[number]['value'];

export interface ReturnItemInput {
  orderItemId: string;
  quantity: number;
  reasonCategory: ReasonCategory;
  reasonNote?: string;
  customerImages?: string[];
}

export interface CreateReturnPayload {
  orderId: string;
  resolutionType: ResolutionType;
  items: ReturnItemInput[];
}

export interface ReturnRequestItem {
  id: string;
  orderItemId: string;
  quantity: number;
  reasonCategory: string;
  reasonNote?: string | null;
  customerImages?: string[];
  refundAmount?: number | string | null;
  qcResult?: string;
  orderItem?: { productName?: string; title?: string; price?: number | string };
}

export interface ReturnRequest {
  id: string;
  requestRef: string;
  orderId: string;
  status: ReturnStatus;
  resolutionType: ResolutionType;
  rejectionReason?: string | null;
  adminNotes?: string | null;
  requestedAt: string;
  completedAt?: string | null;
  items: ReturnRequestItem[];
  pickup?: {
    courierProvider?: string;
    awbNumber?: string;
    scheduledDate?: string;
    status?: string;
  } | null;
  refundTransactions?: Array<{
    id: string;
    amount: number | string;
    status: string;
    createdAt?: string;
  }>;
  replacementOrder?: { id: string; status?: string } | null;
  statusHistory?: Array<{ status: string; createdAt: string; note?: string | null }>;
}

function unwrap(res: any): any {
  return res?.data ?? res;
}

export const ReturnsService = {
  /**
   * Uploads one evidence photo and returns its URL, which is then submitted
   * inside the return payload. Images are uploaded before the request is
   * created, so the create call carries URLs rather than binary.
   * Server limit is 5 MB per file.
   */
  async uploadImage(uri: string, fileName = 'evidence.jpg'): Promise<string> {
    const form = new FormData();
    form.append('image', {
      uri,
      name: fileName,
      type: 'image/jpeg',
    } as unknown as Blob);

    const res = await fetchApi<any>('/returns/upload', {
      method: 'POST',
      requiresAuth: true,
      body: form,
    });
    const url = res?.url ?? res?.data?.url;
    if (!url) throw new Error('Upload did not return an image URL.');
    return url;
  },

  async createReturn(payload: CreateReturnPayload): Promise<ReturnRequest> {
    const res = await fetchApi<any>('/returns', {
      method: 'POST',
      requiresAuth: true,
      body: JSON.stringify(payload),
    });
    return unwrap(res) as ReturnRequest;
  },

  async getMyReturns(): Promise<ReturnRequest[]> {
    const res = await fetchApi<any>('/returns', { requiresAuth: true });
    const data = unwrap(res);
    return Array.isArray(data) ? data : (data?.items ?? data?.returns ?? []);
  },

  async getReturnById(id: string): Promise<ReturnRequest> {
    const res = await fetchApi<any>(`/returns/${id}`, { requiresAuth: true });
    return unwrap(res) as ReturnRequest;
  },

  async cancelReturn(id: string): Promise<void> {
    await fetchApi(`/returns/${id}/cancel`, { method: 'POST', requiresAuth: true });
  },
};

/** Statuses at which the buyer can still withdraw the request. */
export const CANCELLABLE_RETURN_STATUSES: ReturnStatus[] = [
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'PICKUP_SCHEDULED',
];

export function returnStatusLabel(status: string): string {
  return status
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}
