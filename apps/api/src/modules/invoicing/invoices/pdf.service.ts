import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { chromium, type Browser } from 'playwright';

// Headless Chromium HTML -> A4 PDF; one shared browser, one page per render
@Injectable()
export class PdfService implements OnModuleDestroy {
  private browser?: Promise<Browser>;

  private getBrowser(): Promise<Browser> {
    this.browser ??= chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    return this.browser;
  }

  async render(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      return Buffer.from(await page.pdf({ format: 'A4', printBackground: true }));
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await (await this.browser)?.close();
  }
}
