import { useState } from 'react';
import { Cpu, Plus } from 'lucide-react';
import type { Product } from '../types/store.ts';
import { formatVnd } from '../utils/format.ts';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({
  product,
  onSelect,
  onAddToCart,
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const outOfStock = product.stock <= 0;

  return (
    <article className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div>
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="block w-full overflow-hidden rounded-t-xl bg-slate-100 aspect-[4/3] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {!imgError ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-slate-200 p-6 text-slate-500">
              <Cpu className="h-8 w-8 stroke-[1.5]" aria-hidden="true" />
              <span className="text-xs font-medium text-center">{product.name}</span>
            </div>
          )}
        </button>

        <div className="p-5 pb-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="truncate font-medium tracking-wide uppercase">
              {product.brand} · {product.categoryName}
            </span>
            {product.badge && (
              <span className="shrink-0 font-medium text-blue-600">
                {product.badge}
              </span>
            )}
          </div>

          <h3 className="mt-2 font-display text-base font-semibold text-slate-900 leading-snug">
            <button
              type="button"
              onClick={() => onSelect(product)}
              className="text-left hover:text-blue-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
            >
              {product.name}
            </button>
          </h3>

          <p className="mt-1.5 line-clamp-2 text-sm text-slate-600 leading-relaxed">
            {product.shortDesc}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 border-t border-slate-100 px-5 py-4">
        <div>
          <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
            {formatVnd(product.price)}
          </div>
          {product.originalPrice && product.originalPrice > product.price && (
            <div className="font-mono text-xs tabular-nums text-slate-400 line-through">
              {formatVnd(product.originalPrice)}
            </div>
          )}
          <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
            {outOfStock ? 'Tạm hết hàng' : `Còn ${product.stock} sản phẩm`}
          </div>
        </div>

        <button
          type="button"
          disabled={outOfStock}
          onClick={() => onAddToCart(product)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}</span>
        </button>
      </div>
    </article>
  );
}
