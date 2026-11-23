import { BadRequestException, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

interface ExtractedInvoice {
  customerName: string | null;
  invoiceNumber: string | null;
  date: string | null;
  dueDate: string | null;
  lineItems: { description: string; qty: number; unitPrice: number }[];
  subtotal: number | null;
  vatAmount: number | null;
  total: number | null;
}

function extractFromText(text: string): ExtractedInvoice {
  const totalMatch = text.match(/(?:grand\s+)?total[:\s]+(?:AED\s*)?([\d,]+\.?\d*)/i);
  const subtotalMatch = text.match(/sub-?total[:\s]+(?:AED\s*)?([\d,]+\.?\d*)/i);
  const vatMatch = text.match(/(?:vat|tax)[:\s]+(?:AED\s*)?([\d,]+\.?\d*)/i);
  const dateMatch = text.match(/(?:date|dated)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  const dueDateMatch = text.match(/due\s*(?:date)?[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  const invNumMatch = text.match(/(?:invoice|inv)[#\s:]+([A-Z0-9\-\/]+)/i);
  const customerMatch = text.match(/(?:bill\s+to|customer|client)[:\s]+([^\n\r]+)/i);

  const parseNum = (s: string | undefined) => s ? parseFloat(s.replace(/,/g, '')) : null;

  // Try to extract line items from table-like patterns: description + amount
  const lineItems: { description: string; qty: number; unitPrice: number }[] = [];
  const linePattern = /(.+?)\s+(\d+)\s+(?:x\s+)?([\d,]+\.?\d*)/g;
  let lm: RegExpExecArray | null;
  while ((lm = linePattern.exec(text)) !== null && lineItems.length < 10) {
    const desc = lm[1].trim();
    if (desc.length > 2 && !desc.match(/^(total|subtotal|vat|tax|date|invoice)/i)) {
      lineItems.push({ description: desc, qty: parseInt(lm[2], 10), unitPrice: parseFloat(lm[3].replace(/,/g, '')) });
    }
  }

  return {
    customerName: customerMatch ? customerMatch[1].trim().slice(0, 100) : null,
    invoiceNumber: invNumMatch ? invNumMatch[1].trim() : null,
    date: dateMatch ? dateMatch[1] : null,
    dueDate: dueDateMatch ? dueDateMatch[1] : null,
    lineItems,
    subtotal: parseNum(subtotalMatch?.[1]),
    vatAmount: parseNum(vatMatch?.[1]),
    total: parseNum(totalMatch?.[1]),
  };
}

@ApiTags('invoicing')
@ApiBearerAuth()
@Controller('invoicing/invoices')
@UseGuards(JwtAuthGuard)
export class ExtractController {
  @Post('extract')
  async extract(@Req() req: FastifyRequest): Promise<ExtractedInvoice> {
    if (!req.isMultipart()) throw new BadRequestException('Expected multipart/form-data');

    const data = await req.file();
    if (!data) throw new BadRequestException('No file uploaded');

    const allowedMime = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'text/plain'];
    if (!allowedMime.includes(data.mimetype)) {
      throw new BadRequestException('Unsupported file type. Upload PDF, image, or text file.');
    }

    const buffer = await data.toBuffer();
    // For text files, extract directly; for binary files, extract readable ASCII text
    const rawText = buffer.toString('utf-8', 0, Math.min(buffer.length, 50000));
    // Strip non-printable chars, keep alphanumerics + punctuation
    const text = rawText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ');

    return extractFromText(text);
  }
}
