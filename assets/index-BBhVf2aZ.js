(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))i(a);new MutationObserver(a=>{for(const t of a)if(t.type==="childList")for(const c of t.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&i(c)}).observe(document,{childList:!0,subtree:!0});function n(a){const t={};return a.integrity&&(t.integrity=a.integrity),a.referrerPolicy&&(t.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?t.credentials="include":a.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function i(a){if(a.ep)return;a.ep=!0;const t=n(a);fetch(a.href,t)}})();function B(e,s="#/landing"){const n=document.getElementById("app"),i=()=>document.querySelectorAll("[data-route]");function a(){const t=location.hash||s,c=e[t]||e[s];n.innerHTML=c.template(),i().forEach(l=>l.classList.toggle("active",l.getAttribute("href")===t)),document.querySelector(".app")?.classList.remove("nav-open"),typeof c.onMount=="function"&&c.onMount()}window.addEventListener("hashchange",a),a()}const $={template(){return`
      <section class="landing">

        <!-- Hero -->
        <header class="landing-hero card">
        <br/>
          <div class="landing-badge">South African tender toolkit</div>
          <h1 class="landing-title">Never miss a tender requirement again.</h1>
          <p class="landing-sub">
            Upload an RFQ/RFP, get an instant checklist and compliance score, then submit with confidence.
          </p>
          <div class="row landing-cta">
            <a class="btn" id="btnTry">Try it free</a>
            <a class="btn login" id="btnLogin">Login</a>
          </div>
          <div class="landing-trust">
            <span class="tag">No emails required</span>
            <span class="tag">WhatsApp / SMS reports</span>
            <span class="tag">Built for RFQs &lt; R1m</span>
          </div>
        </header>

        <!-- How it works -->
        <section class="grid cols-3 landing-steps">
          <div class="card">
            <div class="step-num">1</div>
            <h3>Upload RFQ/RFP</h3>
            <p class="muted">PDF in, analyse key admin & technical returnables.</p>
          </div>
          <div class="card">
            <div class="step-num">2</div>
            <h3>Checklist & Score</h3>
            <p class="muted">See missing SBDs, BBBEE, Tax PIN and deadlines.</p>
          </div>
          <div class="card">
            <div class="step-num">3</div>
            <h3>Fix & Submit</h3>
            <p class="muted">Upload documents and generate a submission pack.</p>
          </div>
        </section>

        <!-- Features -->
       <!-- Features -->
<section class="landing-features grid cols-3">
  <div class="card feature">
    <div class="ico">📑</div>
    <h3>Auto-Checklist</h3>
    <p class="muted">We audit your RFQ/RFP and surface admin + technical returnables instantly.</p>
    <ul class="feature-list">
      <li>SBDs & returnables detected</li>
      <li>Due dates & validity hints</li>
      <li>Export to workspace</li>
    </ul>
  </div>

  <div class="card feature">
    <div class="ico">🧭</div>
    <h3>Compliance Guidance</h3>
    <p class="muted">Compliance rating with clear, fix-first suggestions for gaps.</p>
    <ul class="feature-list">
      <li>BBBEE, Tax PIN, CSD checks</li>
      <li>“What’s missing” summary</li>
      <li>One-click fix actions</li>
    </ul>
  </div>

  <div class="card feature">
    <div class="ico">💬</div>
    <h3>WhatsApp/SMS Reports</h3>
    <p class="muted">Share simple, client-ready updates from your phone.</p>
    <ul class="feature-list">
      <li>One-tap share link</li>
      <li>Compact status summary</li>
      <li>No email required</li>
    </ul>
  </div>
</section>

        <!-- Pricing (preview) -->
       
        <section class="landing-pricing grid cols-4">
          <div class="card price">
            <h3>Free</h3>
            <div class="landing-price">R0</div>
            <p class="muted">1 scan • basic checklist</p>
            <a class="btn ghost" id="btnStartFree">Start</a>
          </div>

          <div class="card price featured">
            <h3>Starter</h3>
            <div class="landing-price">R199<span class="per">/month</span></div>
            <p class="muted">Unlimited checks • WhatsApp report</p>
            <a class="btn" id="btnChooseStarter">Choose Starter</a>
          </div>

          <div class="card price">
            <h3>Tender List Pro</h3>
            <div class="landing-price">R299<span class="per">/month</span></div>
            <p class="muted">
              Access to curated tender listings with <b>document summaries</b> and
              <b>compliance breakdowns</b>.
            </p>
            <a class="btn ghost" id="btnTenderListPro">Choose Pro</a>
          </div>

          <div class="card price">
            <h3>DFY</h3>
            <div class="landing-price">From R3,000</div>
            <p class="muted">We prepare the pack for you</p>
            <a class="btn ghost" id="btnDFY">Talk to us</a>
          </div>
        </section>


         <!-- FAQ -->
        <section class="landing-faq card">
          <h3>FAQ</h3>

          <details>
            <summary>Do I need an email address?</summary>
            <p class="muted">No. We use phone + OTP, and send reports via WhatsApp or SMS.</p>
          </details>

          <details>
            <summary>Which documents do you check?</summary>
            <p class="muted">
              Common SBDs (1, 4, 6.1, etc.), BBBEE, Tax PIN/CSD, and typical returnables for RFQs.
            </p>
          </details>

          <details>
            <summary>Is this a tender listing site?</summary>
            <p class="muted">
              Not exactly. TenderPick includes a curated tender list from official sources,
              but with a twist: each listing comes with a <b>summary of the required documents</b>
              and key compliance info. This makes it easier for first-timers to know what’s expected.
            </p>
          </details>

          <details>
            <summary>Is there a fee for the tender list with summaries?</summary>
            <p class="muted">
              Yes. While browsing tenders is free, access to the <b>document summary,
              compliance breakdown, and checklist export</b> will require a paid plan.
            </p>
          </details>
        </section>

        <!-- Footer note -->
        <footer class="landing-foot muted">
          © ${new Date().getFullYear()} TenderPick. Built for SA SMEs and first-time bidders.
        </footer>
      </section>
    `},onMount(){const e=()=>location.hash="#/workspace";document.getElementById("btnLogin")?.addEventListener("click",e),document.getElementById("btnTry")?.addEventListener("click",e),document.getElementById("btnStartFree")?.addEventListener("click",e),document.getElementById("btnChooseStarter")?.addEventListener("click",e),document.getElementById("btnDFY")?.addEventListener("click",()=>location.hash="#/settings")}},v={settings:{waNumber:localStorage.getItem("waNumber")||"",whatsappEnabled:!1,smsEnabled:!1},wsItems:[{key:"sbd4",label:"SBD 4 – Declaration of Interest",done:!0,note:"Avoid conflicts of interest"},{key:"sbd61",label:"SBD 6.1 – Preference Points Claim",done:!0,note:"BBBEE preference points"},{key:"tax",label:"Tax Clearance Certificate",done:!0,note:"Valid SARS PIN/certificate"},{key:"bbee",label:"BBBEE Certificate",done:!1,note:"Expires soon / missing"}]},I=e=>{const s=e.done?'<span class="pill pill-ok">Completed</span>':'<span class="pill pill-fail">Missing</span>',n=e.done?'<a class="btn ghost" href="#">Download</a>':`<a class="btn ghost" href="#">Template</a>
                             <button class="btn" data-mark="${e.key}">Upload</button>`;return`
    <div class="item ${e.done?"bg-ok":"bg-fail"}">
      <div><div><b>${e.label}</b></div><div class="muted">${e.note}</div></div>
      <div class="row">${n}${s}</div>
    </div>`},k=()=>Math.round(v.wsItems.filter(e=>e.done).length/v.wsItems.length*100),x={template(){return`
      <section class="workspace">
        <div class="kpi-strip">
            <button class="kpi-chip" data-kind="active" data-count="3" aria-label="Active tenders">
              <span class="ico">📂</span>
              <span class="label">Active</span>
              <span class="count">3</span>
            </button>

            <button class="kpi-chip" data-kind="done" data-count="12" aria-label="Completed tenders">
              <span class="ico">✅</span>
              <span class="label">Completed</span>
              <span class="count">12</span>
            </button>

            <button class="kpi-chip warn" data-kind="attention" data-count="1" aria-label="Needs attention">
              <span class="ico">⚠️</span>
              <span class="label">Needs attention</span>
              <span class="count">1</span>
            </button>
    
        </div>

        <div class="grid cols-2" style="margin-top:16px">
          <div class="card">
            <h3>Upload New Tender Document</h3>
            <p class="muted">Drop your RFQ/RFP to start compliance checking</p>
            <div class="filebox">
              <div class="cloud">☁️</div>
              <div class="muted">Drop your PDF here</div>
              <label class="btn ghost" for="wsFile">Choose File</label>
              <input type="file" id="wsFile" hidden />
              <div class="muted small">Supported: PDF (max 10MB)</div>
            </div>
          </div>

        <div class="card">
            <h3>Quick Actions</h3>
            <div class="list">

                <div class="item">
                  <div>
                    <span class="ico">📄</span>
                    <b>Download SBD Templates</b>
                    <div class="muted">Standard bid forms</div>
                  </div>
                  <a class="btn ghost" href="#">Open</a>
                </div>

                <div class="item">
                  <div>
                    <span class="ico">👨‍💼</span>
                    <b>Expert Consultation</b>
                    <div class="muted">We do it for you (from R3,000)</div>
                  </div>
                  <a class="btn" href="#/settings">Book</a>
                </div>

                <div class="item">
                  <div>
                    <span class="ico">📘</span>
                    <b>Tender Guidelines</b>
                    <div class="muted">SA tender process</div>
                  </div>
                  <a class="btn ghost" href="#">View</a>
                </div>

            </div>
        </div>


        <div class="card" style="margin-top:16px">
          <div class="row between">
            <div>
              <h3 style="margin:0">City of Cape Town – Water Infrastructure RFP</h3>
              <div class="muted">Uploaded 2 days ago • Due: 15 Dec 2024</div>
            </div>
            <span class="pill">In Progress</span>
          </div>
          <div class="hr"></div>
          <div>
            <div class="muted">Compliance Score</div>
            <div class="progress"><div id="wsProgress" style="width:${k()}%"></div></div>
            <div class="muted small">${k()}% complete</div>
          </div>
        </div>

        <div class="grid cols-2" style="margin-top:16px">
          <div class="card">
            <h3>Document Checklist</h3>
            <div class="list" id="wsChecklist">${v.wsItems.map(I).join("")}</div>
            <div style="margin-top:12px">
              <button id="wsGenerate" class="btn" ${k()===100?"":"disabled"}>Generate Submission Package</button>
            </div>
          </div>
          <div class="card card-help">
            <div class="help-inner">
              <h3>Need Help?</h3>
              <div>Our tender experts are here to assist you</div>
              <div class="sp8"> </div>
              <p>Contact Support</p>
              <div>📞 +27 11 123 4567</div>
              <div>💬 WhatsApp Support</div>
              <div class="sp12"></div>
             
            </div>
          </div>
        </div>
      </section>
    `},onMount(){document.querySelectorAll("[data-mark]").forEach(s=>{s.addEventListener("click",()=>{const n=s.dataset.mark,i=v.wsItems.find(t=>t.key===n);i&&(i.done=!0);const a=location.hash;location.hash="",requestAnimationFrame(()=>location.hash=a)})}),document.getElementById("wsGenerate")?.addEventListener("click",()=>{alert("ZIP package generator – placeholder")});const e=document.querySelector(".filebox");e&&(["dragenter","dragover"].forEach(s=>e.addEventListener(s,n=>{n.preventDefault(),e.classList.add("is-dragover")})),["dragleave","drop"].forEach(s=>e.addEventListener(s,n=>{n.preventDefault(),e.classList.remove("is-dragover")}))),document.querySelectorAll(".kpi-chip").forEach(s=>{Number(s.dataset.count||"0")===0&&(s.style.display="none"),s.addEventListener("click",()=>{const i=s.dataset.kind,a=document.getElementById("wsChecklist");a&&(a.scrollIntoView({behavior:"smooth",block:"start"}),a.querySelectorAll(".item").forEach(t=>t.classList.remove("pulse")),i==="attention"?a.querySelectorAll(".bg-fail").forEach(t=>t.classList.add("pulse")):i==="done"?a.querySelectorAll(".bg-ok").forEach(t=>t.classList.add("pulse")):(a.classList.add("pulse"),setTimeout(()=>a.classList.remove("pulse"),1200)))})})}},N={template(){return`
      <section class="report" aria-labelledby="report-title">
        <div class="grid cols-2">
          <div class="card">
            <div class="kpi"><h3>Compliance Report</h3><span class="pill pill-warn">RISK</span></div>
            <p class="muted">Compliance rating for your submission.</p>
            <div class="list">
              <div class="item"><div>Missing: <b>BBBEE Certificate</b></div><a class="btn" href="#/workspace">Fix</a></div>
            </div>
            <div class="row" style="margin-top:12px">
              <a class="btn ok" id="btnWhatsappReport" href="#">Send via WhatsApp</a>
              <a class="btn ghost" href="#">Download ZIP Pack</a>
            </div>
          </div>
          <div class="card">
            <h3>Summary</h3>
            <div class="list">
              <div class="item"><div>Admin docs</div><span class="pill">6/8</span></div>
              <div class="item"><div>Technical</div><span class="pill">1/2</span></div>
              <div class="item"><div>Pricing</div><span class="pill">1/1</span></div>
            </div>
          </div>
        </div>
      </section>
    `},onMount(){document.getElementById("btnWhatsappReport")?.addEventListener("click",e=>{e.preventDefault();const s=(localStorage.getItem("waNumber")||"").replace(/\D/g,"");if(!s)return alert("Add a WhatsApp number in Settings first.");const n=encodeURIComponent("TenderPick: Your compliance report is ready. Status: RISK (demo).");window.open(`https://wa.me/${s}?text=${n}`,"_blank")})}},A={template(){return`
    <section class="settings">
      <div class="card">
        <h3>Notifications</h3>
        <div class="row">
          <label class="chip">
            <input type="checkbox" id="enableWA" ${v.settings.whatsappEnabled?"checked":""}/>
            WhatsApp Report
          </label>
          <label class="chip">
            <input type="checkbox" id="enableSMS" ${v.settings.smsEnabled?"checked":""}/>
            SMS Alerts
          </label>
        </div>

        <div class="hr"></div>

        <label class="muted" for="waNumber">WhatsApp Number</label>
        <div class="row">
          <input class="input" id="waNumber" placeholder="e.g. 069 848 8813" value="${v.settings.waNumber}" />
          <button class="btn" id="saveBtn">Save</button>
        </div>
        <div id="waError" class="error-msg" style="display:none;"></div>
      </div>
    </section>
  `},onMount(){const e=document.getElementById("waNumber"),s=document.getElementById("waError"),n=document.getElementById("saveBtn");function i(a){const t=a.replace(/\s+/g,"");return/^0\d{9}$/.test(t)}n?.addEventListener("click",()=>{const a=e.value.trim();if(!i(a)){e.classList.add("error"),s.textContent="Enter a valid 10-digit number starting with 0.",s.style.display="block";return}e.classList.remove("error"),s.style.display="none",localStorage.setItem("waNumber",a),v.settings.waNumber=a,v.settings.whatsappEnabled=document.getElementById("enableWA").checked,v.settings.smsEnabled=document.getElementById("enableSMS").checked,alert("Saved.")})}},P="/assets/database/open_tenders.json",y=12;function D(e){return e&&/RFQ/i.test(e)?"📄":"📑"}function F(e){return{Gauteng:"🏙️","Western Cape":"🗺️","Eastern Cape":"🌊","North West":"🌾",Limpopo:"🌿","KwaZulu-Natal":"🏖️","Free State":"🌻",Mpumalanga:"⛰️","Northern Cape":"🏜️",National:"🇿🇦"}[e]||"🗺️"}const M=e=>e&&typeof e=="object"&&!Array.isArray(e),T=e=>(e||"").replace(/[_\-]+/g," ").replace(/\s+/g," ").trim().replace(/\b\w/g,s=>s.toUpperCase());function w(e,s){if(!M(e)||Object.keys(e).length===0)return'<div class="muted small">No info.</div>';const n=Object.entries(e).map(([i,a])=>{if(a==null||a==="")return"";const t=s&&(s[i]||s[i.replace(/_/g," ")])||T(i),c=String(a).trim().replace(/\n/g,"<br>");return`<li class="kv-row"><span class="kv-k">${t}</span><span class="kv-v">${c}</span></li>`}).filter(Boolean).join("");return n?`<ul class="kv">${n}</ul>`:'<div class="muted small">No info.</div>'}function R(e,s=""){try{const n=new URL(e,location.href),i=n.searchParams.get("downloadedFileName")||n.searchParams.get("fileName")||"",a=n.pathname.split("/").pop()||"",t=decodeURIComponent(i||a||s),c=t.match(/\.([a-z0-9]{2,6})(?:$|\?)/i),l=(c?c[1]:"").toLowerCase();return{filename:t||s||"Document",ext:l,kind:E(l)}}catch{const n=(s||"").match(/\.([a-z0-9]{2,6})$/i),i=(n?n[1]:"").toLowerCase();return{filename:s||"Document",ext:i,kind:E(i)}}}function E(e){return e?["pdf"].includes(e)?"pdf":["doc","docx","rtf","odt"].includes(e)?"word":["xls","xlsx","csv","ods"].includes(e)?"sheet":["ppt","pptx","odp"].includes(e)?"slides":["zip","rar","7z"].includes(e)?"archive":["jpg","jpeg","png","gif","tif","tiff","bmp","webp"].includes(e)?"image":["txt","md","json","xml"].includes(e)?"text":"file":"file"}function q(e){switch(e){case"pdf":return"📄";case"word":return"📝";case"sheet":return"📊";case"slides":return"📈";case"archive":return"🗜️";case"image":return"🖼️";case"text":return"📃";default:return"📁"}}function W(e){return!Array.isArray(e)||e.length===0?'<div class="muted small">No documents.</div>':`<ul class="docs">${e.map(n=>{if(!n||!n.text&&!n.url)return"";const i=(n.text||n.url).trim(),a=(n.url||"#").trim(),t=R(a,i),c=q(t.kind),l=`<span class="doc-chip doc-${t.kind}">${t.ext?t.ext.toUpperCase():"FILE"}</span>`,d=`<button class="btn-link copy-doc" data-url="${encodeURIComponent(a)}" title="Copy link">Copy</button>`;return`
      <li class="doc-row">
        <div class="doc-main">
          <span class="doc-icon">${c}</span>
          <a class="doc-link" href="${a}" target="_blank" rel="noopener">${t.filename}</a>
          ${l}
        </div>
        <div class="doc-actions">${d}</div>
      </li>`}).filter(Boolean).join("")}</ul>`}function b(e,s,n=!1){return`
    <details class="sect" ${n?"open":""}>
      <summary><span class="chev" aria-hidden="true"></span>${e}</summary>
      <div class="sect-body">${s}</div>
    </details>`}function U(e){const s=e.category||"",n=e.province||"",i=e.buyerName||"",a=e.title||e.tenderNumber||"Tender",t=e.details||{},c=e.details_labels||null,l=e.enquiries||{},d=e.enquiries_labels||null,o=e.briefingSession||{},r=e.briefingSession_labels||null,p=e.tenderDocuments||e.documentLinks||[],m=w(t,c),u=w(l,d),g=w(o,r),h=W(p),f=[n?`${F(n)} ${n}`:"",i||""].filter(Boolean).join(" · ");return`
  <article class="tcard">
    <header class="tcard-head">
      <div class="tcard-title">
        <span class="cat">${D(s)}</span>
        <br/><br/>
        <p >${a}</p>
      </div>
      <div class="tcard-sub">
        ${f?`<span class="muted">${f}</span>`:""}
        <span class="spacer"></span>
        <span class="dates muted small">
          ${e.advertisedDate?`Posted ${e.advertisedDate}`:""}${e.advertisedDate&&e.closingDate?" · ":""}${e.closingDate?`Closes ${e.closingDate}`:""}
        </span>
      </div>
    </header>

    <div class="tcard-body">
      ${b("Details",m,!1)}
      ${b("Enquiries",u,!1)}
      ${b("Briefing Session",g,!1)}
      ${b("Tender Documents",h,!1)}
    </div>

    <footer class="tcard-foot">
      ${e.detailUrl?`<a class="btn ghost" href="${e.detailUrl}" target="_blank" rel="noopener">Detail</a>`:""}
      <a class="btn" href="#/workspace">Use</a>
    </footer>
  </article>`}document.addEventListener("click",e=>{const s=e.target.closest(".tcard .sect > summary");if(!s)return;const n=s.parentElement;n.parentElement.querySelectorAll(":scope > .sect").forEach(i=>{i!==n&&i.removeAttribute("open")})});function C(e,s,n){const i=e.length,a=Math.max(1,Math.ceil(i/n)),t=Math.min(Math.max(1,s),a),c=(t-1)*n,l=Math.min(c+n,i);return{slice:e.slice(c,l),total:i,pages:a,page:t,start:c+1,end:l}}function O(e,s,n=7){const i=[],a=(d,o)=>i.push({type:d,num:o});if(s<=n){for(let d=1;d<=s;d++)a("num",d);return i}const t=n-2;let c=Math.max(2,e-Math.floor(t/2)),l=Math.min(s-1,c+t-1);c=Math.max(2,Math.min(c,Math.max(2,l-t+1))),a("num",1),c>2&&a("ellipsis");for(let d=c;d<=l;d++)a("num",d);return l<s-1&&a("ellipsis"),a("num",s),i}function j({page:e,pages:s,total:n}){const i=e<=1?"disabled":"",a=e>=s?"disabled":"",t=O(e,s,7).map(c=>c.type==="ellipsis"?'<span class="pager-ellipsis">…</span>':`<button class="btn ghost pg-num ${c.num===e?"active":""}"
                   data-page="${c.num}" ${c.num===e?'aria-current="page"':""}>${c.num}</button>`).join("");return`
    <nav class="pager" role="navigation" aria-label="Pagination">
      <div class="pager-left">
        <span class="muted small">Page ${e} of ${s} · ${n} tenders</span>
      </div>
      <div class="pager-right">
        <button class="btn ghost pg-first" ${i} aria-label="First page">First</button>
        <button class="btn ghost pg-prev"  ${i} aria-label="Previous page">Prev</button>
        ${t}
        <button class="btn ghost pg-next"  ${a} aria-label="Next page">Next</button>
        <button class="btn ghost pg-last"  ${a} aria-label="Last page">Last</button>
        <select class="input pg-size" title="Page size">
          ${[12,15,24,50].map(c=>`<option value="${c}" ${c===y?"selected":""}>${c}/page</option>`).join("")}
        </select>
      </div>
    </nav>`}function S(e,s,n){const i=document.getElementById("tenderList"),a=document.getElementById("tenderPager"),{slice:t,total:c,pages:l,page:d}=C(e,s,n);return i.innerHTML=(t&&t.length?t.map(U).join(""):"")||'<div class="muted">No tenders match your filters.</div>',a.innerHTML=j({page:d,pages:l,total:c}),{page:d,pages:l,total:c}}function L(e){return Array.from(new Set(e.filter(Boolean))).sort((s,n)=>s.localeCompare(n))}const Q={template(){return`
      <section class="tenders">
        <div class="card">
          <div class="row between">
            <h3>Tenders</h3>
            <div class="row">
              <a class="chip" data-band="small" style="display:none"></a>
              <a class="chip" data-band="mid" style="display:none"></a>
              <a class="chip" data-band="big" style="display:none"></a>
            </div>
          </div>

          <div class="row" style="margin-top:10px; gap:8px; flex-wrap:wrap;">
            <input class="input" id="q" placeholder="Search title, buyer or number…" />
            <select class="input" id="sector">
              <option value="">All categories</option>
            </select>
            <select class="input" id="province">
              <option value="">All provinces</option>
            </select>
            <a class="btn ghost" id="btnReset">Reset</a>
          </div>

          <div class="hr"></div>
          <div class="list" id="tenderList"></div>
          <div id="tenderPager" style="margin-top:12px"></div>
        </div>
      </section>
    `},async onMount(){const e={q:document.getElementById("q"),sector:document.getElementById("sector"),province:document.getElementById("province"),reset:document.getElementById("btnReset"),list:document.getElementById("tenderList"),pager:document.getElementById("tenderPager")},s=()=>{const o=e.list?.closest(".card")||e.list||document.querySelector(".tenders"),r=o?o.getBoundingClientRect().top+window.pageYOffset-8:0;window.scrollTo({top:r,behavior:"smooth"})};let n=[];try{n=await(await fetch(P,{cache:"no-store"})).json()}catch(o){console.error("Failed to load tenders JSON:",o),S([],1,y);return}const i=L(n.map(o=>o.category||"")),a=L(n.map(o=>o.province||""));i.forEach(o=>{const r=document.createElement("option");r.value=o,r.textContent=o,e.sector.appendChild(r)}),a.forEach(o=>{const r=document.createElement("option");r.value=o,r.textContent=o,e.province.appendChild(r)});const t={page:1,pageSize:y,filtered:n},c=()=>{const o=(e.q.value||"").toLowerCase(),r=e.sector.value,p=e.province.value;return n.filter(u=>{const g=!o||u.title&&u.title.toLowerCase().includes(o)||u.buyerName&&u.buyerName.toLowerCase().includes(o)||u.tenderNumber&&String(u.tenderNumber).toLowerCase().includes(o),h=!r||u.category===r,f=!p||u.province===p;return g&&h&&f}).sort((u,g)=>String(u.closingDate||"").localeCompare(String(g.closingDate||"")))},l=(o={})=>{e.list.innerHTML=`
        <div class="skeleton skel-card"></div>
        <div class="skeleton skel-card"></div>
        <div class="skeleton skel-card"></div>
      `,o.resetPage&&(t.page=1),t.filtered=c(),setTimeout(()=>{const{page:r}=S(t.filtered,t.page,t.pageSize);t.page=r},150)},d=()=>l({resetPage:!0});["input","change"].forEach(o=>{e.q.addEventListener(o,d),e.sector.addEventListener(o,d),e.province.addEventListener(o,d)}),e.reset.addEventListener("click",()=>{e.q.value="",e.sector.value="",e.province.value="",t.page=1,t.pageSize=y,l({resetPage:!0}),s()}),e.pager.addEventListener("click",o=>{const r=o.target.closest(".pg-first"),p=o.target.closest(".pg-prev"),m=o.target.closest(".pg-next"),u=o.target.closest(".pg-last"),g=o.target.closest(".pg-num");if(!r&&!p&&!m&&!u&&!g)return;const{pages:h}=C(t.filtered,t.page,t.pageSize);if(r)t.page=1;else if(p)t.page=Math.max(1,t.page-1);else if(m)t.page=Math.min(h,t.page+1);else if(u)t.page=h;else if(g){const f=parseInt(g.getAttribute("data-page"),10);isNaN(f)||(t.page=Math.min(Math.max(1,f),h))}l(),s()}),e.pager.addEventListener("change",o=>{const r=o.target.closest(".pg-size");if(!r)return;const p=parseInt(r.value,10);!isNaN(p)&&p>0&&(t.pageSize=p,t.page=1,l(),s())}),document.addEventListener("click",o=>{const r=o.target.closest(".copy-doc");if(!r)return;const p=decodeURIComponent(r.getAttribute("data-url")||"");p&&navigator.clipboard?.writeText(p).then(()=>{r.textContent="Copied!",setTimeout(()=>r.textContent="Copy",1200)}).catch(()=>{const m=document.createElement("textarea");m.value=p,document.body.appendChild(m),m.select();try{document.execCommand("copy"),r.textContent="Copied!"}catch{}document.body.removeChild(m),setTimeout(()=>r.textContent="Copy",1200)})}),l({resetPage:!0})}},_={"#/landing":$,"#/workspace":x,"#/reports":N,"#/settings":A,"#/tenders":Q};function z(){const e=document.querySelector(".app"),s=document.getElementById("navToggle"),n=document.getElementById("navBackdrop"),i=document.getElementById("sidebar"),a=()=>e.classList.remove("nav-open"),t=()=>e.classList.toggle("nav-open");s?.addEventListener("click",t),n?.addEventListener("click",a),i?.addEventListener("click",c=>{c.target.closest("[data-route]")&&a()}),document.addEventListener("keydown",c=>c.key==="Escape"&&a())}window.addEventListener("DOMContentLoaded",()=>{B(_,"#/landing"),z()});
