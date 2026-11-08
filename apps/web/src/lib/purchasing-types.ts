export interface Supplier { id: string; code: string; nameEn: string; nameAr: string; trn: string | null; paymentTerms: number; isActive: boolean }
export interface Item { id: string; code: string; nameEn: string; nameAr: string; unit: string; costMethod: 'avco' | 'fifo'; inventoryAccountId: string; cogsAccountId: string }
export interface Warehouse { id: string; code: string; nameEn: string; nameAr: string; isDefault: boolean }
export interface Branch { id: string; name: string }
export interface FiscalYear { id: string; name: string; status: string }
export interface Doc { id: string; number: string; date: string; status: string; journalEntryId: string | null; total?: string; subtotal?: string; vatAmount?: string }
export interface PoLine { id: string; itemId: string | null; description: string; qty: string; unitPrice: string; vatRate: string; vatAmount: string; lineTotal: string }
export interface Po extends Doc { supplierId: string; branchId: string; fiscalYearId: string; lines: PoLine[] }
export interface GrnLine { id: string; poLineId: string | null; itemId: string | null; description: string; qtyReceived: string; unitCost: string; vatRate: string; vatAmount: string; lineTotal: string; warehouseId: string }
export interface Grn extends Doc { supplierId: string; poId: string | null; branchId: string; fiscalYearId: string; lines: GrnLine[] }
export interface SiLine { id: string; itemId: string | null; description: string; qty: string; unitPrice: string; vatRate: string; vatAmount: string; lineTotal: string }
export interface Si extends Doc { supplierId: string; grnId: string | null; poId: string | null; dueDate: string; matchingStatus: string; balanceDue: string; lines: SiLine[] }
export interface Match { poTotal: string | null; grnTotal: string | null; invoiceTotal: string; variance: string | null; status: string }
export interface StockRow { itemId: string; code: string; nameEn: string; warehouseId: string; qty: string; avgCost: string; totalValue: string }
