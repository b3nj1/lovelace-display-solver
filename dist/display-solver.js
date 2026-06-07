function e(e,t,i,o){var s,n=arguments.length,r=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)r=Reflect.decorate(e,t,i,o);else for(var a=e.length-1;a>=0;a--)(s=e[a])&&(r=(n<3?s(r):n>3?s(t,i,r):s(t,i))||r);return n>3&&r&&Object.defineProperty(t,i,r),r}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=globalThis,i=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),s=new WeakMap;let n=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(i&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=s.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&s.set(t,e))}return e}toString(){return this.cssText}};const r=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,i,o)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[o+1],e[0]);return new n(i,e,o)},a=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return(e=>new n("string"==typeof e?e:e+"",void 0,o))(t)})(e):e,{is:l,defineProperty:c,getOwnPropertyDescriptor:h,getOwnPropertyNames:d,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,f=globalThis,g=f.trustedTypes,_=g?g.emptyScript:"",y=f.reactiveElementPolyfillSupport,m=(e,t)=>e,v={toAttribute(e,t){switch(t){case Boolean:e=e?_:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},b=(e,t)=>!l(e,t),$={attribute:!0,type:String,converter:v,reflect:!1,useDefault:!1,hasChanged:b};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),f.litPropertyMetadata??=new WeakMap;let w=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=$){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),o=this.getPropertyDescriptor(e,i,t);void 0!==o&&c(this.prototype,e,o)}}static getPropertyDescriptor(e,t,i){const{get:o,set:s}=h(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:o,set(t){const n=o?.call(this);s?.call(this,t),this.requestUpdate(e,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??$}static _$Ei(){if(this.hasOwnProperty(m("elementProperties")))return;const e=u(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(m("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(m("properties"))){const e=this.properties,t=[...d(e),...p(e)];for(const i of t)this.createProperty(i,e[i])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const i=this._$Eu(e,t);void 0!==i&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(a(e))}else void 0!==e&&t.push(a(e));return t}static _$Eu(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,o)=>{if(i)e.adoptedStyleSheets=o.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const i of o){const o=document.createElement("style"),s=t.litNonce;void 0!==s&&o.setAttribute("nonce",s),o.textContent=i.cssText,e.appendChild(o)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),o=this.constructor._$Eu(e,i);if(void 0!==o&&!0===i.reflect){const s=(void 0!==i.converter?.toAttribute?i.converter:v).toAttribute(t,i.type);this._$Em=e,null==s?this.removeAttribute(o):this.setAttribute(o,s),this._$Em=null}}_$AK(e,t){const i=this.constructor,o=i._$Eh.get(e);if(void 0!==o&&this._$Em!==o){const e=i.getPropertyOptions(o),s="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:v;this._$Em=o;const n=s.fromAttribute(t,e.type);this[o]=n??this._$Ej?.get(o)??n,this._$Em=null}}requestUpdate(e,t,i,o=!1,s){if(void 0!==e){const n=this.constructor;if(!1===o&&(s=this[e]),i??=n.getPropertyOptions(e),!((i.hasChanged??b)(s,t)||i.useDefault&&i.reflect&&s===this._$Ej?.get(e)&&!this.hasAttribute(n._$Eu(e,i))))return;this.C(e,t,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:o,wrapped:s},n){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,n??t??this[e]),!0!==s||void 0!==n)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),!0===o&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,i]of e){const{wrapped:e}=i,o=this[t];!0!==e||this._$AL.has(t)||void 0===o||this.C(t,void 0,i,o)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};w.elementStyles=[],w.shadowRootOptions={mode:"open"},w[m("elementProperties")]=new Map,w[m("finalized")]=new Map,y?.({ReactiveElement:w}),(f.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const x=globalThis,S=e=>e,A=x.trustedTypes,E=A?A.createPolicy("lit-html",{createHTML:e=>e}):void 0,k="$lit$",P=`lit$${Math.random().toFixed(9).slice(2)}$`,M="?"+P,C=`<${M}>`,O=document,z=()=>O.createComment(""),N=e=>null===e||"object"!=typeof e&&"function"!=typeof e,R=Array.isArray,T="[ \t\n\f\r]",I=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,U=/-->/g,H=/>/g,j=RegExp(`>|${T}(?:([^\\s"'>=/]+)(${T}*=${T}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),D=/'/g,L=/"/g,q=/^(?:script|style|textarea|title)$/i,B=(e=>(t,...i)=>({_$litType$:e,strings:t,values:i}))(1),W=Symbol.for("lit-noChange"),G=Symbol.for("lit-nothing"),F=new WeakMap,V=O.createTreeWalker(O,129);function Z(e,t){if(!R(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==E?E.createHTML(t):t}const J=(e,t)=>{const i=e.length-1,o=[];let s,n=2===t?"<svg>":3===t?"<math>":"",r=I;for(let t=0;t<i;t++){const i=e[t];let a,l,c=-1,h=0;for(;h<i.length&&(r.lastIndex=h,l=r.exec(i),null!==l);)h=r.lastIndex,r===I?"!--"===l[1]?r=U:void 0!==l[1]?r=H:void 0!==l[2]?(q.test(l[2])&&(s=RegExp("</"+l[2],"g")),r=j):void 0!==l[3]&&(r=j):r===j?">"===l[0]?(r=s??I,c=-1):void 0===l[1]?c=-2:(c=r.lastIndex-l[2].length,a=l[1],r=void 0===l[3]?j:'"'===l[3]?L:D):r===L||r===D?r=j:r===U||r===H?r=I:(r=j,s=void 0);const d=r===j&&e[t+1].startsWith("/>")?" ":"";n+=r===I?i+C:c>=0?(o.push(a),i.slice(0,c)+k+i.slice(c)+P+d):i+P+(-2===c?t:d)}return[Z(e,n+(e[i]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),o]};class K{constructor({strings:e,_$litType$:t},i){let o;this.parts=[];let s=0,n=0;const r=e.length-1,a=this.parts,[l,c]=J(e,t);if(this.el=K.createElement(l,i),V.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(o=V.nextNode())&&a.length<r;){if(1===o.nodeType){if(o.hasAttributes())for(const e of o.getAttributeNames())if(e.endsWith(k)){const t=c[n++],i=o.getAttribute(e).split(P),r=/([.?@])?(.*)/.exec(t);a.push({type:1,index:s,name:r[2],strings:i,ctor:"."===r[1]?te:"?"===r[1]?ie:"@"===r[1]?oe:ee}),o.removeAttribute(e)}else e.startsWith(P)&&(a.push({type:6,index:s}),o.removeAttribute(e));if(q.test(o.tagName)){const e=o.textContent.split(P),t=e.length-1;if(t>0){o.textContent=A?A.emptyScript:"";for(let i=0;i<t;i++)o.append(e[i],z()),V.nextNode(),a.push({type:2,index:++s});o.append(e[t],z())}}}else if(8===o.nodeType)if(o.data===M)a.push({type:2,index:s});else{let e=-1;for(;-1!==(e=o.data.indexOf(P,e+1));)a.push({type:7,index:s}),e+=P.length-1}s++}}static createElement(e,t){const i=O.createElement("template");return i.innerHTML=e,i}}function Y(e,t,i=e,o){if(t===W)return t;let s=void 0!==o?i._$Co?.[o]:i._$Cl;const n=N(t)?void 0:t._$litDirective$;return s?.constructor!==n&&(s?._$AO?.(!1),void 0===n?s=void 0:(s=new n(e),s._$AT(e,i,o)),void 0!==o?(i._$Co??=[])[o]=s:i._$Cl=s),void 0!==s&&(t=Y(e,s._$AS(e,t.values),s,o)),t}class Q{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,o=(e?.creationScope??O).importNode(t,!0);V.currentNode=o;let s=V.nextNode(),n=0,r=0,a=i[0];for(;void 0!==a;){if(n===a.index){let t;2===a.type?t=new X(s,s.nextSibling,this,e):1===a.type?t=new a.ctor(s,a.name,a.strings,this,e):6===a.type&&(t=new se(s,this,e)),this._$AV.push(t),a=i[++r]}n!==a?.index&&(s=V.nextNode(),n++)}return V.currentNode=O,o}p(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,o){this.type=2,this._$AH=G,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=Y(this,e,t),N(e)?e===G||null==e||""===e?(this._$AH!==G&&this._$AR(),this._$AH=G):e!==this._$AH&&e!==W&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>R(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==G&&N(this._$AH)?this._$AA.nextSibling.data=e:this.T(O.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:i}=e,o="number"==typeof i?this._$AC(e):(void 0===i.el&&(i.el=K.createElement(Z(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===o)this._$AH.p(t);else{const e=new Q(o,this),i=e.u(this.options);e.p(t),this.T(i),this._$AH=e}}_$AC(e){let t=F.get(e.strings);return void 0===t&&F.set(e.strings,t=new K(e)),t}k(e){R(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,o=0;for(const s of e)o===t.length?t.push(i=new X(this.O(z()),this.O(z()),this,this.options)):i=t[o],i._$AI(s),o++;o<t.length&&(this._$AR(i&&i._$AB.nextSibling,o),t.length=o)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=S(e).nextSibling;S(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,o,s){this.type=1,this._$AH=G,this._$AN=void 0,this.element=e,this.name=t,this._$AM=o,this.options=s,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=G}_$AI(e,t=this,i,o){const s=this.strings;let n=!1;if(void 0===s)e=Y(this,e,t,0),n=!N(e)||e!==this._$AH&&e!==W,n&&(this._$AH=e);else{const o=e;let r,a;for(e=s[0],r=0;r<s.length-1;r++)a=Y(this,o[i+r],t,r),a===W&&(a=this._$AH[r]),n||=!N(a)||a!==this._$AH[r],a===G?e=G:e!==G&&(e+=(a??"")+s[r+1]),this._$AH[r]=a}n&&!o&&this.j(e)}j(e){e===G?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class te extends ee{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===G?void 0:e}}class ie extends ee{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==G)}}class oe extends ee{constructor(e,t,i,o,s){super(e,t,i,o,s),this.type=5}_$AI(e,t=this){if((e=Y(this,e,t,0)??G)===W)return;const i=this._$AH,o=e===G&&i!==G||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,s=e!==G&&(i===G||o);o&&this.element.removeEventListener(this.name,this,i),s&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class se{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){Y(this,e)}}const ne=x.litHtmlPolyfillSupport;ne?.(K,X),(x.litHtmlVersions??=[]).push("3.3.3");const re=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ae extends w{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,i)=>{const o=i?.renderBefore??t;let s=o._$litPart$;if(void 0===s){const e=i?.renderBefore??null;o._$litPart$=s=new X(t.insertBefore(z(),e),e,void 0,i??{})}return s._$AI(e),s})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}}ae._$litElement$=!0,ae.finalized=!0,re.litElementHydrateSupport?.({LitElement:ae});const le=re.litElementPolyfillSupport;le?.({LitElement:ae}),(re.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ce=e=>(t,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)},he={attribute:!0,type:String,converter:v,reflect:!1,hasChanged:b},de=(e=he,t,i)=>{const{kind:o,metadata:s}=i;let n=globalThis.litPropertyMetadata.get(s);if(void 0===n&&globalThis.litPropertyMetadata.set(s,n=new Map),"setter"===o&&((e=Object.create(e)).wrapped=!0),n.set(i.name,e),"accessor"===o){const{name:o}=i;return{set(i){const s=t.get.call(this);t.set.call(this,i),this.requestUpdate(o,s,e,!0,i)},init(t){return void 0!==t&&this.C(o,void 0,e,t),t}}}if("setter"===o){const{name:o}=i;return function(i){const s=this[o];t.call(this,i),this.requestUpdate(o,s,e,!0,i)}}throw Error("Unsupported decorator location: "+o)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function pe(e){return function(e){return(t,i)=>"object"==typeof i?de(e,t,i):((e,t,i)=>{const o=t.hasOwnProperty(i);return t.constructor.createProperty(i,e),o?Object.getOwnPropertyDescriptor(t,i):void 0})(e,t,i)}({...e,state:!0,attribute:!1})}function ue(e){const[t,i]=e.split(":").map(Number);return 60*t+i}function fe(e,t,i,o){if(void 0!==e.state&&t!==e.state)return!1;if(void 0!==e.range){const i=parseFloat(t);if(isNaN(i))return!1;const[o,s]=e.range;if(null!==o&&i<o)return!1;if(null!==s&&i>s)return!1}if(void 0!==e.above){const i=parseFloat(t);if(isNaN(i)||i<=e.above)return!1}if(void 0!==e.time_range){const[t,i]=e.time_range;if(!function(e,t,i){const o=60*i.getHours()+i.getMinutes(),s=ue(e),n=ue(t);return s<=n?o>=s&&o<=n:o>=s||o<=n}(t,i,o))return!1}if(void 0!==e.also)for(const t of e.also){const e=i[t.entity];if(!e||e.state!==t.state)return!1}return!0}function ge(e,t,i,o,s=new Date){if(0===i.length)return null;const n=t[e.entity_id],r=n?.state;if(!n||"unavailable"===r||"unknown"===r){const t=e.rules?.some(e=>"unavailable"===e.when.state||"unknown"===e.when.state)??!1;if(!t){if(!o.unavailable_action||"hide"===o.unavailable_action)return null;const t="entity"===e.glyph?n?.attributes?.icon??"":e.glyph??"";return{entityConfig:e,tier:i[i.length-1],color:"",glyphName:t,showInfo:o.show_info??!1,focusMode:!1,indicatorOnly:!1,driveZoneIndicator:!1}}}const a=r??"",l="entity"===e.glyph?n?.attributes?.icon??"":e.glyph??"";return e.rules?function(e,t,i,o,s,n,r){if(!e.rules)return null;for(const a of e.rules){if(!fe(a.when,t,i,r))continue;const l=a.then;return"hide"===l.action?null:{entityConfig:e,tier:l.tier??o[0],color:l.color??"",glyphName:s,showInfo:l.show_info??n.show_info??!1,focusMode:l.focus_mode??!1,indicatorOnly:"indicator"===l.action,driveZoneIndicator:"show"===l.action&&!0===l.indicator}}return null}(e,a,t,i,l,o,s):e.thresholds?function(e,t,i,o,s){if(!e.thresholds)return null;const n=parseFloat(t);if(isNaN(n))return null;const r=e.color_scale??s.color_scale??[];let a=null,l=-1;for(let t=0;t<e.thresholds.length;t++){const i=e.thresholds[t];n>i.above&&(a=i,l=t)}if(!a)return null;const c=a.color??(l<r.length?r[l]:"");return{entityConfig:e,tier:a.tier??i[0],color:c,glyphName:o,showInfo:s.show_info??!1,focusMode:!1,indicatorOnly:!1,driveZoneIndicator:!1}}(e,a,i,l,o):null}const _e={red:{r:255,g:0,b:0},orange:{r:255,g:165,b:0},yellow:{r:255,g:255,b:0},green:{r:0,g:255,b:0},blue:{r:0,g:0,b:255},purple:{r:128,g:0,b:128},white:{r:255,g:255,b:255},cyan:{r:0,g:255,b:255},magenta:{r:255,g:0,b:255},black:{r:0,g:0,b:0}},ye=new Set;function me(e){const t=_e[e];return void 0!==t?t:(ye.has(e)||(ye.add(e),console.warn(`resolveColor: unknown color "${e}" — valid values are: red, orange, yellow, green, blue, purple, white, cyan, magenta, black`)),{r:255,g:255,b:255})}const ve={far:{skip_largest:0,max_info_rows:0,prefer_fewer_icons:!0,prefer_dense:!1},near:{skip_largest:1,max_info_rows:4,prefer_fewer_icons:!1,prefer_dense:!1},close:{skip_largest:0,max_info_rows:6,prefer_fewer_icons:!1,prefer_dense:!0}};function be(e,t,i){const o=function(e){const t=ve[e.viewing_distance];return void 0===t?(console.warn(`expandViewingDistance: unknown viewing_distance "${e.viewing_distance}" — falling back to "near"`),ve.near):t}(e),s=Object.keys(e.glyph_sizes),n=Math.min(o.skip_largest,s.length-1),r=o.prefer_dense?[...e.layouts].reverse():e.layouts;for(const e of r){const r=s.indexOf(e.icon.size);if(!(-1!==r&&r<n)&&(!(t<e.icon.min||t>e.icon.max)&&(i||!(e.info.min>0))&&!(0===o.max_info_rows&&e.info.min>0)))return e}return null}function $e(e,t){if(e.burn_in_drift){return{xOffset:Math.floor(t.getHours()/23*e.margin_px[0]),yOffset:Math.floor(t.getMinutes()/59*e.margin_px[1])}}return{xOffset:0,yOffset:0}}function we(e,t){const i=t.margin_px[0]/t.screen_px[0],o=t.margin_px[1]/t.screen_px[1];if("object"==typeof e)return e;switch(e){case"top-edge":return{x:0,y:0,w:1,h:o};case"bottom-edge":return{x:0,y:1-o,w:1,h:o};case"left-edge":return{x:0,y:0,w:i,h:1};case"right-edge":return{x:1-i,y:0,w:i,h:1};case"top-left":return{x:0,y:0,w:i,h:o};case"top-right":return{x:1-i,y:0,w:i,h:o};case"bottom-left":return{x:0,y:1-o,w:i,h:o};case"bottom-right":return{x:1-i,y:1-o,w:i,h:o}}}function xe(e,t){return{x:Math.floor(e.x*t.screen_px[0]),y:Math.floor(e.y*t.screen_px[1]),w:Math.round(e.w*t.screen_px[0]),h:Math.round(e.h*t.screen_px[1])}}function Se(e,t,i,o){const s=e.severity_bar;if(!s)return null;const[n,r]=e.screen_px,[a,l]=e.margin_px,c=new Date,{xOffset:h,yOffset:d}=$e(e,c);let p,u;if(0===t.length){if(!1!==s.hide_when_idle)return null;p=0,u="entity"===s.color?{r:255,g:255,b:255}:me(s.color)}else{const e=i.length,o=t[0].tier;p=(e-i.indexOf(o))/e,u="entity"===s.color?me(t[0].color):me(s.color)}const f=s.thickness_px,g=s.edge;let _,y,m,v;return"bottom"===g?(m=Math.round(p*(n-2*a)),v=f,_=a+h,y=r-l-f+d):"top"===g?(m=Math.round(p*(n-2*a)),v=f,_=a+h,y=l+d):"left"===g?(m=f,v=Math.round(p*(r-2*l)),_=a+h,y=l+d):(m=f,v=Math.round(p*(r-2*l)),_=n-a-f+h,y=l+d),{x:_,y,w:m,h:v,r:u.r,g:u.g,b:u.b}}function Ae(e,t){return function(e,t){const i=t[e.entity_id],o=i?.state??"",s=i?.attributes?.unit_of_measurement??"",n=(e.value_format??"{value} {unit}").replace(/\{value:\.0f\}/g,()=>{const e=parseFloat(o);return isNaN(e)?o:Math.round(e).toString()}).replace(/\{value\}/g,o).replace(/\{unit\}/g,s),r=e.label??i?.attributes?.friendly_name??e.id;return`${n.trim()} ${r}`.trimEnd()}(e,t)}function Ee(e,t,i,o){const s=Object.keys(e.glyph_sizes).reduce((t,i)=>{const o=e.glyph_sizes[i].px;return o>t?o:t},0),n=Math.floor((e.screen_px[0]-s)/2),r=Math.floor((e.screen_px[1]-s)/2),a=t(e.idle_glyph),{r:l,g:c,b:h}=me("white");return{codepoint:a,x:n,y:r,sizePx:s,r:l,g:c,b:h}}function ke(e,t,i,o,s,n,r,a,l){const c=[],h=new Date,d=[];for(const s of e){const e=ge(s,t,i,o,h);null!==e&&d.push(e);const n=Array.isArray(s.rules)&&s.rules.length>0,r=Array.isArray(s.thresholds)&&s.thresholds.length>0;n||r||c.push(`Entity '${s.id}' has no rules or thresholds and will never be active.`)}d.sort((e,t)=>i.indexOf(e.tier)-i.indexOf(t.tier));const p=function(e,t){return e.some(e=>e.focusMode)?e.filter(e=>e.tier===t[0]):e}(d,i);if(0===p.length){const{xOffset:e,yOffset:t}=$e(n,h),o=Object.keys(n.glyph_sizes)[0]??"small";return{profile_id:n.id,glyphs:[Ee(n,r)],info:[],zones:[],severity_bar:Se(n,[],i),layout:{icon:{min:0,max:1,size:o,cols:1},info:{min:0,max:0}},error:!1,warnings:c,page_count:1}}const u=new Map;for(const e of p)if(!u.has(e.glyphName)){const t=r(e.glyphName);if(u.set(e.glyphName,t),n.font_glyphs&&n.font_glyphs.length>0){const t=e.glyphName;n.font_glyphs.includes(t)||c.push(`Glyph '${t}' not in profile '${n.id}' font_glyphs — will render blank. Add '${t}' to the glyphs: list in your ESPHome device YAML and recompile.`)}}const f=new Map(s.map(e=>[e.id,e])),g=p.filter(e=>!e.indicatorOnly),_=new Map;for(const e of g){const t=e.entityConfig.group;if(void 0!==t){const i=f.get(t);i&&"overlay"===i.collapse&&!_.has(t)&&_.set(t,e)}}const y=new Set;let m=0;for(const e of g){const t=e.entityConfig.group;if(void 0!==t){const e=f.get(t);if(e&&"overlay"===e.collapse){y.has(t)||(y.add(t),m+=1);continue}}m+=1}const v=m,b=p.some(e=>e.showInfo),$=be(n,v,b);if(null===$){const e=Object.keys(n.glyph_sizes),t={icon:{min:0,max:0,size:e[e.length-1]??"medium",cols:1},info:{min:0,max:0}};return{profile_id:n.id,glyphs:[],info:[],zones:[],severity_bar:null,layout:t,error:!0,errorReason:`No layout matches: icon_count=${v}, hasInfo=${b}. Check your profile's layouts table.`,warnings:c,page_count:1}}const w=Math.ceil(v/$.icon.max)||1,x=Math.min(a,w-1),S=[],A=new Set;for(const e of g){const t=e.entityConfig.group;if(void 0!==t){const e=f.get(t);if(e&&"overlay"===e.collapse){A.has(t)||(A.add(t),S.push(_.get(t)));continue}}S.push(e)}const E=x*$.icon.max,k=E+$.icon.max,P=S.slice(E,k),M=function(e,t,i){const o=new Date,{xOffset:s,yOffset:n}=$e(e,o),r=e.margin_px[0]+s,a=e.margin_px[1]+n,l=e.glyph_sizes[t.icon.size];if(void 0===l)throw new Error(`layout.icon.size "${t.icon.size}" is not defined in profile "${e.id}" glyph_sizes`);const c=l.px,h=i.filter(e=>!e.indicatorOnly);return h.map((e,i)=>{const o=i%t.icon.cols,s=Math.floor(i/t.icon.cols),n=Math.floor(r+o*c),l=Math.floor(a+s*c),{r:h,g:d,b:p}=me(e.color);return{codepoint:"",x:n,y:l,sizePx:c,r:h,g:d,b:p}})}(n,$,P),C=M.map((e,t)=>({...e,codepoint:u.get(P[t].glyphName)??""})),O=[];for(let e=0;e<P.length;e++){const i=P[e];if(!i.showInfo)continue;const o=C[e],s=Ae(i.entityConfig,t),{r:n,g:r,b:a}=me(i.color);O.push({text:s,x:o.x,y:o.y+o.sizePx+12+2,r:n,g:r,b:a})}const{xOffset:z,yOffset:N}=$e(n,h),R=function(e,t){const i=[];for(const o of e.zones??[]){const s=t.find(e=>e.entityConfig.zone===o.id&&(!0===e.indicatorOnly||!0===e.driveZoneIndicator));if(!s)continue;const n=xe(we(o.position,e),e),{r,g:a,b:l}=me(s.color);i.push({zoneId:o.id,x:n.x,y:n.y,w:n.w,h:n.h,r,g:a,b:l,shape:"filled_rectangle"})}return i}(n,p),T=Se(n,p,i);return{profile_id:n.id,glyphs:C,info:O,zones:R,severity_bar:T,layout:$,error:!1,warnings:c,page_count:w}}function Pe(e,t){const i=[],o=[],s=[],n=[],r=[],a=[];for(let t=0;t<e.glyphs.length;t++){const l=e.glyphs[t];if(i.push(l.x),o.push(l.y),s.push(l.r),n.push(l.g),r.push(l.b),a.push(l.codepoint),i.length!==t+1||o.length!==t+1||s.length!==t+1||n.length!==t+1||r.length!==t+1||a.length!==t+1)throw new Error(`Glyph array length mismatch at index ${t}`)}const l=function(e,t){const i=Object.entries(e.glyph_sizes).sort((e,t)=>t[1].px-e[1].px).map(([e])=>e),o=i.indexOf(t);return-1===o?(console.warn(`glyphFontIndex: size name "${t}" not found in profile "${e.id}"; defaulting to index 0`),0):o}(t,e.layout.icon.size),c=[],h=[],d=[],p=[],u=[],f=[],g=[],_=[],y=[],m=[],v=[],b=[];for(let t=0;t<e.info.length;t++){const i=e.info[t];if(c.push(0),h.push(i.x),d.push(i.y),p.push(i.r),u.push(i.g),f.push(i.b),c.length!==t+1||h.length!==t+1||d.length!==t+1||p.length!==t+1||u.length!==t+1||f.length!==t+1)throw new Error(`Info glyph array length mismatch at index ${t}`);if(g.push(i.text),_.push(i.x),y.push(i.y),m.push(i.r),v.push(i.g),b.push(i.b),g.length!==t+1||_.length!==t+1||y.length!==t+1||m.length!==t+1||v.length!==t+1||b.length!==t+1)throw new Error(`Info text array length mismatch at index ${t}`)}const $=e.info.length>e.layout.info.max,w={filled_rectangle:0,circle:1,filled_circle:2},x=[],S=[],A=[],E=[],k=[],P=[],M=[],C=[];for(let t=0;t<e.zones.length;t++){const i=e.zones[t],o=w[i.shape];if(void 0===o&&console.warn(`packESPhomePayload: unknown shape '${i.shape}' for zone '${i.zoneId}' — defaulting to 0 (filled_rectangle)`),x.push(o??0),S.push(i.x),A.push(i.y),E.push(i.w),k.push(i.h),P.push(i.r),M.push(i.g),C.push(i.b),x.length!==t+1||S.length!==t+1||A.length!==t+1||E.length!==t+1||k.length!==t+1||P.length!==t+1||M.length!==t+1||C.length!==t+1)throw new Error(`Shape array length mismatch at index ${t}`)}if(null!==e.severity_bar){const t=e.severity_bar,i=x.length;if(x.push(0),S.push(t.x),A.push(t.y),E.push(t.w),k.push(t.h),P.push(t.r),M.push(t.g),C.push(t.b),x.length!==i+1||S.length!==i+1||A.length!==i+1||E.length!==i+1||k.length!==i+1||P.length!==i+1||M.length!==i+1||C.length!==i+1)throw new Error(`Shape array length mismatch at severity_bar index ${i}`)}return{x:i,y:o,r:s,g:n,b:r,glyph:a,glyph_font:l,info_glyph:c,info_glyph_y:d,info_glyph_x:h,info_glyph_r:p,info_glyph_g:u,info_glyph_b:f,info_text:g,info_text_y:y,info_text_x:_,info_text_r:m,info_text_g:v,info_text_b:b,info_scroll:$,draw_shape:x,draw_shape_x:S,draw_shape_y:A,draw_shape_d2:E,draw_shape_d3:k,draw_shape_r:P,draw_shape_g:M,draw_shape_b:C,error:e.error}}const Me="?",Ce={"mdi:molecule-co2":"co2","mdi:pool":"pool","mdi:thermometer":"thermostat","mdi:water":"water_drop","mdi:car-electric":"electric_car","mdi:fan":"mode_fan","mdi:lightbulb":"lightbulb","mdi:lock":"lock","mdi:door":"door_open","mdi:garage":"garage","mdi:garage-open":"door_open","mdi:garage-open-variant":"door_open","mdi:garage-variant":"garage","mdi:garage-lock":"lock","mdi:security":"security","mdi:air-filter":"air","mdi:factory":"factory","mdi:grill":"outdoor_grill","mdi:thermometer-auto":"device_thermostat","mdi:arrow-up":"arrow_upward","mdi:arrow-down":"arrow_downward","mdi:check-circle":"check_circle","mdi:chef-hat":"kitchen","mdi:smoke-detector":"detector_smoke","mdi:motion-sensor":"motion_sensor_active","mdi:window-open":"window","mdi:door-open":"door_open","mdi:fire":"local_fire_department","mdi:alarm":"alarm","mdi:bell":"notifications","mdi:home":"home","mdi:weather-sunny":"sunny","mdi:weather-rainy":"rainy","mdi:weather-snowy":"ac_unit","mdi:weather-cloudy":"cloud","mdi:weather-windy":"air","mdi:lightning-bolt":"bolt","mdi:power-plug":"power","mdi:battery":"battery_full","mdi:battery-low":"battery_1_bar","mdi:wifi":"wifi","mdi:wifi-off":"wifi_off","mdi:bluetooth":"bluetooth","mdi:volume-high":"volume_up","mdi:volume-off":"volume_off","mdi:play":"play_arrow","mdi:pause":"pause","mdi:stop":"stop","mdi:camera":"camera_alt","mdi:video":"videocam","mdi:microphone":"mic","mdi:speaker":"speaker","mdi:television":"tv","mdi:phone":"call","mdi:message":"message","mdi:email":"email","mdi:calendar":"calendar_today","mdi:clock":"schedule","mdi:map-marker":"location_on","mdi:car":"directions_car","mdi:bus":"directions_bus","mdi:train":"train","mdi:walk":"directions_walk","mdi:run":"directions_run","mdi:bicycle":"directions_bike","mdi:alert":"warning","mdi:alert-circle":"error","mdi:information":"info","mdi:help-circle":"help","mdi:star":"star","mdi:heart":"favorite","mdi:trash-can":"delete","mdi:pencil":"edit","mdi:magnify":"search","mdi:close":"close","mdi:plus":"add","mdi:minus":"remove","mdi:refresh":"refresh","mdi:download":"download","mdi:upload":"upload","mdi:share":"share","mdi:cog":"settings","mdi:account":"person","mdi:account-group":"group","mdi:shield":"shield","mdi:key":"key","mdi:window":"window","mdi:power":"power_settings_new","mdi:shield-lock":"lock","mdi:shield-home":"home","mdi:lightbulb-on":"lightbulb"},Oe={garage:"",door_open:"",lock:"",security:"",co2:"",air:"",factory:"",mode_fan_off:"",mode_fan:"",power_settings_new:"",thermostat:"",water_drop:"",outdoor_grill:"",pool:"",device_thermostat:"",lightbulb:"",arrow_upward:"",arrow_downward:"",check_circle:"",kitchen:"",electric_car:"",detector_smoke:"",motion_sensor_active:"",window:"",local_fire_department:"",alarm:"",notifications:"",home:"",sunny:"",rainy:"",ac_unit:"",cloud:"",bolt:"",power:"",battery_full:"",battery_1_bar:"",wifi:"",wifi_off:"",bluetooth:"",volume_up:"",volume_off:"",play_arrow:"",pause:"",stop:"",camera_alt:"",videocam:"",mic:"",speaker:"",tv:"",call:"",message:"",email:"",calendar_today:"",schedule:"",location_on:"",directions_car:"",directions_bus:"",train:"",directions_walk:"",directions_run:"",directions_bike:"",warning:"",error:"",info:"",help:"",star:"",favorite:"",delete:"",edit:"",search:"",close:"",add:"",remove:"",refresh:"",download:"",upload:"",share:"",settings:"",person:"",group:"",shield:"",key:""};function ze(e){if(!e)return Me;if("entity"===e)throw new Error('resolveGlyphForCanvas: "entity" must be resolved to a concrete name before calling');if(e.startsWith("mdi:")){const t=Ce[e];return void 0===t?(console.warn(`resolveGlyphForCanvas: no MDI→MSS mapping for "${e}" — add it to MDI_TO_MSS or use a Material Symbols Sharp name directly`),Me):t}return 1===e.length&&(e.codePointAt(0)??0)>127||2===e.length&&e.codePointAt(0),e}function Ne(e){if(0===e.length)return Me;if("entity"===e)throw new Error('resolveGlyph: "entity" must be resolved to a concrete name before calling resolveGlyph');if(e.startsWith("mdi:")){const t=Ce[e];if(void 0===t)return console.warn(`resolveGlyph: no MDI→MSS mapping for "${e}" — add the icon to MDI_TO_MSS or use a Material Symbols Sharp name directly`),Me;const i=Oe[t];return i||(console.warn(`resolveGlyph: MDI "${e}" maps to MSS "${t}" but "${t}" is not in MSS_CODEPOINTS — add "${t}" to your ESPHome firmware's font_glyphs list`),Me)}if(1===e.length){const t=e.codePointAt(0);if(void 0!==t&&t>127)return e}if(2===e.length){const t=e.codePointAt(0);if(void 0!==t&&t>65535)return e}const t=Oe[e];return t||(console.warn(`resolveGlyph: glyph "${e}" not found in MSS_CODEPOINTS — add "${e}" to your ESPHome firmware's font_glyphs list`),Me)}const Re=new Set;async function Te(e,t,i){i.width=t.screen_px[0],i.height=t.screen_px[1];const o=i.getContext("2d");null!==o&&(o.fillStyle="#000",o.fillRect(0,0,i.width,i.height),await async function(e){if("undefined"!=typeof document&&document.fonts)for(const[,t]of Object.entries(e)){const e=t.px,i="Material Symbols Sharp",o=`${i}:${e}`;if(Re.has(o))continue;const s=`mss-font-${e}`;if(!document.getElementById(s)&&document.head){const t=document.createElement("link");t.id=s,t.rel="stylesheet",t.href=`https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@${e},400,0,0`,document.head.appendChild(t)}await document.fonts.load(`${e}px '${i}'`),Re.add(o)}}(t.glyph_sizes),function(e,t){for(const i of t){const t=i.codepoint===Me?"Material Design Icons":"Material Symbols Sharp";e.font=`${i.sizePx}px '${t}'`,e.fillStyle=`rgb(${i.r}, ${i.g}, ${i.b})`,e.fillText(i.codepoint,i.x,i.y+i.sizePx)}}(o,e.glyphs),function(e,t){for(const i of t)e.font="12px monospace",e.fillStyle=`rgb(${i.r}, ${i.g}, ${i.b})`,e.fillText(i.text,i.x,i.y)}(o,e.info),function(e,t){for(const i of t)"filled_rectangle"===i.shape?(e.fillStyle=`rgb(${i.r},${i.g},${i.b})`,e.fillRect(i.x,i.y,i.w,i.h)):"filled_circle"===i.shape?(e.fillStyle=`rgb(${i.r},${i.g},${i.b})`,e.beginPath(),e.arc(i.x+i.w/2,i.y+i.h/2,i.w/2,0,2*Math.PI),e.fill()):"circle"===i.shape&&(e.strokeStyle=`rgb(${i.r},${i.g},${i.b})`,e.beginPath(),e.arc(i.x+i.w/2,i.y+i.h/2,i.w/2,0,2*Math.PI),e.stroke())}(o,e.zones),function(e,t,i){if(null!==t)return e.fillStyle=`rgb(${t.r}, ${t.g}, ${t.b})`,void e.fillRect(t.x,t.y,t.w,t.h);if(!1===i.severity_bar?.hide_when_idle){e.strokeStyle="#555555";const t=i.margin_px,o=i.screen_px,s=i.severity_bar.thickness_px;e.strokeRect(t[0],o[1]-t[1]-s,o[0]-2*t[0],s)}}(o,e.severity_bar,t))}let Ie=class extends ae{constructor(){super(...arguments),this._errors=[],this._results=new Map,this._pageState={}}setConfig(e){const t=function(e){const t=[];if("object"!=typeof e||null===e)t.push("config must be an object");else{const i=e,o=i.tiers,s=new Set;if(Array.isArray(o)&&0!==o.length)for(let e=0;e<o.length;e++)"string"!=typeof o[e]?t.push(`tiers[${e}] must be a string`):s.add(o[e]);else t.push("tiers must be a non-empty array");const n=i.entities;if(Array.isArray(n)&&0!==n.length){const e=new Set,o=i.groups;if(Array.isArray(o))for(const t of o)if("object"==typeof t&&null!==t){const i=t.id;"string"==typeof i&&e.add(i)}for(let i=0;i<n.length;i++){const o=n[i];if("object"!=typeof o||null===o){t.push(`entities[${i}] must be an object`);continue}const r=o;"string"==typeof r.id&&0!==r.id.length||t.push(`entities[${i}].id is required`),"string"==typeof r.entity_id&&0!==r.entity_id.length||t.push(`entities[${i}].entity_id is required`);const a=Array.isArray(r.rules),l=Array.isArray(r.thresholds);if(a&&l&&t.push(`entities[${i}] (id=${String(r.id)}) must not have both rules and thresholds`),a){const e=r.rules;for(let o=0;o<e.length;o++){const n=e[o];if("object"!=typeof n||null===n)continue;const r=n.then;if("object"==typeof r&&null!==r){const e=r.tier;void 0===e||"string"!=typeof e||s.has(e)||t.push(`entities[${i}].rules[${o}].then.tier "${e}" is not declared in tiers`)}}}if(l){const e=r.thresholds;let o=null;for(let n=0;n<e.length;n++){const r=e[n];if("object"!=typeof r||null===r)continue;const a=r,l=a.tier;void 0===l||"string"!=typeof l||s.has(l)||t.push(`entities[${i}].thresholds[${n}].tier "${l}" is not declared in tiers`);const c=a.above;"number"==typeof c&&(null!==o&&c<=o&&t.push(`entities[${i}].thresholds[${n}].above (${c}) must be strictly greater than previous (${o})`),o=c)}}"string"!=typeof r.group||e.has(r.group)||t.push(`entities[${i}].group "${String(r.group)}" references undeclared group`)}}else t.push("entities must be a non-empty array");const r=i.display_profiles;if(Array.isArray(r)&&0!==r.length)for(let e=0;e<r.length;e++){const i=r[e];if("object"!=typeof i||null===i){t.push(`display_profiles[${e}] must be an object`);continue}const o=i;"string"==typeof o.id&&0!==o.id.length||t.push(`display_profiles[${e}].id is required`);const s=new Set(["esphome","canvas","cast","png_file"]);"string"==typeof o.type&&s.has(o.type)||t.push(`display_profiles[${e}].type must be one of: esphome, canvas, cast, png_file`);const n=o.screen_px;if(Array.isArray(o.screen_px)&&2===o.screen_px.length&&"number"==typeof n[0]&&"number"==typeof n[1]||t.push(`display_profiles[${e}].screen_px must be a [width, height] tuple of numbers`),"esphome"===o.type&&("string"!=typeof o.service||0===o.service.length)){const i="string"==typeof o.id?` (id=${o.id})`:"";t.push(`display_profiles[${e}]${i} (type=esphome) must have a service field`)}}else t.push("display_profiles must be a non-empty array");const a=i.groups;if(Array.isArray(a)){const e=new Set;for(let i=0;i<a.length;i++){const o=a[i];if("object"!=typeof o||null===o)continue;const s=o.id;"string"==typeof s&&(e.has(s)&&t.push(`groups id "${s}" is not unique`),e.add(s))}}}return t}(e);t.length>0?this._errors=t:(this._config=structuredClone(e),this._errors=[],this._hass&&this._runSolver())}set hass(e){this._hass=e;for(const e of Object.keys(this._pageState))clearTimeout(this._pageState[e].dwellTimer);this._runSolver()}get hass(){return this._hass}_runSolver(){if(this._config&&this._hass)for(const e of this._config.display_profiles){this._pageState[e.id]??={currentPage:0};const t=this._pageState[e.id],i="canvas"===e.type?ze:Ne,o=ke(this._config.entities,this._hass.states,this._config.tiers,this._config.defaults??{},this._config.groups??[],e,i,t.currentPage);if(this._results.set(e.id,o),"canvas"===e.type)this.requestUpdate();else if("esphome"===e.type&&!o.error){const t=e.service.split("."),i=t[0],s=t.slice(1).join("."),n=Pe(o,e);this._hass.callService(i,s,n).catch(e=>{console.error("display-solver: callService failed",e)})}if(o.page_count>1){const i=1e3*(e.page_dwell_s??5);t.dwellTimer=setTimeout(()=>{const t=this._pageState[e.id];t&&(t.currentPage=(t.currentPage+1)%o.page_count,this._runSolver())},i)}}}updated(e){if(super.updated(e),this._config)for(const e of this._config.display_profiles){if("canvas"!==e.type)continue;const t=this._results.get(e.id);if(!t)continue;const i=this.shadowRoot?.querySelector(`#canvas-${e.id}`);i&&Te(t,e,i).catch(e=>{console.error("display-solver: renderToCanvas failed",e)})}}disconnectedCallback(){super.disconnectedCallback();for(const e of Object.keys(this._pageState))clearTimeout(this._pageState[e].dwellTimer)}render(){if(this._errors.length>0)return B`<ha-card>
        <div class="error">
          <b>Display Solver config error:</b>
          <ul>${this._errors.map(e=>B`<li>${e}</li>`)}</ul>
        </div>
      </ha-card>`;const e=this._config?.display_profiles.filter(e=>"canvas"===e.type)??[];return B`<ha-card>
      ${e.map(e=>B`
        <div class="profile-wrapper">
          <canvas id="canvas-${e.id}"></canvas>
        </div>
      `)}
    </ha-card>`}getCardSize(){return Math.ceil(this._config?.display_profiles?.length??1)}getGridOptions(){return{rows:3,columns:4,min_rows:2,max_rows:Math.max(6,3*(this._config?.display_profiles?.length??1))}}static getConfigElement(){return Promise.resolve().then(function(){return He}),document.createElement("display-solver-card-editor")}static getStubConfig(e){return{tiers:["critical","alert","status"],defaults:{unavailable_action:"hide",show_info:!0},entities:[{id:"sun",entity_id:"sun.sun",glyph:"sunny",rules:[{when:{state:"above_horizon"},then:{action:"show",tier:"alert",color:"orange"}},{when:{state:"below_horizon"},then:{action:"hide"}}]}],display_profiles:[{id:"preview",type:"canvas",screen_px:[256,256],margin_px:[8,8],burn_in_drift:!1,viewing_distance:"near",idle_glyph:"check_circle",glyph_sizes:{large:{px:96,fits_cols:2},medium:{px:48,fits_cols:3},small:{px:24,fits_cols:4}},layouts:[{icon:{min:1,max:4,size:"large",cols:2},info:{min:0,max:0}},{icon:{min:1,max:9,size:"medium",cols:3},info:{min:0,max:2}},{icon:{min:1,max:16,size:"small",cols:4},info:{min:0,max:3}}]}]}}static{this.styles=r`
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
  `}};e([pe()],Ie.prototype,"_config",void 0),e([pe()],Ie.prototype,"_hass",void 0),e([pe()],Ie.prototype,"_errors",void 0),Ie=e([ce("display-solver-card")],Ie),window.customCards=window.customCards||[],window.customCards.push({type:"display-solver-card",name:"Display Solver",description:"Priority dashboard for ESPHome and Chromecast displays",preview:!0,documentationURL:"https://github.com/b3nj1/lovelace-display-solver"});let Ue=class extends ae{constructor(){super(...arguments),this._expandedEntity=null}setConfig(e){this._config=e}get hass(){return this._hass}set hass(e){this._hass=e}_dispatch(e){this._config=e,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:e},bubbles:!0,composed:!0}))}render(){return this._config?B`
      <div class="editor">
        ${this._renderTiersSection()}
        ${this._renderEntitiesSection()}
        ${this._renderProfilesSection()}
      </div>
    `:B``}_renderTiersSection(){return B`
      <div class="section">
        <h3>Alert Levels &amp; Settings</h3>
        <ha-textfield
          label="Alert levels (comma-separated, most urgent first)"
          .value=${(this._config?.tiers??[]).join(", ")}
          placeholder="critical, alert, status"
          @change=${e=>{const t=e.target.value;this._dispatch({...this._config,tiers:t.split(",").map(e=>e.trim()).filter(Boolean)})}}
        ></ha-textfield>
        <label class="select-row">
          <span class="select-label">When entity unavailable</span>
          <select
            .value=${this._config?.defaults?.unavailable_action??"hide"}
            @change=${e=>{const t=e.target.value;this._dispatch({...this._config,defaults:{...this._config.defaults,unavailable_action:t}})}}
          >
            <option value="hide">Hide (recommended)</option>
            <option value="show">Show (use with a specific unavailable rule)</option>
          </select>
        </label>
        <label class="checkbox-row">
          <ha-checkbox
            .checked=${this._config?.defaults?.show_info??!1}
            @change=${e=>{this._dispatch({...this._config,defaults:{...this._config.defaults,show_info:e.target.checked}})}}
          ></ha-checkbox>
          Show info lines by default
        </label>
      </div>
    `}_renderEntitiesSection(){const e=this._config?.entities??[];return B`
      <div class="section">
        <h3>Entities</h3>
        ${e.map((e,t)=>this._renderEntityRow(e,t))}
        <button class="add-btn" @click=${this._addEntity}>+ Add entity</button>
      </div>
    `}_renderEntityRow(e,t){return B`
      <div class="entity-row">
        <ha-textfield
          label="ID"
          .value=${e.id}
          @change=${i=>this._updateEntity(t,{...e,id:i.target.value})}
        ></ha-textfield>
        ${this._hass?B`<ha-entity-picker
              .hass=${this._hass}
              .value=${e.entity_id}
              label="Entity"
              allow-custom-entity
              @value-changed=${i=>{const o=i.detail.value;this._changeEntityId(t,o,e)}}
            ></ha-entity-picker>`:B`<ha-textfield
              label="Entity ID (e.g. binary_sensor.garage)"
              .value=${e.entity_id}
              placeholder="domain.entity_name"
              @change=${i=>this._updateEntity(t,{...e,entity_id:i.target.value})}
            ></ha-textfield>`}
        <ha-textfield
          label="Glyph name"
          .value=${e.glyph??""}
          placeholder="garage or mdi:garage"
          @change=${i=>this._updateEntity(t,{...e,glyph:i.target.value||void 0})}
        ></ha-textfield>
        <p class="field-hint">
          Use a <a href="https://fonts.google.com/icons?icon.style=Sharp" target="_blank" rel="noopener">Material Symbols Sharp</a> name (e.g. <code>garage</code>, <code>door_open</code>, <code>lock</code>) — these always work.
          MDI names (e.g. <code>mdi:garage</code>) only work for icons in the built-in mapping; if one shows as <code>?</code>, use the MSS name directly.
        </p>
        <ha-textfield
          label="Label (optional display name)"
          .value=${e.label??""}
          @change=${i=>this._updateEntity(t,{...e,label:i.target.value||void 0})}
        ></ha-textfield>
        <div class="entity-rules">
          <button class="toggle-btn" @click=${()=>{this._expandedEntity=this._expandedEntity===t?null:t}}>
            ${this._expandedEntity===t?"Hide rules":`Edit rules (${e.rules?.length??e.thresholds?.length??0})`}
          </button>
          ${this._expandedEntity===t?this._renderRuleEditor(e,t):""}
        </div>
        <button class="remove-btn" @click=${()=>this._removeEntity(t)}>Remove</button>
      </div>
    `}_renderRuleEditor(e,t){const i=this._config?.tiers??[],o=e.rules??[];return B`
      <div class="rule-editor">
        ${o.map((e,s)=>B`
          <div class="rule-row">
            <ha-textfield
              label="When state equals"
              .value=${e.when.state??""}
              placeholder="on, off, above_horizon…"
              @change=${i=>{const n=i.target.value,r={...e,when:{...e.when,state:n||void 0}};this._updateEntityRules(t,o.map((e,t)=>t===s?r:e))}}
            ></ha-textfield>
            <label class="select-row">
              <span class="select-label">Action</span>
              <select
                .value=${e.then.action}
                @change=${i=>{const n=i.target.value,r={...e,then:{...e.then,action:n}};this._updateEntityRules(t,o.map((e,t)=>t===s?r:e))}}
              >
                <option value="show">Show</option>
                <option value="hide">Hide</option>
                <option value="indicator">Indicator only</option>
              </select>
            </label>
            <label class="select-row">
              <span class="select-label">Tier</span>
              <select
                .value=${e.then.tier??""}
                @change=${i=>{const n=i.target.value,r={...e,then:{...e.then,tier:n||void 0}};this._updateEntityRules(t,o.map((e,t)=>t===s?r:e))}}
              >
                ${0===i.length?B`<option value="" disabled>Define tiers above first</option>`:i.map(e=>B`<option value=${e}>${e}</option>`)}
              </select>
            </label>
            ${0===i.length?B`<p class="field-hint">Add alert levels in the "Alert Levels &amp; Settings" section above first.</p>`:""}
            <ha-textfield
              label="Color (name or hex)"
              .value=${e.then.color??""}
              placeholder="red, #ff6600…"
              @change=${i=>{const n=i.target.value,r={...e,then:{...e.then,color:n||void 0}};this._updateEntityRules(t,o.map((e,t)=>t===s?r:e))}}
            ></ha-textfield>
            <button class="remove-btn" @click=${()=>this._updateEntityRules(t,o.filter((e,t)=>t!==s))}>Remove rule</button>
          </div>
        `)}
        <button class="add-btn" @click=${()=>this._updateEntityRules(t,[...o,{when:{},then:{action:"show"}}])}>+ Add rule</button>
      </div>
    `}_changeEntityId(e,t,i){t&&t!==i.entity_id&&this._updateEntity(e,{...i,entity_id:t,rules:[{when:{state:"on"},then:{action:"show",tier:this._config.tiers?.[0],color:"red"}}],thresholds:void 0})}_updateEntity(e,t){if(!this._config)return;const i=[...this._config.entities??[]];i[e]=t,this._dispatch({...this._config,entities:i})}_updateEntityRules(e,t){if(!this._config)return;const i=[...this._config.entities??[]];i[e]={...i[e],rules:t},this._dispatch({...this._config,entities:i})}_addEntity(){if(!this._config)return;const e=[...this._config.entities??[]],t={id:`entity_${e.length+1}`,entity_id:"",rules:[{when:{state:"on"},then:{action:"show",tier:this._config.tiers?.[0],color:"red"}}]};this._dispatch({...this._config,entities:[...e,t]})}_removeEntity(e){if(!this._config)return;const t=(this._config.entities??[]).filter((t,i)=>i!==e);this._dispatch({...this._config,entities:t})}_renderProfilesSection(){const e=this._config?.display_profiles??[];return B`
      <div class="section">
        <h3>Display Profiles</h3>
        ${e.map((e,t)=>this._renderProfileRow(e,t))}
        <button class="add-btn" @click=${this._addProfile}>+ Add profile</button>
        <p class="yaml-note">
          Advanced layout and zone configuration: edit the card YAML directly.
          See the <a href="https://github.com/b3nj1/lovelace-display-solver#readme" target="_blank" rel="noopener">README</a> for the full schema reference.
        </p>
      </div>
    `}_renderProfileRow(e,t){return B`
      <div class="profile-row">
        <ha-textfield
          label="Profile ID"
          .value=${e.id}
          @change=${i=>this._updateProfile(t,{...e,id:i.target.value})}
        ></ha-textfield>
        <label class="select-row">
          <span class="select-label">Output type</span>
          <select
            .value=${e.type}
            @change=${i=>{const o=i.target.value;this._updateProfile(t,{...e,type:o})}}
          >
            <option value="canvas">Canvas (browser preview)</option>
            <option value="esphome">ESPHome display</option>
          </select>
        </label>
        ${"esphome"===e.type?B`
          <ha-textfield
            label="Service (esphome.device_set_display_glyphs)"
            .value=${e.service??""}
            placeholder="esphome.device_set_display_glyphs"
            @change=${i=>this._updateProfile(t,{...e,service:i.target.value||void 0})}
          ></ha-textfield>
        `:""}
        <ha-textfield
          label="Width (px)"
          type="number"
          .value=${String(e.screen_px[0])}
          @change=${i=>{const o=parseInt(i.target.value,10);isNaN(o)||this._updateProfile(t,{...e,screen_px:[o,e.screen_px[1]]})}}
        ></ha-textfield>
        <ha-textfield
          label="Height (px)"
          type="number"
          .value=${String(e.screen_px[1])}
          @change=${i=>{const o=parseInt(i.target.value,10);isNaN(o)||this._updateProfile(t,{...e,screen_px:[e.screen_px[0],o]})}}
        ></ha-textfield>
        <label class="select-row">
          <span class="select-label">Viewing distance</span>
          <select
            .value=${e.viewing_distance}
            @change=${i=>{const o=i.target.value;this._updateProfile(t,{...e,viewing_distance:o})}}
          >
            <option value="close">Close (desk / tablet)</option>
            <option value="near">Near (across the room)</option>
            <option value="far">Far (hallway / at a distance)</option>
          </select>
          <span class="field-hint">Only affects layout selection when the profile has multiple layouts configured.</span>
        </label>
        <label class="checkbox-row">
          <ha-checkbox
            .checked=${e.burn_in_drift}
            @change=${i=>this._updateProfile(t,{...e,burn_in_drift:i.target.checked})}
          ></ha-checkbox>
          Enable burn-in drift (OLED displays)
        </label>
        <ha-textfield
          label="Icon page dwell (seconds — only when icons overflow the layout)"
          type="number"
          .value=${String(e.page_dwell_s??5)}
          @change=${i=>{const o=parseFloat(i.target.value);isNaN(o)||this._updateProfile(t,{...e,page_dwell_s:o})}}
        ></ha-textfield>
        <button class="remove-btn" @click=${()=>this._removeProfile(t)}>Remove profile</button>
      </div>
    `}_updateProfile(e,t){if(!this._config)return;const i=[...this._config.display_profiles??[]];i[e]=t,this._dispatch({...this._config,display_profiles:i})}_addProfile(){if(!this._config)return;const e=[...this._config.display_profiles??[]],t={id:`profile_${e.length+1}`,type:"canvas",screen_px:[400,300],margin_px:[8,8],burn_in_drift:!1,viewing_distance:"near",idle_glyph:"check_circle",glyph_sizes:{small:{px:24,fits_cols:4}},layouts:[{icon:{min:1,max:16,size:"small",cols:4},info:{min:0,max:3}}]};this._dispatch({...this._config,display_profiles:[...e,t]})}_removeProfile(e){if(!this._config)return;const t=(this._config.display_profiles??[]).filter((t,i)=>i!==e);this._dispatch({...this._config,display_profiles:t})}static{this.styles=r`
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
    .field-hint { font-size: 0.8em; color: var(--secondary-text-color); margin: 2px 0 4px; }
    .field-hint a { color: var(--primary-color); }
    .field-hint code { background: var(--secondary-background-color, #f5f5f5); padding: 1px 4px; border-radius: 3px; }
    .select-row { display: flex; flex-direction: column; gap: 4px; }
    .select-label { font-size: 0.85em; color: var(--secondary-text-color, rgba(0,0,0,0.6)); }
    select {
      padding: 8px 10px;
      border: 1px solid var(--input-idle-line-color, rgba(0,0,0,0.42));
      border-radius: 4px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #000);
      font-family: inherit;
      font-size: 0.95em;
      cursor: pointer;
    }
    select:focus { outline: none; border-color: var(--primary-color, #03a9f4); }
  `}};e([pe()],Ue.prototype,"_config",void 0),e([pe()],Ue.prototype,"_expandedEntity",void 0),e([pe()],Ue.prototype,"_hass",void 0),Ue=e([ce("display-solver-card-editor")],Ue);var He=Object.freeze({__proto__:null,get DisplaySolverCardEditor(){return Ue}});export{Ie as DisplaySolverCard};
