"use strict";(self.webpackChunklearn_data=self.webpackChunklearn_data||[]).push([[228],{8228:(e,a,t)=>{t.r(a),t.d(a,{default:()=>m});var l=t(8981),r=t(5670),s=t(2930),u=t(6719),i=t(7847),c=t(3151),n=t(5826),o=t(9658);const h=["/","/intro.html","/daily/d1.html","/academic/UAV/Reinforcement-Learning-in-Multiple-UAV-Networks_Deployment-and-Movement-Design.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%201.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%202.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%203.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%204.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%205.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%206.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%207.html","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/chapter%208.html","/code/java/java%201.html","/code/java/java%202.html","/code/java/java%203.html","/404.html","/daily/","/academic/UAV/","/academic/","/academic/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/","/code/java/","/code/","/category/","/category/daily/","/category/academic/","/category/code/","/tag/","/tag/d1/","/tag/uav/","/tag/ieee-transactions-on-vehicular-technology/","/tag/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0/","/tag/java/","/article/","/star/","/timeline/"];t(2082);const v=(0,r.Mjh)("SEARCH_PRO_QUERY_HISTORY",[]),d=e=>h[e.id]+("anchor"in e?`#${e.anchor}`:""),{resultHistoryCount:p}=o.s,y=(0,r.Mjh)("SEARCH_PRO_RESULT_HISTORY",[]);var m=(0,i.pM)({name:"SearchResult",props:{query:{type:String,required:!0},isFocusing:Boolean},emits:["close","updateQuery"],setup(e,{emit:a}){const t=(0,c.rd)(),h=(0,c.Zv)(),m=(0,l.s5)(o.a),{enabled:A,addQueryHistory:E,queryHistory:g,removeQueryHistory:B}=(()=>{const{queryHistoryCount:e}=o.s,a=e>0;return{enabled:a,queryHistory:v,addQueryHistory:t=>{a&&(v.value.length<e?v.value=Array.from(new Set([t,...v.value])):v.value=Array.from(new Set([t,...v.value.slice(0,e-1)])))},removeQueryHistory:e=>{v.value=[...v.value.slice(0,e),...v.value.slice(e+1)]}}})(),{enabled:C,resultHistory:H,addResultHistory:f,removeResultHistory:k}=(()=>{const e=p>0;return{enabled:e,resultHistory:y,addResultHistory:a=>{if(e){const e={link:d(a),display:a.display};"header"in a&&(e.header=a.header),y.value.length<p?y.value=[e,...y.value]:y.value=[e,...y.value.slice(0,p-1)]}},removeResultHistory:e=>{y.value=[...y.value.slice(0,e),...y.value.slice(e+1)]}}})(),Q=A||C,R=(0,u.lW)(e,"query"),{results:D,searching:w}=(e=>{const a=(0,o.u)(),t=(0,c.Zv)(),{search:l,terminate:r}=(0,o.c)(),n=(0,u.KR)(!1),h=(0,u.IJ)([]);return(0,i.sV)((()=>{const u=()=>{h.value=[],n.value=!1},c=(0,s.Q0)((e=>{n.value=!0,e?l({type:"search",query:e,locale:t.value,options:a.value}).then((e=>{h.value=e,n.value=!1})).catch((e=>{console.error(e),u()})):u()}),o.s.searchDelay);(0,i.wB)([e,t],(()=>c(e.value)),{immediate:!0}),(0,i.hi)((()=>{r()}))})),{searching:n,results:h}})(R),x=(0,u.Kh)({isQuery:!0,index:0}),q=(0,u.KR)(0),S=(0,u.KR)(0),b=(0,i.EW)((()=>Q&&(g.value.length>0||H.value.length>0))),j=(0,i.EW)((()=>D.value.length>0)),_=(0,i.EW)((()=>D.value[q.value]||null)),M=e=>e.map((e=>(0,l.Kg)(e)?e:(0,i.h)(e[0],e[1]))),T=e=>{if("customField"===e.type){const a=o.b[e.index]||"$content",[t,r=""]=(0,l.Qd)(a)?a[h.value].split("$content"):a.split("$content");return e.display.map((e=>(0,i.h)("div",M([t,...e,r]))))}return e.display.map((e=>(0,i.h)("div",M(e))))},U=()=>{q.value=0,S.value=0,a("updateQuery",""),a("close")};return(0,r.MLh)("keydown",(l=>{if(e.isFocusing)if(j.value){if("ArrowUp"===l.key)S.value>0?S.value-=1:(q.value=q.value>0?q.value-1:D.value.length-1,S.value=_.value.contents.length-1);else if("ArrowDown"===l.key)S.value<_.value.contents.length-1?S.value+=1:(q.value=q.value<D.value.length-1?q.value+1:0,S.value=0);else if("Enter"===l.key){const a=_.value.contents[S.value];E(e.query),f(a),t.push(d(a)),U()}}else if(C)if("ArrowUp"===l.key)(()=>{const{isQuery:e,index:a}=x;0===a?(x.isQuery=!e,x.index=e?H.value.length-1:g.value.length-1):x.index=a-1})();else if("ArrowDown"===l.key)(()=>{const{isQuery:e,index:a}=x;a===(e?g.value.length-1:H.value.length-1)?(x.isQuery=!e,x.index=0):x.index=a+1})();else if("Enter"===l.key){const{index:e}=x;x.isQuery?(a("updateQuery",g.value[e]),l.preventDefault()):(t.push(H.value[e].link),U())}})),(0,i.wB)([q,S],(()=>{document.querySelector(".search-pro-result-list-item.active .search-pro-result-item.active")?.scrollIntoView(!1)}),{flush:"post"}),()=>(0,i.h)("div",{class:["search-pro-result-wrapper",{empty:R.value?!j.value:!b.value}],id:"search-pro-results"},""===R.value?Q?b.value?[A?(0,i.h)("ul",{class:"search-pro-result-list"},(0,i.h)("li",{class:"search-pro-result-list-item"},[(0,i.h)("div",{class:"search-pro-result-title"},m.value.queryHistory),g.value.map(((e,t)=>(0,i.h)("div",{class:["search-pro-result-item",{active:x.isQuery&&x.index===t}],onClick:()=>{a("updateQuery",e)}},[(0,i.h)(n.H,{class:"search-pro-result-type"}),(0,i.h)("div",{class:"search-pro-result-content"},e),(0,i.h)("button",{class:"search-pro-remove-icon",innerHTML:n.C,onClick:e=>{e.preventDefault(),e.stopPropagation(),B(t)}})])))])):null,C?(0,i.h)("ul",{class:"search-pro-result-list"},(0,i.h)("li",{class:"search-pro-result-list-item"},[(0,i.h)("div",{class:"search-pro-result-title"},m.value.resultHistory),H.value.map(((e,a)=>(0,i.h)(c.Wt,{to:e.link,class:["search-pro-result-item",{active:!x.isQuery&&x.index===a}],onClick:()=>{U()}},(()=>[(0,i.h)(n.H,{class:"search-pro-result-type"}),(0,i.h)("div",{class:"search-pro-result-content"},[e.header?(0,i.h)("div",{class:"content-header"},e.header):null,(0,i.h)("div",e.display.map((e=>M(e))).flat())]),(0,i.h)("button",{class:"search-pro-remove-icon",innerHTML:n.C,onClick:e=>{e.preventDefault(),e.stopPropagation(),k(a)}})]))))])):null]:m.value.emptyHistory:m.value.emptyResult:w.value?(0,i.h)(n.S,{hint:m.value.searching}):j.value?(0,i.h)("ul",{class:"search-pro-result-list"},D.value.map((({title:a,contents:t},l)=>{const r=q.value===l;return(0,i.h)("li",{class:["search-pro-result-list-item",{active:r}]},[(0,i.h)("div",{class:"search-pro-result-title"},a||m.value.defaultTitle),t.map(((a,t)=>{const l=r&&S.value===t;return(0,i.h)(c.Wt,{to:d(a),class:["search-pro-result-item",{active:l,"aria-selected":l}],onClick:()=>{E(e.query),f(a),U()}},(()=>["text"===a.type?null:(0,i.h)("title"===a.type?n.T:"heading"===a.type?n.a:n.b,{class:"search-pro-result-type"}),(0,i.h)("div",{class:"search-pro-result-content"},["text"===a.type&&a.header?(0,i.h)("div",{class:"content-header"},a.header):null,(0,i.h)("div",T(a))])]))}))])}))):m.value.emptyResult)}})}}]);