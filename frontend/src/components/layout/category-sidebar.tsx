'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { api, Category } from '@/lib/api/client';
import { Menu, X, Package } from 'lucide-react';

function AllProductsIcon({ isActive }: { isActive: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
      <circle cx="24" cy="24" r="20" className={isActive ? 'fill-white/10' : 'fill-gray-100'} />
      <path
        d="M16 18h16M16 24h16M16 30h10"
        stroke={isActive ? 'rgba(255,255,255,0.7)' : '#9ca3af'}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CategoryIcon({ slug, isActive }: { slug: string; isActive: boolean }) {
  const strokeColor = isActive ? 'rgba(255,255,255,0.8)' : '#9ca3af';

  const icons: Record<string, React.ReactNode> = {
    'herbs-spices': (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <path
          d="M12 3c-1 2-1 4-1 6s1 4 2 5c1-1 2-2 2-5s0-4-1-6"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M12 14v7" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M9 18c-1.5 1-2 2-2 3M15 18c1.5 1 2 2 2 3"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    'essential-oils': (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <path
          d="M9 3h6M10 3v4M14 3v4"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8 7h8l1 14H7L8 7z"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="13" r="2" stroke={strokeColor} strokeWidth="1.5" />
      </svg>
    ),
    'raw-honey': (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <path
          d="M12 2l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1 2-4z"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    default: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <circle cx="12" cy="12" r="8" stroke={strokeColor} strokeWidth="1.5" />
        <path d="M12 8v4l2 2" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  };

  const icon = icons[slug] || icons.default;

  return (
    <div
      className={cn(
        'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200',
        isActive ? 'bg-green-600 text-white' : 'bg-gray-50 text-gray-500',
      )}
    >
      {icon}
    </div>
  );
}

export function CategorySidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const selectedCategory = searchParams.get('categoryId') || searchParams.get('category');
  const allProductsActive = !selectedCategory && pathname === '/products';

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.getCategories();
      const data = Array.isArray(response) ? response : response?.categories || [];
      setCategories(data);
    } catch (error) {
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-green-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-green-700 transition-all active:scale-95"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-100 z-50 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-white flex-shrink-0">
          <span className="font-bold text-gray-900">Shop</span>
          <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* All Products */}
          <div className="mb-6">
            <Link
              href="/products"
              onClick={() => setMobileOpen(false)}
              onMouseEnter={() => setHoveredId('all')}
              onMouseLeave={() => setHoveredId(null)}
              className={cn(
                'flex items-center gap-4 p-4 rounded-2xl transition-all duration-200',
                allProductsActive ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-50',
              )}
            >
              <div className="w-12 h-12 flex-shrink-0">
                <AllProductsIcon isActive={allProductsActive} />
              </div>
              <span className="text-base font-medium">All Products</span>
            </Link>
          </div>

          {/* Categories Label */}
          <div className="mb-3">
            <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Categories
            </h3>
          </div>

          {/* Categories List */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No categories</p>
            </div>
          ) : (
            <div className="space-y-1">
              {categories.map((category) => {
                const isActive = selectedCategory === category.id;
                const isHovered = hoveredId === category.id;
                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Link
                      href={`/products?categoryId=${category.id}`}
                      onClick={() => setMobileOpen(false)}
                      onMouseEnter={() => setHoveredId(category.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-2xl transition-all duration-200',
                        isActive
                          ? 'bg-green-600 text-white'
                          : isHovered
                            ? 'bg-gray-50'
                            : 'text-gray-600',
                      )}
                    >
                      <CategoryIcon slug={category.slug} isActive={isActive} />
                      <span className="flex-1 font-medium text-sm">{category.name}</span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {category.productCount || 0}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex-shrink-0">
          <div className="text-xs text-gray-400 text-center">Pure & Natural</div>
        </div>
      </aside>
    </>
  );
}
