// SPDX-License-Identifier: Hippocratic-3.0
import React from "react";
import { renderToString } from "react-dom/server";
import mod from "react-countup";
// the CJS build's interop puts the component on .default
const CountUp = mod.default ?? mod;

const cases = [
  ["as shipped:  <CountUp end={82} duration={0.9} separator=',' />",
   React.createElement(CountUp, { end: 82, duration: 0.9, separator: "," })],
  ["start={0}:   <CountUp end={82} start={0} .../>",
   React.createElement(CountUp, { end: 82, start: 0, duration: 0.9, separator: "," })],
  ["start=end:   <CountUp end={82} start={82} .../>",
   React.createElement(CountUp, { end: 82, start: 82, duration: 0.9, separator: "," })],
  ["big number:  <CountUp end={2245189} start={2245189} separator=',' />",
   React.createElement(CountUp, { end: 2245189, start: 2245189, duration: 0.9, separator: "," })],
  ["render-prop: children={({countUpRef}) => <span ref={countUpRef}>82</span>}",
   React.createElement(CountUp, { end: 82, duration: 0.9, separator: ",", enableScrollSpy: true, scrollSpyOnce: true },
     ({ countUpRef }) => React.createElement("span", { ref: countUpRef }, "82"))],
];

for (const [label, el] of cases) {
  let out;
  try { out = renderToString(el); } catch (e) { out = "THREW: " + String(e).slice(0, 90); }
  console.log(`${label}\n   SSR HTML -> ${out}\n`);
}
