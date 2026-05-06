'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, Category } from '@/lib/api/client';

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.getCategories();
      const data = Array.isArray(response) ? response : response?.categories || [];
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <div className="container mx-auto px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-800 text-sm font-semibold mb-6">
                <Sun className="h-4 w-4" />
                <span>100% Organic & Natural</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-black text-gray-900 leading-tight">
                Discover the Power of{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
                  Pure Nature
                </span>
              </h1>

              <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-lg">
                Premium organic products sourced directly from sustainable farms. Experience the
                goodness of nature delivered fresh to your doorstep.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/products">
                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 h-12 text-base font-semibold"
                  >
                    Explore Products
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/products">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-2 border-green-600 text-green-700 hover:bg-green-50 rounded-full px-8 h-12 text-base font-semibold"
                  >
                    Browse Collection
                  </Button>
                </Link>
              </div>

              <div className="mt-12 flex items-center gap-8">
                <div className="text-center">
                  <p className="text-3xl font-black text-gray-900">500+</p>
                  <p className="text-sm text-gray-500 mt-1">Products</p>
                </div>
                <div className="w-px h-12 bg-gray-200" />
                <div className="text-center">
                  <p className="text-3xl font-black text-gray-900">10K+</p>
                  <p className="text-sm text-gray-500 mt-1">Customers</p>
                </div>
                <div className="w-px h-12 bg-gray-200" />
                <div className="text-center">
                  <p className="text-3xl font-black text-gray-900">50+</p>
                  <p className="text-sm text-gray-500 mt-1">Farms</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-green-200 to-emerald-200 rounded-3xl blur-2xl opacity-40" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop"
                  alt="Fresh organic vegetables and fruits"
                  className="w-full h-auto"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-black text-gray-900">Shop by Category</h2>
            <p className="mt-4 text-gray-600 max-w-xl mx-auto">
              Explore our wide range of premium organic products
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, i) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/products?categoryId=${category.id}`}>
                  <div className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg">
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-300 text-4xl font-bold">
                          {category.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-lg font-bold text-white">{category.name}</h3>
                      {category.productCount !== undefined && (
                        <p className="text-sm text-white/70">{category.productCount} products</p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-green-700">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-black text-white">Ready to Go Natural?</h2>
          <p className="mt-4 text-green-100 max-w-xl mx-auto">
            Join thousands of happy customers who have made the switch to organic living.
          </p>
          <Link href="/products">
            <Button
              size="lg"
              className="mt-8 bg-white text-green-700 hover:bg-green-50 rounded-full px-10 h-14 text-lg font-bold"
            >
              Start Shopping
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
