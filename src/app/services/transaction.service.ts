import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { Transaction, TransactionType } from '../models/transaction.model';
import { FundService } from './fund.service';
import { StorageService } from './storage.service';

const STORAGE_KEY = 'mfms_transactions';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private store = new StorageService();
  private _tx = new BehaviorSubject<Transaction[]>(this.store.get(STORAGE_KEY, [] as Transaction[]));

  readonly transactions$ = this._tx.asObservable().pipe(
    map(txs => [...txs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ))
  );

  constructor(private funds: FundService) { }

  get transactionsValue(): Transaction[] {
    return this._tx.value;
  }

  addTransaction(input: {
    fundCode: string;
    type: TransactionType;
    amount?: number;
    units?: number;
  }): Transaction {
    const fund = this.funds.fundsValue.find(f => f.fundCode === input.fundCode);
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

    this._tx.next([tx, ...this._tx.value]);
    this.store.set(STORAGE_KEY, this._tx.value);
    return tx;
  }

  update(id: string, input: {
    fundCode: string;
    type: TransactionType;
    amount?: number;
    units?: number;
  }): void {
    const fund = this.funds.fundsValue.find(f => f.fundCode === input.fundCode);
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

    const updated = this._tx.value.map(t => {
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
        // timestamp keeps original
      };
    });

    this._tx.next(updated);
    this.store.set(STORAGE_KEY, this._tx.value);
  }

  remove(id: string): void {
    this._tx.next(this._tx.value.filter(t => t.id !== id));
    this.store.set(STORAGE_KEY, this._tx.value);
  }
}
