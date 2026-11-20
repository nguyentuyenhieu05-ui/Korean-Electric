import React, { useEffect, useState } from 'react';
import { Cpu, Minus, Plus, Star, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { Product } from '../types/store.ts';
import { formatDateTime, formatVnd, parseSpecs } from '../utils/format.ts';

interface ProductDetailModalProps {
  productId: number | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export function ProductDetailModal({
  productId,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const { firebaseUser, idToken, loginWithGoogle } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuantity(1);
    setImgError(false);
    setReviewMessage(null);

    fetch(`/api/products/${productId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Không thể tải thông tin sản phẩm.');
        }
        return res.json();
      })
      .then((data: Product) => {
        if (!cancelled) {
          setProduct(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Lỗi tải dữ liệu.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!productId) return null;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !idToken) return;
    if (comment.trim().length < 3) {
      setReviewMessage('Vui lòng nhập nội dung đánh giá tối thiểu 3 ký tự.');
      return;
    }

    setSubmittingReview(true);
    setReviewMessage(null);

    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể gửi đánh giá.');
      }
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              reviews: [data, ...(prev.reviews || [])],
            }
          : prev
      );
      setComment('');
      setRating(5);
      setReviewMessage('Đã đăng đánh giá của bạn.');
    } catch (err: any) {
      setReviewMessage(err.message || 'Gửi đánh giá thất bại.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const specs = product ? parseSpecs(product.specsJson) : [];
  const outOfStock = product ? product.stock <= 0 : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết sản phẩm"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <div className="text-xs font-medium text-slate-500">
            {product ? `${product.brand} · ${product.categoryName} · SKU ${product.sku}` : 'Chi tiết thiết bị'}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết sản phẩm"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 lg:p-8">
          {loading && (
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="aspect-[4/3] animate-pulse rounded-xl bg-slate-100" />
              <div className="space-y-4">
                <div className="h-6 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-8 w-1/3 animate-pulse rounded bg-slate-100" />
                <div className="h-24 w-full animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && product && (
            <div className="space-y-10">
              <div className="grid gap-8 lg:grid-cols-12 items-start">
                <div className="lg:col-span-6">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 aspect-[4/3]">
                    {!imgError ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        onError={() => setImgError(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500">
                        <Cpu className="h-10 w-10" />
                        <span className="text-sm">{product.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contiguous purchase module */}
                <div className="lg:col-span-6 space-y-5">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold uppercase tracking-wide text-blue-600">
                        {product.brand}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{product.categoryName}</span>
                      {product.badge && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-900 font-medium">{product.badge}</span>
                        </>
                      )}
                    </div>
                    <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 sm:text-3xl text-balance">
                      {product.name}
                    </h2>
                  </div>

                  <div className="flex items-baseline gap-3 border-y border-slate-200 py-4">
                    <span className="font-mono text-2xl font-bold tabular-nums text-slate-900">
                      {formatVnd(product.price)}
                    </span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="font-mono text-sm tabular-nums text-slate-400 line-through">
                        {formatVnd(product.originalPrice)}
                      </span>
                    )}
                    <span className="ml-auto text-xs font-medium tabular-nums text-slate-600">
                      {outOfStock ? 'Hết hàng' : `Sẵn kho: ${product.stock} chiếc`}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-600">
                    {product.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
                      <button
                        type="button"
                        disabled={quantity <= 1 || outOfStock}
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        aria-label="Giảm số lượng"
                        className="flex h-10 w-10 items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center font-mono text-sm font-semibold tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        disabled={quantity >= product.stock || outOfStock}
                        onClick={() =>
                          setQuantity((q) => Math.min(product.stock, q + 1))
                        }
                        aria-label="Tăng số lượng"
                        className="flex h-10 w-10 items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={() => {
                        onAddToCart(product, quantity);
                        onClose();
                      }}
                      className="flex-1 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap cursor-pointer"
                    >
                      {outOfStock ? 'Tạm hết hàng' : 'Thêm vào giỏ hàng'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-600">
                    <div className="rounded-lg bg-slate-50 p-3">
                      Bảo hành chính hãng 24 tháng tại trung tâm ủy quyền
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      Miễn phí giao hàng cho đơn từ 2.000.000₫
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical specifications */}
              {specs.length > 0 && (
                <section className="border-t border-slate-200 pt-8">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Thông số kỹ thuật
                  </h3>
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-slate-200">
                        {specs.map(([key, value], idx) => (
                          <tr
                            key={key}
                            className={idx % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'}
                          >
                            <th className="w-1/3 px-4 py-3 font-medium text-slate-600">
                              {key}
                            </th>
                            <td className="px-4 py-3 font-mono text-xs sm:text-sm text-slate-900">
                              {value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Customer Reviews */}
              <section className="border-t border-slate-200 pt-8">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Đánh giá từ khách hàng ({product.reviews?.length || 0})
                  </h3>
                </div>

                <div className="mt-5 grid gap-8 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    {firebaseUser ? (
                      <form
                        onSubmit={handleReviewSubmit}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          Viết nhận xét của bạn
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              aria-label={`${star} sao`}
                              className="p-1 cursor-pointer"
                            >
                              <Star
                                className={`h-5 w-5 ${
                                  star <= rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={3}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Chia sẻ trải nghiệm thực tế về sản phẩm..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                        />
                        {reviewMessage && (
                          <div className="text-xs font-medium text-blue-600">
                            {reviewMessage}
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                        >
                          {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </button>
                      </form>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                        <p className="text-sm text-slate-600">
                          Đăng nhập bằng Google để gửi đánh giá sản phẩm.
                        </p>
                        <button
                          type="button"
                          onClick={loginWithGoogle}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                        >
                          Đăng nhập với Google
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-7 space-y-4">
                    {(!product.reviews || product.reviews.length === 0) && (
                      <p className="text-sm text-slate-500">
                        Chưa có đánh giá nào cho sản phẩm này.
                      </p>
                    )}
                    {product.reviews?.map((rev) => (
                      <div
                        key={rev.id}
                        className="border-b border-slate-100 pb-4 last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {rev.authorName}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDateTime(rev.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3.5 w-3.5 ${
                                s <= rev.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                          {rev.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
