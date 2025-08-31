(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))a(t);new MutationObserver(t=>{for(const i of t)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function n(t){const i={};return t.integrity&&(i.integrity=t.integrity),t.referrerPolicy&&(i.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?i.credentials="include":t.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(t){if(t.ep)return;t.ep=!0;const i=n(t);fetch(t.href,i)}})();function v(e,s="#/landing"){const n=document.getElementById("app"),a=()=>document.querySelectorAll("[data-route]");function t(){const i=location.hash||s,o=e[i]||e[s];n.innerHTML=o.template(),a().forEach(l=>l.classList.toggle("active",l.getAttribute("href")===i)),document.querySelector(".app")?.classList.remove("nav-open"),typeof o.onMount=="function"&&o.onMount()}window.addEventListener("hashchange",t),t()}const h={template(){return`
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
    `},onMount(){const e=()=>location.hash="#/workspace";document.getElementById("btnLogin")?.addEventListener("click",e),document.getElementById("btnTry")?.addEventListener("click",e),document.getElementById("btnStartFree")?.addEventListener("click",e),document.getElementById("btnChooseStarter")?.addEventListener("click",e),document.getElementById("btnDFY")?.addEventListener("click",()=>location.hash="#/settings")}},c={settings:{waNumber:localStorage.getItem("waNumber")||"",whatsappEnabled:!1,smsEnabled:!1},wsItems:[{key:"sbd4",label:"SBD 4 – Declaration of Interest",done:!0,note:"Avoid conflicts of interest"},{key:"sbd61",label:"SBD 6.1 – Preference Points Claim",done:!0,note:"BBBEE preference points"},{key:"tax",label:"Tax Clearance Certificate",done:!0,note:"Valid SARS PIN/certificate"},{key:"bbee",label:"BBBEE Certificate",done:!1,note:"Expires soon / missing"}]},g=e=>{const s=e.done?'<span class="pill pill-ok">Completed</span>':'<span class="pill pill-fail">Missing</span>',n=e.done?'<a class="btn ghost" href="#">Download</a>':`<a class="btn ghost" href="#">Template</a>
                             <button class="btn" data-mark="${e.key}">Upload</button>`;return`
    <div class="item ${e.done?"bg-ok":"bg-fail"}">
      <div><div><b>${e.label}</b></div><div class="muted">${e.note}</div></div>
      <div class="row">${n}${s}</div>
    </div>`},r=()=>Math.round(c.wsItems.filter(e=>e.done).length/c.wsItems.length*100),b={template(){return`
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
            <div class="progress"><div id="wsProgress" style="width:${r()}%"></div></div>
            <div class="muted small">${r()}% complete</div>
          </div>
        </div>

        <div class="grid cols-2" style="margin-top:16px">
          <div class="card">
            <h3>Document Checklist</h3>
            <div class="list" id="wsChecklist">${c.wsItems.map(g).join("")}</div>
            <div style="margin-top:12px">
              <button id="wsGenerate" class="btn" ${r()===100?"":"disabled"}>Generate Submission Package</button>
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
    `},onMount(){document.querySelectorAll("[data-mark]").forEach(s=>{s.addEventListener("click",()=>{const n=s.dataset.mark,a=c.wsItems.find(i=>i.key===n);a&&(a.done=!0);const t=location.hash;location.hash="",requestAnimationFrame(()=>location.hash=t)})}),document.getElementById("wsGenerate")?.addEventListener("click",()=>{alert("ZIP package generator – placeholder")});const e=document.querySelector(".filebox");e&&(["dragenter","dragover"].forEach(s=>e.addEventListener(s,n=>{n.preventDefault(),e.classList.add("is-dragover")})),["dragleave","drop"].forEach(s=>e.addEventListener(s,n=>{n.preventDefault(),e.classList.remove("is-dragover")}))),document.querySelectorAll(".kpi-chip").forEach(s=>{Number(s.dataset.count||"0")===0&&(s.style.display="none"),s.addEventListener("click",()=>{const a=s.dataset.kind,t=document.getElementById("wsChecklist");t&&(t.scrollIntoView({behavior:"smooth",block:"start"}),t.querySelectorAll(".item").forEach(i=>i.classList.remove("pulse")),a==="attention"?t.querySelectorAll(".bg-fail").forEach(i=>i.classList.add("pulse")):a==="done"?t.querySelectorAll(".bg-ok").forEach(i=>i.classList.add("pulse")):(t.classList.add("pulse"),setTimeout(()=>t.classList.remove("pulse"),1200)))})})}},f={template(){return`
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
    `},onMount(){document.getElementById("btnWhatsappReport")?.addEventListener("click",e=>{e.preventDefault();const s=(localStorage.getItem("waNumber")||"").replace(/\D/g,"");if(!s)return alert("Add a WhatsApp number in Settings first.");const n=encodeURIComponent("TenderPick: Your compliance report is ready. Status: RISK (demo).");window.open(`https://wa.me/${s}?text=${n}`,"_blank")})}},y={template(){return`
    <section class="settings">
      <div class="card">
        <h3>Notifications</h3>
        <div class="row">
          <label class="chip">
            <input type="checkbox" id="enableWA" ${c.settings.whatsappEnabled?"checked":""}/>
            WhatsApp Report
          </label>
          <label class="chip">
            <input type="checkbox" id="enableSMS" ${c.settings.smsEnabled?"checked":""}/>
            SMS Alerts
          </label>
        </div>

        <div class="hr"></div>

        <label class="muted" for="waNumber">WhatsApp Number</label>
        <div class="row">
          <input class="input" id="waNumber" placeholder="e.g. 069 848 8813" value="${c.settings.waNumber}" />
          <button class="btn" id="saveBtn">Save</button>
        </div>
        <div id="waError" class="error-msg" style="display:none;"></div>
      </div>
    </section>
  `},onMount(){const e=document.getElementById("waNumber"),s=document.getElementById("waError"),n=document.getElementById("saveBtn");function a(t){const i=t.replace(/\s+/g,"");return/^0\d{9}$/.test(i)}n?.addEventListener("click",()=>{const t=e.value.trim();if(!a(t)){e.classList.add("error"),s.textContent="Enter a valid 10-digit number starting with 0.",s.style.display="block";return}e.classList.remove("error"),s.style.display="none",localStorage.setItem("waNumber",t),c.settings.waNumber=t,c.settings.whatsappEnabled=document.getElementById("enableWA").checked,c.settings.smsEnabled=document.getElementById("enableSMS").checked,alert("Saved.")})}},p=[{id:"1",title:"RFQ: Cleaning Services – Clinic A",entity:"City of Joburg",province:"Gauteng",sector:"Cleaning",category:"RFQ",amount_band:"<R200k",closing_date:"2025-09-01",posted_date:"2025-08-20",source_url:"#"},{id:"2",title:"RFP: Network Upgrade – District Offices",entity:"Magalies Water",province:"North West",sector:"ICT",category:"RFP",amount_band:"R200k–R1m",closing_date:"2025-09-05",posted_date:"2025-08-22",source_url:"#"},{id:"3",title:"RFQ: Security Guarding – Depot",entity:"Rustenburg LM",province:"North West",sector:"Security",category:"RFQ",amount_band:"<R200k",closing_date:"2025-08-30",posted_date:"2025-08-21",source_url:"#"},{id:"4",title:"RFP: Water Pipeline Rehabilitation",entity:"City of Cape Town",province:"Western Cape",sector:"Construction",category:"RFP",amount_band:">R1m",closing_date:"2025-09-10",posted_date:"2025-08-19",source_url:"#"}];function k(e){return`<span class="pill ${e.includes(">")?"pill-fail":e.includes("R200k–R1m")?"pill-warn":"pill-ok"}">${e}</span>`}function w(e){return e==="RFQ"?"📄":"📑"}function E(e){return{Cleaning:"🧽",Security:"🛡️",ICT:"💻",Construction:"🛠️","Professional Services":"👔"}[e]||"🏷️"}function S(e){return{Gauteng:"🏙️","Western Cape":"🗺️","Eastern Cape":"🌊","North West":"🌾",Limpopo:"🌿","KwaZulu-Natal":"🏖️","Free State":"🌻",Mpumalanga:"⛰️","Northern Cape":"🏜️"}[e]||"🗺️"}function L(e){return`
  <div class="item">
    <div>
      <b>${w(e.category)} ${e.title}</b>
      <div class="muted">
        ${S(e.province)} ${e.entity} · ${e.province} · Closes ${e.closing_date}
      </div>
      <div class="muted small">
        Posted ${e.posted_date} · ${E(e.sector)} ${e.sector} · ${e.category}
      </div>
    </div>
    <div class="row">
      ${k(e.amount_band)}
      <a class="btn ghost" href="${e.source_url}" target="_blank" rel="noopener">Source</a>
      <a class="btn" href="#/workspace">Use</a>
    </div>
  </div>`}function u(e){const s=document.getElementById("tenderList");s.innerHTML=e.map(L).join("")||'<div class="muted">No tenders match your filters.</div>'}const C={template(){return`
      <section class="tenders">
        <div class="card">
          <div class="row between">
            <h3>Tenders</h3>
            <div class="row">
              <a class="chip" data-band="small">Small fish &lt; R200k</a>
              <a class="chip" data-band="mid">R200k–R1m</a>
              <a class="chip" data-band="big">Big fish &gt; R1m</a>
            </div>
          </div>
          <div class="row" style="margin-top:10px">
            <input class="input" id="q" placeholder="Search title or entity…" />
            <select class="input" id="sector">
              <option value="">All sectors</option>
              <option>Cleaning</option><option>Security</option><option>ICT</option><option>Construction</option><option>Professional Services</option>
            </select>
            <select class="input" id="province">
              <option value="">All provinces</option>
              <option>Gauteng</option><option>North West</option><option>Western Cape</option><option>Eastern Cape</option><option>Limpopo</option>
            </select>
            <select class="input" id="band">
              <option value="">Any amount</option>
              <option>&lt;R200k</option>
              <option>R200k–R1m</option>
              <option>&gt;R1m</option>
            </select>
            <a class="btn ghost" id="btnReset">Reset</a>
          </div>
          <div class="hr"></div>
          <div class="list" id="tenderList"></div>
        </div>
      </section>
    `},onMount(){const e={q:document.getElementById("q"),sector:document.getElementById("sector"),province:document.getElementById("province"),band:document.getElementById("band"),reset:document.getElementById("btnReset")},s=()=>{const a=(e.q.value||"").toLowerCase(),t=e.sector.value,i=e.province.value,o=e.band.value,l=p.filter(d=>(!a||d.title.toLowerCase().includes(a)||d.entity.toLowerCase().includes(a))&&(!t||d.sector===t)&&(!i||d.province===i)&&(!o||d.amount_band===o)).sort((d,m)=>d.closing_date.localeCompare(m.closing_date));u(l)};["input","change"].forEach(a=>{e.q.addEventListener(a,s),e.sector.addEventListener(a,s),e.province.addEventListener(a,s),e.band.addEventListener(a,s)}),document.querySelectorAll("[data-band]").forEach(a=>{a.addEventListener("click",()=>{const t=a.getAttribute("data-band");e.band.value=t==="small"?"<R200k":t==="mid"?"R200k–R1m":">R1m",s()})});const n=document.querySelectorAll("[data-band]");n.forEach(a=>{a.addEventListener("click",()=>{n.forEach(t=>t.classList.remove("active")),a.classList.add("active")})}),e.reset.addEventListener("click",()=>{e.q.value="",e.sector.value="",e.province.value="",e.band.value="",u(p)}),u(p)}},R={"#/landing":h,"#/workspace":b,"#/reports":f,"#/settings":y,"#/tenders":C};function B(){const e=document.querySelector(".app"),s=document.getElementById("navToggle"),n=document.getElementById("navBackdrop"),a=document.getElementById("sidebar"),t=()=>e.classList.remove("nav-open"),i=()=>e.classList.toggle("nav-open");s?.addEventListener("click",i),n?.addEventListener("click",t),a?.addEventListener("click",o=>{o.target.closest("[data-route]")&&t()}),document.addEventListener("keydown",o=>o.key==="Escape"&&t())}window.addEventListener("DOMContentLoaded",()=>{v(R,"#/landing"),B()});
