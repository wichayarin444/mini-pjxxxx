import { Routes } from '@angular/router';
import { FundManagementComponent } from './pages/fund-management/fund-management.component';
import { TransactionManagementComponent } from './pages/transaction-management/transaction-management.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'transactions' },
  { path: 'funds', component: FundManagementComponent },
  { path: 'transactions', component: TransactionManagementComponent }
];
