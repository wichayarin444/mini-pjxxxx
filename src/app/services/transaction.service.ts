import { Injectable, signal, computed } from '@angular/core';
import { Transaction, TransactionType } from '../models/transaction.model';
import { FundService } from './fund.service';
import { StorageService } from './storage.service';

const STORAGE_KEY = 'mfms_transactions';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private store = new StorageService();
  private _tx = signal<Transaction[]>(this.store.get(STORAGE_KEY, [] as Transaction[]));

  readonly transactions = computed(() =>
    [...this._tx()].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  );

  constructor(private funds: FundService) { }

  addTransaction(input: {
    fundCode: string;
    type: TransactionType;
    amount?: number;
    units?: number;
  }): Transaction {
    const fund = this.funds.funds().find(f => f.fundCode === input.fundCode);
    if (!fund) throw new Error('Fund not found');

    const nav = fund.nav;
    let fee = 0;
    let net = 0;
    let units = input.units;
    let amount = input.amount;

    if (input.type === 'Buy') {
      if (amount == null) throw new Error('Amount is required for Buy');
      fee = amount * (fund.frontEndFee / 100);
      net = amount - fee;
      units = parseFloat((net / nav).toFixed(4));
    } else {
      if (units == null) throw new Error('Units is required for Sell');
      const gross = units * nav;
      fee = gross * (fund.backEndFee / 100);
      net = gross - fee;
      amount = gross;
    }

    const id =
      typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
        ? (crypto as any).randomUUID()
        : `tx_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const tx: Transaction = {
      id,
      fundCode: fund.fundCode,
      type: input.type,
      amount,
      units,
      nav,
      fee: parseFloat(fee.toFixed(2)),
      net: parseFloat(net.toFixed(2)),
      timestamp: new Date().toISOString()
    };

    this._tx.set([tx, ...this._tx()]);
    this.store.set(STORAGE_KEY, this._tx());
    return tx;
  }

  update(id: string, input: {
    fundCode: string;
    type: TransactionType;
    amount?: number;
    units?: number;
  }): void {
    const fund = this.funds.funds().find(f => f.fundCode === input.fundCode);
    if (!fund) throw new Error('Fund not found');

    const nav = fund.nav;
    let fee = 0;
    let net = 0;
    let units = input.units;
    let amount = input.amount;

    if (input.type === 'Buy') {
      if (amount == null) throw new Error('Amount is required for Buy');
      fee = amount * (fund.frontEndFee / 100);
      net = amount - fee;
      units = parseFloat((net / nav).toFixed(4));
    } else {
      if (units == null) throw new Error('Units is required for Sell');
      const gross = units * nav;
      fee = gross * (fund.backEndFee / 100);
      net = gross - fee;
      amount = gross;
    }

    this._tx.update(list => list.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        fundCode: fund.fundCode,
        type: input.type,
        amount,
        units,
        nav,
        fee: parseFloat(fee.toFixed(2)),
        net: parseFloat(net.toFixed(2)),
        // timestamp: t.timestamp // Keep original timestamp
      };
    }));
    this.store.set(STORAGE_KEY, this._tx());
  }

  remove(id: string): void {
    this._tx.set(this._tx().filter(t => t.id !== id));
    this.store.set(STORAGE_KEY, this._tx());
  }
}
