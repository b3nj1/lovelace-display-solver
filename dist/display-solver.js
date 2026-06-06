import{LitElement as e,html as t,css as i}from"lit";import{state as o,customElement as n}from"lit/decorators.js";function r(e,t,i,o){var n,r=arguments.length,s=r<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(e,t,i,o);else for(var a=e.length-1;a>=0;a--)(n=e[a])&&(s=(r<3?n(s):r>3?n(t,i,s):n(t,i))||s);return r>3&&s&&Object.defineProperty(t,i,s),s}function s(e){const[t,i]=e.split(":").map(Number);return 60*t+i}function a(e,t,i,o){if(void 0!==e.state&&t!==e.state)return!1;if(void 0!==e.range){const i=parseFloat(t);if(isNaN(i))return!1;const[o,n]=e.range;if(null!==o&&i<o)return!1;if(null!==n&&i>n)return!1}if(void 0!==e.above){const i=parseFloat(t);if(isNaN(i)||i<=e.above)return!1}if(void 0!==e.time_range){const[t,i]=e.time_range;if(!function(e,t,i){const o=60*i.getHours()+i.getMinutes(),n=s(e),r=s(t);return n<=r?o>=n&&o<=r:o>=n||o<=r}(t,i,o))return!1}if(void 0!==e.also)for(const t of e.also){const e=i[t.entity];if(!e||e.state!==t.state)return!1}return!0}function l(e,t,i,o,n=new Date){if(0===i.length)return null;const r=t[e.entity_id],s=r?.state;if(!r||"unavailable"===s||"unknown"===s){if(!(e.rules?.some(e=>"unavailable"===e.when.state||"unknown"===e.when.state)??!1)){if(!o.unavailable_action||"hide"===o.unavailable_action)return null;const t="entity"===e.glyph?r?.attributes?.icon??"":e.glyph??"";return{entityConfig:e,tier:i[i.length-1],color:"",glyphName:t,showInfo:o.show_info??!1,focusMode:!1,indicatorOnly:!1,driveZoneIndicator:!1}}}const l=s??"",c="entity"===e.glyph?r?.attributes?.icon??"":e.glyph??"";return e.rules?function(e,t,i,o,n,r,s){if(!e.rules)return null;for(const l of e.rules){if(!a(l.when,t,i,s))continue;const c=l.then;return"hide"===c.action?null:{entityConfig:e,tier:c.tier??o[0],color:c.color??"",glyphName:n,showInfo:c.show_info??r.show_info??!1,focusMode:c.focus_mode??!1,indicatorOnly:"indicator"===c.action,driveZoneIndicator:"show"===c.action&&!0===c.indicator}}return null}(e,l,t,i,c,o,n):e.thresholds?function(e,t,i,o,n){if(!e.thresholds)return null;const r=parseFloat(t);if(isNaN(r))return null;const s=e.color_scale??n.color_scale??[];let a=null,l=-1;for(let t=0;t<e.thresholds.length;t++){const i=e.thresholds[t];r>i.above&&(a=i,l=t)}if(!a)return null;const c=a.color??(l<s.length?s[l]:"");return{entityConfig:e,tier:a.tier??i[0],color:c,glyphName:o,showInfo:n.show_info??!1,focusMode:!1,indicatorOnly:!1,driveZoneIndicator:!1}}(e,l,i,c,o):null}"function"==typeof SuppressedError&&SuppressedError;const c={red:{r:255,g:0,b:0},orange:{r:255,g:165,b:0},yellow:{r:255,g:255,b:0},green:{r:0,g:255,b:0},blue:{r:0,g:0,b:255},purple:{r:128,g:0,b:128},white:{r:255,g:255,b:255},cyan:{r:0,g:255,b:255},magenta:{r:255,g:0,b:255},black:{r:0,g:0,b:0}},d=new Set;function h(e){const t=c[e];return void 0!==t?t:(d.has(e)||(d.add(e),console.warn(`resolveColor: unknown color "${e}" — valid values are: red, orange, yellow, green, blue, purple, white, cyan, magenta, black`)),{r:255,g:255,b:255})}const p={far:{max_size:"large",max_info_rows:0,prefer_fewer_icons:!0},near:{max_size:"medium",max_info_rows:4,prefer_fewer_icons:!1},close:{max_size:"tiny",max_info_rows:6,prefer_fewer_icons:!1}};function f(e,t,i){const o=function(e){const t=p[e.viewing_distance];return void 0===t?(console.warn(`expandViewingDistance: unknown viewing_distance "${e.viewing_distance}" — falling back to "near"`),p.near):t}(e),n=Object.keys(e.glyph_sizes),r=n.indexOf(o.max_size);for(const s of e.layouts){if(-1!==r){const e=n.indexOf(s.icon.size);if(-1===e||e<r)continue}if(!(t<s.icon.min||t>s.icon.max)&&((i||!(s.info.min>0))&&!(0===o.max_info_rows&&s.info.min>0)))return s}return null}function u(e,t){if(e.burn_in_drift){return{xOffset:Math.floor(t.getHours()/23*e.margin_px[0]),yOffset:Math.floor(t.getMinutes()/59*e.margin_px[1])}}return{xOffset:0,yOffset:0}}function g(e,t){const i=t.margin_px[0]/t.screen_px[0],o=t.margin_px[1]/t.screen_px[1];if("object"==typeof e)return e;switch(e){case"top-edge":return{x:0,y:0,w:1,h:o};case"bottom-edge":return{x:0,y:1-o,w:1,h:o};case"left-edge":return{x:0,y:0,w:i,h:1};case"right-edge":return{x:1-i,y:0,w:i,h:1};case"top-left":return{x:0,y:0,w:i,h:o};case"top-right":return{x:1-i,y:0,w:i,h:o};case"bottom-left":return{x:0,y:1-o,w:i,h:o};case"bottom-right":return{x:1-i,y:1-o,w:i,h:o}}}function _(e,t){return{x:Math.floor(e.x*t.screen_px[0]),y:Math.floor(e.y*t.screen_px[1]),w:Math.round(e.w*t.screen_px[0]),h:Math.round(e.h*t.screen_px[1])}}function m(e,t){return function(e,t){const i=t[e.entity_id],o=i?.state??"",n=i?.attributes?.unit_of_measurement??"",r=(e.value_format??"{value} {unit}").replace(/\{value:\.0f\}/g,()=>{const e=parseFloat(o);return isNaN(e)?o:Math.round(e).toString()}).replace(/\{value\}/g,o).replace(/\{unit\}/g,n),s=e.label??i?.attributes?.friendly_name??e.id;return`${r.trim()} ${s}`.trimEnd()}(e,t)}function y(e,t,i,o){const n=Object.keys(e.glyph_sizes).reduce((t,i)=>{const o=e.glyph_sizes[i].px;return o>t?o:t},0),r=Math.floor((e.screen_px[0]-n)/2),s=Math.floor((e.screen_px[1]-n)/2),a=t(e.idle_glyph),{r:l,g:c,b:d}=h("white");return{codepoint:a,x:r,y:s,sizePx:n,r:l,g:c,b:d}}function b(e,t,i,o,n,r,s,a,c){const d=[],p=new Date,b=[];for(const n of e){const e=l(n,t,i,o,p);null!==e&&b.push(e);const r=Array.isArray(n.rules)&&n.rules.length>0,s=Array.isArray(n.thresholds)&&n.thresholds.length>0;r||s||d.push(`Entity '${n.id}' has no rules or thresholds and will never be active.`)}b.sort((e,t)=>i.indexOf(e.tier)-i.indexOf(t.tier));const w=function(e,t){return e.some(e=>e.focusMode)?e.filter(e=>e.tier===t[0]):e}(b,i),v=new Map;for(const e of w)if(!v.has(e.glyphName)){const t=s(e.glyphName);if(v.set(e.glyphName,t),r.font_glyphs&&r.font_glyphs.length>0){const t=e.glyphName;r.font_glyphs.includes(t)||d.push(`Glyph '${t}' not in profile '${r.id}' font_glyphs — will render blank. Add '${t}' to the glyphs: list in your ESPHome device YAML and recompile.`)}}const x=new Map(n.map(e=>[e.id,e])),$=w.filter(e=>!e.indicatorOnly),S=new Map;for(const e of $){const t=e.entityConfig.group;if(void 0!==t){const i=x.get(t);i&&"overlay"===i.collapse&&!S.has(t)&&S.set(t,e)}}const k=new Set;let E=0;for(const e of $){const t=e.entityConfig.group;if(void 0!==t){const e=x.get(t);if(e&&"overlay"===e.collapse){k.has(t)||(k.add(t),E+=1);continue}}E+=1}const z=E,M=w.some(e=>e.showInfo),O=f(r,z,M);if(null===O){const e=Object.keys(r.glyph_sizes),t={icon:{min:0,max:0,size:e[e.length-1]??"medium",cols:1},info:{min:0,max:0}};return{profile_id:r.id,glyphs:[],info:[],zones:[],severity_bar:null,layout:t,error:!0,errorReason:`No layout matches: icon_count=${z}, hasInfo=${M}. Check your profile's layouts table.`,warnings:d,page_count:1}}const P=Math.ceil(z/O.icon.max)||1,A=Math.min(a,P-1),C=[],I=new Set;for(const e of $){const t=e.entityConfig.group;if(void 0!==t){const e=x.get(t);if(e&&"overlay"===e.collapse){I.has(t)||(I.add(t),C.push(S.get(t)));continue}}C.push(e)}const R=A*O.icon.max,N=R+O.icon.max,j=C.slice(R,N),D=function(e,t,i){const o=new Date,{xOffset:n,yOffset:r}=u(e,o),s=e.margin_px[0]+n,a=e.margin_px[1]+r,l=e.glyph_sizes[t.icon.size];if(void 0===l)throw new Error(`layout.icon.size "${t.icon.size}" is not defined in profile "${e.id}" glyph_sizes`);const c=l.px;return i.filter(e=>!e.indicatorOnly).map((e,i)=>{const o=i%t.icon.cols,n=Math.floor(i/t.icon.cols),r=Math.floor(s+o*c),l=Math.floor(a+n*c),{r:d,g:p,b:f}=h(e.color);return{codepoint:"",x:r,y:l,sizePx:c,r:d,g:p,b:f}})}(r,O,j),T=D.map((e,t)=>({...e,codepoint:v.get(j[t].glyphName)??""})),H=w.filter(e=>e.showInfo),G=function(e,t,i){const o=new Date,{xOffset:n,yOffset:r}=u(e,o),s=e.glyph_sizes[t.icon.size];if(void 0===s)throw new Error(`layout.icon.size "${t.icon.size}" is not defined in profile "${e.id}" glyph_sizes`);const a=s.px,l=Math.ceil(i/t.icon.cols)*a;return{x:Math.floor(e.margin_px[0]+n),y:Math.floor(e.margin_px[1]+r+l),lineHeight:12}}(r,O,z),L=H.map((e,i)=>{const o=m(e.entityConfig,t),{r:n,g:r,b:s}=h(e.color);return{text:o,x:G.x,y:G.y+i*G.lineHeight,r:n,g:r,b:s}}),{xOffset:F,yOffset:q}=u(r,p),U=function(e,t){const i=[];for(const o of e.zones??[]){const n=t.find(e=>e.entityConfig.zone===o.id&&(!0===e.indicatorOnly||!0===e.driveZoneIndicator));if(!n)continue;const r=_(g(o.position,e),e),{r:s,g:a,b:l}=h(n.color);i.push({zoneId:o.id,x:r.x,y:r.y,w:r.w,h:r.h,r:s,g:a,b:l,shape:"filled_rectangle"})}return i}(r,w),W=function(e,t,i){const o=e.severity_bar;if(!o)return null;const[n,r]=e.screen_px,[s,a]=e.margin_px,l=new Date,{xOffset:c,yOffset:d}=u(e,l);let p,f;if(0===t.length){if(!1!==o.hide_when_idle)return null;p=0,f="entity"===o.color?{r:255,g:255,b:255}:h(o.color)}else{const e=i.length,n=t[0].tier;p=(e-i.indexOf(n))/e,f="entity"===o.color?h(t[0].color):h(o.color)}const g=o.thickness_px,_=o.edge;let m,y,b,w;return"bottom"===_?(b=Math.round(p*(n-2*s)),w=g,m=s+c,y=r-a-g+d):"top"===_?(b=Math.round(p*(n-2*s)),w=g,m=s+c,y=a+d):"left"===_?(b=g,w=Math.round(p*(r-2*a)),m=s+c,y=a+d):(b=g,w=Math.round(p*(r-2*a)),m=n-s-g+c,y=a+d),{x:m,y,w:b,h:w,r:f.r,g:f.g,b:f.b}}(r,w,i),Z=0===w.length?[y(r,s)]:T;return{profile_id:r.id,glyphs:Z,info:L,zones:U,severity_bar:W,layout:O,error:!1,warnings:d,page_count:P}}function w(e,t){const i=[],o=[],n=[],r=[],s=[],a=[];for(let t=0;t<e.glyphs.length;t++){const l=e.glyphs[t];if(i.push(l.x),o.push(l.y),n.push(l.r),r.push(l.g),s.push(l.b),a.push(l.codepoint),i.length!==t+1||o.length!==t+1||n.length!==t+1||r.length!==t+1||s.length!==t+1||a.length!==t+1)throw new Error(`Glyph array length mismatch at index ${t}`)}const l=function(e,t){const i=Object.entries(e.glyph_sizes).sort((e,t)=>t[1].px-e[1].px).map(([e])=>e).indexOf(t);return-1===i?(console.warn(`glyphFontIndex: size name "${t}" not found in profile "${e.id}"; defaulting to index 0`),0):i}(t,e.layout.icon.size),c=[],d=[],h=[],p=[],f=[],u=[],g=[],_=[],m=[],y=[],b=[],w=[];for(let t=0;t<e.info.length;t++){const i=e.info[t];if(c.push(0),d.push(i.x),h.push(i.y),p.push(i.r),f.push(i.g),u.push(i.b),c.length!==t+1||d.length!==t+1||h.length!==t+1||p.length!==t+1||f.length!==t+1||u.length!==t+1)throw new Error(`Info glyph array length mismatch at index ${t}`);if(g.push(i.text),_.push(i.x),m.push(i.y),y.push(i.r),b.push(i.g),w.push(i.b),g.length!==t+1||_.length!==t+1||m.length!==t+1||y.length!==t+1||b.length!==t+1||w.length!==t+1)throw new Error(`Info text array length mismatch at index ${t}`)}const v=e.info.length>e.layout.info.max,x={filled_rectangle:0,circle:1,filled_circle:2},$=[],S=[],k=[],E=[],z=[],M=[],O=[],P=[];for(let t=0;t<e.zones.length;t++){const i=e.zones[t],o=x[i.shape];if(void 0===o&&console.warn(`packESPhomePayload: unknown shape '${i.shape}' for zone '${i.zoneId}' — defaulting to 0 (filled_rectangle)`),$.push(o??0),S.push(i.x),k.push(i.y),E.push(i.w),z.push(i.h),M.push(i.r),O.push(i.g),P.push(i.b),$.length!==t+1||S.length!==t+1||k.length!==t+1||E.length!==t+1||z.length!==t+1||M.length!==t+1||O.length!==t+1||P.length!==t+1)throw new Error(`Shape array length mismatch at index ${t}`)}if(null!==e.severity_bar){const t=e.severity_bar,i=$.length;if($.push(0),S.push(t.x),k.push(t.y),E.push(t.w),z.push(t.h),M.push(t.r),O.push(t.g),P.push(t.b),$.length!==i+1||S.length!==i+1||k.length!==i+1||E.length!==i+1||z.length!==i+1||M.length!==i+1||O.length!==i+1||P.length!==i+1)throw new Error(`Shape array length mismatch at severity_bar index ${i}`)}return{x:i,y:o,r:n,g:r,b:s,glyph:a,glyph_font:l,info_glyph:c,info_glyph_y:h,info_glyph_x:d,info_glyph_r:p,info_glyph_g:f,info_glyph_b:u,info_text:g,info_text_y:m,info_text_x:_,info_text_r:y,info_text_g:b,info_text_b:w,info_scroll:v,draw_shape:$,draw_shape_x:S,draw_shape_y:k,draw_shape_d2:E,draw_shape_d3:z,draw_shape_r:M,draw_shape_g:O,draw_shape_b:P,error:e.error}}const v="?",x={"mdi:molecule-co2":"co2","mdi:pool":"pool","mdi:thermometer":"thermostat","mdi:water":"water_drop","mdi:car-electric":"electric_car","mdi:fan":"mode_fan","mdi:lightbulb":"lightbulb","mdi:lock":"lock","mdi:door":"door_open","mdi:garage":"garage","mdi:security":"security","mdi:air-filter":"air","mdi:factory":"factory","mdi:grill":"outdoor_grill","mdi:thermometer-auto":"device_thermostat","mdi:arrow-up":"arrow_upward","mdi:arrow-down":"arrow_downward","mdi:check-circle":"check_circle","mdi:chef-hat":"kitchen","mdi:smoke-detector":"detector_smoke","mdi:motion-sensor":"motion_sensor_active","mdi:window-open":"window","mdi:door-open":"door_open","mdi:fire":"local_fire_department","mdi:alarm":"alarm","mdi:bell":"notifications","mdi:home":"home","mdi:weather-sunny":"sunny","mdi:weather-rainy":"rainy","mdi:weather-snowy":"ac_unit","mdi:weather-cloudy":"cloud","mdi:weather-windy":"air","mdi:lightning-bolt":"bolt","mdi:power-plug":"power","mdi:battery":"battery_full","mdi:battery-low":"battery_1_bar","mdi:wifi":"wifi","mdi:wifi-off":"wifi_off","mdi:bluetooth":"bluetooth","mdi:volume-high":"volume_up","mdi:volume-off":"volume_off","mdi:play":"play_arrow","mdi:pause":"pause","mdi:stop":"stop","mdi:camera":"camera_alt","mdi:video":"videocam","mdi:microphone":"mic","mdi:speaker":"speaker","mdi:television":"tv","mdi:phone":"call","mdi:message":"message","mdi:email":"email","mdi:calendar":"calendar_today","mdi:clock":"schedule","mdi:map-marker":"location_on","mdi:car":"directions_car","mdi:bus":"directions_bus","mdi:train":"train","mdi:walk":"directions_walk","mdi:run":"directions_run","mdi:bicycle":"directions_bike","mdi:alert":"warning","mdi:alert-circle":"error","mdi:information":"info","mdi:help-circle":"help","mdi:star":"star","mdi:heart":"favorite","mdi:trash-can":"delete","mdi:pencil":"edit","mdi:magnify":"search","mdi:close":"close","mdi:plus":"add","mdi:minus":"remove","mdi:refresh":"refresh","mdi:download":"download","mdi:upload":"upload","mdi:share":"share","mdi:cog":"settings","mdi:account":"person","mdi:account-group":"group","mdi:shield":"shield","mdi:key":"key","mdi:window":"window","mdi:power":"power_settings_new","mdi:shield-lock":"lock","mdi:shield-home":"home","mdi:lightbulb-on":"lightbulb"},$={garage:"",door_open:"",lock:"",security:"",co2:"",air:"",factory:"",mode_fan_off:"",mode_fan:"",power_settings_new:"",thermostat:"",water_drop:"",outdoor_grill:"",pool:"",device_thermostat:"",lightbulb:"",arrow_upward:"",arrow_downward:"",check_circle:"",kitchen:"",electric_car:"",detector_smoke:"",motion_sensor_active:"",window:"",local_fire_department:"",alarm:"",notifications:"",home:"",sunny:"",rainy:"",ac_unit:"",cloud:"",bolt:"",power:"",battery_full:"",battery_1_bar:"",wifi:"",wifi_off:"",bluetooth:"",volume_up:"",volume_off:"",play_arrow:"",pause:"",stop:"",camera_alt:"",videocam:"",mic:"",speaker:"",tv:"",call:"",message:"",email:"",calendar_today:"",schedule:"",location_on:"",directions_car:"",directions_bus:"",train:"",directions_walk:"",directions_run:"",directions_bike:"",warning:"",error:"",info:"",help:"",star:"",favorite:"",delete:"",edit:"",search:"",close:"",add:"",remove:"",refresh:"",download:"",upload:"",share:"",settings:"",person:"",group:"",shield:"",key:""};function S(e){if(0===e.length)return v;if("entity"===e)throw new Error('resolveGlyph: "entity" must be resolved to a concrete name before calling resolveGlyph');if(e.startsWith("mdi:")){const t=x[e];if(void 0===t)return console.warn(`resolveGlyph: no MDI→MSS mapping for "${e}" — add the icon to MDI_TO_MSS or use a Material Symbols Sharp name directly`),v;const i=$[t];return i||(console.warn(`resolveGlyph: MDI "${e}" maps to MSS "${t}" but "${t}" is not in MSS_CODEPOINTS — add "${t}" to your ESPHome firmware's font_glyphs list`),v)}if(1===e.length){const t=e.codePointAt(0);if(void 0!==t&&t>127)return e}if(2===e.length){const t=e.codePointAt(0);if(void 0!==t&&t>65535)return e}const t=$[e];return t||(console.warn(`resolveGlyph: glyph "${e}" not found in MSS_CODEPOINTS — add "${e}" to your ESPHome firmware's font_glyphs list`),v)}const k=new Set;async function E(e,t,i){i.width=t.screen_px[0],i.height=t.screen_px[1];const o=i.getContext("2d");null!==o&&(o.fillStyle="#000",o.fillRect(0,0,i.width,i.height),await async function(e){if("undefined"!=typeof document&&document.fonts)for(const[,t]of Object.entries(e)){const e=t.px,i="Material Symbols Sharp",o=`${i}:${e}`;if(k.has(o))continue;const n=`mss-font-${e}`;if(!document.getElementById(n)&&document.head){const t=document.createElement("link");t.id=n,t.rel="stylesheet",t.href=`https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@${e},400,0,0`,document.head.appendChild(t)}await document.fonts.load(`${e}px '${i}'`),k.add(o)}}(t.glyph_sizes),function(e,t){for(const i of t){const t=i.codepoint===v?"Material Design Icons":"Material Symbols Sharp";e.font=`${i.sizePx}px '${t}'`,e.fillStyle=`rgb(${i.r}, ${i.g}, ${i.b})`,e.fillText(i.codepoint,i.x,i.y+i.sizePx)}}(o,e.glyphs),function(e,t){for(const i of t)e.font="12px monospace",e.fillStyle=`rgb(${i.r}, ${i.g}, ${i.b})`,e.fillText(i.text,i.x,i.y)}(o,e.info),function(e,t){for(const i of t)"filled_rectangle"===i.shape?(e.fillStyle=`rgb(${i.r},${i.g},${i.b})`,e.fillRect(i.x,i.y,i.w,i.h)):"filled_circle"===i.shape?(e.fillStyle=`rgb(${i.r},${i.g},${i.b})`,e.beginPath(),e.arc(i.x+i.w/2,i.y+i.h/2,i.w/2,0,2*Math.PI),e.fill()):"circle"===i.shape&&(e.strokeStyle=`rgb(${i.r},${i.g},${i.b})`,e.beginPath(),e.arc(i.x+i.w/2,i.y+i.h/2,i.w/2,0,2*Math.PI),e.stroke())}(o,e.zones),function(e,t,i){if(null!==t)return e.fillStyle=`rgb(${t.r}, ${t.g}, ${t.b})`,void e.fillRect(t.x,t.y,t.w,t.h);if(!1===i.severity_bar?.hide_when_idle){e.strokeStyle="#555555";const t=i.margin_px,o=i.screen_px,n=i.severity_bar.thickness_px;e.strokeRect(t[0],o[1]-t[1]-n,o[0]-2*t[0],n)}}(o,e.severity_bar,t))}let z=class extends e{constructor(){super(...arguments),this._errors=[],this._results=new Map,this._pageState={}}setConfig(e){const t=function(e){const t=[];if("object"!=typeof e||null===e)t.push("config must be an object");else{const i=e,o=i.tiers,n=new Set;if(Array.isArray(o)&&0!==o.length)for(let e=0;e<o.length;e++)"string"!=typeof o[e]?t.push(`tiers[${e}] must be a string`):n.add(o[e]);else t.push("tiers must be a non-empty array");const r=i.entities;if(Array.isArray(r)&&0!==r.length){const e=new Set,o=i.groups;if(Array.isArray(o))for(const t of o)if("object"==typeof t&&null!==t){const i=t.id;"string"==typeof i&&e.add(i)}for(let i=0;i<r.length;i++){const o=r[i];if("object"!=typeof o||null===o){t.push(`entities[${i}] must be an object`);continue}const s=o;"string"==typeof s.id&&0!==s.id.length||t.push(`entities[${i}].id is required`),"string"==typeof s.entity_id&&0!==s.entity_id.length||t.push(`entities[${i}].entity_id is required`);const a=Array.isArray(s.rules),l=Array.isArray(s.thresholds);if(a&&l&&t.push(`entities[${i}] (id=${String(s.id)}) must not have both rules and thresholds`),a){const e=s.rules;for(let o=0;o<e.length;o++){const r=e[o];if("object"!=typeof r||null===r)continue;const s=r.then;if("object"==typeof s&&null!==s){const e=s.tier;void 0===e||"string"!=typeof e||n.has(e)||t.push(`entities[${i}].rules[${o}].then.tier "${e}" is not declared in tiers`)}}}if(l){const e=s.thresholds;let o=null;for(let r=0;r<e.length;r++){const s=e[r];if("object"!=typeof s||null===s)continue;const a=s,l=a.tier;void 0===l||"string"!=typeof l||n.has(l)||t.push(`entities[${i}].thresholds[${r}].tier "${l}" is not declared in tiers`);const c=a.above;"number"==typeof c&&(null!==o&&c<=o&&t.push(`entities[${i}].thresholds[${r}].above (${c}) must be strictly greater than previous (${o})`),o=c)}}"string"!=typeof s.group||e.has(s.group)||t.push(`entities[${i}].group "${String(s.group)}" references undeclared group`)}}else t.push("entities must be a non-empty array");const s=i.display_profiles;if(Array.isArray(s)&&0!==s.length)for(let e=0;e<s.length;e++){const i=s[e];if("object"!=typeof i||null===i){t.push(`display_profiles[${e}] must be an object`);continue}const o=i;"string"==typeof o.id&&0!==o.id.length||t.push(`display_profiles[${e}].id is required`);const n=new Set(["esphome","canvas","cast","png_file"]);"string"==typeof o.type&&n.has(o.type)||t.push(`display_profiles[${e}].type must be one of: esphome, canvas, cast, png_file`);const r=o.screen_px;if(Array.isArray(o.screen_px)&&2===o.screen_px.length&&"number"==typeof r[0]&&"number"==typeof r[1]||t.push(`display_profiles[${e}].screen_px must be a [width, height] tuple of numbers`),"esphome"===o.type&&("string"!=typeof o.service||0===o.service.length)){const i="string"==typeof o.id?` (id=${o.id})`:"";t.push(`display_profiles[${e}]${i} (type=esphome) must have a service field`)}}else t.push("display_profiles must be a non-empty array");const a=i.groups;if(Array.isArray(a)){const e=new Set;for(let i=0;i<a.length;i++){const o=a[i];if("object"!=typeof o||null===o)continue;const n=o.id;"string"==typeof n&&(e.has(n)&&t.push(`groups id "${n}" is not unique`),e.add(n))}}}return t}(e);t.length>0?this._errors=t:(this._config=structuredClone(e),this._errors=[])}set hass(e){this._hass=e;for(const e of Object.keys(this._pageState))clearTimeout(this._pageState[e].dwellTimer);this._runSolver()}get hass(){return this._hass}_runSolver(){if(this._config&&this._hass)for(const e of this._config.display_profiles){this._pageState[e.id]??={currentPage:0};const t=this._pageState[e.id],i=b(this._config.entities,this._hass.states,this._config.tiers,this._config.defaults??{},this._config.groups??[],e,S,t.currentPage);if(this._results.set(e.id,i),"canvas"===e.type)this.requestUpdate();else if("esphome"===e.type&&!i.error){const t=e.service.split("."),o=t[0],n=t.slice(1).join("."),r=w(i,e);this._hass.callService(o,n,r).catch(e=>{console.error("display-solver: callService failed",e)})}if(i.page_count>1){const o=1e3*(e.page_dwell_s??5);t.dwellTimer=setTimeout(()=>{const t=this._pageState[e.id];t&&(t.currentPage=(t.currentPage+1)%i.page_count,this._runSolver())},o)}}}updated(e){if(super.updated(e),this._config)for(const e of this._config.display_profiles){if("canvas"!==e.type)continue;const t=this._results.get(e.id);if(!t)continue;const i=this.shadowRoot?.querySelector(`#canvas-${e.id}`);i&&E(t,e,i).catch(e=>{console.error("display-solver: renderToCanvas failed",e)})}}disconnectedCallback(){super.disconnectedCallback();for(const e of Object.keys(this._pageState))clearTimeout(this._pageState[e].dwellTimer)}render(){if(this._errors.length>0)return t`<ha-card>
        <div class="error">
          <b>Display Solver config error:</b>
          <ul>${this._errors.map(e=>t`<li>${e}</li>`)}</ul>
        </div>
      </ha-card>`;const e=this._config?.display_profiles.filter(e=>"canvas"===e.type)??[];return t`<ha-card>
      ${e.map(e=>t`
        <div class="profile-wrapper">
          <canvas id="canvas-${e.id}"></canvas>
        </div>
      `)}
    </ha-card>`}getCardSize(){return Math.ceil(this._config?.display_profiles?.length??1)}getGridOptions(){return{rows:3,columns:4,min_rows:2,max_rows:Math.max(6,3*(this._config?.display_profiles?.length??1))}}static getConfigElement(){return Promise.resolve().then(function(){return O}),document.createElement("display-solver-card-editor")}static getStubConfig(e){return{tiers:["critical","alert","status"],defaults:{unavailable_action:"hide",show_info:!0},entities:[{id:"sun",entity_id:"sun.sun",glyph:"sunny",rules:[{when:{state:"above_horizon"},then:{action:"show",tier:"alert",color:"orange"}},{when:{state:"below_horizon"},then:{action:"hide"}}]}],display_profiles:[{id:"preview",type:"canvas",screen_px:[256,256],margin_px:[8,8],burn_in_drift:!1,viewing_distance:"close",idle_glyph:"check_circle",glyph_sizes:{small:{px:48,fits_cols:3}},layouts:[{icon:{min:1,max:9,size:"small",cols:3},info:{min:0,max:2}}]}]}}static{this.styles=i`
    ha-card {
      background: var(--card-background-color);
      overflow: hidden;
    }
    .profile-wrapper {
      padding: 8px;
    }
    canvas {
      display: block;
      width: 100%;
    }
    .error {
      color: var(--error-color, red);
      padding: 8px;
    }
    .error ul {
      margin: 4px 0;
      padding-left: 1.5em;
    }
  `}};r([o()],z.prototype,"_config",void 0),r([o()],z.prototype,"_hass",void 0),r([o()],z.prototype,"_errors",void 0),z=r([n("display-solver-card")],z),window.customCards=window.customCards||[],window.customCards.push({type:"display-solver-card",name:"Display Solver",description:"Priority dashboard for ESPHome and Chromecast displays",preview:!0,documentationURL:"https://github.com/YOUR_ORG/lovelace-display-solver"});let M=class extends e{constructor(){super(...arguments),this._expandedEntity=null}setConfig(e){this._config=e}set hass(e){this._hass=e}_dispatch(e){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:e},bubbles:!0,composed:!0}))}render(){return this._config?t`
      <div class="editor">
        ${this._renderTiersSection()}
        ${this._renderEntitiesSection()}
        ${this._renderProfilesSection()}
      </div>
    `:t``}_renderTiersSection(){return t`
      <div class="section">
        <h3>Alert Levels &amp; Settings</h3>
        <ha-textfield
          label="Alert levels (comma-separated, most urgent first)"
          .value=${(this._config?.tiers??[]).join(", ")}
          placeholder="critical, alert, status"
          @change=${e=>{const t=e.target.value;this._dispatch({...this._config,tiers:t.split(",").map(e=>e.trim()).filter(Boolean)})}}
        ></ha-textfield>
        <ha-select
          label="When entity unavailable"
          .value=${this._config?.defaults?.unavailable_action??"hide"}
          @selected=${e=>{this._dispatch({...this._config,defaults:{...this._config.defaults,unavailable_action:e.detail.value}})}}
        >
          <mwc-list-item value="hide">Hide (recommended)</mwc-list-item>
          <mwc-list-item value="show">Show (use with a specific unavailable rule)</mwc-list-item>
        </ha-select>
        <label class="checkbox-row">
          <ha-checkbox
            .checked=${this._config?.defaults?.show_info??!1}
            @change=${e=>{this._dispatch({...this._config,defaults:{...this._config.defaults,show_info:e.target.checked}})}}
          ></ha-checkbox>
          Show info lines by default
        </label>
      </div>
    `}_renderEntitiesSection(){const e=this._config?.entities??[];return t`
      <div class="section">
        <h3>Entities</h3>
        ${e.map((e,t)=>this._renderEntityRow(e,t))}
        <button class="add-btn" @click=${this._addEntity}>+ Add entity</button>
      </div>
    `}_renderEntityRow(e,i){return t`
      <div class="entity-row">
        <ha-textfield
          label="ID"
          .value=${e.id}
          @change=${t=>this._updateEntity(i,{...e,id:t.target.value})}
        ></ha-textfield>
        ${this._hass?t`<ha-entity-picker
              .hass=${this._hass}
              .value=${e.entity_id}
              label="Entity"
              allow-custom-entity
              @value-changed=${t=>this._updateEntity(i,{...e,entity_id:t.detail.value})}
            ></ha-entity-picker>`:t`<ha-textfield
              label="Entity ID (e.g. binary_sensor.garage)"
              .value=${e.entity_id}
              placeholder="domain.entity_name"
              @change=${t=>this._updateEntity(i,{...e,entity_id:t.target.value})}
            ></ha-textfield>`}
        <ha-textfield
          label="Glyph name"
          .value=${e.glyph??""}
          placeholder="garage or mdi:garage"
          @change=${t=>this._updateEntity(i,{...e,glyph:t.target.value||void 0})}
        ></ha-textfield>
        <p class="field-hint">
          Use a <a href="https://fonts.google.com/icons?icon.style=Sharp" target="_blank" rel="noopener">Material Symbols Sharp</a> name (e.g. <code>garage</code>) or an MDI name (e.g. <code>mdi:garage</code>).
        </p>
        <ha-textfield
          label="Label (optional display name)"
          .value=${e.label??""}
          @change=${t=>this._updateEntity(i,{...e,label:t.target.value||void 0})}
        ></ha-textfield>
        <div class="entity-rules">
          <button class="toggle-btn" @click=${()=>{this._expandedEntity=this._expandedEntity===i?null:i}}>
            ${this._expandedEntity===i?"Hide rules":`Edit rules (${e.rules?.length??e.thresholds?.length??0})`}
          </button>
          ${this._expandedEntity===i?this._renderRuleEditor(e,i):""}
        </div>
        <button class="remove-btn" @click=${()=>this._removeEntity(i)}>Remove</button>
      </div>
    `}_renderRuleEditor(e,i){const o=this._config?.tiers??[],n=e.rules??[];return t`
      <div class="rule-editor">
        ${n.map((e,r)=>t`
          <div class="rule-row">
            <ha-textfield
              label="When state equals"
              .value=${e.when.state??""}
              placeholder="on, off, above_horizon…"
              @change=${t=>{const o=t.target.value,s={...e,when:{...e.when,state:o||void 0}};this._updateEntityRules(i,n.map((e,t)=>t===r?s:e))}}
            ></ha-textfield>
            <ha-select
              label="Action"
              .value=${e.then.action}
              @selected=${t=>{const o={...e,then:{...e.then,action:t.detail.value}};this._updateEntityRules(i,n.map((e,t)=>t===r?o:e))}}
            >
              <mwc-list-item value="show">Show</mwc-list-item>
              <mwc-list-item value="hide">Hide</mwc-list-item>
              <mwc-list-item value="indicator">Indicator only</mwc-list-item>
            </ha-select>
            <ha-select
              label="Tier"
              .value=${e.then.tier??""}
              @selected=${t=>{const o={...e,then:{...e.then,tier:t.detail.value||void 0}};this._updateEntityRules(i,n.map((e,t)=>t===r?o:e))}}
            >
              ${0===o.length?t`<mwc-list-item value="" disabled>Define tiers above first</mwc-list-item>`:o.map(e=>t`<mwc-list-item value=${e}>${e}</mwc-list-item>`)}
            </ha-select>
            ${0===o.length?t`<p class="field-hint">Add alert levels in the "Alert Levels &amp; Settings" section above first.</p>`:""}
            <ha-textfield
              label="Color (name or hex)"
              .value=${e.then.color??""}
              placeholder="red, #ff6600…"
              @change=${t=>{const o=t.target.value,s={...e,then:{...e.then,color:o||void 0}};this._updateEntityRules(i,n.map((e,t)=>t===r?s:e))}}
            ></ha-textfield>
            <button class="remove-btn" @click=${()=>this._updateEntityRules(i,n.filter((e,t)=>t!==r))}>Remove rule</button>
          </div>
        `)}
        <button class="add-btn" @click=${()=>this._updateEntityRules(i,[...n,{when:{},then:{action:"show"}}])}>+ Add rule</button>
      </div>
    `}_updateEntity(e,t){if(!this._config)return;const i=[...this._config.entities??[]];i[e]=t,this._dispatch({...this._config,entities:i})}_updateEntityRules(e,t){if(!this._config)return;const i=[...this._config.entities??[]];i[e]={...i[e],rules:t},this._dispatch({...this._config,entities:i})}_addEntity(){if(!this._config)return;const e=[...this._config.entities??[]],t={id:`entity_${e.length+1}`,entity_id:"",rules:[{when:{state:"on"},then:{action:"show",tier:this._config.tiers?.[0],color:"red"}}]};this._dispatch({...this._config,entities:[...e,t]})}_removeEntity(e){if(!this._config)return;const t=(this._config.entities??[]).filter((t,i)=>i!==e);this._dispatch({...this._config,entities:t})}_renderProfilesSection(){const e=this._config?.display_profiles??[];return t`
      <div class="section">
        <h3>Display Profiles</h3>
        ${e.map((e,t)=>this._renderProfileRow(e,t))}
        <button class="add-btn" @click=${this._addProfile}>+ Add profile</button>
        <p class="yaml-note">
          Advanced layout and zone configuration: edit the card YAML directly.
          See the README in this repository for the full schema reference.
          <!-- TODO: replace with real docs URL before publishing to HACS -->
        </p>
      </div>
    `}_renderProfileRow(e,i){return t`
      <div class="profile-row">
        <ha-textfield
          label="Profile ID"
          .value=${e.id}
          @change=${t=>this._updateProfile(i,{...e,id:t.target.value})}
        ></ha-textfield>
        <ha-select
          label="Output type"
          .value=${e.type}
          @selected=${t=>this._updateProfile(i,{...e,type:t.detail.value})}
        >
          <mwc-list-item value="canvas">Canvas (browser preview)</mwc-list-item>
          <mwc-list-item value="esphome">ESPHome display</mwc-list-item>
        </ha-select>
        ${"esphome"===e.type?t`
          <ha-textfield
            label="Service (esphome.device_set_display_glyphs)"
            .value=${e.service??""}
            placeholder="esphome.device_set_display_glyphs"
            @change=${t=>this._updateProfile(i,{...e,service:t.target.value||void 0})}
          ></ha-textfield>
        `:""}
        <ha-textfield
          label="Width (px)"
          type="number"
          .value=${String(e.screen_px[0])}
          @change=${t=>{const o=parseInt(t.target.value,10);isNaN(o)||this._updateProfile(i,{...e,screen_px:[o,e.screen_px[1]]})}}
        ></ha-textfield>
        <ha-textfield
          label="Height (px)"
          type="number"
          .value=${String(e.screen_px[1])}
          @change=${t=>{const o=parseInt(t.target.value,10);isNaN(o)||this._updateProfile(i,{...e,screen_px:[e.screen_px[0],o]})}}
        ></ha-textfield>
        <ha-select
          label="Viewing distance"
          .value=${e.viewing_distance}
          @selected=${t=>this._updateProfile(i,{...e,viewing_distance:t.detail.value})}
        >
          <mwc-list-item value="close">Close (desk / tablet)</mwc-list-item>
          <mwc-list-item value="near">Near (across the room)</mwc-list-item>
          <mwc-list-item value="far">Far (hallway / at a distance)</mwc-list-item>
        </ha-select>
        <label class="checkbox-row">
          <ha-checkbox
            .checked=${e.burn_in_drift}
            @change=${t=>this._updateProfile(i,{...e,burn_in_drift:t.target.checked})}
          ></ha-checkbox>
          Enable burn-in drift (OLED displays)
        </label>
        <ha-textfield
          label="Icon page dwell (seconds — only when icons overflow the layout)"
          type="number"
          .value=${String(e.page_dwell_s??5)}
          @change=${t=>{const o=parseFloat(t.target.value);isNaN(o)||this._updateProfile(i,{...e,page_dwell_s:o})}}
        ></ha-textfield>
        <button class="remove-btn" @click=${()=>this._removeProfile(i)}>Remove profile</button>
      </div>
    `}_updateProfile(e,t){if(!this._config)return;const i=[...this._config.display_profiles??[]];i[e]=t,this._dispatch({...this._config,display_profiles:i})}_addProfile(){if(!this._config)return;const e=[...this._config.display_profiles??[]],t={id:`profile_${e.length+1}`,type:"canvas",screen_px:[400,300],margin_px:[8,8],burn_in_drift:!1,viewing_distance:"near",idle_glyph:"check_circle",glyph_sizes:{small:{px:24,fits_cols:4}},layouts:[{icon:{min:1,max:16,size:"small",cols:4},info:{min:0,max:3}}]};this._dispatch({...this._config,display_profiles:[...e,t]})}_removeProfile(e){if(!this._config)return;const t=(this._config.display_profiles??[]).filter((t,i)=>i!==e);this._dispatch({...this._config,display_profiles:t})}static{this.styles=i`
    .editor { display: flex; flex-direction: column; gap: 16px; padding: 8px; }
    .section { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 8px; padding: 12px; }
    .section h3 { margin: 0 0 12px; font-size: 1em; color: var(--primary-text-color); }
    .entity-row, .profile-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
    .entity-row:last-of-type, .profile-row:last-of-type { border-bottom: none; }
    .rule-editor { margin-left: 16px; padding: 8px; background: var(--secondary-background-color, #f5f5f5); border-radius: 4px; }
    .rule-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
    .checkbox-row { display: flex; align-items: center; gap: 8px; }
    .add-btn { background: var(--primary-color); color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 0.9em; }
    .remove-btn { background: transparent; color: var(--error-color, red); border: 1px solid var(--error-color, red); padding: 4px 10px; border-radius: 4px; cursor: pointer; align-self: flex-start; }
    .toggle-btn { background: transparent; color: var(--primary-color); border: 1px solid var(--primary-color); padding: 4px 10px; border-radius: 4px; cursor: pointer; }
    .yaml-note { font-size: 0.85em; color: var(--secondary-text-color); margin: 8px 0 0; }
    .yaml-note a { color: var(--primary-color); }
    .field-hint { font-size: 0.8em; color: var(--secondary-text-color); margin: 2px 0 8px; }
    .field-hint a { color: var(--primary-color); }
    .field-hint code { background: var(--secondary-background-color, #f5f5f5); padding: 1px 4px; border-radius: 3px; }
  `}};r([o()],M.prototype,"_config",void 0),r([o()],M.prototype,"_expandedEntity",void 0),r([o()],M.prototype,"_hass",void 0),M=r([n("display-solver-card-editor")],M);var O=Object.freeze({__proto__:null,get DisplaySolverCardEditor(){return M}});export{z as DisplaySolverCard};
