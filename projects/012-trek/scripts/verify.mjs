import assert from 'node:assert/strict';
import {initialState,validateState,parseAmount,balances,settle,routeLength,optimize} from '../site/core.mjs';

// Non-divisible shares conserve every cent, including after settlement.
for(const cents of [1,2,10000,999999999]){
  const expenses=[{id:'test',title:'旅行支出',cents,payer:2}];
  const rows=balances(expenses);
  assert.equal(rows.reduce((s,r)=>s+r.owed,0),cents);
  assert.equal(rows.reduce((s,r)=>s+r.net,0),0);
  const remaining=Object.fromEntries(rows.map(r=>[r.name,r.net]));
  for(const t of settle(expenses)){remaining[t.from]+=t.cents;remaining[t.to]-=t.cents;}
  assert.deepEqual(Object.values(remaining),[0,0,0]);
}
assert.equal(parseAmount('100.01'),10001);
assert.equal(parseAmount('0.01'),1);
for(const invalid of ['0','-1','1.001','1e3','Infinity','','10000000'])assert.equal(parseAmount(invalid),null);
const state=initialState();
for(const day of state.days){
  const sorted=optimize(day);
  assert.equal(sorted[0],day[0]);
  assert.deepEqual([...sorted].sort(),[...day].sort());
  assert.ok(routeLength(sorted)<=routeLength(day)+1e-8);
}
assert.ok(routeLength(optimize(state.days[0]))<routeLength(state.days[0]));
assert.deepEqual(optimize([]),[]);
assert.deepEqual(optimize(['gion']),['gion']);
assert.equal(settle([]).length,0);
assert.ok(validateState(JSON.parse(JSON.stringify(state))));
assert.equal(validateState({...state,days:[['unknown'],[],[]]}),false);
assert.equal(validateState({...state,day:99}),false);
assert.equal(validateState({...state,expenses:[{id:'x',title:'x',cents:1.1,payer:0}]}),false);
console.log('PASS: cent conservation, settlement, amount validation, route optimization, state validation.');
