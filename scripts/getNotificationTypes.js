const fetch = require('node-fetch');

const url = process.env.URL || 'http://localhost:4014/salespulse/GetNotificationTypes';

fetch(url, { method: 'POST' })
  .then(res => res.text())
  .then(text => {
    try {
      console.log('Notification types:', JSON.parse(text));
    } catch (e) {
      console.log('Response:', text);
    }
  })
  .catch(err => {
    console.error('Error fetching notification types:', err.message);
  });
