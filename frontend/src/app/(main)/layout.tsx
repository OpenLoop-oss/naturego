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

  // Only show sidebar on products page
  const showSidebar = pathname === '/products';

  useEffect(() => {
    if (isHydrated) {
      fetchUser();
      fetchCart();
    }
  }, [isHydrated, fetchUser, fetchCart]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex pt-16">
        {showSidebar && <CategorySidebar />}
        <main className="flex-1 min-h-[calc(100vh-64px)]">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
