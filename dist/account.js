let currentUser=null;
export async function requestJSON(path,options={}){
  const response=await fetch(path,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers}});
  let data;try{data=await response.json();}catch{throw new Error('CityFit could not connect. Please try again.');}
  if(!response.ok){if(response.status===401&&path!=='/api/login')document.dispatchEvent(new CustomEvent('cityfit-session-expired'));throw new Error(data.error||'Please try again.');}return data;
}
export const account=()=>currentUser;
const $=id=>document.getElementById(id);
function displayUser(user){
  currentUser=user;$('account-gate').hidden=!!user;$('main').hidden=!user;$('account-controls').hidden=!user;
  $('account-name').textContent=user?.username||'';
  if(user)$('auth-error').hidden=true;
  document.dispatchEvent(new CustomEvent('cityfit-account',{detail:user}));
}
export function initializeAccount(){
  let creating=false;
  $('auth-toggle').addEventListener('click',()=>{creating=!creating;$('auth-title').textContent=creating?'Create your CityFit account':'Welcome to CityFit';$('auth-submit').textContent=creating?'Create account':'Sign in';$('auth-toggle').textContent=creating?'Already have an account? Sign in':'New here? Create an account';$('auth-username-field').hidden=!creating;$('auth-username').required=creating;$('auth-identifier-label').textContent=creating?'Email':'Email or username';$('auth-identifier').type=creating?'email':'text';$('auth-identifier').autocomplete=creating?'email':'username';$('auth-password').autocomplete=creating?'new-password':'current-password';$('auth-password-confirm-field').hidden=!creating;$('auth-password-confirm').required=creating;$('auth-error').hidden=true;});
  $('auth-form').addEventListener('submit',async event=>{
    event.preventDefault();if(creating&&$('auth-password').value!==$('auth-password-confirm').value){$('auth-error').textContent='Your passwords do not match.';$('auth-error').hidden=false;return;}
    $('auth-submit').disabled=true;$('auth-error').hidden=true;
    try{const data=await requestJSON(creating?'/api/register':'/api/login',{method:'POST',body:JSON.stringify({username:$('auth-username').value,email:creating?$('auth-identifier').value:undefined,identifier:$('auth-identifier').value,password:$('auth-password').value})});$('auth-form').reset();displayUser(data.user);document.dispatchEvent(new CustomEvent('cityfit-ai-availability',{detail:data.aiAvailable}));}
    catch(error){$('auth-error').textContent=error.message;$('auth-error').hidden=false;}
    finally{$('auth-submit').disabled=false;}
  });
  $('account-logout').addEventListener('click',async()=>{try{await requestJSON('/api/logout',{method:'POST',body:'{}'});displayUser(null);document.querySelectorAll('dialog[open]').forEach(d=>d.close());}catch(error){$('live-status').textContent=error.message;}});
  document.addEventListener('cityfit-session-expired',()=>displayUser(null));
  requestJSON('/api/account').then(data=>{displayUser(data.user);document.dispatchEvent(new CustomEvent('cityfit-ai-availability',{detail:data.aiAvailable}));}).catch(error=>{$('auth-error').textContent=error.message;$('auth-error').hidden=false;}).finally(()=>{$('auth-loading').hidden=true;$('auth-form').hidden=false;$('auth-toggle').hidden=false;});
}
