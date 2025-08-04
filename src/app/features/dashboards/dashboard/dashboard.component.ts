import {
  Component,
  OnInit,
  inject,
  PLATFORM_ID,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../../../services/AuthService';
import { DashboardService } from '../../../../services/dashboar.service';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';
import { Utils } from '../../../utils/utils';
import { initGrDetailPage } from '../../../shared/constants';
import e from 'express';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
declare var bootstrap: any;
interface DashboardRow {
  name?: string;
  account?: string;
  code?: number;
  permission?: { code?: number };
  smartlist?: {
    extended_ui_attributes?: {
      user_health_data?: any;
    };
  };
  hds_dbrd_permission?: number;
  patient_ref?: any;
  default_hds_record?: number;
  patient?: { first_name?: string; last_name?: string };
  patient_set_by_doctor?: { first_name?: string; last_name?: string };
}

@Component({
  selector: 'dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCheckboxModule,
    FormsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private auth = inject(AuthService);
  private dashboardService = inject(DashboardService);
  searchText = '';
  bulkAction: string = '';
  isLoading = false;
  displayedColumns: string[] = [
    'select',
    'name',
    'account',
    'code',
    'health_data',
  ];
  dataSource = new MatTableDataSource<DashboardRow>([]);
  selection = new SelectionModel<DashboardRow>(true, []);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  totalRecords = 0;
  pageSize = 10;
  pageIndex = 0;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId) && !this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
    }
    this.loadData();
  }

  ngAfterViewInit() {
    this.paginator.page.subscribe((event: PageEvent) => {
      this.pageIndex = event.pageIndex;
      this.pageSize = event.pageSize;
      this.loadData();
    });
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.loadData();
  }

  onBulkActionChange(value: string) {
    this.bulkAction = value;
    if (this.bulkAction !== '') {
      const modal = new bootstrap.Modal(
        document.getElementById('bulkActionModal')
      );
      modal.show();
    } else {
      const modal = bootstrap.Modal.getInstance(
        document.getElementById('bulkActionModal')
      );
      modal.hide();
    }
  }

  onConfirmBulkAction() {
    if (!isPlatformBrowser(this.platformId)) return;

    const userInfoStr = localStorage.getItem('user_info');
    const user = JSON.parse(userInfoStr || '{}');
    const ids: string[] = this.selection.selected.map((item: any) => item?._id);

    const body = {
      token: user.token || '',
      req_time: new Date().setHours(0, 0, 0, 0),
      dbrd_record: ids,
      del: this.bulkAction === '1',
    };

    this.dashboardService.bulkStopOrDeleteDashboardRecords(body).subscribe({
      next: (res) => {
        this.dataSource.data = (res.records as DashboardRow[]) || [];
        this.totalRecords = res.count || 0;
        if (this.paginator) this.paginator.length = this.totalRecords;
        this.loadData();
      },
      error: (err) => {
        console.error('Lỗi khi xử lý bulk action:', err);
      },
    });

    const modal = bootstrap.Modal.getInstance(
      document.getElementById('bulkActionModal')
    );
    modal.hide();
  }

  loadData() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.isLoading = true;

    const userInfoStr = localStorage.getItem('user_info');
    const user = JSON.parse(userInfoStr || '{}');
    const body = {
      token: user.token || '',
      req_time: new Date().setHours(0, 0, 0, 0),
      dashboard: '5b3c485bafa2ef11b3eabcc9',
      dashboard_view_id: -1,
      page: this.pageIndex + 1,
      timezone: '+07:00',
      size: this.pageSize,
      smartlist_id: '[]',
      sort_by: 'sur_date_order',
      sort_direction: -1,
      permission_code: '',
      filter: 'false',
      search: '',
    };

    if (this.searchText.toLowerCase().trim() !== '') {
      body.search = this.searchText.toLowerCase().trim();
      this.dashboardService.searchList(body).subscribe({
        next: (res) => {
          this.dataSource.data = (res.records as DashboardRow[]) || [];
          this.totalRecords = res.count || 0;
          if (this.paginator) this.paginator.length = this.totalRecords;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Lỗi khi tìm kiếm dashboard:', err);
          this.isLoading = false;
        },
      });
    } else {
      this.dashboardService.getList(body).subscribe({
        next: (res) => {
          this.dataSource.data = (res.records as DashboardRow[]) || [];
          this.totalRecords = res.count || 0;
          if (this.paginator) this.paginator.length = this.totalRecords;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Lỗi khi tải dashboard:', err);
          this.isLoading = false;
        },
      });
    }
  }

  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle(): void {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  getHdsOfRecord(data: DashboardRow): string {
    const attributes = data?.smartlist?.extended_ui_attributes;
    const userHealthData = attributes?.user_health_data;
    const permissionCode = data?.permission?.code;

    const hasHealthData =
      !Utils.isEmpty(attributes) &&
      !Utils.isEmpty(userHealthData) &&
      !Utils.isEmpty(permissionCode) &&
      Utils.inArray(permissionCode, initGrDetailPage.listCodeShowIcon);

    const shouldShowHealthData =
      hasHealthData &&
      data?.hds_dbrd_permission === 1 &&
      !Utils.isEmpty(data?.patient_ref);

    if (shouldShowHealthData || data?.default_hds_record) {
      return 'Health Data';
    }
    return '';
  }

  isShowHealthData(data: DashboardRow): boolean {
    const permissionCode = data?.permission?.code;
    return (
      !Utils.isEmpty(permissionCode) &&
      !Utils.inArray(permissionCode, initGrDetailPage.listPerCodeView) &&
      this.getHdsOfRecord(data) === 'Health Data'
    );
  }

  getPatientName(data: DashboardRow): string {
    let patient_name = '';
    if (
      data.patient_set_by_doctor &&
      (!Utils.isEmpty(data.patient_set_by_doctor.first_name) ||
        !Utils.isEmpty(data.patient_set_by_doctor.last_name))
    ) {
      patient_name = [
        data.patient_set_by_doctor.first_name,
        data.patient_set_by_doctor.last_name,
      ]
        .filter(Boolean)
        .join(' ');
    } else if (
      data.patient &&
      (!Utils.isEmpty(data.patient.first_name) ||
        !Utils.isEmpty(data.patient.last_name))
    ) {
      patient_name = [data.patient.first_name, data.patient.last_name]
        .filter(Boolean)
        .join(' ');
    }
    return patient_name;
  }

  checkboxLabel(row?: DashboardRow): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row`;
  }

  getCPState(permission: any, default_hds_record: any): string {
    const code = permission?.code;

    if (typeof code !== 'number') return '';

    if (code >= 0 && code <= 4) return 'Invitation Pending';
    else if (code === 5) return 'Access denied';
    else if (code === 6)
      return default_hds_record == 1 ? 'NoCareProgramAssigned' : 'Active';
    else if (code === 8) return 'CareProgram Deleted By Patient';
    else if (code === 23) return 'HDS Permission Denied';
    else if (code === 24) return 'HDS Permission Partially Denied';
    else if (code === 25) return 'CareProgram Stopped';
    else if (code === 27) return 'Deleted By Provider';
    else if (code === 28) return 'Account Deleted By Patient';
    else if (code === 29) return 'App Incompatible';

    return '';
  }
}
