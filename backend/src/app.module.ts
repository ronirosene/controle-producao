import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { ServiceOrdersModule } from './modules/service-orders/service-orders.module';
import { UploadModule } from './modules/upload/upload.module';
import { ServicosModule } from './modules/servicos/servicos.module';
import { ProdutosModule } from './modules/produtos/produtos.module';
import { BackupsModule } from './modules/backups/backups.module';
import { UrgentesModule } from './modules/urgentes/urgentes.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UsersModule } from './modules/users/users.module';
import { EmailModule } from './modules/email/email.module';
import { AssistenciaRegistersModule } from './modules/assistencia-registers/assistencia-registers.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CustomersModule,
    ProductsModule,
    ServiceOrdersModule,
    UploadModule,
    ServicosModule,
    ProdutosModule,
    BackupsModule,
    UrgentesModule,
    DashboardModule,
    UsersModule,
    EmailModule,
    AssistenciaRegistersModule,
  ],
})
export class AppModule {}
