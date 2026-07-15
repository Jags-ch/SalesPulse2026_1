using { salespulse.domain as domain } from './cds/domain';
using { salespulse.analytics as analytics } from './cds/analytics';

service SalesPulseService @(path:'/salespulse') {
  entity Tenants as projection on domain.Tenant;
  entity SalesTeams as projection on domain.SalesTeam;
  entity SalesUsers as projection on domain.SalesUser;
  entity Customers as projection on domain.Customer;
  entity RevenueRecords as projection on domain.RevenueRecord;
  entity Goals as projection on domain.Goal;
  entity Tasks as projection on domain.Task;
  entity Meetings as projection on domain.Meeting;
  entity Notifications as projection on domain.Notification;
  entity Subscriptions as projection on domain.Subscription;

  action ApproveGoal(goalID: UUID) returns Boolean;
  action EscalateTask(taskID: UUID, reason: String(512)) returns Boolean;
  action RegisterTenant() returns UUID;
  action GetTeamMembers(teamID: UUID) returns array of SalesUsers;
  action GetNotificationTypes() returns String;
}
