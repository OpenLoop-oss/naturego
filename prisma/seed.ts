import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'Admin@123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Garden Admin',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log(`Admin user created/updated: ${adminEmail}`);

  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});

  const categories = [
    {
      name: 'Raw Honey',
      slug: 'raw-honey',
      description: "Pure, unprocessed honey directly from nature's finest bees",
      imageUrl: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=300&fit=crop',
    },
    {
      name: 'Essential Oils',
      slug: 'essential-oils',
      description: '100% pure therapeutic grade essential oils for wellness',
      imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=300&fit=crop',
    },
    {
      name: 'Herbs & Spices',
      slug: 'herbs-spices',
      description: 'Organic dried herbs and exotic spices from around the world',
      imageUrl: 'https://images.unsplash.com/photo-1515023115689-589c33041d3c?w=400&h=300&fit=crop',
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    console.log(`Category created: ${cat.name}`);
  }

  const honey = await prisma.category.findUnique({ where: { slug: 'raw-honey' } });
  const oils = await prisma.category.findUnique({ where: { slug: 'essential-oils' } });
  const herbs = await prisma.category.findUnique({ where: { slug: 'herbs-spices' } });

  const products = [
    // Raw Honey
    {
      name: 'Wild Forest Honey',
      description:
        'Raw, unfiltered wild forest honey harvested from pristine mountain forests. Rich in antioxidants and natural enzymes.',
      price: 1999,
      stock: 45,
      imageUrl: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=400&fit=crop',
      categoryId: honey?.id,
    },
    {
      name: 'Manuka Honey UMF 15+',
      description:
        'Premium Manuka honey with verified UMF 15+ rating. Known for its powerful antibacterial properties.',
      price: 7499,
      stock: 20,
      imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop',
      categoryId: honey?.id,
    },
    {
      name: 'Pure Clover Honey',
      description: 'Classic clover honey with a mild, sweet flavor. Perfect for tea and baking.',
      price: 999,
      stock: 60,
      imageUrl: 'https://images.unsplash.com/photo-1587015990127-424b954e38b5?w=400&h=400&fit=crop',
      categoryId: honey?.id,
    },

    // Essential Oils
    {
      name: 'Lavender Essential Oil',
      description:
        '100% pure lavender essential oil. Perfect for aromatherapy and natural skincare.',
      price: 1199,
      stock: 55,
      imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop',
      categoryId: oils?.id,
    },
    {
      name: 'Tea Tree Essential Oil',
      description: 'Powerful tea tree oil with natural antiseptic properties. Ideal for skin care.',
      price: 999,
      stock: 48,
      imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop',
      categoryId: oils?.id,
    },
    {
      name: 'Peppermint Essential Oil',
      description: 'Cooling peppermint oil for headaches, digestion, and energy boost.',
      price: 899,
      stock: 52,
      imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400&h=400&fit=crop',
      categoryId: oils?.id,
    },

    // Herbs & Spices
    {
      name: 'Organic Turmeric Powder',
      description: 'Premium organic turmeric powder. High in curcumin content.',
      price: 899,
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=400&fit=crop',
      categoryId: herbs?.id,
    },
    {
      name: 'Chamomile Flowers',
      description: 'Pure chamomile flowers known for relaxation and better sleep.',
      price: 799,
      stock: 55,
      imageUrl: 'https://images.unsplash.com/photo-1515023115689-589c33041d3c?w=400&h=400&fit=crop',
      categoryId: herbs?.id,
    },
  ];

  for (const prod of products) {
    if (prod.categoryId) {
      await prisma.product.create({
        data: {
          name: prod.name,
          description: prod.description,
          price: prod.price,
          stock: prod.stock,
          imageUrl: prod.imageUrl,
          categoryId: prod.categoryId,
        },
      });
      console.log(`Product created: ${prod.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
