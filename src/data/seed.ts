import type { AppData } from "../lib/types";

export const SEED: AppData = {
  user: { name: "Jordan Reeves", email: "jordan@makeithappen.app", initials: "JR" },

  work: {
    nextActions: [
      { id: "w-na1", text: "Send Q3 roadmap deck to Priya for review", project: "Q3 Product Roadmap", due: "Today", overdue: false },
      { id: "w-na2", text: "Approve the new pricing copy from marketing", project: "Pricing Refresh", due: "Today", overdue: false },
      { id: "w-na3", text: "Reply to the security questionnaire from Acme", project: "Acme Enterprise Deal", due: "Tomorrow", overdue: false },
    ],
    spotlight: {
      text: "Send Q3 roadmap deck to Priya for review",
      project: "Q3 Product Roadmap",
      milestone: "Roadmap sign-off",
      due: "Today · 5:00 PM",
      context: "@calls",
    },
    todayTasks: [
      { id: "wt1", text: "Send Q3 roadmap deck to Priya", done: false, next: true, context: "@calls", project: "Q3 Product Roadmap" },
      { id: "wt2", text: "Approve pricing copy from marketing", done: false, next: true, context: "@work", project: "Pricing Refresh" },
      { id: "wt3", text: "Stand-up with the platform team", done: true, next: false, context: "@work", project: null },
      { id: "wt4", text: "Review Acme security questionnaire", done: false, next: false, context: "@work", project: "Acme Enterprise Deal" },
      { id: "wt5", text: "Offsite venue — shortlist & book", done: false, state: "delegated", to: "Alex", context: "@calls", project: null },
      { id: "wt6", text: "Signed MSA back from Acme", done: false, state: "waiting", waitFor: "Tom (Acme)", context: "@work", project: "Acme Enterprise Deal" },
    ],
    upcoming: [
      { id: "wu1", text: "Reply to Acme security questionnaire", done: false, next: true, context: "@work", project: "Acme Enterprise Deal", due: "Tomorrow", reminder: "9:00 AM" },
      { id: "wu2", text: "Prep for the exec roadmap review", done: false, next: false, context: "@work", project: "Q3 Product Roadmap", due: "Jun 14" },
      { id: "wu3", text: "1:1 with Alex about pricing", done: false, next: false, context: "@calls", project: "Pricing Refresh", due: "Jun 12", reminder: "2:30 PM" },
      { id: "wu4", text: "DPA redlines", done: false, state: "waiting", waitFor: "Luis (counsel)", context: "@work", project: "Acme Enterprise Deal", due: "Jun 16" },
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
        id: "p1", title: "Q3 Product Roadmap", status: "active", owner: "JR", due: "Jun 28",
        desc: "Finalize and align the team on Q3 priorities, scope, and milestone dates.",
        progress: 0.62, active: true,
        milestones: [
          { id: "m1", title: "Discovery & input gathering", due: "May 30", status: "complete",
            subtasks: [ { id: "s1", t: "Survey CS team", done: true, next: false, who: "AL" }, { id: "s2", t: "Pull usage data", done: true, next: false, who: "JR" } ] },
          { id: "m2", title: "Draft roadmap deck", due: "Jun 14", status: "active",
            subtasks: [ { id: "s3", t: "Outline themes", done: true, next: false, who: "JR" }, { id: "s4", t: "Build slides", done: true, next: false, who: "JR" }, { id: "s5", t: "Send to Priya for review", done: false, next: true, who: "JR" } ] },
          { id: "m3", title: "Roadmap sign-off", due: "Jun 28", status: "hold",
            subtasks: [ { id: "s6", t: "Exec review meeting", done: false, state: "waiting", waitFor: "Priya's calendar", who: "PR" }, { id: "s7", t: "Incorporate feedback", done: false, next: false, who: "JR" } ] },
        ],
        updates: [
          { id: "u1", when: "Jun 9, 2:14 PM", who: "JR", text: "Deck draft is done. Sending to Priya today for a first review pass — aiming for sign-off by the 28th. Discovery uncovered a strong pull for the collaboration features." },
          { id: "u2", when: "Jun 2, 10:02 AM", who: "JR", text: "Wrapped discovery. CS survey + usage data both point to onboarding as the top theme for Q3." },
        ],
      },
      {
        id: "p2", title: "Pricing Refresh", status: "active", owner: "AL", due: "Jul 12",
        desc: "Update pricing tiers and refresh marketing copy ahead of the fiscal year.",
        progress: 0.4, active: true,
        milestones: [
          { id: "m4", title: "Competitive analysis", due: "Jun 6", status: "complete", subtasks: [ { id: "s8", t: "Benchmark 6 competitors", done: true, next: false, who: "AL" } ] },
          { id: "m5", title: "New tier structure", due: "Jun 20", status: "active", subtasks: [ { id: "s9", t: "Model 3 scenarios", done: true, next: false, who: "AL" }, { id: "s10", t: "Approve pricing copy", done: false, next: true, who: "JR" } ] },
        ],
        updates: [
          { id: "u3", when: "Jun 8, 4:30 PM", who: "AL", text: "Tier modeling complete. Recommending a 3-tier structure. Copy draft is ready for Jordan's approval." },
        ],
      },
      {
        id: "p3", title: "Acme Enterprise Deal", status: "active", owner: "JR", due: "Jun 30",
        desc: "Close the Acme Corp enterprise contract — security review and procurement.",
        progress: 0.78, active: true,
        milestones: [
          { id: "m6", title: "Technical evaluation", due: "Jun 1", status: "complete", subtasks: [ { id: "s11", t: "POC environment", done: true, next: false, who: "JR" } ] },
          { id: "m7", title: "Security & procurement", due: "Jun 24", status: "active", subtasks: [ { id: "s12", t: "Reply to security questionnaire", done: false, next: true, who: "JR" }, { id: "s13", t: "DPA redlines", done: false, state: "delegated", to: "Luis", who: "LG" } ] },
        ],
        updates: [ { id: "u4", when: "Jun 7, 11:20 AM", who: "JR", text: "Technical eval passed with flying colors. Now in security review — questionnaire due back to them this week." } ],
      },
      {
        id: "p4", title: "Team Offsite — Lisbon", status: "hold", owner: "JR", due: "Sep 15",
        desc: "Plan the autumn engineering offsite: venue, agenda, travel.",
        progress: 0.2, active: false,
        milestones: [ { id: "m8", title: "Lock venue & dates", due: "Jun 30", status: "active", subtasks: [ { id: "s14", t: "Book venue", done: false, next: false, who: "JR" } ] } ],
        updates: [ { id: "u5", when: "May 28, 9:00 AM", who: "JR", text: "Narrowed to Lisbon. Comparing two venues — decision by end of month." } ],
      },
    ],
    contacts: [
      { id: "c1", name: "Priya Raman", company: "MakeItHappen", role: "VP Product", rel: "Colleague", email: "priya@makeithappen.app", phone: "+1 415 555 0101", color: "#4F6BED", lastNote: "Reviewing the Q3 roadmap deck", lastDate: "Jun 6", followUp: true, remember: "Decides fast, hates long decks. Twins started kindergarten this year. Big fan of clear 'what changed' summaries." },
      { id: "c2", name: "Alex Lin", company: "MakeItHappen", role: "Marketing Lead", rel: "Colleague", email: "alex@makeithappen.app", phone: "+1 415 555 0144", color: "#10B981", lastNote: "Sent pricing copy for approval", lastDate: "Jun 8", followUp: false, remember: "Owns the pricing refresh. Detail-oriented, prefers async written feedback over meetings." },
      { id: "c3", name: "Dana Okoro", company: "Acme Corp", role: "Head of IT", rel: "Client", email: "dana@acme.com", phone: "+1 212 555 0190", color: "#F59E0B", lastNote: "Sent over the security questionnaire", lastDate: "Jun 5", followUp: true, remember: "Champion on the Acme deal. Security is her #1 concern. Used to work at a fintech — appreciates SOC 2 specifics." },
      { id: "c4", name: "Luis Garcia", company: "Garcia Legal", role: "Counsel", rel: "Vendor", email: "luis@garcialegal.com", phone: "+1 305 555 0177", color: "#8B5CF6", lastNote: "DPA redlines in progress", lastDate: "Jun 3", followUp: false, remember: "Our outside counsel for enterprise contracts. Fast turnaround, flat fee per deal." },
      { id: "c5", name: "Mara Voss", company: "Northwind", role: "Designer", rel: "Vendor", email: "mara@northwind.studio", phone: "+1 503 555 0123", color: "#EC4899", lastNote: "Delivered the brand refresh files", lastDate: "May 30", followUp: false, remember: "Contract designer. Excellent at systems work. Would love to bring her on full-time eventually." },
      { id: "c6", name: "Tom Becker", company: "Acme Corp", role: "Procurement", rel: "Client", email: "tom@acme.com", phone: "+1 212 555 0166", color: "#0EA5E9", lastNote: "Waiting on signed MSA", lastDate: "Jun 1", followUp: true, remember: "Procurement gatekeeper at Acme. By-the-book. Cc him on everything contractual." },
    ],
  },

  personal: {
    nextActions: [
      { id: "p-na1", text: "Book flights for the Lisbon trip in September", project: "Lisbon Trip", due: "Today", overdue: false },
      { id: "p-na2", text: "Call Mom — it's been almost two weeks", project: null, due: "Today", overdue: true },
      { id: "p-na3", text: "Schedule the dentist appointment", project: null, due: "This week", overdue: false },
    ],
    spotlight: {
      text: "Book flights for the Lisbon trip in September",
      project: "Lisbon Trip",
      milestone: "Travel & logistics",
      due: "Today",
      context: "@errands",
    },
    todayTasks: [
      { id: "pt1", text: "Book flights for Lisbon trip", done: false, next: true, context: "@errands", project: "Lisbon Trip" },
      { id: "pt2", text: "Call Mom", done: false, next: true, context: "@calls", project: null },
      { id: "pt3", text: "Morning run — 5k", done: true, next: false, context: "@home", project: null },
      { id: "pt4", text: "Pick up dry cleaning", done: false, next: false, context: "@errands", project: null },
      { id: "pt6", text: "Confirm Lisbon dates", done: false, state: "waiting", waitFor: "Sam", context: "@calls", project: "Lisbon Trip" },
      { id: "pt5", text: "Finish 'The Overstory'", done: false, next: false, context: "@home", project: "Read 24 books" },
    ],
    upcoming: [
      { id: "pu1", text: "Schedule the dentist appointment", done: false, next: true, context: "@calls", project: null, due: "This week", reminder: "Mon 10 AM" },
      { id: "pu2", text: "Order a desk chair", done: false, next: false, context: "@errands", project: "Home Office Refresh", due: "Jun 14" },
      { id: "pu5", text: "Standing desk delivery", done: false, state: "waiting", waitFor: "arrives Jun 18", context: "@home", project: "Home Office Refresh", due: "Jun 18" },
      { id: "pu3", text: "Plan day trip to Sintra", done: false, next: false, context: "@home", project: "Lisbon Trip", due: "Jun 20" },
      { id: "pu4", text: "Sam's anniversary — send a note", done: false, next: false, context: "@calls", project: null, due: "Sep 2", reminder: "Sep 1" },
    ],
    someday: [
      { id: "ps-t1", text: "Look into a pottery class", done: false, next: false, context: "@home", project: null },
      { id: "ps-t2", text: "Research standing desk mats", done: false, next: false, context: "@errands", project: "Home Office Refresh" },
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
        id: "pp1", title: "Lisbon Trip", status: "active", owner: "JR", due: "Sep 10",
        desc: "Plan a 10-day trip to Lisbon and the Algarve coast this September.",
        progress: 0.45, active: true,
        milestones: [
          { id: "pm1", title: "Travel & logistics", due: "Jun 15", status: "active", subtasks: [ { id: "ps1", t: "Book flights", done: false, next: true, who: "JR" }, { id: "ps2", t: "Reserve hotel in Alfama", done: true, next: false, who: "JR" } ] },
          { id: "pm2", title: "Itinerary", due: "Aug 1", status: "hold", subtasks: [ { id: "ps3", t: "Day trip to Sintra", done: false, next: false, who: "JR" }, { id: "ps4", t: "Book pastéis tour", done: false, state: "delegated", to: "Sam", who: "JR" } ] },
        ],
        updates: [ { id: "pu1", when: "Jun 4, 8:30 PM", who: "JR", text: "Hotel in Alfama is booked. Just need to lock flights before prices climb." } ],
      },
      {
        id: "pp2", title: "Home Office Refresh", status: "active", owner: "JR", due: "Jul 1",
        desc: "Upgrade the home office — desk, light, and some plants.",
        progress: 0.55, active: true,
        milestones: [ { id: "pm3", title: "Furniture", due: "Jun 20", status: "active", subtasks: [ { id: "ps5", t: "Order standing desk", done: true, next: false, who: "JR" }, { id: "ps6", t: "Pick a chair", done: false, next: true, who: "JR" } ] } ],
        updates: [ { id: "pu2", when: "Jun 1, 1:00 PM", who: "JR", text: "Standing desk ordered. Now hunting for a chair that won't wreck my back." } ],
      },
      {
        id: "pp3", title: "Read 24 books", status: "active", owner: "JR", due: "Dec 31",
        desc: "A book every fortnight this year. Currently on #14.",
        progress: 0.58, active: true,
        milestones: [ { id: "pm4", title: "Q2 reading", due: "Jun 30", status: "active", subtasks: [ { id: "ps7", t: "Finish 'The Overstory'", done: false, next: false, who: "JR" } ] } ],
        updates: [ { id: "pu3", when: "May 26, 9:45 PM", who: "JR", text: "Finished book #13. Slightly ahead of pace — 14 in progress." } ],
      },
    ],
    contacts: [
      { id: "pc1", name: "Mom", company: "Family", role: "", rel: "Family", email: "mom@home.net", phone: "+1 415 555 0011", color: "#F59E0B", lastNote: "Quick chat about the garden", lastDate: "May 28", followUp: true, remember: "Loves a Sunday call. Knee surgery coming up in July — check in before and after. Sends the best care packages." },
      { id: "pc2", name: "Sam Whitfield", company: "", role: "Best friend", rel: "Friend", email: "sam@whitfield.me", phone: "+1 628 555 0044", color: "#4F6BED", lastNote: "Planning the Lisbon trip together", lastDate: "Jun 4", followUp: false, remember: "Coming to Lisbon. Allergic to shellfish. Wedding anniversary is Sep 2 — don't book travel that day." },
      { id: "pc3", name: "Dr. Anika Patel", company: "Bright Smile Dental", role: "Dentist", rel: "Other", email: "office@brightsmile.com", phone: "+1 415 555 0099", color: "#10B981", lastNote: "Overdue for a cleaning", lastDate: "Dec 12", followUp: true, remember: "Six-month cleanings. Front desk prefers morning appointments. Need to schedule — overdue." },
      { id: "pc4", name: "Theo Marsh", company: "", role: "College friend", rel: "Friend", email: "theo@marsh.io", phone: "+1 917 555 0188", color: "#8B5CF6", lastNote: "Owes me a call back", lastDate: "May 15", followUp: false, remember: "Just moved to Berlin. Try to visit on the Europe trip. New baby on the way in the fall." },
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
