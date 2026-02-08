import { PrismaClient, PlanType, AIProvider } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting Production Seed...')

    // 1. Subscription Plans
    const plans = [
        {
            name: 'Starter',
            basePrice: 0,
            features: ['WEB', 'OPS'],
            limits: { devices: 1, users: 3, storageMB: 500 }
        },
        {
            name: 'Pro',
            basePrice: 99.00,
            features: ['WEB', 'OPS', 'VOICE', 'KITCHEN'],
            limits: { devices: 5, users: 10, storageMB: 5000 }
        },
        {
            name: 'Enterprise',
            basePrice: 299.00,
            features: ['WEB', 'OPS', 'VOICE', 'KITCHEN', 'RADAR', 'STUDIO', 'CRM'],
            limits: { devices: 999, users: 999, storageMB: 50000 }
        }
    ]

    for (const plan of plans) {
        const upserted = await prisma.subscriptionPlan.upsert({
            where: { name: plan.name },
            update: {
                basePrice: plan.basePrice,
                features: plan.features,
                limits: plan.limits
            },
            create: {
                name: plan.name,
                basePrice: plan.basePrice,
                features: plan.features,
                limits: plan.limits
            }
        })
        console.log(`✅ Plan Synced: ${upserted.name}`)
    }

    // 2. AI Broker Configuration (Wholesale Costs)
    const brokers = [
        {
            provider: AIProvider.GOOGLE,
            model: 'gemini-1.5-flash',
            costPerUnit: 0.0001, // Cost per 1k input tokens
            sellPricePerUnit: 0.00015, // Sales price
            unitType: 'TOKEN'
        },
        {
            provider: AIProvider.GOOGLE,
            model: 'gemini-1.5-pro',
            costPerUnit: 0.0025,
            sellPricePerUnit: 0.0035,
            unitType: 'TOKEN'
        },
        {
            provider: AIProvider.OPENAI,
            model: 'gpt-4o',
            costPerUnit: 0.0050,
            sellPricePerUnit: 0.0070,
            unitType: 'TOKEN'
        }
    ]

    // Cannot upsert easily without unique composite key on provider+model, 
    // but schema doesn't force it. We'll use findFirst/create logic or clean wipe (safe for config) if desired.
    // Actually, let's just create if not exists for simplicity in this run.

    // cleanup old configs? Rule #21: "Zero-Trust/Clean"
    // Let's assume we want valid configs.

    for (const broker of brokers) {
        // Check if exists
        const existing = await prisma.aiBrokerConfig.findFirst({
            where: {
                provider: broker.provider,
                model: broker.model
            }
        })

        if (!existing) {
            await prisma.aiBrokerConfig.create({
                data: broker
            })
            console.log(`✅ AI Broker Added: ${broker.provider} / ${broker.model}`)
        } else {
            // Update pricing
            await prisma.aiBrokerConfig.update({
                where: { id: existing.id },
                data: {
                    costPerUnit: broker.costPerUnit,
                    sellPricePerUnit: broker.sellPricePerUnit
                }
            })
            console.log(`🔄 AI Broker Updated: ${broker.provider} / ${broker.model}`)
        }
    }

    console.log('🏁 Seeding Complete.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
