(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function a(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(n){if(n.ep)return;n.ep=!0;const s=a(n);fetch(n.href,s)}})();function C(e,t="#/landing"){const a=document.getElementById("app"),i=()=>document.querySelectorAll("[data-route]");function n(){const s=location.hash||t,r=e[s]||e[t];a.innerHTML=r.template(),i().forEach(c=>c.classList.toggle("active",c.getAttribute("href")===s)),document.querySelector(".app")?.classList.remove("nav-open"),typeof r.onMount=="function"&&r.onMount()}window.addEventListener("hashchange",n),n()}const B={template(){return`
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
    `},onMount(){const e=()=>location.hash="#/workspace";document.getElementById("btnLogin")?.addEventListener("click",e),document.getElementById("btnTry")?.addEventListener("click",e),document.getElementById("btnStartFree")?.addEventListener("click",e),document.getElementById("btnChooseStarter")?.addEventListener("click",e),document.getElementById("btnDFY")?.addEventListener("click",()=>location.hash="#/settings")}},v={settings:{waNumber:localStorage.getItem("waNumber")||"",whatsappEnabled:!1,smsEnabled:!1},wsItems:[{key:"sbd4",label:"SBD 4 – Declaration of Interest",done:!0,note:"Avoid conflicts of interest"},{key:"sbd61",label:"SBD 6.1 – Preference Points Claim",done:!0,note:"BBBEE preference points"},{key:"tax",label:"Tax Clearance Certificate",done:!0,note:"Valid SARS PIN/certificate"},{key:"bbee",label:"BBBEE Certificate",done:!1,note:"Expires soon / missing"}]},I=e=>{const t=e.done?'<span class="pill pill-ok">Completed</span>':'<span class="pill pill-fail">Missing</span>',a=e.done?'<a class="btn ghost" href="#">Download</a>':`<a class="btn ghost" href="#">Template</a>
                             <button class="btn" data-mark="${e.key}">Upload</button>`;return`
    <div class="item ${e.done?"bg-ok":"bg-fail"}">
      <div><div><b>${e.label}</b></div><div class="muted">${e.note}</div></div>
      <div class="row">${a}${t}</div>
    </div>`},k=()=>Math.round(v.wsItems.filter(e=>e.done).length/v.wsItems.length*100),N={template(){return`
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
    `},onMount(){document.querySelectorAll("[data-mark]").forEach(t=>{t.addEventListener("click",()=>{const a=t.dataset.mark,i=v.wsItems.find(s=>s.key===a);i&&(i.done=!0);const n=location.hash;location.hash="",requestAnimationFrame(()=>location.hash=n)})}),document.getElementById("wsGenerate")?.addEventListener("click",()=>{alert("ZIP package generator – placeholder")});const e=document.querySelector(".filebox");e&&(["dragenter","dragover"].forEach(t=>e.addEventListener(t,a=>{a.preventDefault(),e.classList.add("is-dragover")})),["dragleave","drop"].forEach(t=>e.addEventListener(t,a=>{a.preventDefault(),e.classList.remove("is-dragover")}))),document.querySelectorAll(".kpi-chip").forEach(t=>{Number(t.dataset.count||"0")===0&&(t.style.display="none"),t.addEventListener("click",()=>{const i=t.dataset.kind,n=document.getElementById("wsChecklist");n&&(n.scrollIntoView({behavior:"smooth",block:"start"}),n.querySelectorAll(".item").forEach(s=>s.classList.remove("pulse")),i==="attention"?n.querySelectorAll(".bg-fail").forEach(s=>s.classList.add("pulse")):i==="done"?n.querySelectorAll(".bg-ok").forEach(s=>s.classList.add("pulse")):(n.classList.add("pulse"),setTimeout(()=>n.classList.remove("pulse"),1200)))})})}},A={template(){return`
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
    `},onMount(){document.getElementById("btnWhatsappReport")?.addEventListener("click",e=>{e.preventDefault();const t=(localStorage.getItem("waNumber")||"").replace(/\D/g,"");if(!t)return alert("Add a WhatsApp number in Settings first.");const a=encodeURIComponent("TenderPick: Your compliance report is ready. Status: RISK (demo).");window.open(`https://wa.me/${t}?text=${a}`,"_blank")})}},P={template(){return`
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
  `},onMount(){const e=document.getElementById("waNumber"),t=document.getElementById("waError"),a=document.getElementById("saveBtn");function i(n){const s=n.replace(/\s+/g,"");return/^0\d{9}$/.test(s)}a?.addEventListener("click",()=>{const n=e.value.trim();if(!i(n)){e.classList.add("error"),t.textContent="Enter a valid 10-digit number starting with 0.",t.style.display="block";return}e.classList.remove("error"),t.style.display="none",localStorage.setItem("waNumber",n),v.settings.waNumber=n,v.settings.whatsappEnabled=document.getElementById("enableWA").checked,v.settings.smsEnabled=document.getElementById("enableSMS").checked,alert("Saved.")})}},D="./assets/database/open_tenders.json",f=12;function F(e){return e&&/RFQ/i.test(e)?"📄":"📑"}function M(e){return{Gauteng:"🏙️","Western Cape":"🗺️","Eastern Cape":"🌊","North West":"🌾",Limpopo:"🌿","KwaZulu-Natal":"🏖️","Free State":"🌻",Mpumalanga:"⛰️","Northern Cape":"🏜️",National:"🇿🇦"}[e]||"🗺️"}const T=e=>e&&typeof e=="object"&&!Array.isArray(e),R=e=>(e||"").replace(/[_\-]+/g," ").replace(/\s+/g," ").trim().replace(/\b\w/g,t=>t.toUpperCase());function w(e,t){if(!T(e)||Object.keys(e).length===0)return'<div class="muted small">No info.</div>';const a=Object.entries(e).map(([i,n])=>{if(n==null||n==="")return"";const s=t&&(t[i]||t[i.replace(/_/g," ")])||R(i),r=String(n).trim().replace(/\n/g,"<br>");return`<li class="kv-row"><span class="kv-k">${s}</span><span class="kv-v">${r}</span></li>`}).filter(Boolean).join("");return a?`<ul class="kv">${a}</ul>`:'<div class="muted small">No info.</div>'}function q(e,t=""){try{const a=new URL(e,location.href),i=a.searchParams.get("downloadedFileName")||a.searchParams.get("fileName")||"",n=a.pathname.split("/").pop()||"",s=decodeURIComponent(i||n||t),r=s.match(/\.([a-z0-9]{2,6})(?:$|\?)/i),c=(r?r[1]:"").toLowerCase();return{filename:s||t||"Document",ext:c,kind:x(c)}}catch{const a=(t||"").match(/\.([a-z0-9]{2,6})$/i),i=(a?a[1]:"").toLowerCase();return{filename:t||"Document",ext:i,kind:x(i)}}}function x(e){return e?["pdf"].includes(e)?"pdf":["doc","docx","rtf","odt"].includes(e)?"word":["xls","xlsx","csv","ods"].includes(e)?"sheet":["ppt","pptx","odp"].includes(e)?"slides":["zip","rar","7z"].includes(e)?"archive":["jpg","jpeg","png","gif","tif","tiff","bmp","webp"].includes(e)?"image":["txt","md","json","xml"].includes(e)?"text":"file":"file"}function W(e){switch(e){case"pdf":return"📄";case"word":return"📝";case"sheet":return"📊";case"slides":return"📈";case"archive":return"🗜️";case"image":return"🖼️";case"text":return"📃";default:return"📁"}}function U(e){return!Array.isArray(e)||e.length===0?'<div class="muted small">No documents.</div>':`<ul class="docs">${e.map(a=>{if(!a||!a.text&&!a.url)return"";const i=(a.text||a.url).trim(),n=(a.url||"#").trim(),s=q(n,i),r=W(s.kind),c=`<span class="doc-chip doc-${s.kind}">${s.ext?s.ext.toUpperCase():"FILE"}</span>`,d=`<button class="btn-link copy-doc" data-url="${encodeURIComponent(n)}" title="Copy link">Copy</button>`;return`
      <li class="doc-row">
        <div class="doc-main">
          <span class="doc-icon">${r}</span>
          <a class="doc-link" href="${n}" target="_blank" rel="noopener">${s.filename}</a>
          ${c}
        </div>
        <div class="doc-actions">${d}</div>
      </li>`}).filter(Boolean).join("")}</ul>`}function y(e,t,a=!1){return`
    <details class="sect" ${a?"open":""}>
      <summary><span class="chev" aria-hidden="true"></span>${e}</summary>
      <div class="sect-body">${t}</div>
    </details>`}function O(e){const t=e.category||"",a=e.province||"",i=e.buyerName||"",n=e.title||e.tenderNumber||"Tender",s=e.details||{},r=e.details_labels||null,c=e.enquiries||{},d=e.enquiries_labels||null,o=e.briefingSession||{},l=e.briefingSession_labels||null,p=e.tenderDocuments||e.documentLinks||[],m=w(s,r),u=w(c,d),g=w(o,l),h=U(p),b=[a?`${M(a)} ${a}`:"",i||""].filter(Boolean).join(" · ");return`
  <article class="tcard">
    <header class="tcard-head">
      <div class="tcard-title">
        <span class="cat">${F(t)}</span>
        <br/><br/>
        <p >${n}</p>
      </div>
      <div class="tcard-sub">
        ${b?`<span class="muted">${b}</span>`:""}
        <span class="spacer"></span>
        <span class="dates muted small">
          ${e.advertisedDate?`Posted ${e.advertisedDate}`:""}${e.advertisedDate&&e.closingDate?" · ":""}${e.closingDate?`Closes ${e.closingDate}`:""}
        </span>
      </div>
    </header>

    <div class="tcard-body">
      ${y("Details",m,!1)}
      ${y("Enquiries",u,!1)}
      ${y("Briefing Session",g,!1)}
      ${y("Tender Documents",h,!1)}
    </div>

    <footer class="tcard-foot">
      ${e.detailUrl?`<a class="btn ghost" href="${e.detailUrl}" target="_blank" rel="noopener">Detail</a>`:""}
      <a class="btn" href="#/workspace">Use</a>
    </footer>
  </article>`}document.addEventListener("click",e=>{const t=e.target.closest(".tcard .sect > summary");if(!t)return;const a=t.parentElement;a.parentElement.querySelectorAll(":scope > .sect").forEach(i=>{i!==a&&i.removeAttribute("open")})});function L(e,t,a){const i=e.length,n=Math.max(1,Math.ceil(i/a)),s=Math.min(Math.max(1,t),n),r=(s-1)*a,c=Math.min(r+a,i);return{slice:e.slice(r,c),total:i,pages:n,page:s,start:r+1,end:c}}function j(e,t,a=7){const i=[],n=(d,o)=>i.push({type:d,num:o});if(t<=a){for(let d=1;d<=t;d++)n("num",d);return i}const s=a-2;let r=Math.max(2,e-Math.floor(s/2)),c=Math.min(t-1,r+s-1);r=Math.max(2,Math.min(r,Math.max(2,c-s+1))),n("num",1),r>2&&n("ellipsis");for(let d=r;d<=c;d++)n("num",d);return c<t-1&&n("ellipsis"),n("num",t),i}function z({page:e,pages:t,total:a}){const i=e<=1?"disabled":"",n=e>=t?"disabled":"",s=j(e,t,7).map(r=>r.type==="ellipsis"?'<span class="pager-ellipsis">…</span>':`<button class="btn ghost pg-num ${r.num===e?"active":""}"
                   data-page="${r.num}" ${r.num===e?'aria-current="page"':""}>${r.num}</button>`).join("");return`
    <nav class="pager" role="navigation" aria-label="Pagination">
      <div class="pager-left">
        <span class="muted small">Page ${e} of ${t} · ${a} tenders</span>
      </div>
      <div class="pager-right">
        <button class="btn ghost pg-first" ${i} aria-label="First page">First</button>
        <button class="btn ghost pg-prev"  ${i} aria-label="Previous page">Prev</button>
        ${s}
        <button class="btn ghost pg-next"  ${n} aria-label="Next page">Next</button>
        <button class="btn ghost pg-last"  ${n} aria-label="Last page">Last</button>
        <select class="input pg-size" title="Page size">
          ${[12,15,24,50].map(r=>`<option value="${r}" ${r===f?"selected":""}>${r}/page</option>`).join("")}
        </select>
      </div>
    </nav>`}function Q(){const e="background:linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 37%,#e5e7eb 63%);background-size:400% 100%;animation:sk-shimmer 1.4s ease infinite;-webkit-animation:sk-shimmer 1.4s ease infinite;border-radius:8px;",t=a=>`class="skeleton" style="${e}${a}"`;return`
    <article class="tcard skel-tcard" aria-hidden="true" style="border:1px solid #e5e7eb;border-radius:14px;background:#fff;padding:14px;display:grid;gap:10px;">
      <div style="display:flex;gap:8px;align-items:center;">
        <span ${t("width:18px;height:18px;border-radius:4px;")}></span>
        <span ${t("height:14px;flex:1;")}></span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span ${t("height:12px;width:35%;")}></span>
        <span style="flex:1;"></span>
        <span ${t("height:12px;width:20%;")}></span>
      </div>
      <div ${t("height:1px;")}></div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span ${t("height:14px;width:30%;")}></span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span ${t("height:12px;width:70%;")}></span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span ${t("height:18px;width:70px;border-radius:999px;")}></span>
        <span ${t("height:18px;width:70px;border-radius:999px;")}></span>
        <span ${t("height:18px;width:100px;border-radius:999px;")}></span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span ${t("height:32px;width:96px;border-radius:8px;")}></span>
        <span ${t("height:32px;width:80px;border-radius:8px;")}></span>
      </div>
    </article>
  `}function E(e,t){const a=Math.max(3,Math.min(t||f,12));e.list.innerHTML=Array.from({length:a},Q).join(""),e.pager.innerHTML=`
    <div class="pager">
      <div class="pager-left">
        <span class="skeleton skel-line" style="width:160px;"></span>
      </div>
      <div class="pager-right">
        <span class="skeleton skel-btn" style="width:72px;"></span>
        <span class="skeleton skel-btn" style="width:72px;"></span>
        <span class="skeleton skel-btn" style="width:160px;"></span>
      </div>
    </div>
  `}function S(e,t,a){const i=document.getElementById("tenderList"),n=document.getElementById("tenderPager"),{slice:s,total:r,pages:c,page:d}=L(e,t,a);return i.innerHTML=(s&&s.length?s.map(O).join(""):"")||'<div class="muted">No tenders match your filters.</div>',n.innerHTML=z({page:d,pages:c,total:r}),{page:d,pages:c,total:r}}function $(e){return Array.from(new Set(e.filter(Boolean))).sort((t,a)=>t.localeCompare(a))}function _(){const e=document.createElement("div");e.className="skeleton skel-line",document.body.appendChild(e);const t=getComputedStyle(e).animationName!=="none";if(document.body.removeChild(e),t)return;const a=`
    .skeleton{background:linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 37%,#e5e7eb 63%);background-size:400% 100%;animation:sk-shimmer 1.4s ease infinite;-webkit-animation:sk-shimmer 1.4s ease infinite;border-radius:8px}
    @keyframes sk-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
    @-webkit-keyframes sk-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
    .skel-line{height:14px}.skel-small{height:12px}.skel-chip{height:18px;width:70px;border-radius:999px}.skel-btn{height:32px;width:96px;border-radius:8px}
    .skel-tcard{border:1px solid #e5e7eb;border-radius:14px;background:#fff;padding:14px;display:grid;gap:10px}
  `,i=document.createElement("style");i.textContent=a,document.head.appendChild(i)}function H(e,t){for(;e&&e.nodeType===1;){if(e.matches(t))return e;e=e.parentElement}return null}const G={template(){return`
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
    `},async onMount(){_();const e={q:document.getElementById("q"),sector:document.getElementById("sector"),province:document.getElementById("province"),reset:document.getElementById("btnReset"),list:document.getElementById("tenderList"),pager:document.getElementById("tenderPager")};E(e,f);const t=()=>{const o=H(e.list,".card")||e.list||document.querySelector(".tenders"),l=o?o.getBoundingClientRect().top+window.pageYOffset-8:0;window.scrollTo({top:l,behavior:"smooth"})};let a=[];try{a=await(await fetch(D,{cache:"no-store"})).json()}catch(o){console.error("Failed to load tenders JSON:",o),S([],1,f);return}const i=$(a.map(o=>o.category||"")),n=$(a.map(o=>o.province||""));i.forEach(o=>{const l=document.createElement("option");l.value=o,l.textContent=o,e.sector.appendChild(l)}),n.forEach(o=>{const l=document.createElement("option");l.value=o,l.textContent=o,e.province.appendChild(l)});const s={page:1,pageSize:f,filtered:a},r=()=>{const o=(e.q.value||"").toLowerCase(),l=e.sector.value,p=e.province.value;return a.filter(u=>{const g=!o||u.title&&u.title.toLowerCase().includes(o)||u.buyerName&&u.buyerName.toLowerCase().includes(o)||u.tenderNumber&&String(u.tenderNumber).toLowerCase().includes(o),h=!l||u.category===l,b=!p||u.province===p;return g&&h&&b}).sort((u,g)=>String(u.closingDate||"").localeCompare(String(g.closingDate||"")))},c=(o={})=>{E(e,s.pageSize),o.resetPage&&(s.page=1),s.filtered=r(),setTimeout(()=>{const{page:l}=S(s.filtered,s.page,s.pageSize);s.page=l},150)},d=()=>c({resetPage:!0});["input","change"].forEach(o=>{e.q.addEventListener(o,d),e.sector.addEventListener(o,d),e.province.addEventListener(o,d)}),e.reset.addEventListener("click",()=>{e.q.value="",e.sector.value="",e.province.value="",s.page=1,s.pageSize=f,c({resetPage:!0}),t()}),e.pager.addEventListener("click",o=>{const l=o.target.closest(".pg-first"),p=o.target.closest(".pg-prev"),m=o.target.closest(".pg-next"),u=o.target.closest(".pg-last"),g=o.target.closest(".pg-num");if(!l&&!p&&!m&&!u&&!g)return;const{pages:h}=L(s.filtered,s.page,s.pageSize);if(l)s.page=1;else if(p)s.page=Math.max(1,s.page-1);else if(m)s.page=Math.min(h,s.page+1);else if(u)s.page=h;else if(g){const b=parseInt(g.getAttribute("data-page"),10);isNaN(b)||(s.page=Math.min(Math.max(1,b),h))}c(),t()}),e.pager.addEventListener("change",o=>{const l=o.target.closest(".pg-size");if(!l)return;const p=parseInt(l.value,10);!isNaN(p)&&p>0&&(s.pageSize=p,s.page=1,c(),t())}),document.addEventListener("click",o=>{const l=o.target.closest(".copy-doc");if(!l)return;const p=decodeURIComponent(l.getAttribute("data-url")||"");p&&navigator.clipboard?.writeText(p).then(()=>{l.textContent="Copied!",setTimeout(()=>l.textContent="Copy",1200)}).catch(()=>{const m=document.createElement("textarea");m.value=p,document.body.appendChild(m),m.select();try{document.execCommand("copy"),l.textContent="Copied!"}catch{}document.body.removeChild(m),setTimeout(()=>l.textContent="Copy",1200)})}),c({resetPage:!0})}},Y={"#/landing":B,"#/workspace":N,"#/reports":A,"#/settings":P,"#/tenders":G};function K(){const e=document.querySelector(".app"),t=document.getElementById("navToggle"),a=document.getElementById("navBackdrop"),i=document.getElementById("sidebar"),n=()=>e.classList.remove("nav-open"),s=()=>e.classList.toggle("nav-open");t?.addEventListener("click",s),a?.addEventListener("click",n),i?.addEventListener("click",r=>{r.target.closest("[data-route]")&&n()}),document.addEventListener("keydown",r=>r.key==="Escape"&&n())}window.addEventListener("DOMContentLoaded",()=>{C(Y,"#/landing"),K()});
