const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'controle.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.serviceOrder.findMany({
    where: { items: { none: {} } },
    include: { product: true },
  });

  console.log(`Found ${orders.length} orders to migrate`);

  for (const order of orders) {
    await prisma.serviceOrderItem.create({
      data: {
        serviceOrderId: order.id,
        productId: order.productId,
        color: order.product?.color || null,
        fabric: order.product?.fabric || null,
        quantity: order.quantity,
        price: order.price,
        chargeable: order.chargeable,
        problemDesc: order.problemDesc,
        resolution: order.resolution,
        images: order.attachments || order.attachment || null,
      },
    });
    console.log(`  Migrated order ${order.pedido || order.id.slice(0, 8)}`);
  }

  console.log('Migration complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
