const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 IGNITION: Seeding Master Protocol v18.0 Data...');

    // 1. Subscription Plans (The Product Catalog)
    const plans = [
        {
            name: 'Starter',
            basePrice: 0.0,
            features: JSON.stringify(['POS', 'INVENTORY_BASIC']),
            limits: JSON.stringify({ users: 3, locations: 1 })
        },
        {
            name: 'Pro',
            basePrice: 49.0,
            features: JSON.stringify(['POS', 'INVENTORY_ADVANCED', 'HR_BASIC', 'WEB_BUILDER']),
            limits: JSON.stringify({ users: 10, locations: 3 })
        },
        {
            name: 'Enterprise',
            basePrice: 299.0,
            features: JSON.stringify(['ALL_ACCESS', 'AI_SUITE', 'RADAR', 'VOICE']),
            limits: JSON.stringify({ users: 999, locations: 999 })
        }
    ];

    for (const p of plans) {
        await prisma.subscriptionPlan.upsert({
            where: { name: p.name },
            update: { basePrice: p.basePrice, features: p.features },
            create: p
        });
        console.log(`💳 Plan Upserted: ${p.name}`);
    }

    // 2. AI Broker Config (The Monetization Engine)
    await prisma.aiBrokerConfig.upsert({
        where: { id: 'broker-gemini-v1' },
        update: {},
        create: {
            id: 'broker-gemini-v1',
            provider: 'GOOGLE',
            model: 'gemini-1.5-flash',
            costPerUnit: 0.0001, // $0.10 per 1M (approx)
            sellPricePerUnit: 0.0003, // 3x Markup
            unitType: 'TOKEN'
        }
    });
    console.log('🧠 AI Broker Configured: Gemini 1.5 Flash (3x Retail Markup)');

    // 3. Organization Configuration (The Tenant)
    // We assume 'mg-group' exists from the main seed.
    const org = await prisma.organization.findUnique({ where: { slug: 'mg-group' } });

    if (org) {
        // A. Module Flags
        await prisma.moduleConfig.upsert({
            where: { organizationId: org.id },
            update: {
                hasWeb: true,
                hasVoice: true,
                hasStudio: true,
                hasRadar: true,
                hasCrm: true
            },
            create: {
                organizationId: org.id,
                hasWeb: true,
                hasVoice: true,
                hasStudio: true,
                hasRadar: true,
                hasCrm: true
            }
        });

        // B. Voice Config
        await prisma.voiceConfig.upsert({
            where: { organizationId: org.id },
            update: {},
            create: {
                organizationId: org.id,
                persona: 'PROFESSIONAL',
                isEnabled: true,
                forwardNumber: '+356 9999 9999'
            }
        });

        console.log(`🏢 Organization '${org.name}' Upgraded to Master Protocol v18.0 (All Modules Active)`);
    } else {
        console.warn('⚠️ MG Group Organization not found. Please run the base seed first.');
    }

    console.log('✅ SEED COMPLETE: System is commercially ready.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
