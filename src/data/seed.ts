import type { AppData } from "../lib/types";

export const SEED: AppData = {
  user: { name: "Jordan Reeves", email: "jordan@makeithappen.app", initials: "JR" },

  work: {
    nextActions: [
      { id: "w-na1", text: "Send launch brief to Priya for sign-off", project: "Product Launch (Sample)", due: "Today", overdue: false },
      { id: "w-na2", text: "Approve the pricing page copy from Alex", project: "Product Launch (Sample)", due: "Today", overdue: false },
      { id: "w-na3", text: "Review vendor contract renewal", project: null, due: "Tomorrow", overdue: false },
    ],
    spotlight: {
      text: "Send launch brief to Priya for sign-off",
      project: "Product Launch (Sample)",
      milestone: "Design & Build",
      due: "Today · 5:00 PM",
      context: "@calls",
    },
    todayTasks: [
      { id: "wt1", text: "Send launch brief to Priya for sign-off", done: false, next: true, context: "@calls", project: "Product Launch (Sample)" },
      { id: "wt2", text: "Approve pricing page copy from Alex", done: false, next: true, context: "@work", project: "Product Launch (Sample)" },
      { id: "wt3", text: "Stand-up with the platform team", done: true, next: false, context: "@work", project: null },
      { id: "wt4", text: "Review vendor contract renewal", done: false, next: false, context: "@work", project: null },
      { id: "wt5", text: "Offsite venue — shortlist & book", done: false, state: "delegated", to: "Alex", context: "@calls", project: null },
      { id: "wt6", text: "Legal sign-off on partner agreement", done: false, state: "waiting", waitFor: "Luis (counsel)", context: "@work", project: null },
    ],
    upcoming: [
      { id: "wu1", text: "Beta wrap-up report to stakeholders", done: false, next: true, context: "@work", project: "Product Launch (Sample)", due: "Tomorrow", reminder: "9:00 AM" },
      { id: "wu2", text: "Pricing sign-off meeting with finance", done: false, next: false, context: "@work", project: "Product Launch (Sample)", due: "Jul 10" },
      { id: "wu3", text: "1:1 with Alex about launch campaign", done: false, next: false, context: "@calls", project: "Product Launch (Sample)", due: "Jun 25", reminder: "2:30 PM" },
      { id: "wu4", text: "Legal review of launch partner agreements", done: false, state: "waiting", waitFor: "Luis (counsel)", context: "@work", project: null, due: "Jun 30" },
    ],
    someday: [
      { id: "ws1", text: "Write up the platform migration RFC", done: false, next: false, context: "@work", project: null },
      { id: "ws2", text: "Explore a referral program", done: false, next: false, context: "@work", project: null },
      { id: "ws3", text: "Refresh the onboarding email sequence", done: false, next: false, context: "@work", project: null },
      { id: "ws4", text: "New brand illustration set", done: false, state: "delegated", to: "Mara", context: "@work", project: null },
    ],
    habits: [
      { id: "wh1", name: "Inbox to zero", icon: "📥", streak: 12, doneToday: true, cadence: "Daily" },
      { id: "wh2", name: "Deep work block", icon: "🎯", streak: 5, doneToday: false, cadence: "Daily" },
      { id: "wh3", name: "Plan tomorrow", icon: "🌙", streak: 23, doneToday: false, cadence: "Daily" },
      { id: "wh4", name: "No-meeting mornings", icon: "🧘", streak: 3, doneToday: true, cadence: "Weekdays" },
    ],
    projects: [
      {
        id: "p1",
        title: "Product Launch (Sample)",
        status: "active",
        owner: "JR",
        start: "May 1",
        due: "Sep 30",
        desc: "End-to-end launch of our new product tier — from discovery through go-live. Goal: 500 sign-ups in the first 30 days.",
        progress: 0.42,
        active: true,
        budget: "$120,000",
        budgetSpent: "$54,800",
        onBudget: true,
        risk: "amber",
        riskNote: "Design vendor timeline is tight — daily check-ins in place. Finance sign-off on pricing still pending.",
        members: [
          { contactId: "c1", role: "Product Lead" },
          { contactId: "c2", role: "Marketing Lead" },
        ],
        externalTeam: [
          { id: "ext1", name: "Mara Voss", role: "Visual Design", company: "Northwind Studio" },
          { id: "ext2", name: "Sam Cho", role: "Engineering Lead", company: "Brightcode Inc." },
        ],
        resources: [
          { id: "r1", label: "Launch Brief", url: "https://docs.google.com/launch-brief" },
          { id: "r2", label: "Brand Guidelines", url: "https://brand.example.com" },
          { id: "r3", label: "Beta Feedback Report", url: "https://docs.google.com/beta-report" },
        ],
        risks: [
          { id: "rsk1", description: "Design deliverables from Northwind delayed by 2 weeks", category: "Schedule", probability: "medium", impact: "high", status: "open", owner: "JR", mitigation: "Daily check-ins with Northwind; parallel dev work scoped to proceed without final assets." },
          { id: "rsk2", description: "Pricing model not yet approved by finance", category: "Business", probability: "low", impact: "high", status: "open", owner: "AL", mitigation: "Finance review meeting locked for Jul 10." },
          { id: "rsk3", description: "Beta UX feedback required scope changes", category: "Scope", probability: "low", impact: "medium", status: "mitigated", owner: "JR", mitigation: "Scope frozen after Jun 30 beta wrap-up. Two UX fixes logged, sized, and assigned." },
        ],
        agendas: [
          {
            id: "ag1",
            title: "Launch Readiness Review",
            date: "Aug 15, 2026",
            attendees: [
              { kind: "internal", id: "c1" },
              { kind: "internal", id: "c2" },
            ],
            items: [
              { id: "ai1", text: "Review launch checklist status" },
              { id: "ai2", text: "Sign off on pricing tiers" },
              { id: "ai3", text: "Confirm go-live date and rollback plan" },
              { id: "ai4", text: "Assign post-launch monitoring owners" },
            ],
            resources: [
              { id: "ar1", label: "Launch Checklist", url: "https://docs.google.com/launch-checklist" },
            ],
          },
        ],
        milestones: [
          {
            id: "m1",
            title: "Discovery & Planning",
            start: "May 1",
            due: "May 31",
            status: "complete",
            subtasks: [
              { id: "s1", t: "Customer interviews (n=12)", done: true, next: false, who: "JR" },
              { id: "s2", t: "Competitive landscape document", done: true, next: false, who: "AL" },
              { id: "s3", t: "Launch brief approved by leadership", done: true, next: false, who: "JR" },
            ],
          },
          {
            id: "m2",
            title: "Design & Build",
            start: "Jun 1",
            due: "Aug 15",
            status: "active",
            subtasks: [
              { id: "s4", t: "Brand design system finalized", done: true, next: false, who: "MV" },
              { id: "s5", t: "Landing page live in staging", done: true, next: false, who: "SC" },
              { id: "s6", t: "Pricing page copy approved", done: false, next: true, who: "AL" },
              { id: "s7", t: "Beta program wrap-up and report", done: false, next: false, who: "JR" },
              { id: "s8", t: "Accessibility audit passed", done: false, next: false, who: "SC" },
            ],
          },
          {
            id: "m3",
            title: "Go-Live",
            start: "Aug 16",
            due: "Sep 30",
            status: "hold",
            subtasks: [
              { id: "s9", t: "Press release drafted and approved", done: false, next: false, who: "AL" },
              { id: "s10", t: "Paid campaign assets ready", done: false, next: false, who: "AL" },
              { id: "s11", t: "Production deploy and smoke test", done: false, next: false, who: "SC" },
              { id: "s12", t: "Post-launch retro scheduled", done: false, next: false, who: "JR" },
            ],
          },
        ],
        updates: [
          { id: "u1", when: "Jun 16, 9:00 AM", who: "JR", text: "Beta closed with NPS of +48 — strong signal. Two UX improvements flagged and scoped into Design & Build. Scope is now frozen. On track for Aug 15 handoff from design.", type: "executive" },
          { id: "u2", when: "Jun 10, 2:30 PM", who: "AL", text: "Pricing copy is drafted and with finance for approval. Expecting sign-off by Jul 10 so we can bake it into the landing page build.", type: "update" },
          { id: "u3", when: "May 31, 5:00 PM", who: "JR", text: "Discovery complete — 12 interviews done across 4 customer segments. Top themes: collaboration tools and faster onboarding. Brief approved by leadership.", type: "win" },
        ],
      },
    ],
    contacts: [
      { id: "c1", name: "Priya Raman", company: "MakeItHappen", role: "VP Product", rel: "Colleague", email: "priya@makeithappen.app", phone: "+1 415 555 0101", color: "#4F6BED", lastNote: "Reviewing the launch brief", lastDate: "Jun 6", followUp: true, remember: "Decides fast, hates long decks. Twins started kindergarten this year. Big fan of clear 'what changed' summaries." },
      { id: "c2", name: "Alex Lin", company: "MakeItHappen", role: "Marketing Lead", rel: "Colleague", email: "alex@makeithappen.app", phone: "+1 415 555 0144", color: "#10B981", lastNote: "Sent pricing copy for approval", lastDate: "Jun 8", followUp: false, remember: "Owns the marketing side of the launch. Detail-oriented, prefers async written feedback over meetings." },
      { id: "c3", name: "Dana Okoro", company: "Acme Corp", role: "Head of IT", rel: "Client", email: "dana@acme.com", phone: "+1 212 555 0190", color: "#F59E0B", lastNote: "Intro call — exploring partnership", lastDate: "Jun 5", followUp: true, remember: "Strong technical background. Security is her #1 concern. Appreciates SOC 2 specifics." },
      { id: "c4", name: "Luis Garcia", company: "Garcia Legal", role: "Counsel", rel: "Vendor", email: "luis@garcialegal.com", phone: "+1 305 555 0177", color: "#8B5CF6", lastNote: "Reviewing launch partner agreements", lastDate: "Jun 3", followUp: false, remember: "Outside counsel for enterprise and launch agreements. Fast turnaround, flat fee per engagement." },
      { id: "c5", name: "Mara Voss", company: "Northwind", role: "Designer", rel: "Vendor", email: "mara@northwind.studio", phone: "+1 503 555 0123", color: "#EC4899", lastNote: "Finalizing brand design system", lastDate: "Jun 12", followUp: false, remember: "Contract designer on the launch. Excellent at systems work. Would love to bring her on full-time eventually." },
      { id: "c6", name: "Tom Becker", company: "Acme Corp", role: "Procurement", rel: "Client", email: "tom@acme.com", phone: "+1 212 555 0166", color: "#0EA5E9", lastNote: "Exploring enterprise licensing terms", lastDate: "Jun 1", followUp: true, remember: "Procurement gatekeeper at Acme. By-the-book. Cc him on everything contractual." },
    ],
  },

  personal: {
    nextActions: [
      { id: "p-na1", text: "Choose kitchen materials and fixtures", project: "Home Renovation (Sample)", due: "This week", overdue: false },
      { id: "p-na2", text: "Call Mom — it's been almost two weeks", project: null, due: "Today", overdue: true },
      { id: "p-na3", text: "Schedule the dentist appointment", project: null, due: "This week", overdue: false },
    ],
    spotlight: {
      text: "Choose kitchen materials and fixtures",
      project: "Home Renovation (Sample)",
      milestone: "Planning & Design",
      due: "This week",
      context: "@errands",
    },
    todayTasks: [
      { id: "pt1", text: "Review flooring samples with designer", done: false, next: true, context: "@errands", project: "Home Renovation (Sample)" },
      { id: "pt2", text: "Call Mom", done: false, next: true, context: "@calls", project: null },
      { id: "pt3", text: "Morning run — 5k", done: true, next: false, context: "@home", project: null },
      { id: "pt4", text: "Pick up dry cleaning", done: false, next: false, context: "@errands", project: null },
      { id: "pt6", text: "Confirm demo start date with Rivera Contracting", done: false, state: "waiting", waitFor: "Rivera Contracting", context: "@calls", project: "Home Renovation (Sample)" },
      { id: "pt5", text: "Finish 'The Overstory'", done: false, next: false, context: "@home", project: null },
    ],
    upcoming: [
      { id: "pu1", text: "Schedule the dentist appointment", done: false, next: true, context: "@calls", project: null, due: "This week", reminder: "Mon 10 AM" },
      { id: "pu2", text: "Contractor kickoff meeting", done: false, next: false, context: "@home", project: "Home Renovation (Sample)", due: "Jun 20" },
      { id: "pu5", text: "Materials delivery window", done: false, state: "waiting", waitFor: "arrives Jul 5", context: "@home", project: "Home Renovation (Sample)", due: "Jul 5" },
      { id: "pu3", text: "Submit permit application", done: false, next: false, context: "@errands", project: "Home Renovation (Sample)", due: "Jun 25" },
      { id: "pu4", text: "Sam's anniversary — send a note", done: false, next: false, context: "@calls", project: null, due: "Sep 2", reminder: "Sep 1" },
    ],
    someday: [
      { id: "ps-t1", text: "Look into a pottery class", done: false, next: false, context: "@home", project: null },
      { id: "ps-t2", text: "Research home gym options for the basement", done: false, next: false, context: "@errands", project: null },
      { id: "ps-t3", text: "Plan a visit to Theo in Berlin", done: false, next: false, context: "@home", project: null },
    ],
    habits: [
      { id: "ph1", name: "Morning run", icon: "🏃", streak: 9, doneToday: true, cadence: "Daily" },
      { id: "ph2", name: "Read 20 pages", icon: "📚", streak: 31, doneToday: false, cadence: "Daily" },
      { id: "ph3", name: "Meditate", icon: "🧘", streak: 7, doneToday: false, cadence: "Daily" },
      { id: "ph4", name: "No phone after 10pm", icon: "🌙", streak: 4, doneToday: false, cadence: "Daily" },
      { id: "ph5", name: "Call a friend", icon: "💬", streak: 2, doneToday: true, cadence: "Weekly" },
    ],
    projects: [
      {
        id: "pp1",
        title: "Home Renovation (Sample)",
        status: "active",
        owner: "JR",
        start: "Jun 1",
        due: "Oct 31",
        desc: "Full kitchen and living room renovation — open-plan layout, new flooring, and updated fixtures throughout.",
        progress: 0.15,
        active: true,
        budget: "$35,000",
        budgetSpent: "$9,200",
        onBudget: true,
        risk: "green",
        externalTeam: [
          { id: "ext1", name: "Rivera Contracting", role: "General Contractor", company: "Rivera & Co." },
          { id: "ext2", name: "Jordan Blu", role: "Interior Designer", company: "Blu Interiors" },
        ],
        resources: [
          { id: "r1", label: "Floor Plan v3", url: "https://drive.google.com/floor-plan" },
          { id: "r2", label: "Materials & Budget Sheet", url: "https://docs.google.com/budget" },
          { id: "r3", label: "Contractor Agreement", url: "https://drive.google.com/contractor" },
        ],
        risks: [
          { id: "rsk1", description: "Contractor availability gap in late August", category: "Schedule", probability: "medium", impact: "medium", status: "open", owner: "JR", mitigation: "Reserved backup contractor slot with two weeks' notice required." },
          { id: "rsk2", description: "Flooring material on backorder", category: "Supply", probability: "low", impact: "low", status: "mitigated", owner: "JR", mitigation: "Ordered extra stock early — confirmed delivered to warehouse." },
        ],
        agendas: [
          {
            id: "ag1",
            title: "Contractor Kickoff",
            date: "Jun 20, 2026",
            attendees: [],
            items: [
              { id: "ai1", text: "Walk through floor plan and full scope" },
              { id: "ai2", text: "Confirm demo start date and duration" },
              { id: "ai3", text: "Review materials list and lead times" },
              { id: "ai4", text: "Establish weekly check-in cadence" },
            ],
            resources: [
              { id: "ar1", label: "Floor Plan v3", url: "https://drive.google.com/floor-plan" },
              { id: "ar2", label: "Materials List", url: "https://docs.google.com/materials" },
            ],
          },
        ],
        milestones: [
          {
            id: "pm1",
            title: "Planning & Design",
            start: "Jun 1",
            due: "Jun 30",
            status: "active",
            subtasks: [
              { id: "ps1", t: "Finalize floor plan with designer", done: true, next: false, who: "JR" },
              { id: "ps2", t: "Get 3 contractor quotes and check references", done: true, next: false, who: "JR" },
              { id: "ps3", t: "Choose materials and fixtures", done: false, next: true, who: "JR" },
              { id: "ps4", t: "Pull permits", done: false, next: false, who: "JR" },
            ],
          },
          {
            id: "pm2",
            title: "Demo & Rough Work",
            start: "Jul 7",
            due: "Jul 31",
            status: "hold",
            subtasks: [
              { id: "ps5", t: "Kitchen demo", done: false, next: false, who: "JR" },
              { id: "ps6", t: "Electrical rough-in", done: false, next: false, who: "JR" },
              { id: "ps7", t: "Plumbing rough-in", done: false, next: false, who: "JR" },
            ],
          },
          {
            id: "pm3",
            title: "Build & Install",
            start: "Aug 1",
            due: "Sep 30",
            status: "hold",
            subtasks: [
              { id: "ps8", t: "Flooring installation", done: false, next: false, who: "JR" },
              { id: "ps9", t: "Cabinet and countertop installation", done: false, next: false, who: "JR" },
              { id: "ps10", t: "Appliances delivered and installed", done: false, next: false, who: "JR" },
            ],
          },
          {
            id: "pm4",
            title: "Final Touches",
            start: "Oct 1",
            due: "Oct 31",
            status: "hold",
            subtasks: [
              { id: "ps11", t: "Paint and trim", done: false, next: false, who: "JR" },
              { id: "ps12", t: "Punch list walkthrough with contractor", done: false, next: false, who: "JR" },
              { id: "ps13", t: "Final inspection passed", done: false, next: false, who: "JR" },
            ],
          },
        ],
        updates: [
          { id: "pu1", when: "Jun 14, 6:00 PM", who: "JR", text: "Hired Rivera Contracting — best price and great reviews. Demo starts Jul 7. Floor plan is locked: open-plan kitchen-living with an island. Flooring ordered.", type: "win" },
          { id: "pu2", when: "Jun 5, 11:00 AM", who: "JR", text: "Got all 3 quotes back. Wide range ($28k–$42k). Narrowing to Rivera and checking their last two references this week before signing.", type: "update" },
        ],
      },
    ],
    contacts: [
      { id: "pc1", name: "Mom", company: "Family", role: "", rel: "Family", email: "mom@home.net", phone: "+1 415 555 0011", color: "#F59E0B", lastNote: "Quick chat about the garden", lastDate: "May 28", followUp: true, remember: "Loves a Sunday call. Knee surgery coming up in July — check in before and after. Sends the best care packages." },
      { id: "pc2", name: "Sam Whitfield", company: "", role: "Best friend", rel: "Friend", email: "sam@whitfield.me", phone: "+1 628 555 0044", color: "#4F6BED", lastNote: "Catching up over coffee", lastDate: "Jun 4", followUp: false, remember: "Allergic to shellfish. Wedding anniversary is Sep 2 — don't book travel that day." },
      { id: "pc3", name: "Dr. Anika Patel", company: "Bright Smile Dental", role: "Dentist", rel: "Other", email: "office@brightsmile.com", phone: "+1 415 555 0099", color: "#10B981", lastNote: "Overdue for a cleaning", lastDate: "Dec 12", followUp: true, remember: "Six-month cleanings. Front desk prefers morning appointments. Need to schedule — overdue." },
      { id: "pc4", name: "Theo Marsh", company: "", role: "College friend", rel: "Friend", email: "theo@marsh.io", phone: "+1 917 555 0188", color: "#8B5CF6", lastNote: "Owes me a call back", lastDate: "May 15", followUp: false, remember: "Just moved to Berlin. New baby on the way in the fall." },
    ],
  },
};

/* contribution-grid history (deterministic) for habit detail */
export function habitHistory(seed: number): number[][] {
  const weeks = 52, days = 7, out: number[][] = [];
  let s = seed;
  for (let w = 0; w < weeks; w++) {
    const col: number[] = [];
    for (let d = 0; d < days; d++) {
      s = (s * 9301 + 49297) % 233280;
      const r = s / 233280;
      // higher density toward the present (right side)
      const bias = 0.35 + (w / weeks) * 0.5;
      col.push(r < bias ? (r < bias * 0.55 ? 2 : 1) : 0);
    }
    out.push(col);
  }
  return out;
}
