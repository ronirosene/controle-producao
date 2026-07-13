const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const path = require('path');
process.env.DATABASE_URL = 'file:' + path.resolve(__dirname, '..', 'controle.db');
const p = new PrismaClient();
p.serviceOrder.count().then(c => { console.log('Orders:', c); return p.serviceOrderItem.count(); }).then(c2 => { console.log('Items:', c2); p.$disconnect(); });
