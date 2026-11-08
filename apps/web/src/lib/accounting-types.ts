export interface AccountNode {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  isHeader: boolean;
  isActive: boolean;
  balance: string;
  children: AccountNode[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface JournalRow {
  id: string;
  number: string;
  date: string;
  description: string;
  status: 'draft' | 'posted' | 'reversed';
  totalDebit: string;
}

export interface JournalLine {
  id: string;
  accountId: string;
  code: string;
  accountName: string;
  debit: string;
  credit: string;
  description: string | null;
}

export interface Journal {
  id: string;
  number: string;
  date: string;
  description: string;
  status: 'draft' | 'posted' | 'reversed';
  fiscalYearId: string;
  lines: JournalLine[];
}

export interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'locked';
}

export interface TrialRow {
  account: { code: string; name: string; type: string; normalBalance: string };
  totalDebit: string;
  totalCredit: string;
  balance: string;
}

export interface TrialBalance {
  rows: TrialRow[];
  totalDebit: string;
  totalCredit: string;
}
