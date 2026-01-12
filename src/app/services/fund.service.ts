import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { Fund } from '../models/fund.model';
import { StorageService } from './storage.service';

const STORAGE_KEY = 'mfms_funds';

@Injectable({ providedIn: 'root' })
export class FundService {
  private store = new StorageService();
  private initial: Fund[] = [
    {
      fundCode: 'K-CASH',
      nav: 15.1234,
      aimcCategory: 'Money Market',
      ipoDate: '2024-05-20',
      frontEndFee: 0.0,
      backEndFee: 0.0
    },
    {
      fundCode: 'SCBBANKING',
      nav: 10.25,
      aimcCategory: 'Equity Large Cap',
      ipoDate: '2021-01-15',
      frontEndFee: 1.0,
      backEndFee: 0.5
    }
  ];

  private _funds = new BehaviorSubject<Fund[]>(this.store.get(STORAGE_KEY, this.initial));

  readonly funds$ = this._funds.asObservable().pipe(
    map(funds => [...funds].sort((a, b) => new Date(b.ipoDate).getTime() - new Date(a.ipoDate).getTime()))
  );

  // Getter for current value (synchronous access if needed)
  get fundsValue(): Fund[] {
    return this._funds.value;
  }

  save(): void {
    this.store.set(STORAGE_KEY, this._funds.value);
  }

  upsert(fund: Fund): void {
    const list = this._funds.value;
    const idx = list.findIndex(f => f.fundCode === fund.fundCode);
    if (idx >= 0) list[idx] = fund;
    else list.push(fund);
    this._funds.next([...list]);
    this.save();
  }

  delete(fundCode: string): void {
    this._funds.next(this._funds.value.filter(f => f.fundCode !== fundCode));
    this.save();
  }
}

