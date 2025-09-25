import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../../services/AuthService';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { Utils } from '../../../../utils/utils';
import { initCharts } from '../../../../shared/constants';

@Component({
  selector: 'hds-data-view',
  standalone: true,
  imports: [
    CommonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    FormsModule,
    MatSortModule,
  ],
  templateUrl: './hds-data-view.component.html',
  styleUrls: ['./hds-data-view.component.scss'],
})
export class HdsDataViewComponent implements OnInit, AfterViewInit, OnChanges {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @Input() getNameAccount!: () => void;
  @Input() fncDetailChart!: (item: any, isSnapShot?: boolean) => void;
  @Input() user: any;
  @Input() charts: any[] = [];
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  public Utils = Utils;
  constructor(private datePipe: DatePipe, private cdr: ChangeDetectorRef) {}
  isBrowser = false;
  isLoading = false;

  dataSource = new MatTableDataSource<any>([]);

  columnNames: string[] = ['Name', 'Value', 'Measurement date'];
  totalRecords = 0;
  pageSize = 10;
  filterValue = '';
  displayedColumns: string[] = ['name', 'value', 'date', 'sample_type'];
  groupHdsSampleCateTypes(): { value: string; icon: string }[] {
    let newArr: string[] = [];

    this.charts.forEach((v: any) => {
      // gộp sample_type_categories vào newArr nếu có
      if (
        v.items[0].sample_type_categories &&
        v.items[0].sample_type_categories.length > 0
      ) {
        newArr = [
          ...new Set([...newArr, ...v.items[0].sample_type_categories]),
        ];
      }

      // tìm sample tương ứng trong listSharedSamples
      const fSample = initCharts.listSharedSamples.find(
        (s) => s.sample_type_id === v.unique_sample_type_id
      );

      if (fSample) {
        v.body_type = fSample.body_type;
        v.top_type = fSample.top_type;
        v.top_title = fSample.top_title;
        v.last = fSample.last;
      }
    });
    const defaultDirCate = '/assets/images/icon-sample-type-category/';
    return newArr.map((v) => ({
      value: v,
      icon:
        defaultDirCate + 'ic_' + v.split(' ').join('_').toLowerCase() + '.svg',
    }));
  }
  menuLeft: any = [];
  private updateTableData() {
    const mappedData = this.charts.map((c: any) => {
      const firstPoint = c.dataCharts?.[0]?.data?.[0] || null;
      let value: any = '';
      if (c.avg) {
        const unit = Utils.showUnit(c.sample_type, c.items[0].primary_unit);
        value = c.items[0].primary_unit ? c.avg + ' ' + unit : 'avg ' + c.avg;
      } else if (firstPoint?.y) {
        if (c.sample_type === 'HEIGHT') {
          const unit = Utils.getUserUnits();
          if (unit?.height === 'ft') {
            value = Utils.convertUnit.showHeightInch(firstPoint.y);
          } else {
            value =
              Utils.formatValueByUnit(c.sample_type, firstPoint.y) +
              ' ' +
              unit?.height;
          }
        } else {
          value = c.items[0].primary_unit
            ? Utils.formatValueByUnit(c.sample_type, firstPoint.y) +
              ' ' +
              Utils.showUnit(c.sample_type, c.items[0].primary_unit)
            : 'avg ' + firstPoint.y;
        }
      } else {
        value = 'avg ' + c.items[0].primary_unit;
      }
      return {
        iconChart:
          'ic-' + c.sample_type.toLowerCase().replace(/_/g, '-') + '-st.svg',
        name: c.name,
        value: value,
        sample_type: c.sample_type,
        date: firstPoint?.date ?? null,
      };
    });

    this.dataSource = new MatTableDataSource<any>(mappedData);
    this.totalRecords = mappedData.length;

    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }
  ngOnInit(): void {
    if (this.isBrowser && !this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
    }
    this.updateTableData();
    //this.menuLeft = this.groupHdsSampleCateTypes();
    //console.log('menuLeft', this.menuLeft);
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['charts']) {
      this.menuLeft = this.groupHdsSampleCateTypes();
      this.updateTableData();
      console.log('this.charts:', this.charts);
    }
  }
  applyFilterText() {
    this.dataSource.filter = this.filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  filterByCategory(cate: string) {
    if (!cate) {
      this.dataSource.data = [];
      this.totalRecords = 0;
      return;
    }
  }
  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }
}
