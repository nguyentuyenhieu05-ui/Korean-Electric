import React, { useEffect, useState } from 'react';
import { PackageSearch, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { Order } from '../types/store.ts';
import {
  formatDateTime,
  formatVnd,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
} from '../utils/format.ts';

function getStatusColorClass(status: string): string {
  switch (status) {
    case 'delivered':
      return 'text-emerald-700';
    case 'shipping':
    case 'confirmed':
      return 'text-blue-700';
    case 'cancelled':
      return 'text-red-600';
    default:
      return 'text-amber-700';
  }
}

export function OrdersView() {
  const { firebaseUser, idToken, loginWithGoogle } = useAuth();
  const [lookupCode, setLookupCode] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResult, setLookupResult] = useState<Order | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loadingMyOrders, setLoadingMyOrders] = useState(false);
  const [myOrdersError, setMyOrdersError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadMyOrders = async (token: string) => {
    setLoadingMyOrders(true);
    setMyOrdersError(null);
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể tải lịch sử đơn hàng.');
      }
      setMyOrders(data);
    } catch (err: any) {
      setMyOrdersError(err.message || 'Lỗi tải dữ liệu.');
    } finally {
      setLoadingMyOrders(false);
    }
  };

  useEffect(() => {
    if (idToken) {
      loadMyOrders(idToken);
    } else {
      setMyOrders([]);
    }
  }, [idToken]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookupResult(null);

    if (!lookupCode.trim() || !lookupPhone.trim()) {
      setLookupError('Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại.');
      return;
    }

    setLookupLoading(true);
    try {
      const params = new URLSearchParams({
        code: lookupCode.trim(),
        phone: lookupPhone.trim(),
      });
      const res = await fetch(`/api/orders/lookup?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không tìm thấy đơn hàng.');
      }
      setLookupResult(data);
    } catch (err: any) {
      setLookupError(err.message || 'Tra cứu thất bại.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!idToken) return;
    setCancellingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể hủy đơn hàng.');
      }
      setMyOrders((prev) =>
        prev.map((o) => (o.id === orderId ? data : o))
      );
    } catch (err: any) {
      setMyOrdersError(err.message || 'Lỗi hủy đơn hàng.');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-12">
      {/* Guest & Public Lookup */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Tra cứu đơn hàng
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Nhập mã đơn hàng (ví dụ: KR-10249210) và số điện thoại đặt hàng để kiểm tra trạng thái vận chuyển.
          </p>
        </div>

        <form
          onSubmit={handleLookup}
          className="mt-6 grid gap-3 sm:grid-cols-12"
        >
          <input
            type="text"
            value={lookupCode}
            onChange={(e) => setLookupCode(e.target.value)}
            placeholder="Mã đơn hàng (KR-...)"
            className="sm:col-span-5 rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
          />
          <input
            type="tel"
            value={lookupPhone}
            onChange={(e) => setLookupPhone(e.target.value)}
            placeholder="Số điện thoại đặt hàng"
            className="sm:col-span-4 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={lookupLoading}
            className="sm:col-span-3 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Search className="h-4 w-4" />
            <span>{lookupLoading ? 'Đang tìm...' : 'Tra cứu'}</span>
          </button>
        </form>

        {lookupError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {lookupError}
          </div>
        )}

        {lookupResult && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <OrderReceiptCard order={lookupResult} />
          </div>
        )}
      </section>

      {/* Authenticated User Order History */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-xl font-bold text-slate-900">
            Lịch sử đơn hàng của bạn
          </h2>
          {!firebaseUser && (
            <button
              type="button"
              onClick={loginWithGoogle}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              Đăng nhập Google để xem lịch sử
            </button>
          )}
        </div>

        {firebaseUser && loadingMyOrders && (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-xl bg-white border border-slate-200" />
            <div className="h-28 animate-pulse rounded-xl bg-white border border-slate-200" />
          </div>
        )}

        {myOrdersError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {myOrdersError}
          </div>
        )}

        {firebaseUser && !loadingMyOrders && myOrders.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <PackageSearch className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              Bạn chưa có đơn hàng nào được ghi nhận trên tài khoản này.
            </p>
          </div>
        )}

        {firebaseUser && myOrders.length > 0 && (
          <div className="space-y-4">
            {myOrders.map((order) => (
              <OrderReceiptCard
                key={order.id}
                order={order}
                onCancel={
                  order.status === 'pending'
                    ? () => handleCancelOrder(order.id)
                    : undefined
                }
                cancelling={cancellingId === order.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function OrderReceiptCard({
  order,
  onCancel,
  cancelling,
}: {
  order: Order;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono font-bold text-slate-900">
            #{order.orderCode}
          </span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="text-slate-500">{formatDateTime(order.createdAt)}</span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="text-slate-600">
            {PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span
            className={`text-sm font-semibold ${getStatusColorClass(order.status)}`}
          >
            {ORDER_STATUS_LABEL[order.status] || order.status}
          </span>
          {onCancel && (
            <button
              type="button"
              disabled={cancelling}
              onClick={onCancel}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
            >
              {cancelling ? 'Đang hủy...' : 'Hủy đơn'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={item.imageUrl}
                alt={item.productName}
                referrerPolicy="no-referrer"
                className="h-12 w-14 shrink-0 rounded-md border border-slate-200 bg-slate-100 object-cover"
              />
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-900">
                  {item.productName}
                </div>
                <div className="font-mono text-xs text-slate-500">
                  {item.productSku} · SL: {item.quantity}
                </div>
              </div>
            </div>
            <div className="font-mono font-medium tabular-nums text-slate-900 shrink-0">
              {formatVnd(item.unitPrice * item.quantity)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-sm">
        <div className="text-slate-600">
          Giao tới: <span className="text-slate-900">{order.shippingAddress}</span>
        </div>
        <div className="font-mono text-base font-bold tabular-nums text-slate-900">
          Tổng: {formatVnd(order.totalAmount)}
        </div>
      </div>
    </article>
  );
}
