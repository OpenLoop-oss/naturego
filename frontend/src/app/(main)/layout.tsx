'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CategorySidebar } from '@/components/layout/category-sidebar';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCartStore } from '@/lib/stores/cart-store';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isHydrated, fetchUser } = useAuthStore();
  const { fetchCart } = useCartStore();

  const showSidebar = pathname === '/products' || pathname.startsWith('/products?');

  useEffect(() => {
    if (isHydrated) {
      fetchUser();
      fetchCart();
    }
  }, [isHydrated, fetchUser, fetchCart]);

  if (showSidebar) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex pt-16">
          <CategorySidebar />
          <main className="flex-1 min-h-[calc(100vh-64px)]">{children}</main>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
