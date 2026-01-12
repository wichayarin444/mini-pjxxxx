import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { FundService } from '../../services/fund.service';
import { Fund } from '../../models/fund.model';
import { TransactionService } from '../../services/transaction.service';
import { Transaction, TransactionType } from '../../models/transaction.model';
import { BehaviorSubject, combineLatest, map, startWith, Observable } from 'rxjs';
import {
  DxDataGridModule,
  DxButtonModule,
  DxSelectBoxModule,
  DxTextBoxModule,
  DxDateBoxModule,
  DxPopupModule,
  DxFormModule,
  DxNumberBoxModule,
  DxRadioGroupModule,
  DxValidatorModule
} from 'devextreme-angular';

@Component({
  selector: 'app-transaction-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DxDataGridModule,
    DxButtonModule,
    DxSelectBoxModule,
    DxTextBoxModule,
    DxDateBoxModule,
    DxPopupModule,
    DxFormModule,
    DxNumberBoxModule,
    DxRadioGroupModule,
    DxValidatorModule
  ],
  templateUrl: './transaction-management.component.html',
  styleUrls: ['./transaction-management.component.scss']
})
export class TransactionManagementComponent {
  searchForm!: FormGroup;
  addForm!: FormGroup;
  showModal$ = new BehaviorSubject<boolean>(false);
  editingId$ = new BehaviorSubject<string | null>(null);
  isBrowser$ = new BehaviorSubject<boolean>(false);

  searchCriteria$ = new BehaviorSubject({
    fundCode: '',
    type: '',
    startDate: '',
    endDate: ''
  });

  readonly fundList$: Observable<Fund[]>;
  readonly transactions$: Observable<Transaction[]>;
  readonly calculations$: Observable<{
    nav: number;
    fee: number;
    net: number;
    units: number;
    amount: number;
  }>;

  constructor(
    private funds: FundService,
    private tx: TransactionService,
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser$.next(isPlatformBrowser(this.platformId));

    this.searchForm = this.fb.group({
      fundCode: [''],
      type: [''],
      startDate: [''],
      endDate: ['']
    });

    this.addForm = this.fb.group({
      fundCode: ['', Validators.required],
      type: ['Buy' as TransactionType, Validators.required],
      amount: [0], // Input for Buy
      units: [0], // Input for Sell (or calc for Buy)
      nav: [{ value: 0, disabled: true }],
      fee: [{ value: 0, disabled: true }],
      net: [{ value: 0, disabled: true }]
    });

    this.fundList$ = this.funds.funds$;

    this.transactions$ = combineLatest([
      this.tx.transactions$,
      this.searchCriteria$
    ]).pipe(
      map(([list, s]) => {
        let filtered = list;
        // Filter
        if (s.fundCode) {
          filtered = filtered.filter(t => t.fundCode.toLowerCase().includes(s.fundCode.toLowerCase()));
        }
        if (s.type) {
          filtered = filtered.filter(t => t.type === s.type);
        }
        if (s.startDate) {
          filtered = filtered.filter(t => new Date(t.timestamp) >= new Date(s.startDate));
        }
        if (s.endDate) {
          filtered = filtered.filter(t => new Date(t.timestamp) <= new Date(s.endDate));
        }
  
        // Sort by Timestamp Descending
        return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      })
    );

    this.calculations$ = combineLatest([
      this.addForm.valueChanges.pipe(startWith(null)), // Trigger on form change
      this.funds.funds$
    ]).pipe(
      map(([_, funds]) => {
        const form = this.addForm.getRawValue(); // use getRawValue to include disabled fields
        const fund = funds.find(f => f.fundCode === form.fundCode);
        
        if (!fund) return { nav: 0, fee: 0, net: 0, units: 0, amount: 0 };
  
        let nav = fund.nav;
        let fee = 0;
        let net = 0;
        let units = 0;
        let amount = 0;
  
        if (form.type === 'Buy') {
          amount = Number(form.amount || 0);
          fee = amount * (fund.frontEndFee / 100);
          net = amount - fee;
          units = net / nav;
        } else {
          units = Number(form.units || 0);
          const gross = units * nav;
          fee = gross * (fund.backEndFee / 100);
          net = gross - fee;
          amount = gross;
        }
  
        return { nav, fee, net, units, amount };
      })
    );
  }

  onSearch(): void {
    this.searchCriteria$.next(this.searchForm.value);
  }

  openModal(transaction?: any): void {
    this.showModal$.next(true);
    if (transaction) {
      this.editingId$.next(transaction.id);
      this.addForm.patchValue({
        fundCode: transaction.fundCode,
        type: transaction.type,
        amount: transaction.amount || 0,
        units: transaction.units || 0,
        nav: transaction.nav,
        fee: transaction.fee,
        net: transaction.net
      });
    } else {
      this.editingId$.next(null);
      this.addForm.reset({
        fundCode: '',
        type: 'Buy',
        amount: 0,
        units: 0,
        nav: 0,
        fee: 0,
        net: 0
      });
    }
  }

  closeModal(): void {
    this.showModal$.next(false);
    this.editingId$.next(null);
  }

  save(): void {
    if (this.addForm.invalid) return;
    
    // Subscribe once to get current calculation
    // Since calculations$ is derived from form state, it should be synchronous enough if we take(1)
    this.calculations$.subscribe(calc => {
      const form = this.addForm.getRawValue();

      if (form.type === 'Buy' && calc.amount <= 0) return;
      if (form.type === 'Sell' && calc.units <= 0) return;

      const txData = {
        fundCode: form.fundCode,
        type: form.type,
        amount: form.type === 'Buy' ? calc.amount : undefined,
        units: form.type === 'Buy' ? undefined : calc.units,
      };

      if (this.editingId$.value) {
        this.tx.update(this.editingId$.value, txData);
      } else {
        this.tx.addTransaction(txData);
      }

      this.closeModal();
    }).unsubscribe();
  }

  remove(id: string): void {
    if (confirm('Are you sure?')) {
      this.tx.remove(id);
    }
  }
}
