const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const allOrders = await prisma.serviceOrder.findMany({ include: { items: true } });
  const counts = {};
  for (const o of allOrders) {
    counts[o.status] = (counts[o.status] || 0) + 1;
  }
  console.log('Status counts:', JSON.stringify(counts, null, 2));

  const stuck = allOrders.filter(o => o.status === 'AGUARDANDO_FINANCEIRO');
  console.log(`\nOrders stuck in AGUARDANDO_FINANCEIRO: ${stuck.length}`);
  for (const o of stuck) {
    const chargeableItems = o.items.filter(i => i.chargeable === true);
    const allChargeableHavePrice = chargeableItems.length > 0 && chargeableItems.every(i => i.price != null && Number(i.price) > 0);
    const noChargeable = o.items.length > 0 && o.items.every(i => i.chargeable !== true);
    console.log(`  ${o.id} pedido=${o.pedido} items=${o.items.length} chargeable=${chargeableItems.length} allHavePrice=${allChargeableHavePrice} noChargeable=${noChargeable}`);
    if (allChargeableHavePrice) {
      console.log(`    → would go to AGUARDANDO_AUT_CLIENTE`);
    } else if (noChargeable) {
      console.log(`    → would go to AGUARDANDO_PRODUCAO`);
    } else {
      console.log(`    → still missing data`);
    }
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
