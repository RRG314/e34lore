export type BudgetLine={id:string;name:string;cents:number|null;owned:boolean};
export function moneyInput(value:string):number|null {
 if(value.trim()==='')return null;
 if(!/^\d{1,7}(\.\d{1,2})?$/.test(value))throw Error('Enter a nonnegative amount with at most two decimal places.');
 const [whole,fraction='']=value.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}
export function sumBudget(lines:readonly BudgetLine[]){
 const missing=lines.filter(line=>!line.owned&&line.cents===null);
 for(const line of lines)if(line.cents!==null&&(!Number.isSafeInteger(line.cents)||line.cents<0))throw Error('Invalid budget amount');
 const known=lines.reduce((sum,line)=>sum+(line.owned?0:line.cents||0),0);
 if(!Number.isSafeInteger(known))throw Error('Budget exceeds supported range');
 return {known,total:missing.length?null:known,missing:missing.map(line=>line.name)};
}
export function laborBudget(hours:string,rate:string):number|null{
 if(!hours.trim()||!rate.trim())return null;
 if(!/^\d{1,3}(\.\d{1,2})?$/.test(hours))throw Error('Enter hours between 0 and 999.99.');
 const cents=moneyInput(rate);return cents===null?null:Math.round(Number(hours)*cents);
}
export function budgetJournal(input:{title:string;guide:string;revision:string;currency:string;lines:BudgetLine[];hours:string;rate:string;at:string}){
 if(!/^[A-Z]{3}$/.test(input.currency))throw Error('Choose a three-letter currency.');
 const sum=sumBudget(input.lines),labor=laborBudget(input.hours,input.rate),amount=(cents:number|null)=>cents===null?'Not supplied':`${input.currency} ${(cents/100).toFixed(2)}`;
 return {title:'Plan: '+input.title.slice(0,145),cost:sum.total===null?null:sum.total/100,currency:input.currency,
 body:[`Repair plan recorded ${input.at}.`,`Walkthrough: ${input.guide} · revision ${input.revision}.`,'Budget values are my estimates, not retailer quotes or factory labor times.','',...input.lines.map(line=>`${line.name}: ${line.owned?'Already owned; no additional purchase cost':amount(line.cents)}`),'',`DIY known subtotal: ${amount(sum.known)}.`,sum.total===null?`Full DIY total is unknown. Missing: ${sum.missing.join(', ')}.`:`DIY budget: ${amount(sum.total)}.`,`Professional labor estimate: ${amount(labor)}${input.hours?` (${input.hours} hours at ${amount(moneyInput(input.rate))}/hour)` : ''}.`,'These figures exclude unrecorded costs. Planning does not record a completed repair.'].join('\n')};
}
