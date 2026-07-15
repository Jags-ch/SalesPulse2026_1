using { cuid, managed } from '@sap/cds/common';
using { salespulse.domain as domain } from './domain';

namespace salespulse.analytics;

entity RevenuePerformanceView @(cds.persistence.skip) {
  key ID: UUID;
  TenantID: UUID;
  RecordDate: Date;
  Amount: Decimal(15,2);
  Forecast: Boolean;
  BookingType: String(64);
  Region: String(64);
  Stage: String(64);
  SalesUserName: String(128);
  SalesTeamName: String(128);
}

entity TeamEffectivenessView @(cds.persistence.skip) {
  key TeamID: UUID;
  TeamName: String(128);
  TotalRevenue: Decimal(15,2);
  ClosedDeals: Integer;
  GoalAchievement: Decimal(5,2);
  WinRatio: Decimal(5,2);
}

entity GoalProgressView @(cds.persistence.skip) {
  key GoalID: UUID;
  Title: String(256);
  Status: String(32);
  ProgressPercent: Integer;
  OwnerName: String(128);
  TeamName: String(128);
}

entity TaskStatusView @(cds.persistence.skip) {
  key TaskID: UUID;
  Title: String(256);
  Status: String(32);
  DueDate: Date;
  AssignedToName: String(128);
  GoalTitle: String(256);
}
