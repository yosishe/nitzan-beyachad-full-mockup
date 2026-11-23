(() => {
 const dialog=document.getElementById('dialog');
 if(!dialog)return;
 function fitPhonePhoto(){
  if(!dialog.open||!dialog.querySelector('.photo-viewer'))return;
  const device=innerWidth>760?document.getElementById('device'):null;
  const rect=device?.getBoundingClientRect(),border=device?parseFloat(getComputedStyle(device).borderLeftWidth)||0:0;
  const values=rect?{
   left:rect.left+border,top:rect.top+border,width:device.clientWidth,height:device.clientHeight,
   radius:Math.max(0,(parseFloat(getComputedStyle(device).borderRadius)||0)-border)
  }:{left:0,top:0,width:innerWidth,height:innerHeight,radius:0};
  for(const [key,value] of Object.entries(values))dialog.style.setProperty('--photo-phone-'+key,value+'px');
 }
 new MutationObserver(fitPhonePhoto).observe(dialog,{attributes:true,attributeFilter:['open'],childList:true,subtree:true});
 window.addEventListener('resize',fitPhonePhoto);
 document.addEventListener('scroll',fitPhonePhoto,true);
 window.visualViewport?.addEventListener('resize',fitPhonePhoto);
})();
