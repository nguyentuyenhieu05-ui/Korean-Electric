import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminGetDashboardStats,
  adminListAllOrders,
  adminUpdateOrderStatus,
  adminUpdateProduct,
  cancelUserOrder,
  createOrderTransaction,
  createReview,
  getProductDetail,
  getUserCart,
  listCategories,
  listOrdersForUser,
  listProducts,
  lookupOrderByCodeAndPhone,
  syncCartItems,
  upsertCartItem,
} from './src/db/queries.ts';
import {
  optionalAuth,
  requireAdmin,
  requireAuth,
  type AuthRequest,
} from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Categories
app.get('/api/categories', async (_req, res) => {
  try {
    const rows = await listCategories();
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi tải danh mục' });
  }
});

// Products catalog with search, category, sort
app.get('/api/products', async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
    const rows = await listProducts({ category, search, sort });
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi tải sản phẩm' });
  }
});

// Product detail + reviews
app.get('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'ID sản phẩm không hợp lệ.' });
    }
    const detail = await getProductDetail(id);
    if (!detail) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
    }
    res.json(detail);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi tải chi tiết sản phẩm' });
  }
});

// Submit product review (authenticated)
app.post('/api/products/:id/reviews', requireAuth, async (req: AuthRequest, res) => {
  try {
    const productId = Number(req.params.id);
    const { rating, comment } = req.body ?? {};
    if (!Number.isFinite(productId)) {
      return res.status(400).json({ error: 'ID sản phẩm không hợp lệ.' });
    }
    if (!comment || typeof comment !== 'string' || comment.trim().length < 3) {
      return res.status(400).json({ error: 'Nội dung đánh giá tối thiểu 3 ký tự.' });
    }
    const review = await createReview({
      productId,
      userId: req.dbUser!.id,
      authorName: req.dbUser!.fullName || req.dbUser!.email.split('@')[0] || 'Khách hàng',
      rating: Number(rating) || 5,
      comment,
    });
    res.status(201).json(review);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Không thể gửi đánh giá.' });
  }
});

// Current authenticated user profile
app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  res.json(req.dbUser);
});

// Cart endpoints (authenticated)
app.get('/api/cart', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = await getUserCart(req.dbUser!.id);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi tải giỏ hàng.' });
  }
});

app.put('/api/cart', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { productId, quantity } = req.body ?? {};
    if (!Number.isFinite(Number(productId)) || !Number.isFinite(Number(quantity))) {
      return res.status(400).json({ error: 'Dữ liệu giỏ hàng không hợp lệ.' });
    }
    const items = await upsertCartItem(
      req.dbUser!.id,
      Number(productId),
      Number(quantity)
    );
    res.json(items);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Lỗi cập nhật giỏ hàng.' });
  }
});

app.post('/api/cart/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const merged = await syncCartItems(req.dbUser!.id, items);
    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi đồng bộ giỏ hàng.' });
  }
});

// Place order (supports both signed-in user and guest checkout)
app.post('/api/orders', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      paymentMethod,
      note,
      items,
    } = req.body ?? {};

    if (!customerName || !customerPhone || !shippingAddress) {
      return res.status(400).json({
        error: 'Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.',
      });
    }

    const order = await createOrderTransaction({
      userId: req.dbUser?.id ?? null,
      customerName,
      customerPhone,
      customerEmail: customerEmail || req.dbUser?.email || null,
      shippingAddress,
      paymentMethod: paymentMethod || 'COD',
      note: note || null,
      items: Array.isArray(items) ? items : [],
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Đặt hàng thất bại.' });
  }
});

// Lookup guest/any order by orderCode + phone
app.get('/api/orders/lookup', async (req, res) => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const phone = typeof req.query.phone === 'string' ? req.query.phone : '';
    if (!code.trim() || !phone.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập mã đơn hàng và số điện thoại.' });
    }
    const order = await lookupOrderByCodeAndPhone(code, phone);
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng khớp với thông tin đã nhập.' });
    }
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi tra cứu đơn hàng.' });
  }
});

// Authenticated user order history
app.get('/api/orders', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await listOrdersForUser(req.dbUser!.id);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi tải lịch sử đơn hàng.' });
  }
});

app.patch('/api/orders/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isFinite(orderId)) {
      return res.status(400).json({ error: 'Mã đơn không hợp lệ.' });
    }
    const updated = await cancelUserOrder(orderId, req.dbUser!.id);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Không thể hủy đơn hàng.' });
  }
});

// Admin endpoints
app.get('/api/admin/stats', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const stats = await adminGetDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi tải thống kê.' });
  }
});

app.post('/api/admin/products', requireAuth, requireAdmin, async (req, res) => {
  try {
    const body = req.body ?? {};
    if (!body.sku || !body.name || !body.brand || !body.categoryId || !body.price) {
      return res.status(400).json({ error: 'Thiếu thông tin sản phẩm bắt buộc.' });
    }
    const created = await adminCreateProduct({
      sku: String(body.sku),
      name: String(body.name),
      brand: String(body.brand),
      categoryId: Number(body.categoryId),
      price: Number(body.price),
      originalPrice: body.originalPrice ? Number(body.originalPrice) : null,
      stock: Number(body.stock ?? 0),
      badge: body.badge ? String(body.badge) : null,
      shortDesc: String(body.shortDesc || body.name),
      description: String(body.description || body.shortDesc || body.name),
      specsJson: typeof body.specsJson === 'string' ? body.specsJson : '{}',
      imageUrl: String(body.imageUrl || '/src/assets/images/prod_laptop_pro_1795140148305.jpg'),
      featured: Boolean(body.featured),
    });
    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Không thể tạo sản phẩm.' });
  }
});

app.put('/api/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'ID sản phẩm không hợp lệ.' });
    }
    const body = req.body ?? {};
    const updatePayload: Record<string, any> = {};
    if (body.name !== undefined) updatePayload.name = String(body.name);
    if (body.brand !== undefined) updatePayload.brand = String(body.brand);
    if (body.categoryId !== undefined) updatePayload.categoryId = Number(body.categoryId);
    if (body.price !== undefined) updatePayload.price = Number(body.price);
    if (body.originalPrice !== undefined) {
      updatePayload.originalPrice = body.originalPrice ? Number(body.originalPrice) : null;
    }
    if (body.stock !== undefined) updatePayload.stock = Number(body.stock);
    if (body.badge !== undefined) updatePayload.badge = body.badge ? String(body.badge) : null;
    if (body.shortDesc !== undefined) updatePayload.shortDesc = String(body.shortDesc);
    if (body.description !== undefined) updatePayload.description = String(body.description);
    if (body.specsJson !== undefined) updatePayload.specsJson = String(body.specsJson);
    if (body.imageUrl !== undefined) updatePayload.imageUrl = String(body.imageUrl);
    if (body.featured !== undefined) updatePayload.featured = Boolean(body.featured);

    const updated = await adminUpdateProduct(id, updatePayload);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Không thể cập nhật sản phẩm.' });
  }
});

app.delete('/api/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'ID sản phẩm không hợp lệ.' });
    }
    const result = await adminDeleteProduct(id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Không thể xóa sản phẩm.' });
  }
});

app.get('/api/admin/orders', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const rows = await adminListAllOrders();
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi tải đơn hàng.' });
  }
});

app.patch('/api/admin/orders/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body ?? {};
    if (!Number.isFinite(id) || !status) {
      return res.status(400).json({ error: 'Dữ liệu cập nhật trạng thái không hợp lệ.' });
    }
    const updated = await adminUpdateOrderStatus(id, String(status));
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Không thể cập nhật trạng thái.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
