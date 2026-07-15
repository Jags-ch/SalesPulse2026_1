-- HDI / HANA SQL view creation script
-- NOTE: Replace <SCHEMA> with your HDI container schema or run this via SQL console connected to the HDI container.

-- Revenue Performance View (simplified)
CREATE OR REPLACE VIEW "REVENUE_PERFORMANCE_VIEW" AS
SELECT
  "ID",
  "RecordDate",
  "Amount",
  "Forecast",
  "BookingType",
  "Region",
  "Stage",
  "Customer_ID" AS "CustomerID",
  "SalesUser_ID" AS "SalesUserID",
  "SalesTeam_ID" AS "SalesTeamID",
  "tenant"
FROM "RevenueRecords";

-- Team Effectiveness View
CREATE OR REPLACE VIEW "TEAM_EFFECTIVENESS_VIEW" AS
SELECT
  st."ID" AS "TeamID",
  st."Name" AS "TeamName",
  COALESCE(SUM(rr."Amount"),0) AS "TotalRevenue",
  SUM(CASE WHEN rr."Stage" = 'Closed' THEN 1 ELSE 0 END) AS "ClosedDeals",
  CASE WHEN st."TargetRevenue" IS NOT NULL AND st."TargetRevenue" > 0
    THEN ROUND((COALESCE(SUM(rr."Amount"),0) / st."TargetRevenue") * 100,2)
    ELSE 0 END AS "GoalAchievementPercent",
  CASE WHEN SUM(CASE WHEN rr."Stage" IS NOT NULL THEN 1 ELSE 0 END) > 0
    THEN ROUND((SUM(CASE WHEN rr."Stage" = 'Closed' THEN 1 ELSE 0 END) * 1.0) /
      SUM(CASE WHEN rr."Stage" IS NOT NULL THEN 1 ELSE 0 END) * 100,2)
    ELSE 0 END AS "WinRatio"
FROM "SalesTeams" st
LEFT JOIN "RevenueRecords" rr ON rr."SalesTeam_ID" = st."ID"
GROUP BY st."ID", st."Name", st."TargetRevenue";

-- Goal Progress View
CREATE OR REPLACE VIEW "GOAL_PROGRESS_VIEW" AS
SELECT
  g."ID" AS "GoalID",
  g."Title",
  g."Status",
  g."ProgressPercent",
  su."UserName" AS "OwnerName",
  st."Name" AS "TeamName"
FROM "Goals" g
LEFT JOIN "SalesUser" su ON g."Owner_ID" = su."ID"
LEFT JOIN "SalesTeams" st ON g."Team_ID" = st."ID";

-- Task Status View
CREATE OR REPLACE VIEW "TASK_STATUS_VIEW" AS
SELECT
  t."ID" AS "TaskID",
  t."Title",
  t."Status",
  t."DueDate",
  su."UserName" AS "AssignedToName",
  g."Title" AS "GoalTitle"
FROM "Tasks" t
LEFT JOIN "SalesUser" su ON t."AssignedTo_ID" = su."ID"
LEFT JOIN "Goals" g ON t."Goal_ID" = g."ID";

-- End of script
