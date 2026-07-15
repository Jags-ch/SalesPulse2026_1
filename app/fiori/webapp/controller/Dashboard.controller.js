sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel"], function (Controller, JSONModel) {
  "use strict";
  return Controller.extend("salespulse360.app.controller.Dashboard", {
    onInit: function () {
      var oModel = this.getOwnerComponent().getModel("mainService");
      this.getView().setModel(new JSONModel({
        RevenueChartPeriod: 'monthly',
        SalesChartPeriod: 'monthly',
        RevenueByUserPeriod: [],
        SalesByUserPeriod: [],
        RevenuePerformance: {
          Daily: 0,
          Weekly: 0,
          Monthly: 0,
          Quarterly: 0,
          Yearly: 0,
          Forecast: 0,
          Trend: []
        }
      }), "view");
      console.log('Dashboard.controller onInit');
      this._loadChartData();
      this._loadTaskAndGoalData();
      // fetch notification types for UI usage
      try {
        sap.ui.require(["salespulse360.app.controller.notification-helper"], function (helper) {
          helper.fetchNotificationTypes(this.getView());
        }.bind(this));
      } catch (e) { /* ignore */ }
    },
    formatAmount: function (value) {
      if (!value) return "0";
      return parseFloat(value).toFixed(2);
    }
    ,
    _loadChartData: function () {
      var vm = this.getView().getModel('view');
      if (!vm) vm = new JSONModel({});
      // Load RevenueRecords and aggregate by SalesUser, with expanded navigation properties
      fetch('/salespulse/RevenueRecords?$expand=SalesUser($expand=Team)')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var rows = data.value || [];
          var map = {};
          rows.forEach(function (r) {
            var userName = (r.SalesUser && r.SalesUser.UserName) || r.SalesUser_ID || 'Unassigned';
            var amt = Number(r.Amount) || 0;
            map[userName] = (map[userName] || 0) + amt;
            // Preserve expanded objects for table binding
            if (!r.SalesUser) {
              r.SalesUser = { UserName: userName, Team: { Name: '' } };
            }
            if (r.SalesUser && !r.SalesUser.Team) {
              r.SalesUser.Team = { Name: '' };
            }
          });
          var arr = Object.keys(map).map(function (k) { return { SalesUser: k, Amount: map[k] }; });
          vm.setProperty('/revenueByUser', arr);
          vm.setProperty('/RevenueRecords', rows);
          vm.setProperty('/RevenueByUserPeriod', this._aggregateRevenueByUserPeriod(rows, vm.getProperty('/RevenueChartPeriod') || 'monthly'));
          vm.setProperty('/SalesByUserPeriod', this._aggregateSalesByUserPeriod(rows, vm.getProperty('/SalesChartPeriod') || 'monthly'));
          vm.setProperty('/RevenuePerformance', this._calculateRevenuePerformance(rows));
          // compute total revenue for selected period
          var total = this._computeRevenueTotalForPeriod(rows, vm.getProperty('/RevenueChartPeriod') || 'monthly');
          vm.setProperty('/RevenueTotal', total);
          vm.setProperty('/RevenueTotalDisplay', this.formatAmount(total));
        }.bind(this)).catch(function () {
          vm.setProperty('/revenueByUser', []);
          vm.setProperty('/RevenueRecords', []);
          vm.setProperty('/RevenueByUserPeriod', []);
          vm.setProperty('/SalesByUserPeriod', []);
          vm.setProperty('/RevenuePerformance', this._emptyRevenuePerformance());
        }.bind(this));
      this.getView().setModel(vm, 'view');
    }
    ,
    onRevenuePeriodChange: function (oEvent) {
      var period = oEvent.getParameter('selectedItem').getKey();
      var vm = this.getView().getModel('view');
      if (!vm) {
        return;
      }
      var rows = vm.getProperty('/RevenueRecords') || [];
      vm.setProperty('/RevenueChartPeriod', period);
      vm.setProperty('/RevenueByUserPeriod', this._aggregateRevenueByUserPeriod(rows, period));
      // update total revenue for selected period
      var total = this._computeRevenueTotalForPeriod(rows, period);
      vm.setProperty('/RevenueTotal', total);
      vm.setProperty('/RevenueTotalDisplay', this.formatAmount(total));
    },

    onSalesPeriodChange: function (oEvent) {
      var period = oEvent.getParameter('selectedItem').getKey();
      var vm = this.getView().getModel('view');
      if (!vm) {
        return;
      }
      var rows = vm.getProperty('/RevenueRecords') || [];
      vm.setProperty('/SalesChartPeriod', period);
      vm.setProperty('/SalesByUserPeriod', this._aggregateSalesByUserPeriod(rows, period));
    },

    _aggregateRevenueByUserPeriod: function (rows, period) {
      if (!rows || rows.length === 0) {
        return [];
      }
      var latestDate = rows.reduce(function (max, r) {
        if (!r.RecordDate) return max;
        var date = new Date(r.RecordDate);
        date.setHours(0,0,0,0);
        return !max || date > max ? date : max;
      }, null);
      if (!latestDate) {
        return [];
      }
      var reference = new Date(latestDate);
      reference.setHours(0,0,0,0);
      var currentMonth = reference.getMonth();
      var quarterStart = Math.floor(currentMonth / 3) * 3;
      var startOfDay = new Date(reference);
      var startOfWeek = new Date(reference);
      startOfWeek.setDate(reference.getDate() - reference.getDay());
      startOfWeek.setHours(0,0,0,0);
      var startOfMonth = new Date(reference.getFullYear(), currentMonth, 1);
      var startOfQuarter = new Date(reference.getFullYear(), quarterStart, 1);
      var startOfYear = new Date(reference.getFullYear(), 0, 1);
      var periodMap = {};
      rows.forEach(function (r) {
        if (!r.RecordDate) return;
        var recordDate = new Date(r.RecordDate);
        recordDate.setHours(0,0,0,0);
        var include = false;
        switch (period) {
          case 'daily':
            include = recordDate.getTime() === reference.getTime();
            break;
          case 'weekly':
            include = recordDate >= startOfWeek && recordDate <= reference;
            break;
          case 'monthly':
            include = recordDate >= startOfMonth && recordDate <= reference;
            break;
          case 'quarterly':
            include = recordDate >= startOfQuarter && recordDate <= reference;
            break;
          case 'yearly':
            include = recordDate >= startOfYear && recordDate <= reference;
            break;
        }
        if (!include) {
          return;
        }
        var userName = (r.SalesUser && r.SalesUser.UserName) || r.SalesUser_ID || 'Unassigned';
        var amount = Number(r.Amount) || 0;
        periodMap[userName] = (periodMap[userName] || 0) + amount;
      });
      return Object.keys(periodMap).map(function (k) {
        return { SalesUser: k, Amount: periodMap[k] };
      });
    },

    _computeRevenueTotalForPeriod: function (rows, period) {
      if (!rows || rows.length === 0) return 0;
      var latestDate = rows.reduce(function (max, r) {
        if (!r.RecordDate) return max;
        var date = new Date(r.RecordDate);
        date.setHours(0,0,0,0);
        return !max || date > max ? date : max;
      }, null);
      if (!latestDate) return 0;
      var reference = new Date(latestDate);
      reference.setHours(0,0,0,0);
      var currentMonth = reference.getMonth();
      var quarterStart = Math.floor(currentMonth / 3) * 3;
      var startOfWeek = new Date(reference);
      startOfWeek.setDate(reference.getDate() - reference.getDay());
      startOfWeek.setHours(0,0,0,0);
      var startOfMonth = new Date(reference.getFullYear(), currentMonth, 1);
      var startOfQuarter = new Date(reference.getFullYear(), quarterStart, 1);
      var startOfYear = new Date(reference.getFullYear(), 0, 1);
      var total = 0;
      rows.forEach(function (r) {
        if (!r.RecordDate) return;
        var recordDate = new Date(r.RecordDate);
        recordDate.setHours(0,0,0,0);
        var include = false;
        switch (period) {
          case 'daily':
            include = recordDate.getTime() === reference.getTime();
            break;
          case 'weekly':
            include = recordDate >= startOfWeek && recordDate <= reference;
            break;
          case 'monthly':
            include = recordDate >= startOfMonth && recordDate <= reference;
            break;
          case 'quarterly':
            include = recordDate >= startOfQuarter && recordDate <= reference;
            break;
          case 'yearly':
            include = recordDate >= startOfYear && recordDate <= reference;
            break;
        }
        if (!include) return;
        total += Number(r.Amount) || 0;
      });
      return total;
    },

    _aggregateSalesByUserPeriod: function (rows, period) {
      if (!rows || rows.length === 0) {
        return [];
      }
      var latestDate = rows.reduce(function (max, r) {
        if (!r.RecordDate) return max;
        var date = new Date(r.RecordDate);
        date.setHours(0,0,0,0);
        return !max || date > max ? date : max;
      }, null);
      if (!latestDate) {
        return [];
      }
      var reference = new Date(latestDate);
      reference.setHours(0,0,0,0);
      var currentMonth = reference.getMonth();
      var quarterStart = Math.floor(currentMonth / 3) * 3;
      var startOfWeek = new Date(reference);
      startOfWeek.setDate(reference.getDate() - reference.getDay());
      startOfWeek.setHours(0,0,0,0);
      var startOfMonth = new Date(reference.getFullYear(), currentMonth, 1);
      var startOfQuarter = new Date(reference.getFullYear(), quarterStart, 1);
      var startOfYear = new Date(reference.getFullYear(), 0, 1);
      var periodMap = {};
      rows.forEach(function (r) {
        if (!r.RecordDate) return;
        var recordDate = new Date(r.RecordDate);
        recordDate.setHours(0,0,0,0);
        var include = false;
        switch (period) {
          case 'daily':
            include = recordDate.getTime() === reference.getTime();
            break;
          case 'weekly':
            include = recordDate >= startOfWeek && recordDate <= reference;
            break;
          case 'monthly':
            include = recordDate >= startOfMonth && recordDate <= reference;
            break;
          case 'quarterly':
            include = recordDate >= startOfQuarter && recordDate <= reference;
            break;
          case 'yearly':
            include = recordDate >= startOfYear && recordDate <= reference;
            break;
        }
        if (!include) {
          return;
        }
        var userName = (r.SalesUser && r.SalesUser.UserName) || r.SalesUser_ID || 'Unassigned';
        periodMap[userName] = (periodMap[userName] || 0) + 1;
      });
      return Object.keys(periodMap).map(function (k) {
        return { SalesUser: k, SalesCount: periodMap[k] };
      });
    },

    _calculateRevenuePerformance: function (rows) {
      if (!rows || rows.length === 0) {
        return this._emptyRevenuePerformance();
      }
      var latestDate = rows.reduce(function (max, r) {
        if (!r.RecordDate) return max;
        var date = new Date(r.RecordDate);
        date.setHours(0,0,0,0);
        return !max || date > max ? date : max;
      }, null);
      if (!latestDate) {
        return this._emptyRevenuePerformance();
      }
      var reference = new Date(latestDate);
      reference.setHours(0,0,0,0);
      var currentYear = reference.getFullYear();
      var currentMonth = reference.getMonth();
      var quarterStart = Math.floor(currentMonth / 3) * 3;
      var startOfMonth = new Date(currentYear, currentMonth, 1);
      var startOfQuarter = new Date(currentYear, quarterStart, 1);
      var startOfYear = new Date(currentYear, 0, 1);
      var monthDays = new Date(currentYear, currentMonth + 1, 0).getDate();
      var weeklyStart = new Date(reference);
      weeklyStart.setDate(reference.getDate() - reference.getDay());
      weeklyStart.setHours(0,0,0,0);
      var revenue = {
        Daily: 0,
        Weekly: 0,
        Monthly: 0,
        Quarterly: 0,
        Yearly: 0,
        Forecast: 0,
        Trend: []
      };
      var monthlyMap = {};
      rows.forEach(function (r) {
        if (!r.RecordDate) return;
        var recordDate = new Date(r.RecordDate);
        recordDate.setHours(0,0,0,0);
        var amount = Number(r.Amount) || 0;
        if (recordDate.getTime() === reference.getTime()) {
          revenue.Daily += amount;
        }
        if (recordDate >= weeklyStart && recordDate <= reference) {
          revenue.Weekly += amount;
        }
        if (recordDate >= startOfMonth && recordDate <= reference) {
          revenue.Monthly += amount;
        }
        if (recordDate >= startOfQuarter && recordDate <= reference) {
          revenue.Quarterly += amount;
        }
        if (recordDate >= startOfYear && recordDate <= reference) {
          revenue.Yearly += amount;
        }
        var monthKey = recordDate.getFullYear() + '-' + String(recordDate.getMonth() + 1).padStart(2, '0');
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + amount;
      });
      var trendKeys = Object.keys(monthlyMap).sort();
      revenue.Trend = trendKeys.slice(-6).map(function (key) {
        var parts = key.split('-');
        var monthName = new Date(parts[0], Number(parts[1]) - 1, 1).toLocaleString('default', { month: 'short' });
        return { Month: monthName, Amount: monthlyMap[key] };
      });
      var passedDays = Math.max(1, reference.getDate());
      var averageDaily = revenue.Monthly / passedDays;
      revenue.Forecast = Math.round((revenue.Monthly + averageDaily * (monthDays - passedDays)) * 100) / 100;
      return revenue;
    }
    ,
    _emptyRevenuePerformance: function () {
      return {
        Daily: 0,
        Weekly: 0,
        Monthly: 0,
        Quarterly: 0,
        Yearly: 0,
        Forecast: 0,
        Trend: []
      };
    },
    _loadTaskAndGoalData: function () {
      var vm = this.getView().getModel('view') || new JSONModel({});
      // Tasks by status
      fetch('/salespulse/Tasks')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var rows = data.value || [];
          var map = {};
          rows.forEach(function (r) {
            var s = r.Status || 'Unknown';
            map[s] = (map[s] || 0) + 1;
          });
          var arr = Object.keys(map).map(function (k) { return { Status: k, Count: map[k] }; });
          vm.setProperty('/tasksByStatus', arr);
        }).catch(function () { vm.setProperty('/tasksByStatus', []); });

      // Goals by status
      fetch('/salespulse/Goals')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var rows = data.value || [];
          var map = {};
          rows.forEach(function (r) {
            var s = r.Status || 'Unknown';
            map[s] = (map[s] || 0) + 1;
          });
          var arr = Object.keys(map).map(function (k) { return { Status: k, Count: map[k] }; });
          vm.setProperty('/goalsByStatus', arr);
        }).catch(function () { vm.setProperty('/goalsByStatus', []); });

      this.getView().setModel(vm, 'view');
    }
  });
});
