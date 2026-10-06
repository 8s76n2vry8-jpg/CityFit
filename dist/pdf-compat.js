// PDF.js's compatibility build assumes this API exists in its oldest supported
// Safari version. Older iPhone browser views need it in both window and worker.
if(typeof Promise.withResolvers!=='function'){
  Object.defineProperty(Promise,'withResolvers',{
    configurable:true,writable:true,
    value:function(){
      let resolve,reject;
      const promise=new this((onResolve,onReject)=>{resolve=onResolve;reject=onReject;});
      return {promise,resolve,reject};
    },
  });
}
