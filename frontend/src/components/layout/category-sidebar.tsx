'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
        <path d="M12 2C10 6 10 10 12 14" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 14L10 16" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 14L14 16" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 7C6 9 6 12 8 15" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 7C18 9 18 12 16 15" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 20C8 21 10 22 12 22C14 22 16 21 16 20" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 11H17" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 15H18" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    'essential-oils': (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <path d="M10 2H14" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11 2V6" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M13 2V6" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 8L7 19C7 20.5 8.5 22 12 22C15.5 22 17 20.5 17 19L16 8" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 14H15" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="16" r="2.5" fill={isActive ? 'rgba(255,255,255,0.3)' : '#e5e7eb'} stroke={strokeColor} strokeWidth="1" />
      </svg>
    ),
    'raw-honey': (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <path d="M7 8H17L19 22H5L7 8Z" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 8C7 5 9 3 12 3C15 3 17 5 17 8" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 13L12 11L15 13" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 18L12 16L15 18" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="20" r="1" fill={isActive ? 'rgba(255,255,255,0.4)' : '#fcd34d'} stroke={strokeColor} strokeWidth="0.5" />
      </svg>
    ),
    default: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <circle cx="12" cy="12" r="8" stroke={strokeColor} strokeWidth="1.5" />
        <path d="M12 8V12L14 14" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 6V4" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show sidebar on products page
  const showSidebar = pathname === '/products';

  const selectedCategory = (() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('categoryId') || params.get('category');
    }
    return null;
  })();

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

  if (!showSidebar) return null;

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
      <div
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className="hidden lg:block"
      >
        <aside
          className={cn(
            'sticky top-16 h-[calc(100vh-64px)] bg-white border-r border-gray-100 z-30 flex flex-col transition-all duration-300 ease-in-out overflow-hidden',
            isExpanded ? 'w-64' : 'w-20',
          )}
        >
          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
            {/* All Products */}
            <div className="mb-4">
              <Link
                href="/products"
                className={cn(
                  'flex items-center rounded-2xl transition-all duration-200',
                  isExpanded ? 'gap-4 p-4' : 'gap-0 p-3 justify-center',
                  allProductsActive ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <div className={cn('flex-shrink-0', isExpanded ? 'w-12 h-12' : 'w-10 h-10')}>
                  <AllProductsIcon isActive={allProductsActive} />
                </div>
                <span
                  className={cn(
                    'font-medium whitespace-nowrap transition-opacity duration-200',
                    isExpanded ? 'text-base opacity-100' : 'w-0 opacity-0 overflow-hidden',
                  )}
                >
                  All Products
                </span>
              </Link>
            </div>

            {/* Categories Label */}
            <div className={cn('mb-2', isExpanded ? 'px-4' : 'px-1 text-center')}>
              <h3
                className={cn(
                  'text-xs font-semibold text-gray-400 uppercase tracking-wider transition-opacity duration-200',
                  isExpanded ? '' : 'overflow-hidden',
                )}
              >
                {isExpanded ? 'Categories' : '...'}
              </h3>
            </div>

            {/* Categories List */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'bg-gray-100 rounded-2xl animate-pulse',
                      isExpanded ? 'h-16' : 'h-12 w-12 mx-auto',
                    )}
                  />
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
                        onMouseEnter={() => setHoveredId(category.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={cn(
                          'flex items-center rounded-2xl transition-all duration-200',
                          isExpanded ? 'gap-4 p-4' : 'gap-0 p-3 justify-center',
                          isActive
                            ? 'bg-green-600 text-white'
                            : isHovered
                              ? 'bg-gray-50'
                              : 'text-gray-600',
                        )}
                      >
                        <div className="flex-shrink-0">
                          <CategoryIcon slug={category.slug} isActive={isActive} />
                        </div>
                        <span
                          className={cn(
                            'font-medium text-sm whitespace-nowrap transition-opacity duration-200',
                            isExpanded ? 'opacity-100' : 'w-0 opacity-0 overflow-hidden',
                          )}
                        >
                          {category.name}
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full transition-opacity duration-200',
                            isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500',
                            isExpanded ? 'opacity-100' : 'w-0 opacity-0 overflow-hidden',
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
          <div className={cn('border-t flex-shrink-0 transition-all duration-200', isExpanded ? 'p-4' : 'p-3')}>
            <div className="text-xs text-gray-400 text-center whitespace-nowrap overflow-hidden">
              {isExpanded ? 'Pure & Natural' : '~'}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile sidebar (full width overlay) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden fixed top-16 left-0 h-[calc(100vh-64px)] w-72 bg-white border-r border-gray-100 z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <span className="font-bold text-gray-900">Shop by Category</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <Link
                href="/products"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 mb-4',
                  allProductsActive ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <div className="w-12 h-12 flex-shrink-0">
                  <AllProductsIcon isActive={allProductsActive} />
                </div>
                <span className="text-base font-medium">All Products</span>
              </Link>

              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Categories
              </h3>

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
                    return (
                      <Link
                        key={category.id}
                        href={`/products?categoryId=${category.id}`}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-2xl transition-all duration-200',
                          isActive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50',
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
                    );
                  })}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
