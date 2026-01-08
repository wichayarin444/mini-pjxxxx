export type TransactionType = 'Buy' | 'Sell';

export interface Transaction {
  id: string;
  fundCode: string;
  type: TransactionType;
  amount?: number;
  units?: number;
  nav: number;
  fee: number;
  net: number;
  timestamp: string;
}

