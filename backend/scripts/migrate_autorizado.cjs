const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const orders = await p.serviceOrder.findMany({ where: { status: 'AUTORIZADO_CLIENTE' } });
  console.log('Found AUTORIZADO_CLIENTE: ' + orders.length);
  for (const o of orders) {
    await p.serviceOrder.update({ where: { id: o.id }, data: { status: 'AGUARDANDO_PRODUCAO' } });
    console.log('  ' + o.id + ' pedido=' + o.pedido + ' -> AGUARDANDO_PRODUCAO');
  }
  const after = await p.serviceOrder.findMany({ where: { status: { in: ['AUTORIZADO_CLIENTE','AGUARDANDO_PRODUCAO'] } } });
  const c = {};
  for (const o of after) { c[o.status] = (c[o.status]||0) + 1; }
  console.log('AUTORIZADO_CLIENTE remaining: ' + (c['AUTORIZADO_CLIENTE']||0) + ', AGUARDANDO_PRODUCAO: ' + (c['AGUARDANDO_PRODUCAO']||0));
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
