const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MASTER_DATA = {
    "venues": [
        { "id": "venue-caviar-bull", "name": "Caviar & Bull", "currency": "EUR", "timezone": "Europe/Malta" },
        { "id": "venue-don-royale", "name": "Don Royale", "currency": "EUR", "timezone": "Europe/Malta" }
    ],
    "users": [
        { "id": "user-cb-owner", "email": "marvin@mggroup.com", "name": "Marvin Gauci", "role": "SUPER_ADMIN", "pin": "1234" },
        { "id": "user-cb-manager", "email": "sarah.c@mggroup.com", "name": "Sarah Camilleri", "role": "BRANCH_MANAGER", "pin": "2345" },
        { "id": "user-cb-server1", "email": "maria.v@mggroup.com", "name": "Maria Vella", "role": "STAFF", "pin": "1111" }
    ],
    "inventory": [
        { "id": "ing-oscietra-30g", "name": "Oscietra Caviar 30g", "unit": "tin", "priceCents": 9500 },
        { "id": "ing-ribeye-raw", "name": "Prime Ribeye (Raw)", "unit": "kg", "priceCents": 3200 },
        { "id": "ing-truffle-oil", "name": "Black Truffle Oil", "unit": "bottle", "priceCents": 1850 }
    ]
};

async function main() {
    console.log('🌱 Starting Surgical Hydration (JS Mode)...');

    // 1. Ensure Organization (MG Group)
    const org = await prisma.organization.upsert({
        where: { slug: 'mg-group' },
        update: {},
        create: {
            name: 'MG Group',
            slug: 'mg-group',
            plan: 'ENTERPRISE'
        }
    });

    // 2. Ensure Brand and Venues (Branches)
    const brand = await prisma.brand.upsert({
        where: { id: 'brand-main' },
        update: {},
        create: {
            id: 'brand-main',
            name: 'MG Restaurants',
            organizationId: org.id
        }
    });

    for (const v of MASTER_DATA.venues) {
        await prisma.branch.upsert({
            where: { id: v.id },
            update: { name: v.name },
            create: {
                id: v.id,
                name: v.name,
                currency: v.currency,
                timezone: v.timezone,
                brandId: brand.id
            }
        });
        console.log(`✅ Upserted Venue: ${v.name}`);
    }

    // 3. Hydrate Staff (Workers)
    for (const u of MASTER_DATA.users) {
        const names = u.name.split(' ');
        await prisma.user.upsert({
            where: { email: u.email },
            update: { role: u.role },
            create: {
                id: u.id,
                email: u.email,
                firstName: names[0],
                lastName: names[1] || '',
                role: u.role,
                pin: u.pin,
                organizationId: org.id,
                permissions: "[]" // Default empty JSON array string for SQLite
            }
        });
        console.log(`👤 Upserted User: ${u.name}`);
    }

    // 4. Hydrate Inventory (Ingredients) - Basic
    const supplier = await prisma.supplier.upsert({
        where: { id: 'sup-main' },
        update: {},
        create: {
            id: 'sup-main',
            name: 'Main Supplier',
            organizationId: org.id
        }
    });

    for (const ing of MASTER_DATA.inventory) {
        await prisma.ingredient.upsert({
            where: { id: ing.id },
            update: { priceCents: ing.priceCents },
            create: {
                id: ing.id,
                name: ing.name,
                purchaseUnit: ing.unit,
                stockUnit: 'g', // Default
                conversionRate: 1000,
                priceCents: ing.priceCents,
                organizationId: org.id,
                supplierId: supplier.id
            }
        });
        console.log(`🥩 Upserted Ingredient: ${ing.name}`);
    }

    console.log('✅ Surgical Hydration Complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
