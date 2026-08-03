const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const allOrders = await prisma.serviceOrder.findMany({ include: { items: true } });
  const counts = {};
  for (const o of allOrders) {
    counts[o.status] = (counts[o.status] || 0) + 1;
  }
  console.log('Status counts before:', JSON.stringify(counts));

  const stuck = allOrders.filter(o => o.status === 'AGUARDANDO_FINANCEIRO');
  let updated = 0;
  for (const o of stuck) {
    const chargeableItems = o.items.filter(i => i.chargeable === true);
    const allChargeableHavePrice = chargeableItems.length > 0 && chargeableItems.every(i => i.price != null && Number(i.price) > 0);
    const noChargeable = o.items.length > 0 && o.items.every(i => i.chargeable !== true);

    let newStatus = null;
    if (allChargeableHavePrice) {
      newStatus = 'AGUARDANDO_AUT_CLIENTE';
    } else if (noChargeable) {
      newStatus = 'AGUARDANDO_PRODUCAO';
    }

    if (newStatus) {
      await prisma.serviceOrder.update({
        where: { id: o.id },
        data: { status: newStatus },
      });
      console.log(`  ${o.id} pedido=${o.pedido}: AGUARDANDO_FINANCEIRO → ${newStatus}`);
      updated++;
    } else {
      console.log(`  ${o.id} pedido=${o.pedido}: SKIPPED (chargeable=${chargeableItems.length} allHavePrice=${allChargeableHavePrice} noChargeable=${noChargeable})`);
    }
  }

  if (updated > 0) {
    const after = await prisma.serviceOrder.findMany();
    const countsAfter = {};
    for (const o of after) { countsAfter[o.status] = (countsAfter[o.status] || 0) + 1; }
    console.log('Status counts after:', JSON.stringify(countsAfter));
  } else {
    console.log('No orders needed migration.');
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
