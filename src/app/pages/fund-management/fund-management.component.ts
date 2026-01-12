import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { FundService } from '../../services/fund.service';
import { Fund } from '../../models/fund.model';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
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
  showModal$ = new BehaviorSubject<boolean>(false);
  editMode$ = new BehaviorSubject<'add' | 'edit' | null>(null);
  searchCriteria$ = new BehaviorSubject({
    fundCode: '',
    aimcCategory: '',
    ipoFrom: '',
    ipoTo: ''
  });

  searchForm!: FormGroup;
  form!: FormGroup;
  isBrowser$ = new BehaviorSubject<boolean>(false);

  readonly list$: Observable<Fund[]>;

  constructor(
    private funds: FundService,
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser$.next(isPlatformBrowser(this.platformId));

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

    this.list$ = combineLatest([
      this.funds.funds$,
      this.searchCriteria$
    ]).pipe(
      map(([base, s]) => {
        return base.filter(f => {
          const byCode = s.fundCode ? f.fundCode.toLowerCase().includes(s.fundCode.toLowerCase()) : true;
          const byCat = s.aimcCategory
            ? f.aimcCategory.toLowerCase().includes(s.aimcCategory.toLowerCase())
            : true;
          const byFrom = s.ipoFrom ? new Date(f.ipoDate) >= new Date(s.ipoFrom) : true;
          const byTo = s.ipoTo ? new Date(f.ipoDate) <= new Date(s.ipoTo) : true;
          return byCode && byCat && byFrom && byTo;
        });
      })
    );
  }

  onSearch(): void {
    this.searchCriteria$.next(this.searchForm.value);
  }

  startAdd(): void {
    this.editMode$.next('add');
    this.showModal$.next(true);
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

  startEdit(fund: Fund): void {
    this.editMode$.next('edit');
    this.showModal$.next(true);
    this.form.patchValue(fund);
    this.form.get('fundCode')?.disable(); // Primary key cannot change
  }

  closeModal(): void {
    this.showModal$.next(false);
    this.editMode$.next(null);
  }

  cancelEdit(): void {
    this.closeModal();
  }

  save(): void {
    if (this.form.invalid) return;
    const data = this.form.getRawValue(); // include disabled fields
    this.funds.upsert(data);
    this.closeModal();
  }

  remove(fundCode: string): void {
    if (confirm('Are you sure you want to delete this fund?')) {
      this.funds.delete(fundCode);
    }
  }
}
