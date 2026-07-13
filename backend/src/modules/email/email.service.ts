import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      });
      this.logger.log(`Email service configured: ${host}`);
    } else {
      this.logger.warn('SMTP not configured — email notifications disabled');
    }
  }

  private formatItems(order: any): string[] {
    if (!order.items || order.items.length === 0) return ['Nenhum produto cadastrado'];
    return order.items.map((item: any, i: number) => {
      const lines = [
        `${i + 1}. Produto: ${item.product?.name || '-'}`,
        `   Cor: ${item.color || '-'} | Detalhe: ${item.fabric || '-'}`,
        `   Quantidade: ${item.quantity}`,
        `   Problema: ${item.problemDesc || '-'}`,
        `   Solução: ${item.resolution || '-'}`,
        `   Valor: ${item.price != null ? `R$ ${Number(item.price).toFixed(2)}` : 'A definir'}`,
        `   Cobrança: ${item.chargeable === true ? 'Sim' : item.chargeable === false ? 'Não (Gratuito)' : 'Pendente'}`,
      ];
      return lines.join('\n');
    });
  }

  async sendNewOrderNotification(order: any): Promise<void> {
    if (!this.transporter) return;
    const to = process.env.FINANCE_EMAIL;
    if (!to) {
      this.logger.warn('FINANCE_EMAIL not set');
      return;
    }

    const pedido = order.pedido ? `#${order.pedido}` : `#${order.id?.slice(0, 8)}`;
    const itemsStr = this.formatItems(order).join('\n\n');
    const lines: string[] = [
      `Novo Pedido de Assistência registrado!`,
      ``,
      `Pedido: ${pedido}`,
      `Cliente: ${order.customer?.name || '-'}`,
      `Data de Entrada: ${new Date(order.entryDate).toLocaleDateString('pt-BR')}`,
      order.billingDate ? `Data de Faturamento: ${new Date(order.billingDate).toLocaleDateString('pt-BR')}` : null,
      ``,
      `--- Produtos ---`,
      itemsStr,
      ``,
      order.notes ? `Observações: ${order.notes}` : null,
      ``,
      `Acesse o sistema: ${process.env.FRONTEND_URL || 'https://controle-producao.fly.dev'}/ordens`,
    ].filter((l): l is string => l !== null);

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        cc: 'ti@moveispelinson.com.br',
        subject: `Novo Pedido ${pedido} — ${order.customer?.name || ''}`,
        text: lines.join('\n'),
      });
      this.logger.log(`Email sent to ${to} (cc ti@moveispelinson.com.br) about order ${pedido}`);
    } catch (err: any) {
      this.logger.error(`Failed to send email: ${err.message}`);
    }
  }

  async sendFinanceiroUpdateNotification(order: any): Promise<void> {
    if (!this.transporter) return;
    const to = 'ti@moveispelinson.com.br';

    const pedido = order.pedido ? `#${order.pedido}` : `#${order.id?.slice(0, 8)}`;
    const itemsStr = this.formatItems(order).join('\n\n');
    const lines: string[] = [
      `Pedido de Assistência atualizado pelo Financeiro!`,
      ``,
      `Pedido: ${pedido}`,
      `Cliente: ${order.customer?.name || '-'}`,
      ``,
      `--- Produtos ---`,
      itemsStr,
      ``,
      `Acesse o sistema: ${process.env.FRONTEND_URL || 'https://controle-producao.fly.dev'}/ordens`,
    ];

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: `Pedido de Assistência atualizado pelo Financeiro — ${pedido}`,
        text: lines.join('\n'),
      });
      this.logger.log(`Email sent to ${to} about financeiro update for order ${pedido}`);
    } catch (err: any) {
      this.logger.error(`Failed to send email: ${err.message}`);
    }
  }
}
