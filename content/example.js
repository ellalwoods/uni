/* Example content, so the app can be tried before any notes are added.
 * Only used when Settings → Example content is on. It replaces the real content while it's on,
 * and keeps its progress separately. None of this comes from your notes. */
(function () {
  let on = false;
  try { on = JSON.parse(localStorage.getItem('uni.example') || 'false'); } catch (e) {}
  UNI.example = on;
  if (!on) return;
  UNI.courses.forEach(c => { c.content = {}; });

  const week = (title, file, pages, topics, cards, quiz, summary) => ({
    title, source: { file, pages }, topics, cards, quiz,
    summary: summary || [{ heading: title, points: cards.map(c => c.a), ref: 'p.1' }],
  });
  const card = (q, a, ref) => ({ q, a, ref });
  const mc = (q, options, answer, why, ref) => ({ q, options, answer, why, ref });

  UNI.addWeek('ica', 1, week('What arbitration is', 'ICA Week 1 notes.pdf', 9,
    ['Arbitration as consent-based dispute resolution', 'Party autonomy', 'Arbitration compared with litigation'],
    [card('What makes arbitration different from going to court?', 'It only happens because the parties agreed to it, and they choose the decision-makers and much of the procedure.', 'p.2'),
     card('What is party autonomy?', 'The parties’ freedom to shape the arbitration: who decides, where, under which rules and in which language.', 'p.4'),
     card('Name two reasons businesses choose arbitration.', 'A neutral forum away from either party’s home courts, and an award that is easier to enforce across borders.', 'p.6')],
    [mc('Arbitration depends above all on…', ['A court order', 'The parties’ consent', 'The seriousness of the dispute', 'The amount at stake'], 1, 'Without an agreement to arbitrate there is no arbitration.', 'p.2')]));

  UNI.addWeek('ica', 2, week('The arbitration agreement', 'ICA Week 2 notes.pdf', 11,
    ['Separability', 'Kompetenz-Kompetenz', 'Written form', 'Pathological clauses', 'Scope of the clause', 'Non-signatories', 'Multi-tier clauses'],
    [card('Why does an arbitration clause survive when the main contract is said to be void?', 'The clause is treated as its own small agreement inside the bigger one. An attack on the main contract doesn’t by itself knock out the promise to arbitrate, so the tribunal can still decide whether the contract is void.', 'p.3'),
     card('What is Kompetenz-Kompetenz?', 'The tribunal’s power to rule on its own jurisdiction, including objections about whether the arbitration agreement exists or is valid.', 'p.4'),
     card('What is a pathological clause?', 'A badly drafted arbitration clause, for example one naming an institution that doesn’t exist, which makes it unclear whether or how the parties meant to arbitrate.', 'p.6'),
     card('Why does written form matter?', 'Many laws and treaties only recognise an arbitration agreement that is in writing, so form affects whether it can be enforced.', 'p.5'),
     card('What is a multi-tier clause?', 'A clause that requires steps such as negotiation or mediation before arbitration can start.', 'p.9')],
    [mc('Separability means that…', ['The award can be split into parts', 'The arbitration clause is treated as independent of the main contract', 'Each party appoints a separate arbitrator', 'Claims must be heard separately'], 1, 'The clause stands apart, so the main contract being void doesn’t automatically void it.', 'p.3'),
     mc('Who decides first whether the tribunal has jurisdiction?', ['The national court, always', 'The parties, by vote', 'The tribunal itself', 'The institution’s secretary'], 2, 'That is Kompetenz-Kompetenz.', 'p.4'),
     mc('A clause naming an institution that doesn’t exist is an example of…', ['A multi-tier clause', 'A pathological clause', 'An optional clause', 'A submission agreement'], 1, 'It is defective in a way that makes the parties’ intention unclear.', 'p.6')],
    [{ heading: 'Separability', points: ['The arbitration clause is a separate agreement from the main contract.', 'If the main contract is void, the clause can still survive.'], ref: 'p.3' },
     { heading: 'Kompetenz-Kompetenz', points: ['The tribunal can decide its own jurisdiction.', 'Courts may review that decision later.'], ref: 'p.4' },
     { heading: 'Form and drafting', points: ['Agreements usually need to be in writing.', 'Poorly drafted (pathological) clauses cause disputes about whether to arbitrate at all.'], ref: 'pp.5–6' },
     { heading: 'Who is bound', points: ['Normally only the parties who signed.', 'Non-signatories can sometimes be bound, for example through agency or assignment.'], ref: 'pp.7–8' }]));

  const quick = (id, n, title, topics) => UNI.addWeek(id, n, week(title, `Week ${n} notes.pdf`, 8 + n % 5, topics,
    topics.map((t, i) => card(`Explain: ${t}`, `Example answer about ${t.toLowerCase()}, written from the week’s notes.`, `p.${i + 2}`)),
    [mc(`Which of these was covered in week ${n}?`, [topics[0], 'Maritime salvage', 'Patent term extension', 'Tax residency'], 0, `${topics[0]} is one of this week’s topics.`, 'p.2')]));
  [['Seats and laws', ['The seat', 'Governing law', 'Procedural law']], ['Institutions', ['Institutional rules', 'Ad hoc arbitration', 'Fees']],
   ['The tribunal', ['Appointment', 'Independence', 'Challenges']], ['Jurisdiction', ['Objections', 'Timing', 'Court review']],
   ['Interim measures', ['Emergency arbitrators', 'Court support', 'Security for costs']], ['Evidence', ['Documents', 'Witnesses', 'Experts']],
   ['The award', ['Form of the award', 'Reasons', 'Costs']], ['Challenges to awards', ['Setting aside', 'Grounds', 'Time limits']]]
    .forEach(([t, topics], i) => quick('ica', i + 3, t, topics));
  [['Corporate personality', ['Separate legal personality', 'Limited liability']], ['Lifting the veil', ['Evasion', 'Concealment']],
   ['Directors’ duties', ['Duty of care', 'Fiduciary duties']], ['Shareholders', ['Shareholder rights', 'Derivative claims']],
   ['Capital', ['Share capital', 'Distributions']], ['Corporate governance', ['The board', 'Disclosure']]]
    .forEach(([t, topics], i) => quick('corporate', i + 1, t, topics));
  [['Regulating AI', ['Defining an AI system', 'Risk-based regulation']], ['The EU AI Act', ['Prohibited practices', 'High-risk systems']],
   ['Transparency', ['Disclosure duties', 'Explainability']], ['Liability', ['Fault', 'Product liability']],
   ['Data', ['Training data', 'Privacy']], ['Copyright', ['Training and copyright', 'AI-generated works']]]
    .forEach(([t, topics], i) => quick('ailaw', i + 1, t, topics));
})();
