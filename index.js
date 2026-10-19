const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();
function zonedParts(date, timeZone) { const out={}; new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).forEach(p=>{if(p.type!=='literal')out[p.type]=p.value}); return out; }
function isDue(s, now) { if(!s.enabled||!s.time||!Array.isArray(s.days)||!s.days.length||s.target!=='all')return false; const p=zonedParts(now,s.timezone||'Asia/Kolkata'); const d=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday); const [h,m]=s.time.split(':').map(Number); return s.days.includes(d)&&Number(p.hour)===h&&Number(p.minute)===m; }
exports.dispatchZenovaAlarms = onSchedule({schedule:'every 1 minutes',timeZone:'UTC',region:'asia-south1',retryCount:1}, async()=>{
 const now=new Date(); const schedules=await db.collection('alarmSchedules').where('enabled','==',true).get();
 for(const docSnap of schedules.docs){const s=docSnap.data();if(!isDue(s,now))continue;const p=zonedParts(now,s.timezone||'Asia/Kolkata');const minuteKey=`${p.year}${p.month}${p.day}${p.hour}${p.minute}`;const lockRef=db.collection('alarmDispatches').doc(`${docSnap.id}_${minuteKey}`);
  try{const claimed=await db.runTransaction(async tx=>{const lock=await tx.get(lockRef);if(lock.exists)return false;tx.create(lockRef,{scheduleId:docSnap.id,minuteKey,claimedAt:admin.firestore.FieldValue.serverTimestamp(),status:'processing'});return true});if(!claimed)continue;
   const deviceSnap=await db.collection('alarmDevices').where('enabled','==',true).get();let sent=0,failed=0;const devices=deviceSnap.docs.map(d=>({ref:d.ref,token:d.data().token||d.id})).filter(d=>!!d.token);
   for(let i=0;i<devices.length;i+=500){const chunk=devices.slice(i,i+500);const res=await messaging.sendEachForMulticast({tokens:chunk.map(x=>x.token),data:{title:'Zenova Educations — Wake-up reminder',body:`${s.name||'Wake-up alarm'} is scheduled now.`,scheduleId:docSnap.id,url:'/alarm/',ringSeconds:String(s.ringSeconds||60),scheduledAt:now.toISOString()},android:{priority:'high',ttl:3600000},webpush:{headers:{Urgency:'high',TTL:'3600'},notification:{title:'Zenova Educations — Wake-up reminder',body:`${s.name||'Wake-up alarm'} is scheduled now.`,requireInteraction:true,tag:`zenova-${docSnap.id}`},fcmOptions:{link:'/alarm/'}}});sent+=res.successCount;failed+=res.failureCount;res.responses.forEach((r,j)=>{if(!r.success&&['messaging/invalid-registration-token','messaging/registration-token-not-registered'].includes(r.error?.code))chunk[j].ref.delete().catch(()=>{});});}
   await lockRef.update({status:'complete',sent,failed,deviceCount:devices.length,completedAt:admin.firestore.FieldValue.serverTimestamp()});logger.info('Zenova alarm dispatched',{scheduleId:docSnap.id,sent,failed,deviceCount:devices.length});
  }catch(e){logger.error('Zenova alarm dispatch error',{scheduleId:docSnap.id,error:String(e)});}
 }
});
