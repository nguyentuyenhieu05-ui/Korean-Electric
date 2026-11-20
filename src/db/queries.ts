import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  cartItems,
  categories,
  orderItems,
  orders,
  products,
  reviews,
  users,
} from './schema.ts';

const ADMIN_EMAILS = new Set(['nguyentuyenhieu05@gmail.com']);

export async function getOrCreateUser(
  uid: string,
  email: string,
  fullName: string | null
) {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(users)
        .set({
          email: email || existing[0].email,
          fullName: fullName ?? existing[0].fullName,
        })
        .where(eq(users.uid, uid))
        .returning();
      return updated[0];
    }

    const totalUsers = await db.select({ value: count() }).from(users);
    const isFirstUser = Number(totalUsers[0]?.value ?? 0) === 0;
    const role = isFirstUser || ADMIN_EMAILS.has(email.toLowerCase()) ? 'admin' : 'customer';

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        fullName,
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          fullName,
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Không thể đồng bộ thông tin tài khoản.', { cause: error });
  }
}

export async function listCategories() {
  try {
    return await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.id));
  } catch (error) {
    console.error('Database query failed in listCategories:', error);
    throw new Error('Không thể tải danh mục sản phẩm.', { cause: error });
  }
}

export interface ProductFilterParams {
  category?: string;
  search?: string;
  sort?: string;
}

export async function listProducts(filters: ProductFilterParams = {}) {
  try {
    const conditions = [];

    if (filters.category && filters.category !== 'all') {
      const cat = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, filters.category))
        .limit(1);
      if (cat.length > 0) {
        conditions.push(eq(products.categoryId, cat[0].id));
      } else {
        return [];
      }
    }

    if (filters.search && filters.search.trim().length > 0) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(products.name, q),
          ilike(products.brand, q),
          ilike(products.sku, q),
          ilike(products.shortDesc, q)
        )
      );
    }

    let orderClause = desc(products.featured);
    if (filters.sort === 'price_asc') {
      orderClause = asc(products.price);
    } else if (filters.sort === 'price_desc') {
      orderClause = desc(products.price);
    } else if (filters.sort === 'newest') {
      orderClause = desc(products.createdAt);
    }

    const rows = await db
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
        name: products.name,
        brand: products.brand,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        price: products.price,
        originalPrice: products.originalPrice,
        stock: products.stock,
        badge: products.badge,
        shortDesc: products.shortDesc,
        description: products.description,
        specsJson: products.specsJson,
        imageUrl: products.imageUrl,
        featured: products.featured,
        createdAt: products.createdAt,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderClause, asc(products.id));

    return rows;
  } catch (error) {
    console.error('Database query failed in listProducts:', error);
    throw new Error('Không thể tải danh sách sản phẩm.', { cause: error });
  }
}

export async function getProductDetail(id: number) {
  try {
    const productRows = await db
      .select({
        id: products.id,
        sku: products.sku,
        slug: products.slug,
        name: products.name,
        brand: products.brand,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        price: products.price,
        originalPrice: products.originalPrice,
        stock: products.stock,
        badge: products.badge,
        shortDesc: products.shortDesc,
        description: products.description,
        specsJson: products.specsJson,
        imageUrl: products.imageUrl,
        featured: products.featured,
        createdAt: products.createdAt,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id))
      .limit(1);

    if (productRows.length === 0) {
      return null;
    }

    const productReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.productId, id))
      .orderBy(desc(reviews.createdAt));

    return {
      ...productRows[0],
      reviews: productReviews,
    };
  } catch (error) {
    console.error('Database query failed in getProductDetail:', error);
    throw new Error('Không thể tải chi tiết sản phẩm.', { cause: error });
  }
}

export async function createReview(params: {
  productId: number;
  userId: number;
  authorName: string;
  rating: number;
  comment: string;
}) {
  try {
    const inserted = await db
      .insert(reviews)
      .values({
        productId: params.productId,
        userId: params.userId,
        authorName: params.authorName,
        rating: Math.max(1, Math.min(5, Math.round(params.rating))),
        comment: params.comment.trim(),
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createReview:', error);
    throw new Error('Không thể gửi đánh giá sản phẩm.', { cause: error });
  }
}

export async function getUserCart(userId: number) {
  try {
    return await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        name: products.name,
        sku: products.sku,
        brand: products.brand,
        price: products.price,
        stock: products.stock,
        imageUrl: products.imageUrl,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId))
      .orderBy(asc(cartItems.id));
  } catch (error) {
    console.error('Database query failed in getUserCart:', error);
    throw new Error('Không thể tải giỏ hàng.', { cause: error });
  }
}

export async function upsertCartItem(
  userId: number,
  productId: number,
  quantity: number
) {
  try {
    const prod = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (prod.length === 0) {
      throw new Error('Sản phẩm không tồn tại.');
    }

    const existing = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
      .limit(1);

    if (quantity <= 0) {
      if (existing.length > 0) {
        await db.delete(cartItems).where(eq(cartItems.id, existing[0].id));
      }
      return getUserCart(userId);
    }

    const clampedQty = Math.min(quantity, Math.max(1, prod[0].stock));

    if (existing.length > 0) {
      await db
        .update(cartItems)
        .set({ quantity: clampedQty, updatedAt: new Date() })
        .where(eq(cartItems.id, existing[0].id));
    } else {
      await db.insert(cartItems).values({
        userId,
        productId,
        quantity: clampedQty,
      });
    }

    return getUserCart(userId);
  } catch (error) {
    console.error('Database query failed in upsertCartItem:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Không thể cập nhật giỏ hàng.',
      { cause: error }
    );
  }
}

export async function syncCartItems(
  userId: number,
  items: Array<{ productId: number; quantity: number }>
) {
  try {
    for (const item of items) {
      if (item.quantity > 0) {
        const existing = await db
          .select()
          .from(cartItems)
          .where(
            and(
              eq(cartItems.userId, userId),
              eq(cartItems.productId, item.productId)
            )
          )
          .limit(1);
        const prod = await db
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (prod.length > 0 && prod[0].stock > 0) {
          const nextQty = Math.min(
            prod[0].stock,
            (existing[0]?.quantity ?? 0) + item.quantity
          );
          if (existing.length > 0) {
            await db
              .update(cartItems)
              .set({ quantity: nextQty, updatedAt: new Date() })
              .where(eq(cartItems.id, existing[0].id));
          } else {
            await db.insert(cartItems).values({
              userId,
              productId: item.productId,
              quantity: nextQty,
            });
          }
        }
      }
    }
    return getUserCart(userId);
  } catch (error) {
    console.error('Database query failed in syncCartItems:', error);
    throw new Error('Không thể đồng bộ giỏ hàng.', { cause: error });
  }
}

export async function createOrderTransaction(params: {
  userId: number | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: string;
  paymentMethod: string;
  note: string | null;
  items: Array<{ productId: number; quantity: number }>;
}) {
  try {
    return await db.transaction(async (tx) => {
      if (!params.items || params.items.length === 0) {
        throw new Error('Giỏ hàng đang trống.');
      }

      let subtotal = 0;
      const lineItems: Array<{
        productId: number;
        productName: string;
        productSku: string;
        imageUrl: string;
        unitPrice: number;
        quantity: number;
      }> = [];

      for (const reqItem of params.items) {
        const prodRows = await tx
          .select()
          .from(products)
          .where(eq(products.id, reqItem.productId))
          .limit(1);

        if (prodRows.length === 0) {
          throw new Error('Một sản phẩm trong giỏ không còn tồn tại.');
        }

        const prod = prodRows[0];
        if (reqItem.quantity <= 0) {
          throw new Error(`Số lượng không hợp lệ cho ${prod.name}.`);
        }
        if (prod.stock < reqItem.quantity) {
          throw new Error(
            `Sản phẩm "${prod.name}" chỉ còn ${prod.stock} chiếc trong kho.`
          );
        }

        await tx
          .update(products)
          .set({ stock: prod.stock - reqItem.quantity })
          .where(eq(products.id, prod.id));

        subtotal += prod.price * reqItem.quantity;
        lineItems.push({
          productId: prod.id,
          productName: prod.name,
          productSku: prod.sku,
          imageUrl: prod.imageUrl,
          unitPrice: prod.price,
          quantity: reqItem.quantity,
        });
      }

      const shippingFee = subtotal >= 2000000 ? 0 : 45000;
      const totalAmount = subtotal + shippingFee;
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderCode = `KR-${Date.now().toString().slice(-4)}${randomSuffix}`;

      const insertedOrders = await tx
        .insert(orders)
        .values({
          orderCode,
          userId: params.userId,
          customerName: params.customerName.trim(),
          customerPhone: params.customerPhone.trim(),
          customerEmail: params.customerEmail?.trim() || null,
          shippingAddress: params.shippingAddress.trim(),
          paymentMethod: params.paymentMethod || 'COD',
          note: params.note?.trim() || null,
          subtotal,
          shippingFee,
          totalAmount,
          status: 'pending',
        })
        .returning();

      const newOrder = insertedOrders[0];

      const insertedItems = await tx
        .insert(orderItems)
        .values(
          lineItems.map((item) => ({
            orderId: newOrder.id,
            ...item,
          }))
        )
        .returning();

      if (params.userId) {
        await tx.delete(cartItems).where(eq(cartItems.userId, params.userId));
      }

      return {
        ...newOrder,
        items: insertedItems,
      };
    });
  } catch (error) {
    console.error('Database transaction failed in createOrderTransaction:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Đặt hàng thất bại, vui lòng thử lại.',
      { cause: error }
    );
  }
}

export async function listOrdersForUser(userId: number) {
  try {
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    const results = [];
    for (const ord of userOrders) {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, ord.id));
      results.push({ ...ord, items });
    }
    return results;
  } catch (error) {
    console.error('Database query failed in listOrdersForUser:', error);
    throw new Error('Không thể tải lịch sử đơn hàng.', { cause: error });
  }
}

export async function lookupOrderByCodeAndPhone(
  orderCode: string,
  phone: string
) {
  try {
    const found = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.orderCode, orderCode.trim().toUpperCase()),
          eq(orders.customerPhone, phone.trim())
        )
      )
      .limit(1);

    if (found.length === 0) {
      return null;
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, found[0].id));

    return {
      ...found[0],
      items,
    };
  } catch (error) {
    console.error('Database query failed in lookupOrderByCodeAndPhone:', error);
    throw new Error('Không thể tra cứu đơn hàng.', { cause: error });
  }
}

export async function cancelUserOrder(orderId: number, userId: number) {
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Không tìm thấy đơn hàng.');
      }
      if (existing[0].status !== 'pending') {
        throw new Error('Chỉ có thể hủy đơn hàng đang ở trạng thái chờ xác nhận.');
      }

      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      for (const item of items) {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      const updated = await tx
        .update(orders)
        .set({ status: 'cancelled' })
        .where(eq(orders.id, orderId))
        .returning();

      return { ...updated[0], items };
    });
  } catch (error) {
    console.error('Database query failed in cancelUserOrder:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Không thể hủy đơn hàng.',
      { cause: error }
    );
  }
}

export async function adminCreateProduct(input: {
  sku: string;
  name: string;
  brand: string;
  categoryId: number;
  price: number;
  originalPrice?: number | null;
  stock: number;
  badge?: string | null;
  shortDesc: string;
  description: string;
  specsJson: string;
  imageUrl: string;
  featured?: boolean;
}) {
  try {
    const slugBase = input.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${slugBase}-${Date.now().toString().slice(-4)}`;

    const inserted = await db
      .insert(products)
      .values({
        sku: input.sku.trim().toUpperCase(),
        slug,
        name: input.name.trim(),
        brand: input.brand.trim(),
        categoryId: input.categoryId,
        price: input.price,
        originalPrice: input.originalPrice || null,
        stock: input.stock,
        badge: input.badge?.trim() || null,
        shortDesc: input.shortDesc.trim(),
        description: input.description.trim(),
        specsJson: input.specsJson,
        imageUrl: input.imageUrl.trim(),
        featured: Boolean(input.featured),
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in adminCreateProduct:', error);
    throw new Error('Không thể tạo sản phẩm mới (kiểm tra mã SKU trùng lặp).', {
      cause: error,
    });
  }
}

export async function adminUpdateProduct(
  id: number,
  input: Partial<{
    name: string;
    brand: string;
    categoryId: number;
    price: number;
    originalPrice: number | null;
    stock: number;
    badge: string | null;
    shortDesc: string;
    description: string;
    specsJson: string;
    imageUrl: string;
    featured: boolean;
  }>
) {
  try {
    const updated = await db
      .update(products)
      .set(input)
      .where(eq(products.id, id))
      .returning();

    if (updated.length === 0) {
      throw new Error('Sản phẩm không tồn tại.');
    }
    return updated[0];
  } catch (error) {
    console.error('Database query failed in adminUpdateProduct:', error);
    throw new Error('Không thể cập nhật sản phẩm.', { cause: error });
  }
}

export async function adminDeleteProduct(id: number) {
  try {
    const usedInOrder = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.productId, id))
      .limit(1);

    if (usedInOrder.length > 0) {
      await db
        .update(products)
        .set({ stock: 0, badge: 'Ngừng kinh doanh' })
        .where(eq(products.id, id));
      return { archived: true };
    }

    await db.delete(products).where(eq(products.id, id));
    return { archived: false };
  } catch (error) {
    console.error('Database query failed in adminDeleteProduct:', error);
    throw new Error('Không thể xóa sản phẩm.', { cause: error });
  }
}

export async function adminListAllOrders() {
  try {
    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));

    const results = [];
    for (const ord of allOrders) {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, ord.id));
      results.push({ ...ord, items });
    }
    return results;
  } catch (error) {
    console.error('Database query failed in adminListAllOrders:', error);
    throw new Error('Không thể tải danh sách đơn hàng.', { cause: error });
  }
}

export async function adminUpdateOrderStatus(orderId: number, status: string) {
  try {
    const allowed = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      throw new Error('Trạng thái đơn hàng không hợp lệ.');
    }

    const updated = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, orderId))
      .returning();

    if (updated.length === 0) {
      throw new Error('Không tìm thấy đơn hàng.');
    }
    return updated[0];
  } catch (error) {
    console.error('Database query failed in adminUpdateOrderStatus:', error);
    throw new Error('Không thể cập nhật trạng thái đơn hàng.', { cause: error });
  }
}

export async function adminGetDashboardStats() {
  try {
    const [prodCount] = await db.select({ value: count() }).from(products);
    const [orderCount] = await db.select({ value: count() }).from(orders);
    const allOrders = await db.select().from(orders);
    const allProducts = await db.select().from(products);

    const activeRevenue = allOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const lowStockCount = allProducts.filter((p) => p.stock <= 10).length;
    const pendingOrdersCount = allOrders.filter((o) => o.status === 'pending').length;

    return {
      totalProducts: Number(prodCount?.value ?? 0),
      totalOrders: Number(orderCount?.value ?? 0),
      activeRevenue,
      lowStockCount,
      pendingOrdersCount,
    };
  } catch (error) {
    console.error('Database query failed in adminGetDashboardStats:', error);
    throw new Error('Không thể tải thống kê quản trị.', { cause: error });
  }
}
