import { PrismaClient, VenueType, ServiceStyle, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashPin(pin: string) {
  return bcrypt.hash(pin, 10);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.reviewRisk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.stockLedger.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.kDSTicket.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.table.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();
  await prisma.venue.deleteMany();

  // ============================================
  // VENUES - Marvin Gauci Group
  // ============================================

  const caviarBull = await prisma.venue.create({
    data: {
      name: 'Caviar & Bull',
      type: VenueType.FINE_DINING,
      serviceStyle: ServiceStyle.TABLE_SERVICE,
      timezone: 'Europe/Malta',
      address: 'Vault 17, Pjazza Kastilja, Valletta, Malta',
      phone: '+356 2122 4596',
      config: {
        openingHours: {
          monday: { open: '18:00', close: '23:00' },
          tuesday: { open: '18:00', close: '23:00' },
          wednesday: { open: '18:00', close: '23:00' },
          thursday: { open: '18:00', close: '23:00' },
          friday: { open: '18:00', close: '23:30' },
          saturday: { open: '18:00', close: '23:30' },
          sunday: 'closed',
        },
        taxRate: 0.18,
        currency: 'EUR',
      },
    },
  });

  const donRoyale = await prisma.venue.create({
    data: {
      name: 'Don Royale',
      type: VenueType.CASUAL,
      serviceStyle: ServiceStyle.TABLE_SERVICE,
      timezone: 'Europe/Malta',
      address: 'Triq il-Batterija, St. Pauls Bay, Malta',
      phone: '+356 2157 3795',
      config: {
        openingHours: {
          monday: { open: '12:00', close: '15:00', eveningOpen: '18:00', eveningClose: '22:30' },
          tuesday: { open: '12:00', close: '15:00', eveningOpen: '18:00', eveningClose: '22:30' },
          wednesday: { open: '12:00', close: '15:00', eveningOpen: '18:00', eveningClose: '22:30' },
          thursday: { open: '12:00', close: '15:00', eveningOpen: '18:00', eveningClose: '22:30' },
          friday: { open: '12:00', close: '15:00', eveningOpen: '18:00', eveningClose: '23:00' },
          saturday: { open: '12:00', close: '23:00' },
          sunday: { open: '12:00', close: '22:30' },
        },
        taxRate: 0.18,
        currency: 'EUR',
      },
    },
  });

  const soleTarragon = await prisma.venue.create({
    data: {
      name: 'Sole by Tarragon',
      type: VenueType.FINE_DINING,
      serviceStyle: ServiceStyle.TABLE_SERVICE,
      timezone: 'Europe/Malta',
      address: 'Radisson Blu Resort, St. Julians, Malta',
      phone: '+356 2137 4894',
      config: {
        openingHours: {
          monday: 'closed',
          tuesday: 'closed',
          wednesday: { open: '19:00', close: '22:30' },
          thursday: { open: '19:00', close: '22:30' },
          friday: { open: '19:00', close: '22:30' },
          saturday: { open: '19:00', close: '22:30' },
          sunday: { open: '19:00', close: '22:30' },
        },
        taxRate: 0.18,
        currency: 'EUR',
      },
    },
  });

  console.log('✅ Created 3 venues');

  // ============================================
  // USERS - Staff for each venue
  // ============================================

  const ownerPin = await hashPin('1234');
  const managerPin = await hashPin('2345');
  const staffPin = await hashPin('1111');

  // Caviar & Bull Staff
  await prisma.user.createMany({
    data: [
      { username: 'owner', role: UserRole.OWNER, pinHash: ownerPin, venueId: caviarBull.id },
      { username: 'cb_manager', role: UserRole.MANAGER, pinHash: managerPin, venueId: caviarBull.id },
      { username: 'cb_server1', role: UserRole.SERVER, pinHash: staffPin, venueId: caviarBull.id },
      { username: 'cb_kitchen1', role: UserRole.KITCHEN, pinHash: staffPin, venueId: caviarBull.id },
    ],
  });

  // Don Royale Staff
  await prisma.user.createMany({
    data: [
      { username: 'dr_manager', role: UserRole.MANAGER, pinHash: managerPin, venueId: donRoyale.id },
      { username: 'dr_server1', role: UserRole.SERVER, pinHash: staffPin, venueId: donRoyale.id },
      { username: 'dr_server2', role: UserRole.SERVER, pinHash: staffPin, venueId: donRoyale.id },
      { username: 'dr_kitchen1', role: UserRole.KITCHEN, pinHash: staffPin, venueId: donRoyale.id },
    ],
  });

  // Sole by Tarragon Staff
  await prisma.user.createMany({
    data: [
      { username: 'sole_manager', role: UserRole.MANAGER, pinHash: managerPin, venueId: soleTarragon.id },
      { username: 'sole_server1', role: UserRole.SERVER, pinHash: staffPin, venueId: soleTarragon.id },
      { username: 'sole_kitchen1', role: UserRole.KITCHEN, pinHash: staffPin, venueId: soleTarragon.id },
    ],
  });

  console.log('✅ Created users for all venues');

  // ============================================
  // ZONES & TABLES
  // ============================================

  // Caviar & Bull - Small intimate venue
  const cbMainZone = await prisma.zone.create({
    data: {
      name: 'Main Dining',
      venueId: caviarBull.id,
      tables: {
        create: [
          { name: 'Table 1', seats: 2 },
          { name: 'Table 2', seats: 2 },
          { name: 'Table 3', seats: 4 },
          { name: 'Table 4', seats: 4 },
          { name: 'Table 5', seats: 6 },
        ],
      },
    },
  });

  // Don Royale - Larger casual venue
  const drIndoorZone = await prisma.zone.create({
    data: {
      name: 'Indoor Seating',
      venueId: donRoyale.id,
      tables: {
        create: [
          { name: 'T1', seats: 4 },
          { name: 'T2', seats: 4 },
          { name: 'T3', seats: 6 },
          { name: 'T4', seats: 2 },
          { name: 'T5', seats: 4 },
          { name: 'T6', seats: 8 },
        ],
      },
    },
  });

  const drOutdoorZone = await prisma.zone.create({
    data: {
      name: 'Terrace',
      venueId: donRoyale.id,
      tables: {
        create: [
          { name: 'O1', seats: 4 },
          { name: 'O2', seats: 4 },
          { name: 'O3', seats: 2 },
          { name: 'O4', seats: 2 },
        ],
      },
    },
  });

  // Sole by Tarragon - Fine dining
  const soleMainZone = await prisma.zone.create({
    data: {
      name: 'Main Dining Room',
      venueId: soleTarragon.id,
      tables: {
        create: [
          { name: 'A1', seats: 2 },
          { name: 'A2', seats: 2 },
          { name: 'A3', seats: 4 },
          { name: 'A4', seats: 4 },
          { name: 'A5', seats: 6 },
          { name: 'A6', seats: 8 },
        ],
      },
    },
  });

  console.log('✅ Created zones and tables');

  // ============================================
  // MENUS
  // ============================================

  // Caviar & Bull Menu
  const cbMenu = await prisma.menu.create({
    data: {
      name: 'Dinner Menu',
      isActive: true,
      venueId: caviarBull.id,
    },
  });

  const cbStarters = await prisma.menuCategory.create({
    data: {
      name: 'Starters',
      sortOrder: 1,
      menuId: cbMenu.id,
      items: {
        create: [
          {
            name: 'Russian Oscietra Caviar',
            description: '30g served with blinis, crème fraîche, and traditional accompaniments',
            price: 125.0,
            prepTime: 5,
            allergens: ['dairy', 'gluten', 'fish'],
            tags: ['signature', 'luxury'],
          },
          {
            name: 'Oysters on Ice',
            description: 'Fresh Gillardeau oysters (6pc) with mignonette and lemon',
            price: 32.0,
            prepTime: 5,
            allergens: ['shellfish'],
            tags: ['fresh', 'raw'],
          },
          {
            name: 'Beef Tartare',
            description: 'Hand-cut Irish beef, quail egg yolk, capers, and toasted sourdough',
            price: 24.0,
            prepTime: 8,
            allergens: ['egg', 'gluten', 'mustard'],
            tags: ['raw'],
          },
        ],
      },
    },
  });

  const cbMains = await prisma.menuCategory.create({
    data: {
      name: 'Mains',
      sortOrder: 2,
      menuId: cbMenu.id,
      items: {
        create: [
          {
            name: 'Wagyu Beef Tenderloin',
            description: 'A5 Wagyu, truffle mash, seasonal vegetables, red wine jus',
            price: 89.0,
            prepTime: 25,
            allergens: ['dairy'],
            tags: ['signature', 'premium'],
          },
          {
            name: 'Mediterranean Sea Bass',
            description: 'Whole roasted sea bass, herb oil, grilled vegetables',
            price: 42.0,
            prepTime: 20,
            allergens: ['fish'],
            tags: ['fresh', 'local'],
          },
          {
            name: 'Wild Mushroom Risotto',
            description: 'Carnaroli rice, porcini, truffle oil, parmesan',
            price: 28.0,
            prepTime: 18,
            allergens: ['dairy', 'gluten'],
            tags: ['vegetarian'],
          },
        ],
      },
    },
  });

  const cbDesserts = await prisma.menuCategory.create({
    data: {
      name: 'Desserts',
      sortOrder: 3,
      menuId: cbMenu.id,
      items: {
        create: [
          {
            name: 'Dark Chocolate Soufflé',
            description: 'Warm soufflé with vanilla ice cream (20 min prep)',
            price: 16.0,
            prepTime: 20,
            allergens: ['dairy', 'egg', 'gluten'],
            tags: ['signature'],
          },
          {
            name: 'Tiramisu',
            description: 'Classic Italian dessert with mascarpone and espresso',
            price: 12.0,
            prepTime: 5,
            allergens: ['dairy', 'egg', 'gluten'],
            tags: [],
          },
        ],
      },
    },
  });

  // Don Royale Menu
  const drMenu = await prisma.menu.create({
    data: {
      name: 'All Day Menu',
      isActive: true,
      venueId: donRoyale.id,
    },
  });

  const drStarters = await prisma.menuCategory.create({
    data: {
      name: 'Starters & Sharing',
      sortOrder: 1,
      menuId: drMenu.id,
      items: {
        create: [
          {
            name: 'Bruschetta Classica',
            description: 'Fresh tomatoes, basil, garlic on toasted ciabatta',
            price: 9.5,
            prepTime: 8,
            allergens: ['gluten'],
            tags: ['vegetarian', 'vegan-option'],
          },
          {
            name: 'Calamari Fritti',
            description: 'Crispy fried squid with aioli and lemon',
            price: 14.0,
            prepTime: 10,
            allergens: ['seafood', 'gluten', 'egg'],
            tags: [],
          },
          {
            name: 'Burrata e Pomodoro',
            description: 'Creamy burrata, heirloom tomatoes, basil pesto',
            price: 16.0,
            prepTime: 5,
            allergens: ['dairy', 'nuts'],
            tags: ['vegetarian'],
          },
        ],
      },
    },
  });

  const drPizza = await prisma.menuCategory.create({
    data: {
      name: 'Wood-Fired Pizza',
      sortOrder: 2,
      menuId: drMenu.id,
      items: {
        create: [
          {
            name: 'Margherita',
            description: 'San Marzano tomato, mozzarella, basil',
            price: 14.0,
            prepTime: 12,
            allergens: ['gluten', 'dairy'],
            tags: ['vegetarian', 'classic'],
          },
          {
            name: 'Diavola',
            description: 'Tomato, mozzarella, spicy salami, chili oil',
            price: 17.0,
            prepTime: 12,
            allergens: ['gluten', 'dairy'],
            tags: ['spicy'],
          },
          {
            name: 'Quattro Formaggi',
            description: 'Mozzarella, gorgonzola, parmesan, ricotta',
            price: 18.0,
            prepTime: 12,
            allergens: ['gluten', 'dairy'],
            tags: ['vegetarian'],
          },
        ],
      },
    },
  });

  const drPasta = await prisma.menuCategory.create({
    data: {
      name: 'Fresh Pasta',
      sortOrder: 3,
      menuId: drMenu.id,
      items: {
        create: [
          {
            name: 'Carbonara',
            description: 'Guanciale, egg yolk, pecorino, black pepper',
            price: 16.0,
            prepTime: 15,
            allergens: ['gluten', 'dairy', 'egg'],
            tags: ['classic'],
          },
          {
            name: 'Seafood Linguine',
            description: 'Prawns, mussels, clams, white wine, garlic',
            price: 22.0,
            prepTime: 18,
            allergens: ['gluten', 'shellfish'],
            tags: [],
          },
          {
            name: 'Pesto Genovese',
            description: 'Fresh basil pesto, pine nuts, parmesan',
            price: 15.0,
            prepTime: 12,
            allergens: ['gluten', 'dairy', 'nuts'],
            tags: ['vegetarian'],
          },
        ],
      },
    },
  });

  // Sole by Tarragon Menu
  const soleMenu = await prisma.menu.create({
    data: {
      name: 'Tasting Menu',
      isActive: true,
      venueId: soleTarragon.id,
    },
  });

  const soleCourses = await prisma.menuCategory.create({
    data: {
      name: 'Tasting Courses',
      sortOrder: 1,
      menuId: soleMenu.id,
      items: {
        create: [
          {
            name: 'Amuse-Bouche',
            description: "Chef's daily selection of small bites",
            price: 0.0,
            prepTime: 5,
            allergens: ['varies'],
            tags: ['tasting-menu'],
          },
          {
            name: 'Scallop Crudo',
            description: 'Hokkaido scallops, citrus, micro herbs',
            price: 0.0,
            prepTime: 10,
            allergens: ['shellfish'],
            tags: ['tasting-menu', 'raw'],
          },
          {
            name: 'Lobster Bisque',
            description: 'Rich lobster consommé, cognac cream',
            price: 0.0,
            prepTime: 8,
            allergens: ['shellfish', 'dairy', 'alcohol'],
            tags: ['tasting-menu'],
          },
          {
            name: 'Turbot Fillet',
            description: 'Pan-seared turbot, saffron beurre blanc, samphire',
            price: 0.0,
            prepTime: 18,
            allergens: ['fish', 'dairy'],
            tags: ['tasting-menu', 'signature'],
          },
          {
            name: 'Lamb Rack',
            description: 'Maltese lamb, herb crust, ratatouille, jus',
            price: 0.0,
            prepTime: 22,
            allergens: ['gluten'],
            tags: ['tasting-menu', 'local'],
          },
          {
            name: 'Cheese Selection',
            description: 'Artisan European cheeses, quince paste, crackers',
            price: 0.0,
            prepTime: 5,
            allergens: ['dairy', 'gluten', 'nuts'],
            tags: ['tasting-menu'],
          },
          {
            name: 'Lemon Tart',
            description: 'Citrus tart, meringue, raspberry sorbet',
            price: 0.0,
            prepTime: 5,
            allergens: ['gluten', 'dairy', 'egg'],
            tags: ['tasting-menu'],
          },
        ],
      },
    },
  });

  const soleWines = await prisma.menuCategory.create({
    data: {
      name: 'Wine Pairing',
      sortOrder: 2,
      menuId: soleMenu.id,
      items: {
        create: [
          {
            name: 'Standard Wine Pairing',
            description: '5 glasses paired with tasting courses',
            price: 65.0,
            prepTime: 0,
            allergens: ['sulfites'],
            tags: ['wine', 'optional'],
          },
          {
            name: 'Premium Wine Pairing',
            description: '5 premium selections from reserve cellar',
            price: 125.0,
            prepTime: 0,
            allergens: ['sulfites'],
            tags: ['wine', 'optional', 'premium'],
          },
        ],
      },
    },
  });

  console.log('✅ Created menus with detailed items');

  // ============================================
  // INVENTORY - Sample items
  // ============================================

  await prisma.inventoryItem.createMany({
    data: [
      { name: 'Wagyu Beef', category: 'Protein', unit: 'kg', quantity: 5.5, minStock: 2, venueId: caviarBull.id },
      { name: 'Olive Oil', category: 'Pantry', unit: 'liters', quantity: 10, minStock: 3, venueId: caviarBull.id },
      { name: 'Pizza Dough', category: 'Dough', unit: 'balls', quantity: 50, minStock: 20, venueId: donRoyale.id },
      { name: 'Mozzarella', category: 'Dairy', unit: 'kg', quantity: 12, minStock: 5, venueId: donRoyale.id },
      { name: 'Fresh Turbot', category: 'Seafood', unit: 'kg', quantity: 3, minStock: 1, venueId: soleTarragon.id },
    ],
  });

  console.log('✅ Created sample inventory');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('   Owner PIN: 1234');
  console.log('   Manager PIN: 2345');
  console.log('   Staff PIN: 1111');
  console.log('\n🏢 Venues:');
  console.log(`   - Caviar & Bull (ID: ${caviarBull.id})`);
  console.log(`   - Don Royale (ID: ${donRoyale.id})`);
  console.log(`   - Sole by Tarragon (ID: ${soleTarragon.id})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
