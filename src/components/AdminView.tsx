import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { AdminStats, Category, Order, Product } from '../types/store.ts';
import { formatDateTime, formatVnd, ORDER_STATUS_LABEL } from '../utils/format.ts';

interface AdminViewProps {
  categories: Category[];
  products: Product[];
  onProductsChanged: () => Promise<void>;
}

const PRESET_IMAGES = [
  { label: 'Laptop Pro', url: '/src/assets/images/prod_laptop_pro_1795140148305.jpg' },
  { label: 'Tai nghe ANC', url: '/src/assets/images/prod_headphones_anc_1795140148135.jpg' },
  { label: 'Smartphone Flagship', url: '/src/assets/images/prod_smartphone_flagship_1795140149849.jpg' },
  { label: 'Bàn phím cơ CNC', url: '/src/assets/images/prod_keyboard_mech_1795140150484.jpg' },
  { label: 'Đồng hồ Titanium', url: '/src/assets/images/prod_smartwatch_titanium_1795140147598.jpg' },
  { label: 'Màn hình Studio 5K', url: '/src/assets/images/prod_monitor_studio_1795140148960.jpg' },
  { label: 'Earbuds Pro', url: '/src/assets/images/prod_earbuds_pro_1795140148551.jpg' },
  { label: 'Tablet Pro OLED', url: '/src/assets/images/prod_tablet_pro_1795140148265.jpg' },
];

export function AdminView({
  categories,
  products,
  onProductsChanged,
}: AdminViewProps) {
  const { firebaseUser, profile, idToken, loginWithGoogle } = useAuth();
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Kora');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
  const [price, setPrice] = useState('15000000');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [badge, setBadge] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);
  const [saving, setSaving] = useState(false);

  const loadAdminData = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/orders', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!statsRes.ok) {
        const d = await statsRes.json().catch(() => ({}));
        throw new Error(d.error || 'Không có quyền truy cập trang quản trị.');
      }

      const [statsData, ordersData] = await Promise.all([
        statsRes.json(),
        ordersRes.json(),
      ]);
      setStats(statsData);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu quản trị.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idToken && profile?.role === 'admin') {
      loadAdminData(idToken);
    }
  }, [idToken, profile?.role]);

  const openCreateForm = () => {
    setEditingProduct(null);
    setSku(`KR-${Math.floor(1000 + Math.random() * 9000)}`);
    setName('');
    setBrand('Kora');
    setCategoryId(categories[0]?.id || 1);
    setPrice('12990000');
    setOriginalPrice('');
    setStock('15');
    setBadge('Mới ra mắt');
    setShortDesc('');
    setDescription('');
    setImageUrl(PRESET_IMAGES[0].url);
    setShowProductForm(true);
  };

  const openEditForm = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setName(p.name);
    setBrand(p.brand);
    setCategoryId(p.categoryId);
    setPrice(String(p.price));
    setOriginalPrice(p.originalPrice ? String(p.originalPrice) : '');
    setStock(String(p.stock));
    setBadge(p.badge || '');
    setShortDesc(p.shortDesc);
    setDescription(p.description);
    setImageUrl(p.imageUrl);
    setShowProductForm(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken) return;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        sku,
        name,
        brand,
        categoryId: Number(categoryId),
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        stock: Number(stock),
        badge: badge || null,
        shortDesc,
        description: description || shortDesc,
        specsJson: editingProduct?.specsJson || '{"Bảo hành":"24 tháng chính hãng"}',
        imageUrl,
        featured: true,
      };

      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể lưu sản phẩm.');
      }

      setShowProductForm(false);
      await Promise.all([onProductsChanged(), loadAdminData(idToken)]);
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu sản phẩm.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!idToken) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể xóa sản phẩm.');
      }
      await Promise.all([onProductsChanged(), loadAdminData(idToken)]);
    } catch (err: any) {
      setError(err.message || 'Lỗi xóa sản phẩm.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    if (!idToken) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể cập nhật trạng thái.');
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: data.status } : o))
      );
      loadAdminData(idToken);
    } catch (err: any) {
      setError(err.message || 'Lỗi cập nhật trạng thái đơn hàng.');
    }
  };

  if (!firebaseUser) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4">
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Quản trị cửa hàng
          </h1>
          <p className="text-sm text-slate-600">
            Vui lòng đăng nhập bằng tài khoản quản trị viên để quản lý danh mục sản phẩm, tồn kho và đơn hàng.
          </p>
          <button
            type="button"
            onClick={loginWithGoogle}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Đăng nhập với Google
          </button>
        </div>
      </div>
    );
  }

  if (profile && profile.role !== 'admin') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-3">
          <h1 className="font-display text-xl font-bold text-slate-900">
            Không có quyền quản trị
          </h1>
          <p className="text-sm text-slate-600">
            Tài khoản <span className="font-medium text-slate-900">{profile.email}</span> hiện đang ở vai trò khách hàng.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Quản trị cửa hàng Kora Electronics
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Quản lý danh mục sản phẩm, số lượng tồn kho và xử lý đơn đặt hàng.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm sản phẩm</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Row */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-medium text-slate-500">
              Doanh thu hoạt động
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900">
              {formatVnd(stats.activeRevenue)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-medium text-slate-500">
              Đơn hàng chờ xác nhận
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900">
              {stats.pendingOrdersCount} / {stats.totalOrders}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-medium text-slate-500">
              Sản phẩm đang kinh doanh
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900">
              {stats.totalProducts}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-medium text-slate-500">
              Cảnh báo tồn kho (≤10)
            </div>
            <div className="mt-2 font-mono text-xl font-bold tabular-nums text-slate-900">
              {stats.lowStockCount}
            </div>
          </div>
        </div>
      )}

      {/* Segmented Tabs */}
      <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
        <button
          type="button"
          onClick={() => setTab('products')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
            tab === 'products'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sản phẩm ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('orders')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
            tab === 'orders'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Đơn hàng ({orders.length})
        </button>
      </div>

      {loading && (
        <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />
      )}

      {!loading && tab === 'products' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3.5">Sản phẩm</th>
                <th className="px-4 py-3.5">SKU</th>
                <th className="px-4 py-3.5">Danh mục</th>
                <th className="px-4 py-3.5 text-right">Giá bán</th>
                <th className="px-4 py-3.5 text-right">Tồn kho</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="h-10 w-12 rounded-md border border-slate-200 object-cover bg-slate-100"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                    {p.sku}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{p.categoryName}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-medium tabular-nums text-slate-900">
                    {formatVnd(p.price)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono tabular-nums text-slate-700">
                    {p.stock}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(p)}
                        aria-label={`Sửa ${p.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id)}
                        aria-label={`Xóa ${p.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === 'orders' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3.5">Mã đơn</th>
                <th className="px-4 py-3.5">Khách hàng</th>
                <th className="px-4 py-3.5">Ngày đặt</th>
                <th className="px-4 py-3.5 text-right">Tổng tiền</th>
                <th className="px-4 py-3.5">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Chưa có đơn hàng nào trong hệ thống.
                  </td>
                </tr>
              )}
              {orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-mono font-semibold text-slate-900">
                    #{ord.orderCode}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-slate-900">{ord.customerName}</div>
                    <div className="text-xs text-slate-500">
                      {ord.customerPhone} · {ord.shippingAddress}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">
                    {formatDateTime(ord.createdAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                    {formatVnd(ord.totalAmount)}
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={ord.status}
                      onChange={(e) =>
                        handleUpdateOrderStatus(ord.id, e.target.value)
                      }
                      aria-label={`Trạng thái đơn ${ord.orderCode}`}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                    >
                      {Object.entries(ORDER_STATUS_LABEL).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Create / Edit Modal */}
      {showProductForm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Biểu mẫu sản phẩm"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          onClick={() => setShowProductForm(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-5 space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block font-medium text-slate-700">
                  Mã SKU *
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingProduct)}
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono disabled:bg-slate-100"
                  />
                </label>
                <label className="block font-medium text-slate-700">
                  Thương hiệu *
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>

              <label className="block font-medium text-slate-700">
                Tên sản phẩm *
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block font-medium text-slate-700">
                  Danh mục
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block font-medium text-slate-700">
                  Giá bán (VNĐ) *
                  <input
                    type="number"
                    min={0}
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  />
                </label>
                <label className="block font-medium text-slate-700">
                  Tồn kho *
                  <input
                    type="number"
                    min={0}
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block font-medium text-slate-700">
                  Giá niêm yết cũ (tuỳ chọn)
                  <input
                    type="number"
                    min={0}
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
                  />
                </label>
                <label className="block font-medium text-slate-700">
                  Nhãn nổi bật (tuỳ chọn)
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="Mới ra mắt, Bán chạy..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>

              <label className="block font-medium text-slate-700">
                Hình ảnh sản phẩm
                <select
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                >
                  {PRESET_IMAGES.map((img) => (
                    <option key={img.url} value={img.url}>
                      {img.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block font-medium text-slate-700">
                Mô tả ngắn *
                <input
                  type="text"
                  required
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block font-medium text-slate-700">
                Mô tả chi tiết
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
