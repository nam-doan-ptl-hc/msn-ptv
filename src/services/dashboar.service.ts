import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(private api: ApiService) {}

  getList(body: any) {
    return this.api.postFormEncoded('/listDashboardRecords', body);
  }

  searchList(body: any) {
    return this.api.postFormEncoded('/searchInDashboardRecord', body);
  }

  bulkStopOrDeleteDashboardRecords(body: any) {
    return this.api.postFormEncoded('/bulkStopOrDeleteDashboardRecords', body);
  }

  loadData4SnapshotCard(body: any) {
    return this.api.postFormEncoded('/loadData4SnapshotCard', body);
  }

  loadHDSsampleTypes(body: any) {
    return this.api.postFormEncoded('/loadHDSsampleTypes', body);
  }
}
