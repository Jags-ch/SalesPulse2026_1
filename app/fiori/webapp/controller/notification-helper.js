sap.ui.define(["sap/ui/model/json/JSONModel"], function (JSONModel) {
  "use strict";
  return {
    fetchNotificationTypes: function (oView) {
      fetch('/salespulse/GetNotificationTypes', { method: 'POST' })
        .then(function (res) { return res.text(); })
        .then(function (text) {
          try {
            var types = JSON.parse(text);
            var m = oView.getModel('view') || new JSONModel({});
            m.setProperty('/notificationTypes', types);
            oView.setModel(m, 'view');
          } catch (e) {
            // ignore
          }
        }).catch(function () { /* ignore */ });
    }
  };
});
