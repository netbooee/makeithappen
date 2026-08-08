/* ============ Shared section partials for the Project Detail IA study ============ */
/* Each function returns an HTML string. Both layout options compose these same parts,
   so the only difference between Option A and Option B is WHERE things sit. */

/* Path data lifted verbatim from the app's icons.jsx (Lucide set).
   trash / dl / ext / doc have no equivalent in icons.jsx yet — canonical Lucide
   trash-2, download, external-link and file-text, to be added to that set. */
const L = (...d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d.map(x => x[0] === '@' ? x.slice(1) : '<path d="' + x + '"/>').join('') + '</svg>';
const ICO = {
  chev: L('m9 18 6-6-6-6'),
  cal: L('M8 2v4', 'M16 2v4', '@<rect x="3" y="4" width="18" height="18" rx="2"/>', 'M3 10h18'),
  check: L('M20 6 9 17l-5-5'),
  checkc: L('M21.801 10A10 10 0 1 1 17 3.335', 'm9 11 3 3L22 4'),
  user: L('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', '@<circle cx="12" cy="7" r="4"/>'),
  plus: L('M5 12h14', 'M12 5v14'),
  edit: L('M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z'),
  trash: L('M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'),
  dl: L('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'),
  ext: L('M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'),
  copy: L('@<rect x="8" y="8" width="14" height="14" rx="2"/>', 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'),
  spark: L('M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z'),
  flag: L('M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'),
  doc: L('M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v5h5', 'M9 13h6', 'M9 17h4'),
  clock: L('@<circle cx="12" cy="12" r="10"/>', 'M12 6v6l4 2'),
  link: L('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'),
};
const ic = (n, s) => `<span class="ic" style="width:${s || 14}px;height:${s || 14}px">${ICO[n]}</span>`;

/* ---------- data lifted from the live page ---------- */
const MS = [
  { id: 'm1', t: 'Evaluations and Demos', range: 'May 1, 2026 →', due: 'Jul 31', dueFlag: true, status: 'active', tasks: [
    { t: 'Partner demo for Intapp Time', next: true, tag: 'Scheduled', tagK: 'hold', due: 'Aug 20', who: 'TM' },
    { t: 'Intapp Time Demo BSG', done: true, tag: 'Completed', tagK: 'next', due: 'May 15', who: 'TM' },
    { t: 'Define Attorney Working Group', done: true, tag: 'Completed', tagK: 'next', due: 'Jun 29', who: 'SG' },
    { t: 'Intapp Billstream BSG', done: true, tag: 'Completed', tagK: 'next', due: 'Jul 14', who: 'TM' } ] },
  { id: 'm2', t: 'RFP Timeline', range: 'Jun 22, 2026 →', due: 'Jul 31', status: 'complete', tasks: [
    { t: 'Draft RFP', done: true, tag: 'Completed', tagK: 'next', due: 'Apr 30', who: 'TM' },
    { t: 'Create Scoring Method', done: true, tag: 'Completed', tagK: 'next', due: 'Apr 30', who: 'TM' },
    { t: 'Intapp (Sent)', done: true, tag: 'Completed', tagK: 'next', due: 'Jun 30', who: 'TM' },
    { t: 'Aderant (Sent)', done: true, tag: 'Completed', tagK: 'next', due: 'Jun 30', who: 'TM' },
    { t: 'Laural (Sent)', done: true, tag: 'Completed', tagK: 'next', due: 'Jun 30', who: 'TM' },
    { t: 'Create pricing comparison sheet.', done: true, tag: 'Completed', tagK: 'next', due: 'Jul 13', who: 'TM' },
    { t: 'ADERANT RFP Due [Late]', wait: true, tag: 'Was Very Late', tagK: 'wait', due: 'Jul 24', who: 'TM' } ], more: 5 },
  { id: 'm3', t: 'Discovery & Due Diligence', range: 'Mar 1, 2026 →', due: 'Jul 31', status: 'complete', tasks: [
    { t: 'Validate with 2026 ILTA Survey Results when available', due: 'Aug 14', who: 'TM' },
    { t: 'Review 2025 ILTA Survey Results', done: true, tag: 'Completed', tagK: 'next', who: 'TM' },
    { t: 'Perform Market Study', done: true, tag: 'Completed', tagK: 'next', who: 'TM' } ] },
  { id: 'm4', t: 'Negotiation & Contract', range: '', due: 'No date', status: 'active', tasks: [
    { t: 'Reach out to Intapp for a formal pricing quote.', who: 'TM' } ] },
];
const TEAM = [['SG','Stephanie Godfrey','CFO','#4F6BED'],['MN','Maureen Naughton','CIO','#E5484D'],['TM','Tony Martinez','PMO','#7C5CFC'],['CS','Corey Schneps','Revenue','#10B981'],['TC','Tim Chia','Finance','#64748B'],['MC','Mike Caplan','COO','#4F6BED']];
const EXT = [['MH','MaryBeth Hernandez','Sales · Intapp','#64748B'],['GL','Gerald Leonard','Account Manager · ADERANT','#7C5CFC']];
const STAKE = ['Ray Lambert','Michael A. Kaplan','Kimberly E. Lomot','Chandra K. Shih','Michael Papandrea','Eric Weiner','Carl Hessler','Mark Kesslen','Brooke Gillar','Steven Skolnick'];

/* ---------- header ---------- */
function projectHeader() {
  const r = 32, c = 2 * Math.PI * r;
  return `<div class="ph">
    <button class="backlink">${ic('chev')} All projects</button>
    <div class="ph-main">
      <div class="ph-left">
        <div class="ph-title"><span class="ph-mark">LS</span><h1>NextGen Time Entry Assessment.</h1><span class="chip status-active">Active</span>
          <span class="ph-tools">${['edit','copy','dl','ext'].map(k => `<button class="icon-btn">${ICO[k]}</button>`).join('')}</span></div>
        <p class="ph-desc">🎯 This project will evaluate and shortlist next-generation time entry solutions that incorporate AI to improve efficiency in the work-to-bill cycle, and improve partner satisfaction. The goal is to identify one viable vendor.</p>
        <div class="ph-meta">
          <span class="chip">${ic('user',11)} Stephanie Godfrey</span>
          <span class="chip">${ic('cal',11)} Due Aug 31, 2026</span>
          <span class="chip">${ic('checkc',11)} 16/19 done</span>
          <span class="chip context">SP ID: 252</span>
          <button class="btn btn-ghost btn-xs">${ICO.dl} Export HTML</button>
          <button class="btn btn-ghost btn-xs">${ICO.dl} Export PDF</button>
        </div>
      </div>
      <div class="dial"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="6"/><circle cx="36" cy="36" r="${r}" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * 0.16}" transform="rotate(-90 36 36)"/></svg><div class="dial-t"><b>84%</b><small>16/19</small></div></div>
    </div>
  </div>`;
}

/* ---------- KPI cards (full row, Option A) ---------- */
function kpiRow() {
  return `<div class="kpis">
    <div class="card card-pad kpi"><div class="kpi-l">Risk</div>
      <div class="risk-dots">${['#10B981','#F59E0B','#E5484D'].map((c,i) => `<span class="rd" style="background:${i===0?c:'#fff'};border-color:${c}"></span>`).join('')}</div>
      <a class="kpi-v-link">Low: Summer Resource Risk for Partner Demos</a>
      <div class="risk-rows">${[['Timeline risk',0],['Budget risk',0],['Resource risk',1]].map(([l,lvl]) => `<div class="risk-row"><span>${l}</span><span class="rl">${[0,1,2].map(i => `<i style="background:${i===lvl?['#10B981','#F59E0B','#E5484D'][lvl]:'#EDEFF3'}"></i>`).join('')}</span></div>`).join('')}</div></div>
    <div class="card card-pad kpi"><div class="kpi-l">Timeline</div>
      <div class="kpi-pair"><small>START</small><b class="mono">05/01/2026</b></div>
      <div class="kpi-pair"><small>DUE</small><b class="mono">08/31/2026</b></div>
      <p class="kpi-note">Moved up selection schedule from 9/30 to 8/31.</p></div>
    <div class="card card-pad kpi"><div class="kpi-l">Budget</div>
      <div class="kpi-pair"><small>TOTAL BUDGET</small><b class="mono">$25,000</b></div>
      <div class="kpi-pair"><small>ACTUAL COST</small><b class="mono">$0.00</b></div>
      <div class="kpi-pair"><small>REMAINING</small><b class="mono" style="color:var(--next-ink)">$25k</b></div>
      <p class="kpi-note">This is FY26 assessment budget only. Will be FY27 full.</p></div>
    <div class="card card-pad kpi kpi-wide"><div class="kpi-l">Executive update</div>
      <p class="kpi-body"><span class="dot" style="background:var(--next)"></span> Intapp has been provisionally selected, as its RFP response most closely aligned with our needs. Laurel.ai was eliminated for being insufficiently mature. Aderant was eliminated due to a dependency on SIERRA for key features. Next step: present demo to partner group.</p>
      <div class="kpi-foot"><small>Jul 28, 9:10 AM</small><a>Read more</a></div></div>
  </div>`;
}

/* ---------- KPI strip (compact, Option B rail) ---------- */
function kpiStrip() {
  return `<div class="card facts">
    <div class="card-head"><h3>Project facts</h3><span class="chip status-active" style="margin-left:auto">Low risk</span></div>
    <div class="facts-body">
      ${[['Start','05/01/2026'],['Due','08/31/2026'],['Budget','$25,000'],['Actual','$0.00'],['Remaining','$25k']].map(([l,v]) => `<div class="fact"><span>${l}</span><b class="mono">${v}</b></div>`).join('')}
      <div class="fact fact-risk"><span>Risk</span><span class="rl">${[0,1,2].map(i => `<i style="background:${i===0?'#10B981':'#EDEFF3'}"></i>`).join('')}</span></div>
    </div>
    <button class="facts-more">Timeline, budget &amp; risk detail ${ic('chev',12)}</button>
  </div>`;
}
function execUpdate() {
  return `<div class="card card-pad exec"><div class="kpi-l">Executive update</div>
    <p class="kpi-body"><span class="dot" style="background:var(--next)"></span> Intapp has been provisionally selected, as its RFP response most closely aligned with our needs. Laurel.ai was eliminated for being insufficiently mature. Aderant was eliminated due to a dependency on SIERRA.</p>
    <div class="kpi-foot"><small>Jul 28, 9:10 AM</small><a>Read more</a></div></div>`;
}

/* ---------- coming up next ---------- */
function comingUpNext() {
  return `<div class="card card-pad cun">
    <div class="kpi-l">Coming up next</div>
    <p>Intapp has been provisionally selected as the preferred vendor following RFP evaluation, with Laurel.ai and Aderant both eliminated from consideration. The immediate next step is to present an Intapp Time demo to the partner group.</p>
    <div class="cun-btns"><button class="btn btn-ghost btn-xs">${ICO.spark} Regenerate</button><button class="btn btn-ghost btn-xs">${ICO.edit} Edit</button></div>
  </div>`;
}

/* ---------- milestones ---------- */
function milestoneCard(m) {
  const done = m.tasks.filter(t => t.done).length + (m.more || 0);
  const total = m.tasks.length + (m.more || 0);
  const dotC = m.status === 'complete' ? 'var(--next)' : 'var(--accent)';
  return `<div class="card ms">
    <button class="ms-head" data-acc>
      ${ic('chev')}
      <span class="dot" style="background:${dotC}"></span>
      <span class="ms-t">${m.t}</span>
      <span class="ms-meta">
      <span class="ms-count chip ${done === total ? 'next' : ''}">${ic('checkc',11)} ${done}/${total}</span>
      <span class="chip${m.dueFlag ? ' work' : ''}">${ic('cal',11)} ${m.due}</span>
      <span class="chip status-${m.status}">${m.status === 'complete' ? 'Complete' : 'Active'}</span>
      <span class="icon-btn sm">${ICO.edit}</span></span>
    </button>
    <div class="ms-body" data-accbody>
      ${m.range ? `<div class="ms-span">${ic('cal',11)} ${m.range} ${m.due}</div>` : ''}
      ${m.tasks.map(t => `<div class="task-row">
        ${t.done ? '<span class="check done">' + ICO.check + '</span>' : t.wait ? '<span class="state-mark wait">' + ICO.clock + '</span>' : '<span class="check"></span>'}
        <span class="task-t ${t.done ? 'done-t' : ''}">${t.t}</span>
        <span class="task-meta">
        ${t.next ? '<span class="chip next">' + ic('flag',11) + ' Next</span>' : ''}
        ${t.tag ? `<span class="chip ${t.tagK === 'next' ? 'next' : t.tagK === 'wait' ? 'wait' : 'status-hold'}">${t.tag}</span>` : ''}
        <span class="chip">${ic('cal',11)} ${t.due || 'Due'}</span>
        <span class="mini-av" style="background:var(--ink-3)">${t.who}</span>
        <span class="icon-btn sm">${ICO.trash}</span></span></div>`).join('')}
      ${m.more ? `<button class="ms-more">+ ${m.more} more completed tasks</button>` : ''}
      <button class="ms-add">${ic('plus',13)} Add task</button>
    </div>
  </div>`;
}
function milestones() {
  return `<div class="section-h">Milestones / Workstreams<button class="head-action ml-a" data-toggleall>${ic('chev',11)} Toggle all</button></div>
    <div class="ms-stack">${MS.map(milestoneCard).join('')}</div>
    <button class="ms-add block">${ic('plus',13)} Add milestone / workstream</button>`;
}

/* ---------- people & context rail ---------- */
function railGroup(title, count, body, open) {
  return `<div class="card rail-card">
    <button class="rail-head ${open ? 'is-open' : ''}" data-acc>${ic('chev')}<h3>${title}</h3>${count ? `<span class="count">${count}</span>` : ''}</button>
    <div class="rail-body${open ? ' is-open' : ''}" data-accbody>${body}</div>
  </div>`;
}
function personRow(a, name, sub, col, del) {
  return `<div class="p-row"><span class="mini-av lg" style="background:${col}">${a}</span>
    <span class="p-n">${name}<small>${sub}</small></span>
    <span class="icon-btn sm">${ICO.edit}</span><span class="icon-btn sm">${del ? ICO.trash : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>'}</span></div>`;
}
function peopleRail(opts) {
  const o = opts || {};
  return `${railGroup('Status updates', 8, [['Jul 28','Intapp provisionally selected; demo to partner group being scheduled.'],['Jul 15','Legal review of Intapp terms and Billstream underway.'],['Jul 01','Decision to hold off on Sierra implementation.']].map(([d,t]) => `<div class="upd"><b>${d}</b><p>${t}</p></div>`).join('') + '<button class="ms-add">Show all 8 updates</button>', o.updatesOpen)}
  ${railGroup('Stakeholders', 10, STAKE.map(n => `<div class="p-row"><span class="p-n">${n}<small>Partner</small></span><span class="chip">🙂 Neutral</span><span class="icon-btn sm">${ICO.edit}</span><span class="icon-btn sm">${ICO.trash}</span></div>`).join('') + `<button class="ms-add">${ic('plus',13)} Add stakeholder</button>`, false)}
  ${railGroup('Internal team', 6, TEAM.map(p => personRow(p[0], p[1], p[2], p[3])).join('') + `<button class="ms-add">${ic('plus',13)} Add team member</button>`, o.teamOpen)}
  ${railGroup('External team', 2, EXT.map(p => personRow(p[0], p[1], p[2], p[3], true)).join('') + `<button class="ms-add">${ic('plus',13)} Add member</button>`, false)}
  ${railGroup('Resources', 4, ['RFP scoring workbook','ILTA 2025 survey','Intapp response pack','Aderant response pack'].map(n => `<div class="p-row"><span class="ic" style="width:14px;height:14px;color:var(--ink-3)">${ICO.link}</span><span class="p-n">${n}</span></div>`).join(''), false)}`;
}

/* ---------- registers ---------- */
function filterBar(bits, action) {
  return `<div class="reg-filters">${bits.map(b => `<span class="sel">${b} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></span>`).join('')}<button class="head-action">${ic('plus',12)} ${action}</button></div>`;
}
const regDecisions = () => `${filterBar(['All statuses'], 'Add decision')}
  <table class="reg"><thead><tr><th>Decision</th><th>Status</th><th class="th-s">Date ▾</th><th>Owner</th><th></th></tr></thead><tbody>
  ${[['Approve to move forward with partner demo of Intapp time only.','Emailed Mark, Jon, and Gary with an update on the selection process. For information','Decided','2026-08-04'],
     ['Provisional selection of Intapp Time, Terms and Billstream. Pending legal review of terms','Based on Aderant\'s poor response to the RFP and our strategic decision not to upgrade to Sierra, places Intapp Time as our lead selection.','Decided','2026-07-15'],
     ['Decision to hold off on Sierra implementation','Sierra is an extensive project that would require a tremendous amount of resources from both IT and finance. An assessment of the impact and benefits should be performed first.','Decided','2026-07-01']]
    .map(([t,n,s,d]) => `<tr><td><b>${t}</b><em>↳ ${n}</em></td><td><span class="chip next">${s}</span></td><td class="mono nw">${d}</td><td class="nw">Steph Go…</td><td class="td-a"><span class="acts"><span class="icon-btn sm">${ICO.edit}</span><span class="icon-btn sm">${ICO.trash}</span></span></td></tr>`).join('')}
  </tbody></table>`;
const regIssues = () => `${filterBar(['All statuses','All severities'], 'Add issue')}
  <table class="reg"><thead><tr><th class="th-s">Severity ▾</th><th>Title</th><th>Status</th><th>Owner</th><th></th></tr></thead><tbody>
  <tr><td><span class="chip sev-crit">Critical</span></td><td><b>Aderant RFP response delayed.</b><em>Due to lack of resources, Aderant is unable to respond to our RFP by the deadline of June 30th. They asked for an extension to July 24.</em><em>↳ Submitted Late and Processed on 7/24</em></td><td><span class="chip next">Resolved</span></td><td class="nw">Tony</td><td class="td-a"><span class="acts"><span class="icon-btn sm">${ICO.edit}</span><span class="icon-btn sm">${ICO.trash}</span></span></td></tr>
  </tbody></table>`;
const regRisks = () => `${filterBar(['All statuses','All severities'], 'Add risk')}
  <table class="reg"><thead><tr><th class="th-s">Severity ▾</th><th>Risk</th><th>Category</th><th>P</th><th>I</th><th>Status</th><th>Owner</th><th></th></tr></thead><tbody>
  <tr><td><span class="chip sev-med">Medium</span></td><td><b>Attorneys may not like any of the choices we make for a new timekeeping system.</b><em>↳ Involve partners in the selection process. Enlist them as champions to support the rollout.</em></td><td><span class="chip">Technical</span></td><td>M</td><td>M</td><td><span class="chip sev-open">Open</span></td><td class="nw">All</td><td class="td-a"><span class="acts"><span class="icon-btn sm">${ICO.edit}</span><span class="icon-btn sm">${ICO.trash}</span></span></td></tr>
  </tbody></table>`;
const regTasks = () => `<div class="empty"><p>No tasks yet. Add one below or tag this project on any task.</p><button class="ms-add">${ic('plus',13)} Add task to project</button></div>`;
const regAgendas = () => `<div class="reg-filters"><button class="head-action" style="margin-left:auto">${ic('plus',12)} New meeting</button></div>
  ${[['COO Update','Jul 28, 2026'],['Project Check-In Call - Tony &amp; Steph','Jul 16, 2026']].map(([t,d]) => `<div class="ag-row"><button class="ag-head" data-acc>${ic('chev')}<span class="ic" style="width:14px;height:14px;color:var(--ink-3)">${ICO.doc}</span><b>${t}</b><span class="ag-meta">${d}</span><span class="chip next">${ic('checkc',11)} Link</span>${['dl','copy','edit','trash'].map(k => `<span class="icon-btn sm">${ICO[k]}</span>`).join('')}</button>
    <div class="ag-body" data-accbody hidden><div class="ag-item"><b>1. Vendor shortlist review</b><p>Walk the COO through the Intapp provisional selection and the elimination rationale.</p></div><div class="ag-item"><b>2. Partner demo scheduling</b><p>Confirm Aug 20 slot and who presents.</p></div><div class="ag-foot"><button class="btn btn-ghost btn-xs">${ICO.spark} AI rewrite</button><button class="btn btn-ghost btn-xs">${ICO.dl} Export HTML</button></div></div></div>`).join('')}`;

const REGISTERS = [
  { id: 'decisions', label: 'Decisions', count: 3, badge: '3', body: regDecisions },
  { id: 'issues', label: 'Issues', count: 1, badge: '1', body: regIssues },
  { id: 'risks', label: 'Risks', count: 1, badge: '1 open', body: regRisks },
  { id: 'tasks', label: 'Tasks', count: 0, badge: '0', body: regTasks },
  { id: 'agendas', label: 'Agendas', count: 2, badge: '2', body: regAgendas },
];
