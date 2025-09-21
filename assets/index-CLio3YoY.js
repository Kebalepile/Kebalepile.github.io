(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))i(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const l of s.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&i(l)}).observe(document,{childList:!0,subtree:!0});function n(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(a){if(a.ep)return;a.ep=!0;const s=n(a);fetch(a.href,s)}})();function B(e,t="#/landing"){const n=document.getElementById("app"),i=()=>document.querySelectorAll("[data-route]");function a(){const s=location.hash||t,l=e[s]||e[t];n.innerHTML=l.template(),i().forEach(r=>r.classList.toggle("active",r.getAttribute("href")===s)),document.querySelector(".app")?.classList.remove("nav-open"),typeof l.onMount=="function"&&l.onMount()}window.addEventListener("hashchange",a),a()}const $={template(){return`
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
    `},onMount(){const e=()=>location.hash="#/workspace";document.getElementById("btnLogin")?.addEventListener("click",e),document.getElementById("btnTry")?.addEventListener("click",e),document.getElementById("btnStartFree")?.addEventListener("click",e),document.getElementById("btnChooseStarter")?.addEventListener("click",e),document.getElementById("btnDFY")?.addEventListener("click",()=>location.hash="#/settings")}},v={settings:{waNumber:localStorage.getItem("waNumber")||"",whatsappEnabled:!1,smsEnabled:!1},wsItems:[{key:"sbd4",label:"SBD 4 – Declaration of Interest",done:!0,note:"Avoid conflicts of interest"},{key:"sbd61",label:"SBD 6.1 – Preference Points Claim",done:!0,note:"BBBEE preference points"},{key:"tax",label:"Tax Clearance Certificate",done:!0,note:"Valid SARS PIN/certificate"},{key:"bbee",label:"BBBEE Certificate",done:!1,note:"Expires soon / missing"}]},I=e=>{const t=e.done?'<span class="pill pill-ok">Completed</span>':'<span class="pill pill-fail">Missing</span>',n=e.done?'<a class="btn ghost" href="#">Download</a>':`<a class="btn ghost" href="#">Template</a>
                             <button class="btn" data-mark="${e.key}">Upload</button>`;return`
    <div class="item ${e.done?"bg-ok":"bg-fail"}">
      <div><div><b>${e.label}</b></div><div class="muted">${e.note}</div></div>
      <div class="row">${n}${t}</div>
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
    `},onMount(){document.querySelectorAll("[data-mark]").forEach(t=>{t.addEventListener("click",()=>{const n=t.dataset.mark,i=v.wsItems.find(s=>s.key===n);i&&(i.done=!0);const a=location.hash;location.hash="",requestAnimationFrame(()=>location.hash=a)})}),document.getElementById("wsGenerate")?.addEventListener("click",()=>{alert("ZIP package generator – placeholder")});const e=document.querySelector(".filebox");e&&(["dragenter","dragover"].forEach(t=>e.addEventListener(t,n=>{n.preventDefault(),e.classList.add("is-dragover")})),["dragleave","drop"].forEach(t=>e.addEventListener(t,n=>{n.preventDefault(),e.classList.remove("is-dragover")}))),document.querySelectorAll(".kpi-chip").forEach(t=>{Number(t.dataset.count||"0")===0&&(t.style.display="none"),t.addEventListener("click",()=>{const i=t.dataset.kind,a=document.getElementById("wsChecklist");a&&(a.scrollIntoView({behavior:"smooth",block:"start"}),a.querySelectorAll(".item").forEach(s=>s.classList.remove("pulse")),i==="attention"?a.querySelectorAll(".bg-fail").forEach(s=>s.classList.add("pulse")):i==="done"?a.querySelectorAll(".bg-ok").forEach(s=>s.classList.add("pulse")):(a.classList.add("pulse"),setTimeout(()=>a.classList.remove("pulse"),1200)))})})}},A={template(){return`
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
    `},onMount(){document.getElementById("btnWhatsappReport")?.addEventListener("click",e=>{e.preventDefault();const t=(localStorage.getItem("waNumber")||"").replace(/\D/g,"");if(!t)return alert("Add a WhatsApp number in Settings first.");const n=encodeURIComponent("TenderPick: Your compliance report is ready. Status: RISK (demo).");window.open(`https://wa.me/${t}?text=${n}`,"_blank")})}},P={template(){return`
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
  `},onMount(){const e=document.getElementById("waNumber"),t=document.getElementById("waError"),n=document.getElementById("saveBtn");function i(a){const s=a.replace(/\s+/g,"");return/^0\d{9}$/.test(s)}n?.addEventListener("click",()=>{const a=e.value.trim();if(!i(a)){e.classList.add("error"),t.textContent="Enter a valid 10-digit number starting with 0.",t.style.display="block";return}e.classList.remove("error"),t.style.display="none",localStorage.setItem("waNumber",a),v.settings.waNumber=a,v.settings.whatsappEnabled=document.getElementById("enableWA").checked,v.settings.smsEnabled=document.getElementById("enableSMS").checked,alert("Saved.")})}},D="/assets/database/open_tenders.json",b=12;function F(e){return e&&/RFQ/i.test(e)?"📄":"📑"}function M(e){return{Gauteng:"🏙️","Western Cape":"🗺️","Eastern Cape":"🌊","North West":"🌾",Limpopo:"🌿","KwaZulu-Natal":"🏖️","Free State":"🌻",Mpumalanga:"⛰️","Northern Cape":"🏜️",National:"🇿🇦"}[e]||"🗺️"}const T=e=>e&&typeof e=="object"&&!Array.isArray(e),R=e=>(e||"").replace(/[_\-]+/g," ").replace(/\s+/g," ").trim().replace(/\b\w/g,t=>t.toUpperCase());function w(e,t){if(!T(e)||Object.keys(e).length===0)return'<div class="muted small">No info.</div>';const n=Object.entries(e).map(([i,a])=>{if(a==null||a==="")return"";const s=t&&(t[i]||t[i.replace(/_/g," ")])||R(i),l=String(a).trim().replace(/\n/g,"<br>");return`<li class="kv-row"><span class="kv-k">${s}</span><span class="kv-v">${l}</span></li>`}).filter(Boolean).join("");return n?`<ul class="kv">${n}</ul>`:'<div class="muted small">No info.</div>'}function q(e,t=""){try{const n=new URL(e,location.href),i=n.searchParams.get("downloadedFileName")||n.searchParams.get("fileName")||"",a=n.pathname.split("/").pop()||"",s=decodeURIComponent(i||a||t),l=s.match(/\.([a-z0-9]{2,6})(?:$|\?)/i),r=(l?l[1]:"").toLowerCase();return{filename:s||t||"Document",ext:r,kind:E(r)}}catch{const n=(t||"").match(/\.([a-z0-9]{2,6})$/i),i=(n?n[1]:"").toLowerCase();return{filename:t||"Document",ext:i,kind:E(i)}}}function E(e){return e?["pdf"].includes(e)?"pdf":["doc","docx","rtf","odt"].includes(e)?"word":["xls","xlsx","csv","ods"].includes(e)?"sheet":["ppt","pptx","odp"].includes(e)?"slides":["zip","rar","7z"].includes(e)?"archive":["jpg","jpeg","png","gif","tif","tiff","bmp","webp"].includes(e)?"image":["txt","md","json","xml"].includes(e)?"text":"file":"file"}function W(e){switch(e){case"pdf":return"📄";case"word":return"📝";case"sheet":return"📊";case"slides":return"📈";case"archive":return"🗜️";case"image":return"🖼️";case"text":return"📃";default:return"📁"}}function U(e){return!Array.isArray(e)||e.length===0?'<div class="muted small">No documents.</div>':`<ul class="docs">${e.map(n=>{if(!n||!n.text&&!n.url)return"";const i=(n.text||n.url).trim(),a=(n.url||"#").trim(),s=q(a,i),l=W(s.kind),r=`<span class="doc-chip doc-${s.kind}">${s.ext?s.ext.toUpperCase():"FILE"}</span>`,d=`<button class="btn-link copy-doc" data-url="${encodeURIComponent(a)}" title="Copy link">Copy</button>`;return`
      <li class="doc-row">
        <div class="doc-main">
          <span class="doc-icon">${l}</span>
          <a class="doc-link" href="${a}" target="_blank" rel="noopener">${s.filename}</a>
          ${r}
        </div>
        <div class="doc-actions">${d}</div>
      </li>`}).filter(Boolean).join("")}</ul>`}function y(e,t,n=!1){return`
    <details class="sect" ${n?"open":""}>
      <summary><span class="chev" aria-hidden="true"></span>${e}</summary>
      <div class="sect-body">${t}</div>
    </details>`}function O(e){const t=e.category||"",n=e.province||"",i=e.buyerName||"",a=e.title||e.tenderNumber||"Tender",s=e.details||{},l=e.details_labels||null,r=e.enquiries||{},d=e.enquiries_labels||null,c=e.briefingSession||{},o=e.briefingSession_labels||null,p=e.tenderDocuments||e.documentLinks||[],m=w(s,l),u=w(r,d),g=w(c,o),h=U(p),f=[n?`${M(n)} ${n}`:"",i||""].filter(Boolean).join(" · ");return`
  <article class="tcard">
    <header class="tcard-head">
      <div class="tcard-title">
        <span class="cat">${F(t)}</span>
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
      ${y("Details",m,!1)}
      ${y("Enquiries",u,!1)}
      ${y("Briefing Session",g,!1)}
      ${y("Tender Documents",h,!1)}
    </div>

    <footer class="tcard-foot">
      ${e.detailUrl?`<a class="btn ghost" href="${e.detailUrl}" target="_blank" rel="noopener">Detail</a>`:""}
      <a class="btn" href="#/workspace">Use</a>
    </footer>
  </article>`}document.addEventListener("click",e=>{const t=e.target.closest(".tcard .sect > summary");if(!t)return;const n=t.parentElement;n.parentElement.querySelectorAll(":scope > .sect").forEach(i=>{i!==n&&i.removeAttribute("open")})});function C(e,t,n){const i=e.length,a=Math.max(1,Math.ceil(i/n)),s=Math.min(Math.max(1,t),a),l=(s-1)*n,r=Math.min(l+n,i);return{slice:e.slice(l,r),total:i,pages:a,page:s,start:l+1,end:r}}function j(e,t,n=7){const i=[],a=(d,c)=>i.push({type:d,num:c});if(t<=n){for(let d=1;d<=t;d++)a("num",d);return i}const s=n-2;let l=Math.max(2,e-Math.floor(s/2)),r=Math.min(t-1,l+s-1);l=Math.max(2,Math.min(l,Math.max(2,r-s+1))),a("num",1),l>2&&a("ellipsis");for(let d=l;d<=r;d++)a("num",d);return r<t-1&&a("ellipsis"),a("num",t),i}function Q({page:e,pages:t,total:n}){const i=e<=1?"disabled":"",a=e>=t?"disabled":"",s=j(e,t,7).map(l=>l.type==="ellipsis"?'<span class="pager-ellipsis">…</span>':`<button class="btn ghost pg-num ${l.num===e?"active":""}"
                   data-page="${l.num}" ${l.num===e?'aria-current="page"':""}>${l.num}</button>`).join("");return`
    <nav class="pager" role="navigation" aria-label="Pagination">
      <div class="pager-left">
        <span class="muted small">Page ${e} of ${t} · ${n} tenders</span>
      </div>
      <div class="pager-right">
        <button class="btn ghost pg-first" ${i} aria-label="First page">First</button>
        <button class="btn ghost pg-prev"  ${i} aria-label="Previous page">Prev</button>
        ${s}
        <button class="btn ghost pg-next"  ${a} aria-label="Next page">Next</button>
        <button class="btn ghost pg-last"  ${a} aria-label="Last page">Last</button>
        <select class="input pg-size" title="Page size">
          ${[12,15,24,50].map(l=>`<option value="${l}" ${l===b?"selected":""}>${l}/page</option>`).join("")}
        </select>
      </div>
    </nav>`}function _(){return`
    <article class="tcard skel-tcard" aria-hidden="true">
      <div class="skel-row">
        <span class="skeleton skel-line" style="width:18px;height:18px;border-radius:4px;"></span>
        <span class="skeleton skel-line skel-grow"></span>
      </div>
      <div class="skel-row">
        <span class="skeleton skel-small" style="width:35%;"></span>
        <span class="skel-grow"></span>
        <span class="skeleton skel-small" style="width:20%;"></span>
      </div>
      <div class="skeleton" style="height:1px;"></div>
      <div class="skel-row">
        <span class="skeleton skel-line" style="width:30%;"></span>
      </div>
      <div class="skel-row">
        <span class="skeleton skel-small" style="width:70%;"></span>
      </div>
      <div class="skel-row">
        <span class="skeleton skel-chip"></span>
        <span class="skeleton skel-chip"></span>
        <span class="skeleton skel-chip" style="width:100px;"></span>
      </div>
      <div class="skel-row">
        <span class="skeleton skel-btn"></span>
        <span class="skeleton skel-btn" style="width:80px;"></span>
      </div>
    </article>
  `}function S(e,t){const n=Math.max(3,Math.min(t||b,12));e.list.innerHTML=Array.from({length:n},_).join(""),e.pager.innerHTML=`
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
  `}function L(e,t,n){const i=document.getElementById("tenderList"),a=document.getElementById("tenderPager"),{slice:s,total:l,pages:r,page:d}=C(e,t,n);return i.innerHTML=(s&&s.length?s.map(O).join(""):"")||'<div class="muted">No tenders match your filters.</div>',a.innerHTML=Q({page:d,pages:r,total:l}),{page:d,pages:r,total:l}}function x(e){return Array.from(new Set(e.filter(Boolean))).sort((t,n)=>t.localeCompare(n))}const z={template(){return`
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
    `},async onMount(){const e={q:document.getElementById("q"),sector:document.getElementById("sector"),province:document.getElementById("province"),reset:document.getElementById("btnReset"),list:document.getElementById("tenderList"),pager:document.getElementById("tenderPager")};S(e,b);const t=()=>{const c=e.list?.closest(".card")||e.list||document.querySelector(".tenders"),o=c?c.getBoundingClientRect().top+window.pageYOffset-8:0;window.scrollTo({top:o,behavior:"smooth"})};let n=[];try{n=await(await fetch(D,{cache:"no-store"})).json()}catch(c){console.error("Failed to load tenders JSON:",c),L([],1,b);return}const i=x(n.map(c=>c.category||"")),a=x(n.map(c=>c.province||""));i.forEach(c=>{const o=document.createElement("option");o.value=c,o.textContent=c,e.sector.appendChild(o)}),a.forEach(c=>{const o=document.createElement("option");o.value=c,o.textContent=c,e.province.appendChild(o)});const s={page:1,pageSize:b,filtered:n},l=()=>{const c=(e.q.value||"").toLowerCase(),o=e.sector.value,p=e.province.value;return n.filter(u=>{const g=!c||u.title&&u.title.toLowerCase().includes(c)||u.buyerName&&u.buyerName.toLowerCase().includes(c)||u.tenderNumber&&String(u.tenderNumber).toLowerCase().includes(c),h=!o||u.category===o,f=!p||u.province===p;return g&&h&&f}).sort((u,g)=>String(u.closingDate||"").localeCompare(String(g.closingDate||"")))},r=(c={})=>{S(e,s.pageSize),c.resetPage&&(s.page=1),s.filtered=l(),setTimeout(()=>{const{page:o}=L(s.filtered,s.page,s.pageSize);s.page=o},150)},d=()=>r({resetPage:!0});["input","change"].forEach(c=>{e.q.addEventListener(c,d),e.sector.addEventListener(c,d),e.province.addEventListener(c,d)}),e.reset.addEventListener("click",()=>{e.q.value="",e.sector.value="",e.province.value="",s.page=1,s.pageSize=b,r({resetPage:!0}),t()}),e.pager.addEventListener("click",c=>{const o=c.target.closest(".pg-first"),p=c.target.closest(".pg-prev"),m=c.target.closest(".pg-next"),u=c.target.closest(".pg-last"),g=c.target.closest(".pg-num");if(!o&&!p&&!m&&!u&&!g)return;const{pages:h}=C(s.filtered,s.page,s.pageSize);if(o)s.page=1;else if(p)s.page=Math.max(1,s.page-1);else if(m)s.page=Math.min(h,s.page+1);else if(u)s.page=h;else if(g){const f=parseInt(g.getAttribute("data-page"),10);isNaN(f)||(s.page=Math.min(Math.max(1,f),h))}r(),t()}),e.pager.addEventListener("change",c=>{const o=c.target.closest(".pg-size");if(!o)return;const p=parseInt(o.value,10);!isNaN(p)&&p>0&&(s.pageSize=p,s.page=1,r(),t())}),document.addEventListener("click",c=>{const o=c.target.closest(".copy-doc");if(!o)return;const p=decodeURIComponent(o.getAttribute("data-url")||"");p&&navigator.clipboard?.writeText(p).then(()=>{o.textContent="Copied!",setTimeout(()=>o.textContent="Copy",1200)}).catch(()=>{const m=document.createElement("textarea");m.value=p,document.body.appendChild(m),m.select();try{document.execCommand("copy"),o.textContent="Copied!"}catch{}document.body.removeChild(m),setTimeout(()=>o.textContent="Copy",1200)})}),r({resetPage:!0})}},H={"#/landing":$,"#/workspace":N,"#/reports":A,"#/settings":P,"#/tenders":z};function G(){const e=document.querySelector(".app"),t=document.getElementById("navToggle"),n=document.getElementById("navBackdrop"),i=document.getElementById("sidebar"),a=()=>e.classList.remove("nav-open"),s=()=>e.classList.toggle("nav-open");t?.addEventListener("click",s),n?.addEventListener("click",a),i?.addEventListener("click",l=>{l.target.closest("[data-route]")&&a()}),document.addEventListener("keydown",l=>l.key==="Escape"&&a())}window.addEventListener("DOMContentLoaded",()=>{B(H,"#/landing"),G()});
