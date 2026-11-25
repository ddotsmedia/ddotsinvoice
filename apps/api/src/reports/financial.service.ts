import { Inject, Injectable } from '@nestjs/common';
import { Db, Tx, withTenant } from '@ddotsinvoice/db';
import * as M from '@ddotsinvoice/money';
import { AccessTokenPayload } from '@ddotsinvoice/shared';
import { DB } from '../infra/drizzle.module';
import { requireCompany, requireTenant } from '../common/tenant';
import { accountsById, addDays, movements, Mv } from './report.util';

type Acc = { normalBalance: string };

// Signed balance by normal side
const bal = (a: Acc, mv: Mv) => (a.normalBalance === 'debit' ? M.sub(mv.d, mv.c) : M.sub(mv.c, mv.d));

@Injectable()
export class FinancialReportsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private scope(actor: AccessTokenPayload) {
    return { tenantId: requireTenant(actor.tenantId), companyId: requireCompany(actor.companyId) };
  }

  balanceSheet(actor: AccessTokenPayload, asOfDate: string) {
    if (!actor.tenantId) return Promise.resolve({ asset: [], liability: [], equity: [], retainedEarnings: '0', totalAssets: '0', totalLiabilities: '0', totalEquity: '0' });
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.bsWith(tx, companyId, asOfDate));
  }

  private async bsWith(tx: Tx, companyId: string, asOfDate: string) {
    const mv = await movements(tx, companyId, undefined, asOfDate);
    const accts = await accountsById(tx, companyId);
    const sections = { asset: [] as any[], liability: [] as any[], equity: [] as any[] };
    let earnings = M.money(0);
    for (const [id, m] of mv) {
      const a = accts.get(id);
      if (!a) continue;
      if (a.type === 'revenue' || a.type === 'expense') {
        earnings = M.add(earnings, M.sub(m.c, m.d));
        continue;
      }
      const amount = M.toDb(bal(a, m));
      sections[a.type as 'asset' | 'liability' | 'equity'].push({ accountCode: a.code, nameEn: a.name, nameAr: a.nameAr, balance: amount });
    }
    const sum = (xs: { balance: string }[]) => xs.reduce((s, x) => M.add(s, M.money(x.balance)), M.money(0));
    const totalAssets = sum(sections.asset);
    const totalEquity = M.add(sum(sections.equity), earnings);
    const totalLiab = sum(sections.liability);
    const totalLE = M.add(totalLiab, totalEquity);
    const diff = M.sub(totalAssets, totalLE).abs();
    return {
      asOfDate,
      assets: sections.asset, totalAssets: M.toDb(totalAssets),
      liabilities: sections.liability, totalLiabilities: M.toDb(totalLiab),
      equity: sections.equity, currentPeriodEarnings: M.toDb(earnings), totalEquity: M.toDb(totalEquity),
      balanced: diff.lessThanOrEqualTo(M.money('0.01')),
    };
  }

  incomeStatement(actor: AccessTokenPayload, fromDate: string, toDate: string) {
    if (!actor.tenantId) return Promise.resolve({ revenue: [], expenses: [], grossProfit: '0', operatingProfit: '0', netProfit: '0' });
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, (tx) => this.isWith(tx, companyId, fromDate, toDate));
  }

  private async isWith(tx: Tx, companyId: string, fromDate: string, toDate: string) {
    const mv = await movements(tx, companyId, fromDate, toDate);
    const accts = await accountsById(tx, companyId);
    const revenue: any[] = [], cogs: any[] = [], opex: any[] = [];
    let totalRevenue = M.money(0), totalCogs = M.money(0), totalOpex = M.money(0);
    for (const [id, m] of mv) {
      const a = accts.get(id);
      if (!a) continue;
      const line = { accountCode: a.code, nameEn: a.name, nameAr: a.nameAr };
      if (a.type === 'revenue') {
        const v = M.sub(m.c, m.d); totalRevenue = M.add(totalRevenue, v); revenue.push({ ...line, amount: M.toDb(v) });
      } else if (a.type === 'expense' && a.code.startsWith('5')) {
        const v = M.sub(m.d, m.c); totalCogs = M.add(totalCogs, v); cogs.push({ ...line, amount: M.toDb(v) });
      } else if (a.type === 'expense') {
        const v = M.sub(m.d, m.c); totalOpex = M.add(totalOpex, v); opex.push({ ...line, amount: M.toDb(v) });
      }
    }
    const grossProfit = M.sub(totalRevenue, totalCogs);
    const netProfit = M.sub(grossProfit, totalOpex);
    return {
      fromDate, toDate,
      revenue, totalRevenue: M.toDb(totalRevenue),
      cogs, totalCogs: M.toDb(totalCogs),
      grossProfit: M.toDb(grossProfit),
      operatingExpenses: opex, totalOperatingExpenses: M.toDb(totalOpex),
      netProfit: M.toDb(netProfit),
    };
  }

  trialBalance(actor: AccessTokenPayload, asOfDate: string) {
    if (!actor.tenantId) return Promise.resolve([]);
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const mv = await movements(tx, companyId, undefined, asOfDate);
      const accts = await accountsById(tx, companyId);
      let td = M.money(0), tc = M.money(0);
      const rows = [...mv].flatMap(([id, m]) => {
        const a = accts.get(id);
        if (!a) return [];
        td = M.add(td, m.d); tc = M.add(tc, m.c);
        return [{ accountCode: a.code, nameEn: a.name, nameAr: a.nameAr, debit: M.toDb(m.d), credit: M.toDb(m.c) }];
      }).sort((x, y) => x.accountCode.localeCompare(y.accountCode));
      return { asOfDate, rows, totalDebits: M.toDb(td), totalCredits: M.toDb(tc), balanced: M.eq(td, tc) };
    });
  }

  // Indirect method: net profit adjusted for AR, inventory, AP and GRNI movements. Investing/financing not yet modelled.
  cashFlow(actor: AccessTokenPayload, fromDate: string, toDate: string) {
    if (!actor.tenantId) return Promise.resolve({ operating: '0', investing: '0', financing: '0', net: '0' });
    const { tenantId, companyId } = this.scope(actor);
    return withTenant(this.db, tenantId, async (tx) => {
      const is = await this.isWith(tx, companyId, fromDate, toDate);
      const mv = await movements(tx, companyId, fromDate, toDate);
      const accts = await accountsById(tx, companyId);
      const byCode = (code: string) => {
        const a = [...accts.values()].find((x) => x.code === code && x.companyId === companyId);
        return a ? mv.get(a.id) : undefined;
      };
      const net = (code: string, debitSide: boolean) => {
        const m = byCode(code);
        if (!m) return M.money(0);
        return debitSide ? M.sub(m.d, m.c) : M.sub(m.c, m.d);
      };
      const dAR = net('1200', true);
      const dInv = net('1500', true);
      const dAP = net('2100', false);
      const dGrni = net('2300', false);
      const operating = M.add(M.sub(M.add(M.money(is.netProfit), dAP), M.add(dAR, dInv)), dGrni);
      const investing = M.money(0);
      const financing = M.money(0);
      return {
        fromDate, toDate,
        operating: { netProfit: is.netProfit, changeReceivables: M.toDb(M.sub(M.money(0), dAR)), changeInventory: M.toDb(M.sub(M.money(0), dInv)), changePayables: M.toDb(dAP), changeGrni: M.toDb(dGrni), total: M.toDb(operating) },
        investing: { total: M.toDb(investing) },
        financing: { total: M.toDb(financing) },
        netCashFlow: M.toDb(M.add(M.add(operating, investing), financing)),
      };
    });
  }
}

export { addDays };
