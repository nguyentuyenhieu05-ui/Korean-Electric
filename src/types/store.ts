export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

export interface ProductReview {
  id: number;
  productId: number;
  userId: number;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Product {
  id: number;
  sku: string;
  slug: string;
  name: string;
  brand: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  price: number;
  originalPrice: number | null;
  stock: number;
  badge: string | null;
  shortDesc: string;
  description: string;
  specsJson: string;
  imageUrl: string;
  featured: boolean;
  createdAt: string;
  reviews?: ProductReview[];
}

export interface CartItem {
  productId: number;
  quantity: number;
  name: string;
  sku: string;
  brand: string;
  price: number;
  stock: number;
  imageUrl: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  productSku: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: number;
  orderCode: string;
  userId: number | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: string;
  paymentMethod: 'COD' | 'BANK_TRANSFER' | 'EWALLET' | string;
  note: string | null;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled' | string;
  createdAt: string;
  items: OrderItem[];
}

export interface AdminStats {
  totalProducts: number;
  totalOrders: number;
  activeRevenue: number;
  lowStockCount: number;
  pendingOrdersCount: number;
}

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  fullName: string | null;
  role: 'customer' | 'admin' | string;
}
