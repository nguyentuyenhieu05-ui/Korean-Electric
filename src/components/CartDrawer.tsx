import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { CartItem, Order } from '../types/store.ts';
import { formatVnd, PAYMENT_METHOD_LABEL } from '../utils/format.ts';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onOrderSuccess: (order: Order) => void;
}

export function CartDrawer({
  open,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onOrderSuccess,
}: CartDrawerProps) {
  const { profile, idToken } = useAuth();
  const [step, setStep] = useState<'cart' | 'checkout' | 'receipt'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER' | 'EWALLET'>('COD');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (profile) {
      setCustomerName((prev) => prev || profile.fullName || '');
      setCustomerEmail((prev) => prev || profile.email || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!open && step === 'receipt') {
      setStep('cart');
      setConfirmedOrder(null);
    }
  }, [open, step]);

  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal === 0 || subtotal >= 2000000 ? 0 : 45000;
  const totalAmount = subtotal + shippingFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      setError('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.');
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          shippingAddress,
          paymentMethod,
          note,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Đặt hàng không thành công.');
      }

      setConfirmedOrder(data);
      setStep('receipt');
      onOrderSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi đặt hàng, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Giỏ hàng và thanh toán"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('cart');
                }}
                aria-label="Quay lại giỏ hàng"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="font-display text-lg font-bold text-slate-900">
              {step === 'cart' && `Giỏ hàng (${items.reduce((s, i) => s + i.quantity, 0)})`}
              {step === 'checkout' && 'Thông tin thanh toán'}
              {step === 'receipt' && 'Xác nhận đơn hàng'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'cart' && (
            <>
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center py-12">
                  <ShoppingBag className="h-12 w-12 text-slate-300 stroke-[1.5]" />
                  <p className="mt-4 font-display text-base font-semibold text-slate-900">
                    Giỏ hàng của bạn đang trống
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Chọn các thiết bị công nghệ từ cửa hàng để thêm vào giỏ.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex gap-4 border-b border-slate-100 pb-4"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="h-20 w-24 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-cover"
                      />
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs text-slate-500">
                              {item.brand} · {item.sku}
                            </div>
                            <h3 className="truncate text-sm font-semibold text-slate-900">
                              {item.name}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.productId)}
                            aria-label={`Xóa ${item.name}`}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center rounded-md border border-slate-200">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQuantity(item.productId, item.quantity - 1)
                              }
                              aria-label="Giảm số lượng"
                              className="flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center font-mono text-xs font-semibold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={item.quantity >= item.stock}
                              onClick={() =>
                                onUpdateQuantity(item.productId, item.quantity + 1)
                              }
                              aria-label="Tăng số lượng"
                              className="flex h-7 w-7 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                            {formatVnd(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  Họ và tên người nhận *
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn An"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Số điện thoại *
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0901 234 567"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Email nhận hóa đơn
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Địa chỉ giao hàng chi tiết *
                  <textarea
                    rows={2}
                    required
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Ghi chú đơn hàng
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Giao giờ hành chính, gọi trước khi đến..."
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </label>
              </div>

              <div className="space-y-2.5 pt-2">
                <span className="block text-sm font-medium text-slate-700">
                  Phương thức thanh toán
                </span>
                {(['COD', 'BANK_TRANSFER', 'EWALLET'] as const).map((method) => (
                  <label
                    key={method}
                    className={`flex items-center gap-3 rounded-lg border p-3.5 text-sm cursor-pointer transition-colors ${
                      paymentMethod === method
                        ? 'border-blue-600 bg-blue-50/50 text-slate-900 font-medium'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="accent-blue-600"
                    />
                    <span>{PAYMENT_METHOD_LABEL[method]}</span>
                  </label>
                ))}
              </div>
            </form>
          )}

          {step === 'receipt' && confirmedOrder && (
            <div className="space-y-6 py-4">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <div className="font-display text-base font-bold text-slate-900">
                    Đơn hàng #{confirmedOrder.orderCode} đã được ghi nhận
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    Trạng thái: Chờ xác nhận — Đang chuẩn bị hàng. Vui lòng lưu lại mã đơn{' '}
                    <span className="font-mono font-semibold text-slate-900">
                      {confirmedOrder.orderCode}
                    </span>{' '}
                    để tra cứu trạng thái giao hàng.
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Người nhận</span>
                  <span className="font-medium text-slate-900">
                    {confirmedOrder.customerName} · {confirmedOrder.customerPhone}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 shrink-0">Địa chỉ</span>
                  <span className="text-right text-slate-900">
                    {confirmedOrder.shippingAddress}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thanh toán</span>
                  <span className="text-slate-900">
                    {PAYMENT_METHOD_LABEL[confirmedOrder.paymentMethod] || confirmedOrder.paymentMethod}
                  </span>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-4">
                {confirmedOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-700">
                      {item.productName}{' '}
                      <span className="font-mono text-xs text-slate-500">
                        ×{item.quantity}
                      </span>
                    </span>
                    <span className="font-mono font-medium tabular-nums text-slate-900">
                      {formatVnd(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                  <span>Tổng thanh toán</span>
                  <span className="font-mono tabular-nums">
                    {formatVnd(confirmedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {step === 'cart' && items.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 p-6 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính</span>
                <span className="font-mono tabular-nums">{formatVnd(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Phí vận chuyển</span>
                <span className="font-mono tabular-nums">
                  {shippingFee === 0 ? 'Miễn phí' : formatVnd(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>Tổng cộng</span>
                <span className="font-mono tabular-nums">{formatVnd(totalAmount)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep('checkout')}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 cursor-pointer"
            >
              Tiến hành đặt hàng
            </button>
          </div>
        )}

        {step === 'checkout' && (
          <div className="border-t border-slate-200 bg-slate-50 p-6 space-y-4">
            <div className="flex items-center justify-between text-base font-bold text-slate-900">
              <span>Tổng thanh toán ({items.length} dòng)</span>
              <span className="font-mono tabular-nums">{formatVnd(totalAmount)}</span>
            </div>
            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Đang xử lý đơn hàng...' : 'Xác nhận đặt hàng'}
            </button>
          </div>
        )}

        {step === 'receipt' && (
          <div className="border-t border-slate-200 bg-slate-50 p-6">
            <button
              type="button"
              onClick={() => {
                setStep('cart');
                setConfirmedOrder(null);
                onClose();
              }}
              className="w-full rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
            >
              Tiếp tục mua sắm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
