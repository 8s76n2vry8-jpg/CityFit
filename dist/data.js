export const cities = [
  ['nyc','New York','NY',100,100,100,100],
  ['sf','San Francisco','CA',97.6,80.5,103.2,109.2],
  ['seattle','Seattle','WA',90.3,60.2,98,95.8],
  ['dc','Washington','DC',87.3,69,88.8,95.4],
  ['boston','Boston','MA',86.2,77.7,91.4,91.3],
  ['sandiego','San Diego','CA',82,74.5,80.9,89.8],
  ['la','Los Angeles','CA',81.5,64.6,87.1,88.2],
  ['miami','Miami','FL',79.5,69,80.3,99.1],
  ['philly','Philadelphia','PA',78.8,44.7,84.2,78.6],
  ['chicago','Chicago','IL',76,55.2,82.6,81.6],
  ['atlanta','Atlanta','GA',75.3,44.2,84,84.1],
  ['portland','Portland','OR',75.2,48.4,81.2,74.3],
  ['denver','Denver','CO',75.1,50.2,81.2,74.5],
  ['dallas','Dallas','TX',72.9,45.8,75.6,72.5],
  ['nashville','Nashville','TN',70.3,51.8,75.3,69.3],
  ['austin','Austin','TX',66.4,50.3,68.6,73.5],
].map(([id,name,state,overall,rent,groceries,dining])=>({id,name,state,overall,rent,groceries,dining}));

export const categories = [
  {id:'rent',name:'Rent',index:'rent',color:'#3656ed',icon:'home'},
  {id:'groceries',name:'Groceries',index:'groceries',color:'#39aaa1',icon:'basket'},
  {id:'dining',name:'Dining & coffee',index:'dining',color:'#faaf4e',icon:'coffee'},
  {id:'transport',name:'Transportation',index:'overall',color:'#7b83df',icon:'train'},
  {id:'utilities',name:'Utilities',index:'overall',color:'#87b6e8',icon:'bolt'},
  {id:'shopping',name:'Shopping',index:'overall',color:'#e38fb3',icon:'bag'},
  {id:'entertainment',name:'Fun & fitness',index:'overall',color:'#aba3e8',icon:'music'},
  {id:'fixed',name:'Subscriptions & other',index:null,color:'#a7afbf',icon:'repeat'},
];
export const sampleBudget = {rent:2200,groceries:420,dining:380,transport:160,utilities:150,shopping:210,entertainment:220,fixed:180};
export const dataSource = 'https://www.numbeo.com/cost-of-living/region_rankings.jsp?region=021&title=2026';
