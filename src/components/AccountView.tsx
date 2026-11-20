import { LogOut, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { ActiveView } from './Header.tsx';

interface AccountViewProps {
  onNavigate: (view: ActiveView) => void;
}

export function AccountView({ onNavigate }: AccountViewProps) {
  const { firebaseUser, profile, loading, authError, loginWithGoogle, logout } =
    useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        {!firebaseUser ? (
          <div className="space-y-5">
            <h1 className="font-display text-2xl font-bold text-slate-900">
              Tài khoản khách hàng
            </h1>
            <p className="text-sm leading-relaxed text-slate-600">
              Đăng nhập bằng Google để lưu giỏ hàng đồng bộ, theo dõi toàn bộ lịch sử đơn hàng và gửi đánh giá sản phẩm đã trải nghiệm.
            </p>
            {authError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {authError}
              </div>
            )}
            <button
              type="button"
              onClick={loginWithGoogle}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors cursor-pointer"
            >
              <span>Đăng nhập với Google</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-slate-900">
                    {profile?.fullName || firebaseUser.displayName || 'Thành viên Kora'}
                  </h1>
                  <p className="text-sm text-slate-600">
                    {profile?.email || firebaseUser.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Đăng xuất</span>
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Vai trò tài khoản</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {profile?.role === 'admin' ? 'Quản trị viên hệ thống' : 'Khách hàng'}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Mã định danh</div>
                <div className="mt-1 truncate font-mono text-xs text-slate-700">
                  {firebaseUser.uid}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('orders')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                Xem đơn hàng của tôi
              </button>
              {profile?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span>Mở trang quản trị</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
