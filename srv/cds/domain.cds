namespace salespulse.domain;

using { cuid, managed } from '@sap/cds/common';

type UUID    : String(36);
type Text100 : String(100);
type Text256 : String(256);

aspect TenantAware {
  tenant : UUID;
}

aspect SoftDelete {
  IsActive : Boolean default true;
  DeletedAt : Timestamp;
}

type SalesRole : String(32);
type GoalStatus : String(32);
type TaskStatus : String(32);
type MeetingType : String(32);
type NotificationCategory : String(32);
type SubscriptionPlan : String(32);

entity Tenant : managed, TenantAware, SoftDelete {
  key ID: UUID;
  Name: String(256);
  BusinessDomain: String(128);
  ContactEmail: String(254);
  SubscriptionPlan: SubscriptionPlan;
}

entity SalesTeam : managed, TenantAware, SoftDelete {
  key ID: UUID;
  Name: String(128);
  Manager: Association to SalesUser;
  Tenant: Association to Tenant;
  TargetRevenue: Decimal(15,2);
  Region: String(64);
}

entity SalesUser : managed, TenantAware, SoftDelete {
  key ID: UUID;
  UserName: String(128);
  Email: String(254);
  Role: SalesRole;
  Team: Association to SalesTeam;
}

entity Customer : managed, TenantAware, SoftDelete {
  key ID: UUID;
  Name: String(256);
  Industry: String(128);
  Country: String(64);
  Email: String(254);
  Phone: String(32);
  AccountOwner: Association to SalesUser;
  AssignedTeam: Association to SalesTeam;
  Tenant: Association to Tenant;
  LifetimeValue: Decimal(15,2);
  LastActivity: Timestamp;
  OpenOpportunities: Integer;
  Priority: String(32);
}

entity RevenueRecord : managed, TenantAware, SoftDelete {
  key ID: UUID;
  Tenant: Association to Tenant;
  Customer: Association to Customer;
  SalesUser: Association to SalesUser;
  Amount: Decimal(15,2);
  Currency: String(3);
  RecordDate: Date;
  Segment: String(64);
  ProductLine: String(64);
  Status: String(32);
  Source: String(64);
}

entity Goal : managed, TenantAware, SoftDelete {
  key ID: UUID;
  Title: String(256);
  Description: String(1024);
  Owner: Association to SalesUser;
  Customer: Association to Customer;
  Tenant: Association to Tenant;
  SalesTeam: Association to SalesTeam;
  Status: GoalStatus;
  StartDate: Date;
  EndDate: Date;
  TargetAmount: Decimal(15,2);
  AchievedAmount: Decimal(15,2);
  Progress: Decimal(5,2);
  Priority: String(32);
  Comments: String(1024);
}

entity Task : managed, TenantAware, SoftDelete {
  key ID: UUID;
  Title: String(256);
  Description: String(1024);
  AssignedTo: Association to SalesUser;
  RelatedGoal: Association to Goal;
  Tenant: Association to Tenant;
  Status: TaskStatus;
  Priority: String(32);
  DueDate: Date;
  CompletedDate: Date;
  EstimatedEffort: Decimal(5,2);
  ActualEffort: Decimal(5,2);
  IsBlocked: Boolean default false;
  BlockReason: String(512);
}

entity Meeting : managed, TenantAware, SoftDelete {
  key ID: UUID;
  Subject: String(256);
  Category: MeetingType;
  Organizer: Association to SalesUser;
  SalesTeam: Association to SalesTeam;
  Tenant: Association to Tenant;
  Customer: Association to Customer;
  StartTime: Timestamp;
  EndTime: Timestamp;
  Location: String(128);
  Notes: String(1024);
  Outcome: String(256);
}

entity Notification : managed, TenantAware, SoftDelete {
  key ID: UUID;
  Tenant: Association to Tenant;
  Recipient: Association to SalesUser;
  Category: NotificationCategory;
  Message: String(512);
  SentAt: Timestamp;
  Read: Boolean default false;
  Severity: String(32);
  TriggeredBy: String(64);
  Link: String(512);
  Priority: String(32);
}

entity Subscription : managed, TenantAware, SoftDelete {
  key ID: UUID;
  Tenant: Association to Tenant;
  Plan: SubscriptionPlan;
  StartDate: Date;
  EndDate: Date;
  AutoRenew: Boolean default true;
  Seats: Integer;
  Status: String(32);
  BillingCycle: String(32);
  PaymentMethod: String(64);
  RenewalNotes: String(512);
}
