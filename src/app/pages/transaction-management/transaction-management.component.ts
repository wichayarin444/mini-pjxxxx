import { Component, computed, signal, effect, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { FundService } from '../../services/fund.service';
import { TransactionService } from '../../services/transaction.service';
import { TransactionType } from '../../models/transaction.model';
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
  showModal = signal(false);
  editingId = signal<string | null>(null);
  isBrowser = signal(false);

  searchCriteria = signal({
    fundCode: '',
    type: '',
    startDate: '',
    endDate: ''
  });

  constructor(
    private funds: FundService,
    private tx: TransactionService,
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser.set(isPlatformBrowser(this.platformId));

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

    // React to form changes for calculations
    this.addForm.valueChanges.subscribe(val => {
      this.calculate(val);
    });
  }

  readonly fundList = computed(() => this.funds.funds());

  readonly transactions = computed(() => {
    let list = this.tx.transactions();
    const s = this.searchCriteria();

    // Filter
    if (s.fundCode) {
      list = list.filter(t => t.fundCode.toLowerCase().includes(s.fundCode.toLowerCase()));
    }
    if (s.type) {
      list = list.filter(t => t.type === s.type);
    }
    if (s.startDate) {
      list = list.filter(t => new Date(t.timestamp) >= new Date(s.startDate));
    }
    if (s.endDate) {
      list = list.filter(t => new Date(t.timestamp) <= new Date(s.endDate));
    }

    // Sort by Timestamp Descending
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  onSearch(): void {
    this.searchCriteria.set(this.searchForm.value);
  }

  openModal(transaction?: any): void {
    this.showModal.set(true);
    if (transaction) {
      this.editingId.set(transaction.id);
      this.addForm.patchValue({
        fundCode: transaction.fundCode,
        type: transaction.type,
        amount: transaction.amount || 0,
        units: transaction.units || 0,
        nav: transaction.nav,
        fee: transaction.fee,
        net: transaction.net
      });
      // Force recalculate or set manual override if needed, 
      // but patchValue should trigger valueChanges if emitEvent is true (default).
    } else {
      this.editingId.set(null);
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
    this.showModal.set(false);
    this.editingId.set(null);
  }

  calculate(val: any): void {
    if (!val.fundCode) return;

    const fund = this.fundList().find(f => f.fundCode === val.fundCode);
    if (!fund) return;

    const nav = fund.nav;
    // We don't emit event to avoid infinite loop, or use distinctUntilChanged in a real app
    // Here we just set values if they differ to avoid loop issues, or just update displayed values manually
    // For simplicity, we'll update the control values but with emitEvent: false where possible or careful management.

    // However, we are inside valueChanges. To avoid loop, we should only set fields that are calculated.
    // Better approach: Separate input fields from calculated display fields in UI or use a method that doesn't trigger loop.

    // Actually, let's just calculate derived values for display / final submission
    // and store them in separate signals or just properties, OR update form controls with emitEvent: false.
  }

  // Helper to get current fund details
  get currentFund() {
    const code = this.addForm.get('fundCode')?.value;
    return this.fundList().find(f => f.fundCode === code);
  }

  // Derived calculations for display
  get calculations() {
    const form = this.addForm.getRawValue(); // use getRawValue to include disabled fields
    const fund = this.currentFund;
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
      amount = gross; // Or should this be displayed differently? "Amount" usually implies money involved. 
      // For Sell, user gets 'Net'. Gross is intermediate.
    }

    return { nav, fee, net, units, amount };
  }

  save(): void {
    if (this.addForm.invalid) return;
    const form = this.addForm.getRawValue();
    const calc = this.calculations;

    if (form.type === 'Buy' && calc.amount <= 0) return;
    if (form.type === 'Sell' && calc.units <= 0) return;

    const txData = {
      fundCode: form.fundCode,
      type: form.type,
      amount: form.type === 'Buy' ? calc.amount : undefined,
      units: form.type === 'Buy' ? undefined : calc.units,
    };

    if (this.editingId()) {
      this.tx.update(this.editingId()!, txData);
    } else {
      this.tx.addTransaction(txData);
    }

    this.closeModal();
  }

  remove(id: string): void {
    if (confirm('Are you sure?')) {
      this.tx.remove(id);
    }
  }
}
