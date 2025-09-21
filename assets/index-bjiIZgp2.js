(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))i(t);new MutationObserver(t=>{for(const n of t)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function a(t){const n={};return t.integrity&&(n.integrity=t.integrity),t.referrerPolicy&&(n.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?n.credentials="include":t.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(t){if(t.ep)return;t.ep=!0;const n=a(t);fetch(t.href,n)}})();function B(e,s="#/landing"){const a=document.getElementById("app"),i=()=>document.querySelectorAll("[data-route]");function t(){const n=location.hash||s,o=e[n]||e[s];a.innerHTML=o.template(),i().forEach(l=>l.classList.toggle("active",l.getAttribute("href")===n)),document.querySelector(".app")?.classList.remove("nav-open"),typeof o.onMount=="function"&&o.onMount()}window.addEventListener("hashchange",t),t()}const $={template(){return`
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
    `},onMount(){const e=()=>location.hash="#/workspace";document.getElementById("btnLogin")?.addEventListener("click",e),document.getElementById("btnTry")?.addEventListener("click",e),document.getElementById("btnStartFree")?.addEventListener("click",e),document.getElementById("btnChooseStarter")?.addEventListener("click",e),document.getElementById("btnDFY")?.addEventListener("click",()=>location.hash="#/settings")}},m={settings:{waNumber:localStorage.getItem("waNumber")||"",whatsappEnabled:!1,smsEnabled:!1},wsItems:[{key:"sbd4",label:"SBD 4 – Declaration of Interest",done:!0,note:"Avoid conflicts of interest"},{key:"sbd61",label:"SBD 6.1 – Preference Points Claim",done:!0,note:"BBBEE preference points"},{key:"tax",label:"Tax Clearance Certificate",done:!0,note:"Valid SARS PIN/certificate"},{key:"bbee",label:"BBBEE Certificate",done:!1,note:"Expires soon / missing"}]},I=e=>{const s=e.done?'<span class="pill pill-ok">Completed</span>':'<span class="pill pill-fail">Missing</span>',a=e.done?'<a class="btn ghost" href="#">Download</a>':`<a class="btn ghost" href="#">Template</a>
                             <button class="btn" data-mark="${e.key}">Upload</button>`;return`
    <div class="item ${e.done?"bg-ok":"bg-fail"}">
      <div><div><b>${e.label}</b></div><div class="muted">${e.note}</div></div>
      <div class="row">${a}${s}</div>
    </div>`},y=()=>Math.round(m.wsItems.filter(e=>e.done).length/m.wsItems.length*100),x={template(){return`
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
            <div class="progress"><div id="wsProgress" style="width:${y()}%"></div></div>
            <div class="muted small">${y()}% complete</div>
          </div>
        </div>

        <div class="grid cols-2" style="margin-top:16px">
          <div class="card">
            <h3>Document Checklist</h3>
            <div class="list" id="wsChecklist">${m.wsItems.map(I).join("")}</div>
            <div style="margin-top:12px">
              <button id="wsGenerate" class="btn" ${y()===100?"":"disabled"}>Generate Submission Package</button>
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
    `},onMount(){document.querySelectorAll("[data-mark]").forEach(s=>{s.addEventListener("click",()=>{const a=s.dataset.mark,i=m.wsItems.find(n=>n.key===a);i&&(i.done=!0);const t=location.hash;location.hash="",requestAnimationFrame(()=>location.hash=t)})}),document.getElementById("wsGenerate")?.addEventListener("click",()=>{alert("ZIP package generator – placeholder")});const e=document.querySelector(".filebox");e&&(["dragenter","dragover"].forEach(s=>e.addEventListener(s,a=>{a.preventDefault(),e.classList.add("is-dragover")})),["dragleave","drop"].forEach(s=>e.addEventListener(s,a=>{a.preventDefault(),e.classList.remove("is-dragover")}))),document.querySelectorAll(".kpi-chip").forEach(s=>{Number(s.dataset.count||"0")===0&&(s.style.display="none"),s.addEventListener("click",()=>{const i=s.dataset.kind,t=document.getElementById("wsChecklist");t&&(t.scrollIntoView({behavior:"smooth",block:"start"}),t.querySelectorAll(".item").forEach(n=>n.classList.remove("pulse")),i==="attention"?t.querySelectorAll(".bg-fail").forEach(n=>n.classList.add("pulse")):i==="done"?t.querySelectorAll(".bg-ok").forEach(n=>n.classList.add("pulse")):(t.classList.add("pulse"),setTimeout(()=>t.classList.remove("pulse"),1200)))})})}},N={template(){return`
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
    `},onMount(){document.getElementById("btnWhatsappReport")?.addEventListener("click",e=>{e.preventDefault();const s=(localStorage.getItem("waNumber")||"").replace(/\D/g,"");if(!s)return alert("Add a WhatsApp number in Settings first.");const a=encodeURIComponent("TenderPick: Your compliance report is ready. Status: RISK (demo).");window.open(`https://wa.me/${s}?text=${a}`,"_blank")})}},A={template(){return`
    <section class="settings">
      <div class="card">
        <h3>Notifications</h3>
        <div class="row">
          <label class="chip">
            <input type="checkbox" id="enableWA" ${m.settings.whatsappEnabled?"checked":""}/>
            WhatsApp Report
          </label>
          <label class="chip">
            <input type="checkbox" id="enableSMS" ${m.settings.smsEnabled?"checked":""}/>
            SMS Alerts
          </label>
        </div>

        <div class="hr"></div>

        <label class="muted" for="waNumber">WhatsApp Number</label>
        <div class="row">
          <input class="input" id="waNumber" placeholder="e.g. 069 848 8813" value="${m.settings.waNumber}" />
          <button class="btn" id="saveBtn">Save</button>
        </div>
        <div id="waError" class="error-msg" style="display:none;"></div>
      </div>
    </section>
  `},onMount(){const e=document.getElementById("waNumber"),s=document.getElementById("waError"),a=document.getElementById("saveBtn");function i(t){const n=t.replace(/\s+/g,"");return/^0\d{9}$/.test(n)}a?.addEventListener("click",()=>{const t=e.value.trim();if(!i(t)){e.classList.add("error"),s.textContent="Enter a valid 10-digit number starting with 0.",s.style.display="block";return}e.classList.remove("error"),s.style.display="none",localStorage.setItem("waNumber",t),m.settings.waNumber=t,m.settings.whatsappEnabled=document.getElementById("enableWA").checked,m.settings.smsEnabled=document.getElementById("enableSMS").checked,alert("Saved.")})}},D="/assets/database/open_tenders.json",h=12;function P(e){return e&&/RFQ/i.test(e)?"📄":"📑"}function F(e){return{Gauteng:"🏙️","Western Cape":"🗺️","Eastern Cape":"🌊","North West":"🌾",Limpopo:"🌿","KwaZulu-Natal":"🏖️","Free State":"🌻",Mpumalanga:"⛰️","Northern Cape":"🏜️",National:"🇿🇦"}[e]||"🗺️"}const R=e=>e&&typeof e=="object"&&!Array.isArray(e),T=e=>(e||"").replace(/[_\-]+/g," ").replace(/\s+/g," ").trim().replace(/\b\w/g,s=>s.toUpperCase());function w(e,s){if(!R(e)||Object.keys(e).length===0)return'<div class="muted small">No info.</div>';const a=Object.entries(e).map(([i,t])=>{if(t==null||t==="")return"";const n=s&&(s[i]||s[i.replace(/_/g," ")])||T(i),o=String(t).trim().replace(/\n/g,"<br>");return`<li class="kv-row"><span class="kv-k">${n}</span><span class="kv-v">${o}</span></li>`}).filter(Boolean).join("");return a?`<ul class="kv">${a}</ul>`:'<div class="muted small">No info.</div>'}function q(e,s=""){try{const a=new URL(e,location.href),i=a.searchParams.get("downloadedFileName")||a.searchParams.get("fileName")||"",t=a.pathname.split("/").pop()||"",n=decodeURIComponent(i||t||s),o=n.match(/\.([a-z0-9]{2,6})(?:$|\?)/i),l=(o?o[1]:"").toLowerCase();return{filename:n||s||"Document",ext:l,kind:E(l)}}catch{const a=(s||"").match(/\.([a-z0-9]{2,6})$/i),i=(a?a[1]:"").toLowerCase();return{filename:s||"Document",ext:i,kind:E(i)}}}function E(e){return e?["pdf"].includes(e)?"pdf":["doc","docx","rtf","odt"].includes(e)?"word":["xls","xlsx","csv","ods"].includes(e)?"sheet":["ppt","pptx","odp"].includes(e)?"slides":["zip","rar","7z"].includes(e)?"archive":["jpg","jpeg","png","gif","tif","tiff","bmp","webp"].includes(e)?"image":["txt","md","json","xml"].includes(e)?"text":"file":"file"}function M(e){switch(e){case"pdf":return"📄";case"word":return"📝";case"sheet":return"📊";case"slides":return"📈";case"archive":return"🗜️";case"image":return"🖼️";case"text":return"📃";default:return"📁"}}function W(e){return!Array.isArray(e)||e.length===0?'<div class="muted small">No documents.</div>':`<ul class="docs">${e.map(a=>{if(!a||!a.text&&!a.url)return"";const i=(a.text||a.url).trim(),t=(a.url||"#").trim(),n=q(t,i),o=M(n.kind),l=`<span class="doc-chip doc-${n.kind}">${n.ext?n.ext.toUpperCase():"FILE"}</span>`,c=`<button class="btn-link copy-doc" data-url="${encodeURIComponent(t)}" title="Copy link">Copy</button>`;return`
      <li class="doc-row">
        <div class="doc-main">
          <span class="doc-icon">${o}</span>
          <a class="doc-link" href="${t}" target="_blank" rel="noopener">${n.filename}</a>
          ${l}
        </div>
        <div class="doc-actions">${c}</div>
      </li>`}).filter(Boolean).join("")}</ul>`}function g(e,s,a=!1){return`
    <details class="sect" ${a?"open":""}>
      <summary><span class="chev" aria-hidden="true"></span>${e}</summary>
      <div class="sect-body">${s}</div>
    </details>`}function U(e){const s=e.category||"",a=e.province||"",i=e.buyerName||"",t=e.title||e.tenderNumber||"Tender",n=e.details||{},o=e.details_labels||null,l=e.enquiries||{},c=e.enquiries_labels||null,r=e.briefingSession||{},d=e.briefingSession_labels||null,u=e.tenderDocuments||e.documentLinks||[],p=w(n,o),v=w(l,c),f=w(r,d),b=W(u),k=[a?`${F(a)} ${a}`:"",i||""].filter(Boolean).join(" · ");return`
  <article class="tcard">
    <header class="tcard-head">
      <div class="tcard-title">
        <span class="cat">${P(s)}</span>
        <b class="title">${t}</b>
      </div>
      <div class="tcard-sub">
        ${k?`<span class="muted">${k}</span>`:""}
        <span class="spacer"></span>
        <span class="dates muted small">
          ${e.advertisedDate?`Posted ${e.advertisedDate}`:""}${e.advertisedDate&&e.closingDate?" · ":""}${e.closingDate?`Closes ${e.closingDate}`:""}
        </span>
      </div>
    </header>

    <div class="tcard-body">
      ${g("Details",p,!1)}
      ${g("Enquiries",v,!1)}
      ${g("Briefing Session",f,!1)}
      ${g("Tender Documents",b,!1)}
    </div>

    <footer class="tcard-foot">
      ${e.detailUrl?`<a class="btn ghost" href="${e.detailUrl}" target="_blank" rel="noopener">Detail</a>`:""}
      <a class="btn" href="#/workspace">Use</a>
    </footer>
  </article>`}document.addEventListener("click",e=>{const s=e.target.closest(".tcard .sect > summary");if(!s)return;const a=s.parentElement;a.parentElement.querySelectorAll(":scope > .sect").forEach(i=>{i!==a&&i.removeAttribute("open")})});function C(e,s,a){const i=e.length,t=Math.max(1,Math.ceil(i/a)),n=Math.min(Math.max(1,s),t),o=(n-1)*a,l=Math.min(o+a,i);return{slice:e.slice(o,l),total:i,pages:t,page:n,start:o+1,end:l}}function O({page:e,pages:s,total:a}){const i=e<=1?"disabled":"",t=e>=s?"disabled":"";return`
    <div class="pager">
      <div class="pager-left">
        <span class="muted small">Page ${e} of ${s} · ${a} tenders</span>
      </div>
      <div class="pager-right">
        <button class="btn ghost pg-first" ${i}>First</button>
        <button class="btn ghost pg-prev" ${i}>Prev</button>
        <button class="btn ghost pg-next" ${t}>Next</button>
        <button class="btn ghost pg-last" ${t}>Last</button>
        <select class="input pg-size" title="Page size">
          ${[12,15,24,50].map(n=>`<option value="${n}" ${n===h?"selected":""}>${n}/page</option>`).join("")}
        </select>
      </div>
    </div>`}function S(e,s,a){const i=document.getElementById("tenderList"),t=document.getElementById("tenderPager"),{slice:n,total:o,pages:l,page:c}=C(e,s,a);return i.innerHTML=(n&&n.length?n.map(U).join(""):"")||'<div class="muted">No tenders match your filters.</div>',t.innerHTML=O({page:c,pages:l,total:o}),{page:c,pages:l,total:o}}function L(e){return Array.from(new Set(e.filter(Boolean))).sort((s,a)=>s.localeCompare(a))}const j={template(){return`
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
    `},async onMount(){const e={q:document.getElementById("q"),sector:document.getElementById("sector"),province:document.getElementById("province"),reset:document.getElementById("btnReset"),list:document.getElementById("tenderList"),pager:document.getElementById("tenderPager")};let s=[];try{s=await(await fetch(D,{cache:"no-store"})).json()}catch(c){console.error("Failed to load tenders JSON:",c),S([],1,h);return}const a=L(s.map(c=>c.category||"")),i=L(s.map(c=>c.province||""));a.forEach(c=>{const r=document.createElement("option");r.value=c,r.textContent=c,e.sector.appendChild(r)}),i.forEach(c=>{const r=document.createElement("option");r.value=c,r.textContent=c,e.province.appendChild(r)});const t={page:1,pageSize:h,filtered:s},n=()=>{const c=(e.q.value||"").toLowerCase(),r=e.sector.value,d=e.province.value;return s.filter(p=>{const v=!c||p.title&&p.title.toLowerCase().includes(c)||p.buyerName&&p.buyerName.toLowerCase().includes(c)||p.tenderNumber&&String(p.tenderNumber).toLowerCase().includes(c),f=!r||p.category===r,b=!d||p.province===d;return v&&f&&b}).sort((p,v)=>String(p.closingDate||"").localeCompare(String(v.closingDate||"")))},o=(c={})=>{c.resetPage&&(t.page=1),t.filtered=n();const{page:r}=S(t.filtered,t.page,t.pageSize);t.page=r},l=()=>o({resetPage:!0});["input","change"].forEach(c=>{e.q.addEventListener(c,l),e.sector.addEventListener(c,l),e.province.addEventListener(c,l)}),e.reset.addEventListener("click",()=>{e.q.value="",e.sector.value="",e.province.value="",t.page=1,t.pageSize=h,o({resetPage:!0})}),e.pager.addEventListener("click",c=>{const r=c.target.closest(".pg-first"),d=c.target.closest(".pg-prev"),u=c.target.closest(".pg-next"),p=c.target.closest(".pg-last");if(!r&&!d&&!u&&!p)return;const{pages:v}=C(t.filtered,t.page,t.pageSize);r&&(t.page=1),d&&(t.page=Math.max(1,t.page-1)),u&&(t.page=Math.min(v,t.page+1)),p&&(t.page=v),o()}),e.pager.addEventListener("change",c=>{const r=c.target.closest(".pg-size");if(!r)return;const d=parseInt(r.value,10);!isNaN(d)&&d>0&&(t.pageSize=d,t.page=1,o())}),document.addEventListener("click",c=>{const r=c.target.closest(".copy-doc");if(!r)return;const d=decodeURIComponent(r.getAttribute("data-url")||"");d&&navigator.clipboard?.writeText(d).then(()=>{r.textContent="Copied!",setTimeout(()=>r.textContent="Copy",1200)}).catch(()=>{const u=document.createElement("textarea");u.value=d,document.body.appendChild(u),u.select();try{document.execCommand("copy"),r.textContent="Copied!"}catch{}document.body.removeChild(u),setTimeout(()=>r.textContent="Copy",1200)})}),o({resetPage:!0})}},Q={"#/landing":$,"#/workspace":x,"#/reports":N,"#/settings":A,"#/tenders":j};function _(){const e=document.querySelector(".app"),s=document.getElementById("navToggle"),a=document.getElementById("navBackdrop"),i=document.getElementById("sidebar"),t=()=>e.classList.remove("nav-open"),n=()=>e.classList.toggle("nav-open");s?.addEventListener("click",n),a?.addEventListener("click",t),i?.addEventListener("click",o=>{o.target.closest("[data-route]")&&t()}),document.addEventListener("keydown",o=>o.key==="Escape"&&t())}window.addEventListener("DOMContentLoaded",()=>{B(Q,"#/landing"),_()});
