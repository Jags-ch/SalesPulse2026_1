const cds = require('@sap/cds');
const fs = require('fs');
const path = require('path');

module.exports = cds.service.impl(async function () {
  const { Tenant, SalesTeam, SalesUser, Customer, RevenueRecord, Goal, Task, Meeting, Notification, Subscription } = cds.entities('salespulse.domain');
  const { RevenuePerformanceView, TeamEffectivenessView, GoalProgressView, TaskStatusView } = cds.entities('salespulse.analytics');
  await seedCsvData();

  this.on('READ', RevenuePerformanceView, async (req) => {
    const tenantId = req.user && req.user.tenant ? req.user.tenant : req.headers['x-sap-business-tenant'];
    const rows = await cds.tx(req).run(
      SELECT.from(RevenueRecord, r => {
        r.ID;
        r.RecordDate;
        r.Amount;
        r.Status.as('Stage');
        r.Source.as('Region');
        r.SalesUser.UserName.as('SalesUserName');
        r.Customer.Name.as('SalesTeamName');
        r.Tenant.ID.as('TenantID');
      }).where({ tenant: tenantId })
    );
    return rows.map((row) => ({
      ...row,
      Forecast: false,
      BookingType: 'Actual',
      SalesTeamName: row.SalesTeamName || 'Unassigned',
    }));
  });

  async function seedCsvData() {
    const dataFolders = cds.env.requires.db.data || ['db/data'];
    const entities = {
      Tenant,
      SalesTeam,
      SalesUser,
      Customer,
      RevenueRecord,
      Goal,
      Task,
      Meeting,
      Notification,
      Subscription,
    };

    for (const [entityName, entity] of Object.entries(entities)) {
      const csvPath = dataFolders
        .map((folder) => path.resolve(__dirname, '..', folder, '${entityName}.csv'))
        .find(fs.existsSync);
      if (!csvPath) continue;

      const existing = await cds.run(SELECT.one.from(entity).columns(['count(1) as cnt']));
      console.log('seedCsvData:', entityName, 'path=', csvPath, 'existing=', existing && existing.cnt);
      if (existing && existing.cnt > 0) continue;

      const csv = fs.readFileSync(csvPath, 'utf8').trim();
      if (!csv) continue;
      const [header, ...lines] = csv.split(/\r?\n/).filter(Boolean);
      const columns = header.split(',').map((h) => h.trim());
      const entries = lines.map((line) => {
        const parts = line.split(',');
        return columns.reduce((row, col, idx) => {
          row[col] = parseCsvValue(parts[idx]);
          return row;
        }, {});
      });
      console.log('seedCsvData:', entityName, 'rows=', entries.length);
      if (entries.length > 0) {
        await cds.run(INSERT.into(entity).entries(entries));
      }
    }
  }

  function parseCsvValue(value) {
    if (value === undefined) return null;
    const v = value.trim();
    if (v === '') return null;
    if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
    if (/^-?\d+(?:\.\d+)?$/.test(v) && !/^0\d+/.test(v)) return Number(v);
    return v;
  }

  this.before('CREATE', [SalesTeam, SalesUser, Customer, RevenueRecord, Goal, Task, Meeting, Notification, Subscription], assignTenant);
  this.before('UPDATE', [SalesTeam, SalesUser, Customer, RevenueRecord, Goal, Task, Meeting, Notification, Subscription], verifyTenant);

  this.on('ApproveGoal', async (req) => {
    const goalId = req.data.goalID;
    await cds.tx(req).run(
      UPDATE(Goal).set({ Status: 'Active' }).where({ ID: goalId, tenant: req.data.tenant })
    );
    return true;
  });

  this.on('GetTeamMembers', async (req) => {
    const tenantId = req.user && req.user.tenant ? req.user.tenant : req.headers['x-sap-business-tenant'];
    return cds.tx(req).run(
      SELECT.from(SalesUser).where({ Team_ID: req.data.teamID, tenant: tenantId })
    );
  });

  this.on('GetNotificationTypes', async (req) => {
    try {
      const typesPath = path.resolve(__dirname, 'notification-types.json');
      if (!fs.existsSync(typesPath)) return JSON.stringify([]);
      const content = fs.readFileSync(typesPath, 'utf8');
      return content; // already JSON string
    } catch (e) {
      return JSON.stringify([]);
    }
  });

  this.on('EscalateTask', async (req) => {
    const task = await cds.tx(req).run(SELECT.one.from(Task).where({ ID: req.data.taskID, tenant: req.data.tenant }));
    if (!task) return false;
    await cds.tx(req).run(
      UPDATE(Task).set({ Status: 'Blocked', Comments: req.data.reason }).where({ ID: req.data.taskID })
    );
    await cds.tx(req).run(
      INSERT.into(Notification).entries({
        Category: 'TaskAlert',
        Message: 'Task escalation for ${task.Title}',
        Severity: 'High',
        TriggeredBy: 'System',
        Recipient_ID: task.AssignedTo_ID,
        tenant: req.data.tenant
      })
    );
    return true;
  });

  this.on('RegisterTenant', async (req) => {
    const tenantData = { ...req.data, Status: 'Active', StartDate: new Date().toISOString().slice(0, 10), IsActive: true };
    const result = await cds.tx(req).run(INSERT.into(Tenant).entries(tenantData));
    return result.ID;
  });

  this.after('CREATE', Task, async (req) => {
    const task = req.data;
    await cds.tx(req).run(
      INSERT.into(Notification).entries({
        Category: 'TaskAlert',
        Message: 'New task assigned: ${task.Title}',
        Severity: 'Medium',
        TriggeredBy: 'System',
        Recipient_ID: task.AssignedTo_ID,
        tenant: task.tenant
      })
    );
  });

  this.after('CREATE', Goal, async (req) => {
    const goal = req.data;
    await cds.tx(req).run(
      INSERT.into(Notification).entries({
        Category: 'GoalAlert',
        Message: 'Goal created: ${goal.Title}',
        Severity: 'Info',
        TriggeredBy: 'System',
        Recipient_ID: goal.Owner_ID,
        tenant: goal.tenant
      })
    );
  });

  async function assignTenant(req) {
    const tenantId = req.user && req.user.tenant ? req.user.tenant : req.headers['x-sap-business-tenant'];
    if (req.data) {
      if (!req.data.ID) {
        req.data.ID = cds.utils.uuid();
      }
      if (tenantId) {
        req.data.tenant = tenantId;
      }
    }
  }

  async function verifyTenant(req) {
    const tenantId = req.user && req.user.tenant ? req.user.tenant : req.headers['x-sap-business-tenant'];
    if (tenantId && req.data) {
      req.data.tenant = tenantId;
    }
  }
});
