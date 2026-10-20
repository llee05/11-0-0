import test from 'node:test';
import assert from 'node:assert/strict';
import {matchChances,summarizeSamples} from '../scripts/audit-balance.mjs';

test('match forecast convolution handles draws, split boards and symmetric decisive games',()=>{
  assert.deepEqual(matchChances(Array(4).fill({win:0,draw:1,loss:0})),{win:0,draw:1,loss:0,expectedMatchPoints:1});
  assert.deepEqual(matchChances([{win:1,draw:0,loss:0},{win:1,draw:0,loss:0},{win:0,draw:0,loss:1},{win:0,draw:0,loss:1}]),{win:0,draw:1,loss:0,expectedMatchPoints:1});
  assert.deepEqual(matchChances(Array(4).fill({win:0.5,draw:0,loss:0.5})),{win:5/16,draw:6/16,loss:5/16,expectedMatchPoints:1});
  const ps=[{win:0.6,draw:0.3,loss:0.1},{win:0.4,draw:0.4,loss:0.2},{win:0.2,draw:0.5,loss:0.3},{win:0.3,draw:0.2,loss:0.5}];
  const a=matchChances(ps),b=matchChances(ps.map(p=>({win:p.loss,draw:p.draw,loss:p.win})));
  assert.ok(Math.abs(a.win-b.loss)<1e-12&&Math.abs(a.loss-b.win)<1e-12&&Math.abs(a.draw-b.draw)<1e-12);
  assert.ok(Math.abs(a.win+a.draw+a.loss-1)<1e-12);
  assert.throws(()=>matchChances(ps.slice(1)),/four boards/);
});
test('poor-run summaries distinguish record, points and outcomes below encountered forecasts',()=>{
  const common={sourceGap:80,effectiveGap:65};
  const report=summarizeSamples([
    {...common,w:2,d:6,l:3,mp:10,rank:20,expectedMP:14},
    {...common,w:5,d:0,l:6,mp:10,rank:21,expectedMP:11},
    {...common,w:9,d:1,l:1,mp:19,rank:1,expectedMP:17},
  ]);
  assert.equal(report.atMostTwoWins.count,1);assert.equal(report.atMostTenMatchPoints.count,2);assert.equal(report.exactTwoSixThree.count,1);
  assert.equal(report.titles.count,1);assert.equal(report.perfect.count,0);
  assert.deepEqual(report.poorRunForecast,{runs:2,meanActualMP:10,meanForecastMP:12.5,meanOutcomeMinusForecast:-2.5});
  assert.ok(report.exactTwoSixThree.interval95[0]<1/3&&report.exactTwoSixThree.interval95[1]>1/3);
});
