(() => {
 if(/\/scroll(?:\.html)?$/.test(location.pathname))return;
 function profileParts(p){
  const limit=document.body.classList.contains('large-reading')?85:130;
  const chunks=text=>{const out=[];let line='';for(const word of String(text||'').trim().split(/\s+/u)){if(line&&line.length+word.length+1>limit){out.push(line);line=''}line+=(line?' ':'')+word}if(line)out.push(line);return out};
  const style={'הודעות קצרות':'נוח לי לקבל הודעה קצרה.','זמן לחשוב':'נוח לי לקחת זמן לחשוב לפני תשובה.','שאלה אחת בכל פעם':'נוח לי ששואלים אותי שאלה אחת בכל פעם.','עזרה בפתיחת שיחה':'עוזר לי כשמישהו מתחיל את השיחה בשאלה.'};
  const sections=[['נעים להכיר',introduction(p)||'כאן אפשר להכיר אותי דרך התמונות והתחביבים שלי.'],['התחביבים שלי',p.hobbies.join(' · ')||'עוד לא בחרתי תחביבים.'],['קצת עליי',p.bio||'אפשר להתחיל להכיר אותי דרך התחביבים שלי.'],['מה נעים לי בשיחה',p.style.map(t=>style[t]||t).join(' ')||'אפשר להתחיל בשאלה קצרה.'],['מה עושה לי טוב?',p.joy],['בקצרה על '+p.name,readingSummary(p).join(' ')]];
  return sections.flatMap(([title,text])=>chunks(text).map((text,i)=>({title:title+(i?' · המשך':''),text,shared:title==='התחביבים שלי'&&i===0})));
 }
 profilePageCount=p=>profileParts(p).length;
profileDeck = function(p,k,{id='',common=[],fromRequest=false,fromChat=false}={}){
 const parts=profileParts(p);k=Math.max(0,Math.min(k,parts.length-1));const part=parts[k];
 const own=!id,discovery=!own&&!fromRequest&&!fromChat,about=false,count=parts.length,last=k===count-1;
 const interests=[...new Set(p.hobbies)];
 const hobby=interests.length?interests[k%interests.length]:'';
 const photoIndex=p.photos.length?k%p.photos.length:0;
 const pic=p.photos[photoIndex];
 const styleText={'הודעות קצרות':'נוח לי לקבל הודעה קצרה.','זמן לחשוב':'נוח לי לקחת זמן לחשוב לפני תשובה.','שאלה אחת בכל פעם':'נוח לי ששואלים אותי שאלה אחת בכל פעם.','עזרה בפתיחת שיחה':'עוזר לי כשמישהו מתחיל את השיחה בשאלה.'};
 const line=part.text,extra='';
 const speech=[p.name,k===0&&p.city!==line?p.city:'',line,k!==1&&hobby?'תחביב: '+hobby:'',extra].filter(Boolean).join('. ');
 const action=own?'ownStage':fromRequest?'requestStage':fromChat?'chatProfileStage':'stage';
 const forward=k===0?'<button type="button" class="deck-next" '+act(action,1)+'>'+'<span>'+esc('עוד על '+p.name)+'</span>'+icon('chevron-left')+'</button>':
   !last?round('לעמוד הבא בפרופיל',action,1,'chevron-left','nextpart'):
   !discovery?'':'<button type="button" class="deck-next" aria-label="'+esc('אפשרויות בפרופיל של '+p.name)+'" '+act('profileDecision',id)+'><span>אפשרויות</span>'+icon('chevron-left')+'</button>';
 const backArrow=k?round('לעמוד הקודם בפרופיל',action,-1,'chevron-right','prevpart'):
   '<button type="button" class="round prevpart" disabled aria-label="העמוד הראשון בפרופיל">'+icon('chevron-right')+'</button>';
 const nav=forward+backArrow;
 const sentRequest=!own&&outgoing().find(r=>r.to===id);
 const sent=Boolean(sentRequest);
 const atLimit=discovery&&!sent&&sentToday()>=db.settings.requests;
 const remaining=Math.max(0,db.settings.requests-sentToday());
 const limitNote=discovery?'<button type="button" id="ask-limit" class="opening-quota" '+act('openingLimit')+' aria-label="'+esc((remaining?'אפשר לפנות לעוד '+remaining+' אנשים היום. ':'פניות חדשות אפשר לשלוח שוב מחר. ')+'להסבר על פניות ושיחות')+'">'+(remaining?(remaining===1?'אפשר לפנות לעוד אדם אחד היום':'אפשר לפנות לעוד '+remaining+' אנשים היום'):'פניות חדשות אפשר לשלוח שוב מחר')+' <span class="quota-info" aria-hidden="true">?</span></button>':'';
 const revisiting=discovery&&reviewingProfiles;
 const single=revisiting&&visits().filter(canRevisit).length===1;
 const reviewText=single?'זה פרופיל שכבר ראית היום.':'אלה הפרופילים שכבר ראית היום.';
 const reviewNotice=revisiting?'<div class="review-notice" role="status">'+icon('users')+reviewText+'</div>':'';
 const controls=listen((revisiting?reviewText+' ':'')+speech)+(own||fromChat?'':round('אפשרויות לפרופיל · עזרה, הסתרה או דיווח','profileOptions',id,'shield-check'));
 const ask=btn(sent?(sentRequest.kind==='like'?'הלייק נשלח':'הבקשה נשלחה'):'רוצה להכיר את '+p.name,'ask',id,'primary',sent?'check':'message-circle',atLimit?'disabled aria-describedby="ask-limit"':sent?'disabled':'');
 const foot=fromChat?btn('חזרה לשיחה עם '+p.name,'backToChat',id,'primary','chevron-right'):fromRequest?btn('רוצה להכיר ולענות ל'+p.name,'accept',id,'primary','message-circle')+quiet('חזרה לבקשה','backToRequest',id,'chevron-right'):own?btn('חזרה לפרופיל שלי','ownBack','','','chevron-right'):ask+(single?btn('חזרה הביתה','go','home','','house'):btn('לדלג לאדם הבא','nextPerson','','','user-round-search'))+(!single&&(revisiting||deckIndex>0)?round('לחזור לאדם הקודם','prevPerson','','chevron-right'):'');
 const like=discovery?'<button type="button" class="profile-like'+(sent?' is-sent':'')+'" '+act('likeProfile',id)+' aria-label="'+esc(sent?'כבר נשלחה בקשת היכרות ל'+p.name:'לשלוח לייק ל'+p.name)+'" '+(sent?'disabled':atLimit?'disabled aria-describedby="ask-limit"':'')+'>'+icon('heart')+'<span>'+(sent?(sentRequest.kind==='like'?'הלייק נשלח':'בקשה נשלחה'):'לייק')+'</span></button>':'';
 const fields=[p.name,p.age,p.city].filter(value=>value!==null&&value!==undefined&&String(value).trim());
 const identity='<div class="profile-meta" dir="rtl">'+fields.map((v,i)=>i?'<span class="meta-part"><span class="midpoint" aria-hidden="true">·</span><bdi>'+esc(v)+'</bdi></span>':'<bdi class="profile-name">'+esc(v)+'</bdi>').join(' ')+'</div>';
 const section=part.title;
 const portrait=p.photos[0]?img(p.photos[0],'cover-thumb',''):'';
 const header='<div class="profile-heading">'+portrait+identity+'<div class="row">'+controls+'</div></div><div class="profile-title-row"><h1 class="profile-title">'+esc(section)+'</h1>'+(pic?quiet('הגדל תמונה','expandProfilePhoto'):'')+'</div>';
 const label='<span class="deck-count">'+(about&&hobby&&!discovery?'<span class="profile-hobby">'+esc(hobby)+'</span> · ':'')+(k+1)+' מתוך '+count+'</span>';
 const personalBio=(p.bio||'').trim();
 const aboutCopy=personalBio.split(/\n+|(?<=[.!?])\s+/u).filter(Boolean).map(t=>'<span class="bio-paragraph">'+esc(t)+'</span>').join('')+
  (p.joy&&!personalBio.includes(p.joy)?'<span class="bio-joy"><b>מה עושה לי טוב?</b> '+esc(p.joy)+'</span>':'');
 const summary=readingSummary(p);
 const ending='';
 return '<div class="deck paged-deck'+(about?' about-deck':'')+(last?' final-deck':'')+'"><section class="card"><div class="visual">'+(pic?img(pic,'',photoDescriptions[pic]||'תמונה '+(photoIndex+1)+' מתוך '+p.photos.length+' בפרופיל של '+p.name):'')+progress(k+1,count)+label+like+nav+(own||cleanPresentation?'':mark(13,'<span>הזדמנות להיכרות</span>','deck-caption'))+'</div><div class="body'+(about?' about-body':'')+'">'+header+(false?'<span class="profile-hobby">תחביב · '+esc(hobby)+'</span>':'')+'<p class="'+(about?'bio-copy':'')+'">'+(about&&aboutCopy?aboutCopy:esc(line))+'</p>'+(extra?'<p class="profile-detail">'+esc(extra)+'</p>':'')+''+(about?quiet('לקרוא את ההמשך','showProfileText',line):'')+(part.shared&&common.length?'<div class="notice"><span class="small">שניכם אוהבים</span><div class="chips">'+common.slice(0,3).map(x=>'<span class="chip">'+esc(x)+'</span>').join('')+'</div></div>':'')+'</div>'+ending+'</section>'+reviewNotice+limitNote+'<div class="deck-foot'+(discovery?' profile-choices':'')+'">'+foot+'</div></div>';
};
 fitAboutText=()=>{};
 render();
})();
