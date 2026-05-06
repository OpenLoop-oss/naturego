'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Check,
  Loader2,
  Home,
  Building,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/stores/auth-store';
import { api, Address, CreateAddressInput } from '@/lib/api/client';

const labelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Work: Briefcase,
  Office: Building,
};

export default function AddressesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateAddressInput>({
    label: 'Home',
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setAddresses([]);
      router.push('/login');
      return;
    }
    fetchAddresses();
  }, [isAuthenticated, router]);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const response = await api.getAddresses();
      const addrList = Array.isArray(response) ? response : response?.addresses || [];
      setAddresses(addrList);
    } catch {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingAddress) {
        await api.updateAddress(editingAddress.id, formData);
        toast.success('Address updated successfully');
      } else {
        await api.createAddress(formData);
        toast.success('Address added successfully');
      }
      setShowForm(false);
      setEditingAddress(null);
      resetForm();
      fetchAddresses();
    } catch {
      toast.error(editingAddress ? 'Failed to update address' : 'Failed to add address');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingAddress(id);
    try {
      await api.deleteAddress(id);
      toast.success('Address deleted');
      fetchAddresses();
    } catch {
      toast.error('Failed to delete address');
    } finally {
      setDeletingAddress(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.setDefaultAddress(id);
      toast.success('Default address updated');
      fetchAddresses();
    } catch {
      toast.error('Failed to update default address');
    }
  };

  const resetForm = () => {
    setFormData({
      label: 'Home',
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      isDefault: false,
    });
  };

  const openAddForm = () => {
    resetForm();
    setEditingAddress(null);
    setShowForm(true);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Addresses</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your shipping addresses for faster checkout
            </p>
          </div>
          <Button onClick={openAddForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Address
          </Button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold">No addresses saved</h2>
              <p className="text-muted-foreground mt-2">
                Add your shipping address to speed up checkout
              </p>
              <Button className="mt-6" onClick={openAddForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {addresses.map((address) => {
              const Icon = labelIcons[address.label] || MapPin;
              return (
                <Card
                  key={address.id}
                  className={`relative animate-fade-in ${
                    address.isDefault ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="font-medium">{address.label}</span>
                        {address.isDefault && (
                          <Badge variant="default" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(address)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(address.id)}
                          disabled={deletingAddress === address.id}
                        >
                          {deletingAddress === address.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1 text-sm">
                      <p className="font-medium">{address.fullName}</p>
                      <p className="text-muted-foreground">{address.addressLine1}</p>
                      {address.addressLine2 && (
                        <p className="text-muted-foreground">{address.addressLine2}</p>
                      )}
                      <p className="text-muted-foreground">
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p className="text-muted-foreground mt-2">
                        <span className="font-medium">Phone:</span> {address.phone}
                      </p>
                    </div>

                    {!address.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full"
                        onClick={() => handleSetDefault(address.id)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Set as Default
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Address Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="label">Label</Label>
                <div className="flex gap-2 mt-2">
                  {['Home', 'Work', 'Office'].map((l) => (
                    <Button
                      key={l}
                      type="button"
                      variant={formData.label === l ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, label: l })}
                    >
                      {l === 'Home' && <Home className="h-4 w-4 mr-1" />}
                      {l === 'Work' && <Briefcase className="h-4 w-4 mr-1" />}
                      {l === 'Office' && <Building className="h-4 w-4 mr-1" />}
                      {l}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Rahul Sharma"
                  required
                  className="mt-1"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="9876543210"
                  required
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="123 Green Valley, Sector 15"
                  required
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Near Organic Market"
                  className="mt-1"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Mumbai"
                  required
                  className="mt-1"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Maharashtra"
                  required
                  className="mt-1"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="400001"
                  required
                  className="mt-1"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingAddress(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingAddress ? 'Update Address' : 'Save Address'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
