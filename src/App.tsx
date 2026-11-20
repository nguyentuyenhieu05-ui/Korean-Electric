import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, RefreshCw, Search, Shield, Truck } from 'lucide-react';
import { AccountView } from './components/AccountView.tsx';
import { AdminView } from './components/AdminView.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { Header, type ActiveView } from './components/Header.tsx';
import { OrdersView } from './components/OrdersView.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import type { CartItem, Category, Order, Product } from './types/store.ts';

const GUEST_CART_KEY = 'kora_guest_cart_v1';
const HERO_IMAGE = '/src/assets/images/hero_flagship_workspace_1795140148943.jpg';

function StorefrontApp() {
  const { idToken } = useAuth();

  const [activeView, setActiveView] = useState<ActiveView>('store');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('featured');

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(GUEST_CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const catalogRef = useRef<HTMLElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2600);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setCatalogError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (sortOrder !== 'featured') params.set('sort', sortOrder);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Không thể tải danh sách sản phẩm.');
      }
      const data: Product[] = await res.json();
      setProducts(data);
    } catch (err: any) {
      setCatalogError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedCategory, searchQuery, sortOrder]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 180);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // Sync guest cart with database when user authenticates
  useEffect(() => {
    if (!idToken) {
      try {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartItems));
      } catch {
        // ignore storage quota
      }
      return;
    }

    let cancelled = false;
    const syncOnLogin = async () => {
      try {
        let guestItems: CartItem[] = [];
        try {
          const raw = localStorage.getItem(GUEST_CART_KEY);
          guestItems = raw ? JSON.parse(raw) : [];
        } catch {
          guestItems = [];
        }

        if (guestItems.length > 0) {
          const syncRes = await fetch('/api/cart/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              items: guestItems.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
              })),
            }),
          });
          if (syncRes.ok && !cancelled) {
            const merged = await syncRes.json();
            setCartItems(merged);
            localStorage.removeItem(GUEST_CART_KEY);
            return;
          }
        }

        const res = await fetch('/api/cart', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok && !cancelled) {
          const serverCart = await res.json();
          setCartItems(serverCart);
        }
      } catch (err) {
        console.error('Cart sync error:', err);
      }
    };

    syncOnLogin();
    return () => {
      cancelled = true;
    };
  }, [idToken]);

  useEffect(() => {
    if (!idToken) {
      try {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartItems));
      } catch {
        // ignore
      }
    }
  }, [cartItems, idToken]);

  const handleAddToCart = async (product: Product, quantity = 1) => {
    const currentItem = cartItems.find((i) => i.productId === product.id);
    const nextQty = Math.min(
      product.stock,
      (currentItem?.quantity ?? 0) + quantity
    );

    if (nextQty <= 0) return;

    if (idToken) {
      try {
        const res = await fetch('/api/cart', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ productId: product.id, quantity: nextQty }),
        });
        if (res.ok) {
          const updated = await res.json();
          setCartItems(updated);
          showToast(`Đã thêm "${product.name}" vào giỏ hàng`);
          return;
        }
      } catch (err) {
        console.error('Add to server cart failed:', err);
      }
    }

    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: nextQty };
        return copy;
      }
      return [
        ...prev,
        {
          productId: product.id,
          quantity: nextQty,
          name: product.name,
          sku: product.sku,
          brand: product.brand,
          price: product.price,
          stock: product.stock,
          imageUrl: product.imageUrl,
        },
      ];
    });
    showToast(`Đã thêm "${product.name}" vào giỏ hàng`);
  };

  const handleUpdateCartQty = async (productId: number, quantity: number) => {
    if (idToken) {
      try {
        const res = await fetch('/api/cart', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ productId, quantity }),
        });
        if (res.ok) {
          const updated = await res.json();
          setCartItems(updated);
          return;
        }
      } catch (err) {
        console.error('Update cart failed:', err);
      }
    }

    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((i) => i.productId !== productId));
    } else {
      setCartItems((prev) =>
        prev.map((i) =>
          i.productId === productId ? { ...i, quantity } : i
        )
      );
    }
  };

  const handleRemoveCartItem = (productId: number) => {
    handleUpdateCartQty(productId, 0);
  };

  const handleOrderSuccess = (_order: Order) => {
    setCartItems([]);
    localStorage.removeItem(GUEST_CART_KEY);
    fetchProducts();
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeView={activeView}
        onNavigate={setActiveView}
        cartCount={totalCartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          {toastMessage}
        </div>
      )}

      <main className="flex-1">
        {activeView === 'store' && (
          <>
            {/* Section 1: Storefront Hero */}
            <section className="border-b border-slate-200 bg-white">
              <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <div className="grid gap-10 lg:grid-cols-12 items-stretch">
                  <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
                    <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                      Bộ sưu tập phần cứng 2026
                    </div>
                    <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl text-balance leading-[1.12]">
                      Thiết bị điện tử chuẩn mực cho công việc và sáng tạo
                    </h1>
                    <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                      Từ laptop nhôm nguyên khối, màn hình 5K chuẩn màu đến hệ thống âm thanh chống ồn chủ động — bảo hành chính hãng 24 tháng, giao nhanh toàn quốc.
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          catalogRef.current?.scrollIntoView({ behavior: 'smooth' })
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap cursor-pointer"
                      >
                        <span>Khám phá sản phẩm</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView('orders')}
                        className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-2 py-2 cursor-pointer"
                      >
                        Tra cứu đơn hàng
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-[16/9] lg:aspect-auto">
                      <img
                        src={HERO_IMAGE}
                        alt="Không gian làm việc với laptop KoraBook Pro và tai nghe Aurion Studio"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Catalog Filter Bar + 3-Column Product Grid */}
            <section
              ref={catalogRef}
              className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-8"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-900">
                    Danh mục thiết bị nổi bật
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Giá đã bao gồm VAT · Miễn phí vận chuyển cho đơn từ 2.000.000₫
                  </p>
                </div>

                {/* Search + Sort */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 sm:w-64 sm:flex-initial">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm tên thiết bị, hãng, SKU..."
                      aria-label="Tìm kiếm sản phẩm"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    aria-label="Sắp xếp sản phẩm"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="featured">Nổi bật nhất</option>
                    <option value="price_asc">Giá: Thấp đến Cao</option>
                    <option value="price_desc">Giá: Cao đến Thấp</option>
                    <option value="newest">Mới cập nhật</option>
                  </select>
                </div>
              </div>

              {/* Interactive Category Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-200/70 p-1.5 w-fit max-w-full overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedCategory === cat.slug
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {catalogError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {catalogError}
                </div>
              )}

              {loadingProducts ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white"
                    />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                  <p className="font-display text-base font-semibold text-slate-900">
                    Không tìm thấy sản phẩm phù hợp
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }}
                    className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={(p) => setSelectedProductId(p.id)}
                      onAddToCart={(p) => handleAddToCart(p, 1)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Section 3: Service & Warranty Guarantee */}
            <section className="border-t border-slate-200 bg-white">
              <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="grid gap-8 md:grid-cols-3">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900">
                        Bảo hành chính hãng 24 tháng
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                        100% sản phẩm nguyên seal, đầy đủ hóa đơn VAT và hỗ trợ bảo hành điện tử theo số serial.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900">
                        Giao nhanh 2 giờ nội thành
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                        Miễn phí vận chuyển toàn quốc cho đơn hàng từ 2.000.000₫. Kiểm tra máy trước khi thanh toán COD.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-900">
                      <RefreshCw className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900">
                        Đổi mới 30 ngày miễn phí
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                        Đổi ngay sản phẩm mới tương đương nếu phát sinh lỗi phần cứng từ nhà sản xuất trong 30 ngày đầu.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeView === 'orders' && <OrdersView />}
        {activeView === 'account' && <AccountView onNavigate={setActiveView} />}
        {activeView === 'admin' && (
          <AdminView
            categories={categories}
            products={products}
            onProductsChanged={fetchProducts}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 text-xs text-slate-500">
          <div>
            <span className="font-display font-bold text-slate-900">
              Kora Electronics
            </span>{' '}
            · 128 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh · Hotline: 1900 6886
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveView('store')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Cửa hàng
            </button>
            <button
              type="button"
              onClick={() => setActiveView('orders')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Tra cứu đơn
            </button>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Quản trị
            </button>
            <span>© 2026 Kora Electronics</span>
          </div>
        </div>
      </footer>

      <ProductDetailModal
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onOrderSuccess={handleOrderSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StorefrontApp />
    </AuthProvider>
  );
}
