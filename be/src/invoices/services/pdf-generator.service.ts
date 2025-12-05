import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Invoice } from '../entities/invoice.entity';
import { OrganizationInvoiceSettings } from '../entities/organization-invoice-settings.entity';
import { Settings } from '../../settings/entities/settings.entity';

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  async generateInvoicePdf(
    invoice: Invoice,
    invoiceSettings: OrganizationInvoiceSettings,
    businessSettings: Settings,
  ): Promise<Buffer> {
    const html = this.generateInvoiceHtml(invoice, invoiceSettings, businessSettings);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: invoiceSettings.invoiceDisplayFormat === 'A4' ? 'A4' : 'Letter',
        printBackground: true,
        margin: {
          top: '20px',
          bottom: '20px',
          left: '10px',
          right: '10px',
        },
      });

      return Buffer.from(pdf);
    } catch (error) {
      this.logger.error('Failed to generate PDF', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  generateInvoiceHtml(
    invoice: Invoice,
    invoiceSettings: OrganizationInvoiceSettings,
    businessSettings: Settings,
  ): string {
    const gstRate = invoiceSettings.gstEnabled && businessSettings.taxRate ? businessSettings.taxRate : 0;
    const subtotal = parseFloat(invoice.subtotal.toString());
    const taxAmount = parseFloat(invoice.taxAmount.toString());
    const discountAmount = parseFloat(invoice.discountAmount.toString());
    const total = parseFloat(invoice.total.toString());

    const formatCurrency = (amount: number) => {
      return `${businessSettings.currency || '₹'} ${amount.toFixed(2)}`;
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    // Build logo URL - handle leading slashes properly
    // Use NEXT_PUBLIC_API_BASE_URL for consistency with frontend, or fallback to localhost
    const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:4000';
    let logoUrl: string | null = null;
    if (invoiceSettings.includeLogo && businessSettings.businessLogo) {
      const logoPath = businessSettings.businessLogo;
      
      // Check if logoPath is already a full URL
      if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
        logoUrl = logoPath;
      } else {
        // Remove trailing slash from baseUrl and leading slash from logo path
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const cleanLogoPath = logoPath.replace(/^\/+/, '');
        logoUrl = `${cleanBaseUrl}/${cleanLogoPath}`;
      }
      this.logger.log(`Logo URL constructed: ${logoUrl} (from path: ${logoPath})`);
    }
      
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 20px;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #333;
    }
    .business-info {
      flex: 1;
    }
    .business-logo {
      max-width: 150px;
      max-height: 80px;
      margin-bottom: 10px;
    }
    .business-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .business-details {
      font-size: 11px;
      color: #666;
      line-height: 1.8;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-title {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .invoice-number {
      font-size: 14px;
      margin-bottom: 5px;
    }
    .invoice-date {
      font-size: 11px;
      color: #666;
    }
    .customer-section {
      margin-bottom: 30px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 5px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
    }
    .customer-details {
      font-size: 11px;
      line-height: 1.8;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .items-table th {
      background: #333;
      color: white;
      padding: 12px 8px;
      text-align: left;
      font-size: 11px;
      font-weight: bold;
    }
    .items-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #ddd;
      font-size: 11px;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .totals-section {
      margin-top: 20px;
      margin-left: auto;
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 12px;
    }
    .totals-row.total {
      font-weight: bold;
      font-size: 16px;
      padding-top: 10px;
      border-top: 2px solid #333;
      margin-top: 5px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
    .gst-section {
      margin-top: 15px;
      padding: 10px;
      background: #f0f0f0;
      border-radius: 5px;
    }
    .gst-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .gst-table th,
    .gst-table td {
      padding: 6px;
      text-align: right;
      font-size: 10px;
      border-bottom: 1px solid #ddd;
    }
    .gst-table th {
      background: #e0e0e0;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="business-info">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="business-logo" />` : ''}
        <div class="business-name">${businessSettings.businessName || 'Business Name'}</div>
        <div class="business-details">
          ${businessSettings.businessAddress ? `<div>${businessSettings.businessAddress}</div>` : ''}
          ${businessSettings.contactPhone ? `<div>Phone: ${businessSettings.contactPhone}</div>` : ''}
          ${businessSettings.contactEmail ? `<div>Email: ${businessSettings.contactEmail}</div>` : ''}
          ${businessSettings.gstNumber ? `<div>GSTIN: ${businessSettings.gstNumber}</div>` : ''}
        </div>
      </div>
      <div class="invoice-info">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-number">Invoice #: ${invoice.invoiceNumber}</div>
        <div class="invoice-date">Date: ${formatDate(invoice.createdAt)}</div>
      </div>
    </div>

    ${invoice.customerName || invoice.customerPhone
      ? `
    <div class="customer-section">
      <div class="section-title">Bill To:</div>
      <div class="customer-details">
        ${invoice.customerName ? `<div><strong>${invoice.customerName}</strong></div>` : ''}
        ${invoice.customerPhone ? `<div>Phone: ${invoice.customerPhone}</div>` : ''}
        ${invoice.customerGstin ? `<div>GSTIN: ${invoice.customerGstin}</div>` : ''}
      </div>
    </div>
    `
      : ''}

    <table class="items-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th class="text-center">Qty</th>
          <th class="text-right">Rate</th>
          ${invoiceSettings.gstEnabled ? '<th class="text-right">Tax</th>' : ''}
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items
          .map(
            (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.name}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">${formatCurrency(item.rate)}</td>
          ${invoiceSettings.gstEnabled
            ? `<td class="text-right">${formatCurrency(item.tax || 0)}</td>`
            : ''}
          <td class="text-right">${formatCurrency(item.total)}</td>
        </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>

    <div class="totals-section">
      <div class="totals-row">
        <span>Subtotal:</span>
        <span>${formatCurrency(subtotal)}</span>
      </div>
      ${discountAmount > 0
        ? `
      <div class="totals-row">
        <span>Discount:</span>
        <span>-${formatCurrency(discountAmount)}</span>
      </div>
      `
        : ''}
      ${invoiceSettings.gstEnabled && taxAmount > 0
        ? `
      <div class="totals-row">
        <span>GST (${gstRate}%):</span>
        <span>${formatCurrency(taxAmount)}</span>
      </div>
      `
        : ''}
      <div class="totals-row total">
        <span>Total:</span>
        <span>${formatCurrency(total)}</span>
      </div>
    </div>

    ${businessSettings.invoiceFooter
      ? `
    <div class="footer">
      ${businessSettings.invoiceFooter}
    </div>
    `
      : ''}
  </div>
</body>
</html>
    `;
  }
}

