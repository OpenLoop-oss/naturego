'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCartStore } from '@/lib/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import {
  ShoppingBag,
  User,
  Search,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Package,
  Heart,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { itemCount } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      useCartStore.getState().fetchCart();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white shadow-2xl mx-auto mt-20 max-w-2xl rounded-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSearch} className="flex items-center">
                <Search className="ml-6 h-5 w-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-5 text-lg outline-none placeholder:text-gray-400"
                />
                <Button
                  type="submit"
                  className="mr-2 bg-green-600 hover:bg-green-700 rounded-xl px-6"
                >
                  Search
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glass Header */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-black/5 py-2'
            : 'bg-white/95 backdrop-blur-md py-3',
        )}
      >
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Logo size="md" />

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {[
                { href: '/products', label: 'Shop' },
                { href: '/products?categoryId=herbs-spices', label: 'Herbs' },
                { href: '/products?categoryId=essential-oils', label: 'Oils' },
                { href: '/products?categoryId=raw-honey', label: 'Honey' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    pathname === item.href || pathname.startsWith(item.href + '?')
                      ? 'text-green-700 bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="h-10 w-10 rounded-xl hover:bg-gray-100"
              >
                <Search className="h-5 w-5 text-gray-600" />
              </Button>

              {/* Wishlist */}
              <Link href="/wishlist">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl hover:bg-gray-100 relative"
                >
                  <Heart className="h-5 w-5 text-gray-600" />
                </Button>
              </Link>

              {/* Cart */}
              <Link href="/cart">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl hover:bg-gray-100 relative"
                >
                  <ShoppingBag className="h-5 w-5 text-gray-600" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white shadow-lg shadow-green-500/30">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* User Menu */}
              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-10 px-2 rounded-xl hover:bg-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-sm font-bold shadow">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-64 rounded-2xl border-0 bg-white/90 backdrop-blur-xl shadow-xl shadow-black/10 p-2"
                  >
                    <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 mb-2">
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer"
                      >
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">My Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/orders"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer"
                      >
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">My Orders</span>
                      </Link>
                    </DropdownMenuItem>
                    {user.role === 'ADMIN' && (
                      <>
                        <DropdownMenuSeparator className="my-2 bg-gray-100" />
                        <DropdownMenuItem asChild>
                          <Link
                            href="/admin/dashboard"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer"
                          >
                            <LayoutDashboard className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-gray-700">Admin Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator className="my-2 bg-gray-100" />
                    <DropdownMenuItem
                      onClick={logout}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden lg:flex items-center gap-2 ml-2">
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-900 px-4"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/25 rounded-xl"
                    >
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile Menu */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden h-10 w-10 rounded-xl hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl"
            >
              <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
                {[
                  { href: '/products', label: 'Shop All' },
                  { href: '/products?categoryId=herbs-spices', label: 'Herbs & Spices' },
                  { href: '/products?categoryId=essential-oils', label: 'Essential Oils' },
                  { href: '/products?categoryId=raw-honey', label: 'Raw Honey' },
                  { href: '/wishlist', label: 'Wishlist' },
                  { href: '/orders', label: 'My Orders' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'px-4 py-3 rounded-xl text-sm font-medium',
                      pathname === item.href ? 'text-green-700 bg-green-50' : 'text-gray-600',
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                {!isAuthenticated && (
                  <div className="flex flex-col gap-2 pt-4 mt-2 border-t border-gray-100">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-xl border-gray-200">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full rounded-xl bg-gradient-to-r from-green-600 to-green-700">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
