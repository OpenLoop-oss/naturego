"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  SlidersHorizontal,
  X,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Grid3X3,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, Product, Category } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCartStore } from "@/lib/stores/cart-store";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [wishlistItems, setWishlistItems] = useState<Set<string>>(new Set());
  const [wishlistLoading, setWishlistLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [gridSize, setGridSize] = useState<"small" | "medium">("medium");

  const { isAuthenticated } = useAuthStore();
  const { addItem: addToCart } = useCartStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          api.getProducts({
            page,
            limit: 12,
            search: search || undefined,
            categoryId: selectedCategory || undefined,
            sortBy,
            sortOrder,
          }),
          api.getCategories(),
        ]);

        setProducts(productsRes?.products || []);
        setCategories(categoriesRes || []);
        setTotalPages(productsRes?.pagination?.totalPages || 1);
        setTotalProducts(productsRes?.pagination?.total || 0);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, search, selectedCategory, sortBy, sortOrder]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("search") || "");
    setSelectedCategory(params.get("category") || "");
    setSortBy(params.get("sortBy") || "createdAt");
    setSortOrder((params.get("sortOrder") as "asc" | "desc") || "desc");
  }, []);

  const handleAddToCart = async (productId: string) => {
    if (!isAuthenticated) {
      toast.error("Please login to add items to cart");
      return;
    }

    setAddingToCart(productId);
    try {
      const success = await addToCart(productId, 1);
      if (success) {
        toast.success("Added to cart!");
      } else {
        toast.error("Failed to add to cart");
      }
    } catch (error) {
      toast.error("Failed to add to cart");
    } finally {
      setAddingToCart(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-6 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i} className="rounded-2xl overflow-hidden">
                <Skeleton className="aspect-square rounded-none" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-1/3" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-forest mb-2">
              All Products
            </h1>
            <p className="text-sage">
              {totalProducts} products found
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sage" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 w-64 rounded-xl border-sand/30 bg-white/80"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-sand/20" : ""}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 border border-sand/30 rounded-lg p-1">
              <Button
                variant={gridSize === "medium" ? "default" : "ghost"}
                size="icon"
                onClick={() => setGridSize("medium")}
                className="h-8 w-8"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={gridSize === "small" ? "default" : "ghost"}
                size="icon"
                onClick={() => setGridSize("small")}
                className="h-8 w-8"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="lg:w-64 space-y-6">
              <Card className="rounded-2xl border-sand/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-forest">Filters</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-sage hover:text-forest"
                    >
                      Clear all
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-forest mb-2 block">
                        Category
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setPage(1);
                        }}
                        className="w-full rounded-xl border border-sand/30 bg-white/80 px-3 py-2 text-sm"
                      >
                        <option value="">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-forest mb-2 block">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => {
                          setSortBy(e.target.value);
                          setPage(1);
                        }}
                        className="w-full rounded-xl border border-sand/30 bg-white/80 px-3 py-2 text-sm"
                      >
                        <option value="createdAt">Newest</option>
                        <option value="price">Price</option>
                        <option value="name">Name</option>
                      </select>
                    </div>

                    {sortBy === "price" && (
                      <div>
                        <label className="text-sm font-medium text-forest mb-2 block">
                          Sort Order
                        </label>
                        <div className="flex gap-2">
                          <Button
                            variant={sortOrder === "asc" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSortOrder("asc")}
                          >
                            Low to High
                          </Button>
                          <Button
                            variant={sortOrder === "desc" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSortOrder("desc")}
                          >
                            High to Low
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 mx-auto text-sage mb-4" />
                <p className="text-lg text-sage">No products found</p>
                {(search || selectedCategory) && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div
                className={
                  gridSize === "small"
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                }
              >
                {products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/products/${product.id}`}>
                      <Card className="rounded-2xl border-sand/30 hover:border-forest/30 hover:shadow-xl transition-all duration-300 overflow-hidden group">
                        <div className="relative overflow-hidden">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-sand/20 flex items-center justify-center">
                              <Leaf className="h-12 w-12 text-sage" />
                            </div>
                          )}
                          {product.stock === 0 && (
                            <Badge variant="destructive" className="absolute top-3 right-3">
                              Out of Stock
                            </Badge>
                          )}
                          {product.stock > 0 && product.stock <= 10 && (
                            <Badge variant="warning" className="absolute top-3 right-3">
                              Only {product.stock} left
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-forest mb-2 line-clamp-2">
                            {product.name}
                          </h3>
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-forest">
                              {formatPrice(product.price)}
                            </span>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleAddToCart(product.id);
                              }}
                              disabled={addingToCart === product.id || product.stock === 0}
                              className="rounded-xl bg-forest hover:bg-forest-light"
                            >
                              {addingToCart === product.id ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <ShoppingBag className="h-4 w-4" />
                                </motion.div>
                              ) : (
                                <ShoppingBag className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-4">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} className="rounded-2xl overflow-hidden">
              <Skeleton className="aspect-square rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsContent />
    </Suspense>
  );
}
