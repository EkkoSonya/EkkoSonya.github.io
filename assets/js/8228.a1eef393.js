"use strict";(self.webpackChunklearn_data=self.webpackChunklearn_data||[]).push([[8228],{8228:(e,a,t)=>{t.r(a),t.d(a,{default:()=>y});var l=t(8981),r=t(5670),s=t(2930),c=t(6719),u=t(7847),i=t(3151),o=t(5826),n=t(9658);const v=["/","/intro.html","/daily/d1.html","/academic/UAV/Reinforcement-Learning-in-Multiple-UAV-Networks_Deployment-and-Movement-Design.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%201.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%2010.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%202.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%203.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%204.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%205.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%206.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%207.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%208.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%209.html","/code/java/java%201.html","/code/java/java%2010.html","/code/java/java%2011.html","/code/java/java%2012.html","/code/java/java%2013.html","/code/java/java%2014.html","/code/java/java%2015.html","/code/java/java%2016.html","/code/java/java%2017.html","/code/java/java%202.html","/code/java/java%203.html","/code/java/java%204.html","/code/java/java%205.html","/code/java/java%206.html","/code/java/java%207.html","/code/java/java%208.html","/code/java/java%209.html","/404.html","/daily/","/academic/UAV/","/academic/","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/","/code/java/","/code/","/category/","/category/daily/","/category/academic/","/category/code/","/tag/","/tag/d1/","/tag/uav/","/tag/ieee-transactions-on-vehicular-technology/","/tag/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/","/tag/java/","/article/","/star/","/timeline/"];t(2082);const h=(0,r.Mjh)("SEARCH_PRO_QUERY_HISTORY",[]),d=e=>v[e.id]+("anchor"in e?`#${e.anchor}`:""),{resultHistoryCount:p}=n.s,m=(0,r.Mjh)("SEARCH_PRO_RESULT_HISTORY",[]);var y=(0,u.pM)({name:"SearchResult",props:{query:{type:String,required:!0},isFocusing:Boolean},emits:["close","updateQuery"],setup(e,{emit:a}){const t=(0,i.rd)(),v=(0,i.Zv)(),y=(0,l.s5)(n.a),{enabled:A,addQueryHistory:E,queryHistory:B,removeQueryHistory:j}=(()=>{const{queryHistoryCount:e}=n.s,a=e>0;return{enabled:a,queryHistory:h,addQueryHistory:t=>{a&&(h.value.length<e?h.value=Array.from(new Set([t,...h.value])):h.value=Array.from(new Set([t,...h.value.slice(0,e-1)])))},removeQueryHistory:e=>{h.value=[...h.value.slice(0,e),...h.value.slice(e+1)]}}})(),{enabled:C,resultHistory:g,addResultHistory:H,removeResultHistory:f}=(()=>{const e=p>0;return{enabled:e,resultHistory:m,addResultHistory:a=>{if(e){const e={link:d(a),display:a.display};"header"in a&&(e.header=a.header),m.value.length<p?m.value=[e,...m.value]:m.value=[e,...m.value.slice(0,p-1)]}},removeResultHistory:e=>{m.value=[...m.value.slice(0,e),...m.value.slice(e+1)]}}})(),k=A||C,D=(0,c.lW)(e,"query"),{results:Q,searching:R}=(e=>{const a=(0,n.u)(),t=(0,i.Zv)(),{search:l,terminate:r}=(0,n.c)(),o=(0,c.KR)(!1),v=(0,c.IJ)([]);return(0,u.sV)((()=>{const c=()=>{v.value=[],o.value=!1},i=(0,s.Q0)((e=>{o.value=!0,e?l({type:"search",query:e,locale:t.value,options:a.value}).then((e=>{v.value=e,o.value=!1})).catch((e=>{console.error(e),c()})):c()}),n.s.searchDelay);(0,u.wB)([e,t],(()=>i(e.value)),{immediate:!0}),(0,u.hi)((()=>{r()}))})),{searching:o,results:v}})(D),w=(0,c.Kh)({isQuery:!0,index:0}),x=(0,c.KR)(0),q=(0,c.KR)(0),S=(0,u.EW)((()=>k&&(B.value.length>0||g.value.length>0))),b=(0,u.EW)((()=>Q.value.length>0)),_=(0,u.EW)((()=>Q.value[x.value]||null)),M=e=>e.map((e=>(0,l.Kg)(e)?e:(0,u.h)(e[0],e[1]))),T=e=>{if("customField"===e.type){const a=n.b[e.index]||"$content",[t,r=""]=(0,l.Qd)(a)?a[v.value].split("$content"):a.split("$content");return e.display.map((e=>(0,u.h)("div",M([t,...e,r]))))}return e.display.map((e=>(0,u.h)("div",M(e))))},U=()=>{x.value=0,q.value=0,a("updateQuery",""),a("close")};return(0,r.MLh)("keydown",(l=>{if(e.isFocusing)if(b.value){if("ArrowUp"===l.key)q.value>0?q.value-=1:(x.value=x.value>0?x.value-1:Q.value.length-1,q.value=_.value.contents.length-1);else if("ArrowDown"===l.key)q.value<_.value.contents.length-1?q.value+=1:(x.value=x.value<Q.value.length-1?x.value+1:0,q.value=0);else if("Enter"===l.key){const a=_.value.contents[q.value];E(e.query),H(a),t.push(d(a)),U()}}else if(C)if("ArrowUp"===l.key)(()=>{const{isQuery:e,index:a}=w;0===a?(w.isQuery=!e,w.index=e?g.value.length-1:B.value.length-1):w.index=a-1})();else if("ArrowDown"===l.key)(()=>{const{isQuery:e,index:a}=w;a===(e?B.value.length-1:g.value.length-1)?(w.isQuery=!e,w.index=0):w.index=a+1})();else if("Enter"===l.key){const{index:e}=w;w.isQuery?(a("updateQuery",B.value[e]),l.preventDefault()):(t.push(g.value[e].link),U())}})),(0,u.wB)([x,q],(()=>{document.querySelector(".search-pro-result-list-item.active .search-pro-result-item.active")?.scrollIntoView(!1)}),{flush:"post"}),()=>(0,u.h)("div",{class:["search-pro-result-wrapper",{empty:D.value?!b.value:!S.value}],id:"search-pro-results"},""===D.value?k?S.value?[A?(0,u.h)("ul",{class:"search-pro-result-list"},(0,u.h)("li",{class:"search-pro-result-list-item"},[(0,u.h)("div",{class:"search-pro-result-title"},y.value.queryHistory),B.value.map(((e,t)=>(0,u.h)("div",{class:["search-pro-result-item",{active:w.isQuery&&w.index===t}],onClick:()=>{a("updateQuery",e)}},[(0,u.h)(o.H,{class:"search-pro-result-type"}),(0,u.h)("div",{class:"search-pro-result-content"},e),(0,u.h)("button",{class:"search-pro-remove-icon",innerHTML:o.C,onClick:e=>{e.preventDefault(),e.stopPropagation(),j(t)}})])))])):null,C?(0,u.h)("ul",{class:"search-pro-result-list"},(0,u.h)("li",{class:"search-pro-result-list-item"},[(0,u.h)("div",{class:"search-pro-result-title"},y.value.resultHistory),g.value.map(((e,a)=>(0,u.h)(i.Wt,{to:e.link,class:["search-pro-result-item",{active:!w.isQuery&&w.index===a}],onClick:()=>{U()}},(()=>[(0,u.h)(o.H,{class:"search-pro-result-type"}),(0,u.h)("div",{class:"search-pro-result-content"},[e.header?(0,u.h)("div",{class:"content-header"},e.header):null,(0,u.h)("div",e.display.map((e=>M(e))).flat())]),(0,u.h)("button",{class:"search-pro-remove-icon",innerHTML:o.C,onClick:e=>{e.preventDefault(),e.stopPropagation(),f(a)}})]))))])):null]:y.value.emptyHistory:y.value.emptyResult:R.value?(0,u.h)(o.S,{hint:y.value.searching}):b.value?(0,u.h)("ul",{class:"search-pro-result-list"},Q.value.map((({title:a,contents:t},l)=>{const r=x.value===l;return(0,u.h)("li",{class:["search-pro-result-list-item",{active:r}]},[(0,u.h)("div",{class:"search-pro-result-title"},a||y.value.defaultTitle),t.map(((a,t)=>{const l=r&&q.value===t;return(0,u.h)(i.Wt,{to:d(a),class:["search-pro-result-item",{active:l,"aria-selected":l}],onClick:()=>{E(e.query),H(a),U()}},(()=>["text"===a.type?null:(0,u.h)("title"===a.type?o.T:"heading"===a.type?o.a:o.b,{class:"search-pro-result-type"}),(0,u.h)("div",{class:"search-pro-result-content"},["text"===a.type&&a.header?(0,u.h)("div",{class:"content-header"},a.header):null,(0,u.h)("div",T(a))])]))}))])}))):y.value.emptyResult)}})}}]);