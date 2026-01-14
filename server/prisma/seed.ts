import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  { name: 'Food & Dining', icon: '🍕', color: '#FF6B6B' },
  { name: 'Transportation', icon: '🚗', color: '#4ECDC4' },
  { name: 'Shopping', icon: '🛍️', color: '#FF00FF' },
  { name: 'Entertainment', icon: '🎬', color: '#00D4FF' },
  { name: 'Bills & Utilities', icon: '💡', color: '#FFD700' },
  { name: 'Health', icon: '🏥', color: '#00FF88' },
  { name: 'Travel', icon: '✈️', color: '#9B59B6' },
  { name: 'Education', icon: '📚', color: '#3498DB' },
  { name: 'Groceries', icon: '🛒', color: '#2ECC71' },
  { name: 'Other', icon: '📦', color: '#888888' },
];

async function main() {
  console.log('Seeding database...');

  // Create default categories
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: {
        name_userId: {
          name: category.name,
          userId: null as unknown as string, // For default categories, userId is null
        },
      },
      update: {
        icon: category.icon,
        color: category.color,
      },
      create: {
        name: category.name,
        icon: category.icon,
        color: category.color,
        isDefault: true,
        userId: null,
      },
    });
    console.log(`Created/updated category: ${category.name}`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
