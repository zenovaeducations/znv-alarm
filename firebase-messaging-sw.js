/* Firebase Cloud Messaging service worker for Zenova Educations.
   Keep this file at the website root: /firebase-messaging-sw.js */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyDeO4bUhJ2kScQ7ZbEYwSlfH8Uk5qpGBIo",
  authDomain: "znvapp-2a26f.firebaseapp.com",
  projectId: "znvapp-2a26f",
  storageBucket: "znvapp-2a26f.firebasestorage.app",
  messagingSenderId: "391066000827",
  appId: "1:391066000827:web:9dda02a3464176af2ff89e",
  measurementId: "G-EJFSZLTHML"
});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  const title = data.title || 'Zenova Educations — Wake-up reminder';
  const options = {
    body: data.body || 'It is time to wake up and prepare for study.',
    icon: '/zenova-icon.png',
    tag: data.scheduleId || 'zenova-wakeup',
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || '/alarm/' }
  };
  self.registration.showNotification(title, options);
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url || '/alarm/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {
    for (const client of list) if ('focus' in client) { client.navigate(url); return client.focus(); }
    return clients.openWindow(url);
  }));
});
