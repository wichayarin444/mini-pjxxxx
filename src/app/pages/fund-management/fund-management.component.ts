import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { FundService } from '../../services/fund.service';
import { Fund } from '../../models/fund.model';
import {
  DxDataGridModule,
  DxButtonModule,
  DxSelectBoxModule,
  DxTextBoxModule,
  DxDateBoxModule,
  DxPopupModule,
  DxFormModule,
  DxNumberBoxModule,
  DxValidatorModule
} from 'devextreme-angular';

@Component({
  selector: 'app-fund-management',
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
    DxValidatorModule
  ],
  templateUrl: './fund-management.component.html',
  styleUrls: ['./fund-management.component.scss']
})
export class FundManagementComponent {
  aimcCategories = ['Money Market', 'Equity Large Cap', 'Equity Small Cap', 'Fixed Income', 'Mixed Fund'];
  showModal = signal(false);
  editMode = signal<'add' | 'edit' | null>(null);
  searchCriteria = signal({
    fundCode: '',
    aimcCategory: '',
    ipoFrom: '',
    ipoTo: ''
  });

  searchForm!: FormGroup;
  form!: FormGroup;

  constructor(private funds: FundService, private fb: FormBuilder) {
    this.searchForm = this.fb.group({
      fundCode: [''],
      aimcCategory: [''],
      ipoFrom: [''],
      ipoTo: ['']
    });
    this.form = this.fb.group({
      fundCode: ['', Validators.required],
      nav: [0, [Validators.required, Validators.min(0.0001)]],
      aimcCategory: ['', Validators.required],
      ipoDate: ['', Validators.required],
      frontEndFee: [0, [Validators.required, Validators.min(0)]],
      backEndFee: [0, [Validators.required, Validators.min(0)]]
    });
  }

  readonly list = computed(() => {
    const base = this.funds.funds();
    const s = this.searchCriteria();
    return base.filter(f => {
      const byCode = s.fundCode ? f.fundCode.toLowerCase().includes(s.fundCode.toLowerCase()) : true;
      const byCat = s.aimcCategory
        ? f.aimcCategory.toLowerCase().includes(s.aimcCategory.toLowerCase())
        : true;
      const byFrom = s.ipoFrom ? new Date(f.ipoDate) >= new Date(s.ipoFrom) : true;
      const byTo = s.ipoTo ? new Date(f.ipoDate) <= new Date(s.ipoTo) : true;
      return byCode && byCat && byFrom && byTo;
    });
  });

  onSearch(): void {
    this.searchCriteria.set(this.searchForm.value);
  }

  startAdd(): void {
    this.editMode.set('add');
    this.showModal.set(true);
    this.form.reset({
      fundCode: '',
      nav: 0,
      aimcCategory: 'Money Market',
      ipoDate: new Date().toISOString().split('T')[0],
      frontEndFee: 0,
      backEndFee: 0
    });
    this.form.get('fundCode')?.enable();
  }

  startEdit(item: Fund): void {
    this.editMode.set('edit');
    this.showModal.set(true);
    this.form.reset(item);
    this.form.get('fundCode')?.disable();
  }

  closeModal(): void {
    this.editMode.set(null);
    this.showModal.set(false);
  }

  save(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue() as Fund;
    value.nav = Number(value.nav);
    value.frontEndFee = Number(value.frontEndFee);
    value.backEndFee = Number(value.backEndFee);
    this.funds.upsert(value);
    this.closeModal();
  }

  remove(fundCode: string): void {
    if (confirm('Are you sure you want to delete this fund?')) {
      this.funds.delete(fundCode);
    }
  }

  cancelEdit(): void {
    this.closeModal();
  }
}
