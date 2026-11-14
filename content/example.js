/* Example content: week 6 of the Evidence notes (Hearsay), turned into the app's format.
 * Only used when Settings → Example content is on. It adds an Evidence course alongside the real ones,
 * and keeps its progress separately. Everything here comes from "Evidence Notes.docx". */
(function () {
  let on = false;
  try { on = JSON.parse(localStorage.getItem('uni.example') || 'false'); } catch (e) {}
  UNI.example = on;
  if (!on) return;

  UNI.addCourse({ id: 'evidence', name: 'Evidence', short: 'Evidence', colour: '#765ba7', weeks: 13, example: true });

  UNI.addWeek('evidence', 6, {
    title: 'An Introduction to Exclusionary Rules and Hearsay',
    source: { file: 'Evidence Notes.docx', pages: 'pp.48–53' },

    topics: [
      { title: 'The Rule Against Hearsay', ref: 'p.48', blocks: [
        { term: 'Hearsay', def: 'A witness may not give evidence of a **statement made out of court** in order to **prove the truth** of that statement.' },
        { quote: 'An assertion other than one made by a witness while testifying in the proceedings is inadmissible as evidence of any fact asserted.', by: 'Heydon, Cross on Evidence' },
        { quote: 'A statement, oral or written made otherwise than by a witness in giving evidence; and a statement contained or recorded in any book, document, or record whatever, proof of which is not admitted on other grounds, are deemed to be irrelevant for the purpose of proving the truth of the matter stated.', by: 'Stephen, A Digest on the Law of Evidence' },
        { case: 'R v Christie', short: 'Christie', body: ['Hearsay is no evidence of the thing heard.'] },
        { h: 'Rationale' },
        { p: 'Hearsay is excluded because (***Teper v The Queen***):' },
        { ul: ['it is **not the best evidence**;', 'it is **not given on oath**;', 'the maker’s truthfulness and accuracy **cannot be tested by cross-examination**;', 'the court cannot observe the maker’s **demeanour**; and', 'hearsay is **easily fabricated**, and hard to disprove even when it is.'] },
        { quote: 'The theory of the Hearsay rule is that the many possible deficiencies, suppressions, sources of error and untrustworthiness, which lie underneath the bare untested assertion of a witness, may be best brought to light and exposed by the test of cross-examination…the Hearsay rule, as accepted in our law, signifies a rule rejecting assertions, offered testimonially, which have not been in some way subjected to the test of cross-examination.', by: 'Wigmore' },
        { h: 'Out-of-court statement' },
        { p: 'An out-of-court statement includes:' },
        { ul: ['verbal statements;', 'written statements (with special exceptions for documentary hearsay, covered in Week 8);', 'gestures or other non-verbal communication, where **designed to convey information** (***Chandrasekera v The King***); and', 'express assertions and, in general, implied assertions.'] },
        { p: 'The rule only applies where the statement is used **to prove its truth**. So, evidence of an accused’s out-of-court **lie** is not hearsay. It is tendered because it is false, not to prove its contents (e.g. lies showing a consciousness of guilt, as in ***Baden-Clay***).' },
        { h: 'Express and implied assertions' },
        { term: 'Express assertion', def: 'The statement directly states the fact.' },
        { term: 'Implied assertion', def: 'The fact is **assumed** by the statement rather than stated.' },
        { p: 'Before ***Walton***, it was uncertain whether the hearsay rule applied to implied assertions. However, in ***Pollitt v The Queen***, McHugh J explained that an implied assertion is only as reliable as what was expressly said, so the same objections apply: the maker’s truthfulness, memory, perception and narration cannot be tested. Implied assertions are therefore treated as ‘contained’ in the out-of-court statement.' },
      ] },

      { title: 'Hearsay v Original Evidence', ref: 'p.49', blocks: [
        { p: 'The key question is **what the statement is being used to prove**.' },
        { term: 'Original evidence', def: 'Evidence that is tendered to prove that the statement **was made**, or to prove some other fact (e.g. someone’s state of mind or knowledge), and not its truth.' },
        { p: 'Original evidence must still be **relevant**: the fact it proves must bear on a fact in issue.' },
        { case: 'Subramaniam v Public Prosecutor', short: 'Subramaniam', body: [
          'Subramaniam was charged with possessing ammunition and pleaded duress. He said terrorists had captured him and threatened to kill him if he did not take part. The trial judge excluded what the terrorists said to him as hearsay.',
          'The Privy Council allowed the appeal. The statements were not tendered for their truth, but to prove the **fact they were made**, which was relevant to his **state of mind** and later conduct (a fact in issue for duress). They were not hearsay.'] },
        { p: 'Common examples of original evidence include:' },
        { table: { head: ['Use', 'Example'], rows: [
          ['**That the statement was made**', '***Rush v Nationwide News Pty Ltd (No 9)***: the articles were tendered to prove they were published, and then that they were defamatory, not to prove their contents. (In Australian defamation proceedings, the defendant bears the burden of proving substantial truth.)'],
          ['**Awareness of a person**', 'A greeting may prove the speaker knew another person was present, e.g. someone to whom a duty of care was owed.'],
          ['**A relationship or context**', 'A conversation with no relevant assertions may prove two people knew each other, despite claiming to be strangers (***R v Kennedy***), or that a conversation occurred, or give context for other events.'],
          ['**Knowledge**', '***Kamleh v The Queen***: a statement was tendered to show the co-offender knew the television had been turned up to full volume.'],
          ['**State of mind of the maker**', '***Ratten***, ***Bartzis***, ***Matthews*** (below).'],
          ['**What the statement maker later did**', '***Walton***, ***Hytch***, ***Campbell*** (below).'],
          ['**State of mind of the hearer**', '***Subramaniam***, ***Bull*** (below).']] } },
        { h: 'State of mind of the maker' },
        { case: 'Ratten v The Queen', short: 'Ratten', body: [
          'Ratten was charged with murdering his wife and claimed the gun discharged accidentally. A telephone operator gave evidence that, shortly before the shooting, she took a call from a sobbing woman saying ‘get me the police please’ and giving the address.',
          'The Privy Council held it was **not hearsay**. It was relevant to show the wife’s **state of mind** (fear) at the time. In any event, it would have been admissible as res gestae (Week 7).',
          'The case predates ***Walton***, and the Privy Council did not consider the implied assertion issue.'] },
        { case: 'R v Bartzis', short: 'Bartzis', body: [
          'Bartzis, charged with grievous bodily harm, wanted to rely on the contents of his **000 calls**, in which he said the complainant had attacked him. The calls were **not res gestae**: they were a narrative of past events, and parts were false. The **fact** he called 000 was admissible as evidence of his fear. The **contents** were relevant only for their truth, so they were **hearsay**.'] },
        { case: 'R v Matthews', short: 'Matthews', body: [
          'Matthews was charged with rape and murder, and claimed the intercourse was consensual and that he killed her under provocation. Evidence of the deceased’s complaints about him and her **fear** of him in the days before her death was admitted. It was not admitted for its truth, but as evidence of her **state of mind**. That was **relevant** to both charges: it made his account of consensual intercourse incredible, and it gave the **background** to the relationship.',
          'Matthews sits uneasily with ***R v Frawley***, where Gleeson CJ said the deceased’s fear does not itself prove the accused killed her. It would only do so if the fear was well-founded, which is the very thing the statement cannot be used to prove.'] },
        { h: 'State of mind of the hearer' },
        { case: 'Bull v The Queen', short: 'Bull', judge: 'McHugh, Gummow and Hayne JJ', body: [
          'Bull was convicted of rape. He sought to give evidence of a phone call with the complainant two hours earlier, in which he referred to her ‘fantasies’ and offered to ‘blow away’ her ‘cobwebs’, after which she came to his house. The evidence was excluded.',
          'It was **not hearsay**. Its relevance did not depend on the truth of what the complainant said, but on the fact that **Bull said those things**, she responded, and she then went to the house. That was evidence of her **reason for going**, which was relevant to consent (and honest belief in consent).',
          'The chain of relevance had two steps, but that did not affect admissibility. Whether events later went beyond what she had in mind went to **weight**, for the jury. A direction would have been needed that the evidence could not be used to infer her sexual disposition. New trial ordered.'] },
        { p: '***Subramaniam*** (above) is also an example of a statement used to prove the hearer’s state of mind.' },
        { h: 'Statement used to infer what the (deceased) statement maker later did' },
        { p: 'A statement of intention can be used to infer that the maker **later did what they said they would**, assuming the statement was sincerely made, that people generally do not assert intentions they do not have, and generally carry out the intentions they assert (***R v Hytch***).' },
        { case: 'Walton', short: 'Walton', body: [
          'Walton was charged with murdering his former partner, Ms Croad. A fact in issue was whether he had arranged to meet her in the town centre.',
          '**Statements of intention**: three witnesses said Croad told them she planned to meet Walton in town. These were admissible as evidence of her **state of mind**, from which it could be inferred she carried out her intention. Not hearsay.',
          '**The phone call**: a witness was with Croad when she took a call, said ‘Daddy’s on the phone’ to her son, and the son said ‘Hello Daddy’. Evidence of the call was generally admissible. But ‘Hello Daddy’ was an **implied assertion** tendered for its truth (that the caller was Walton), so it was **hearsay** and should not have been admitted. The proviso was applied.',
          'A statement about a person’s state of mind may only have value if it is true, so there may be an element of hearsay. But it can still be treated as **conduct from which an inference is drawn**, rather than an assertion used to prove its truth. The distinction is fine, but should be drawn.'] },
        { p: 'In ***Bull***, McHugh, Gummow and Hayne JJ observed that ***Walton*** comes **perilously close** to using the assertions to prove the fact asserted, but that ‘common sense pragmatism prevailed’. In Queensland, the proviso is in **s 668E(1A) *Criminal Code***.' },
        { case: 'R v Hytch', short: 'Hytch', body: [
          'Hytch was convicted of the manslaughter of a 16-year-old with whom he was said to be in a secret relationship. Her body was never found. She had told friends she planned to meet him that night and falsely tell him she was pregnant.',
          '**Admissibility:** the statements were admissible under ***Walton*** as evidence of her **intention** to (1) meet him (which went to whether they met), and (2) her intention to claim pregnancy (which went to why he might have harmed her).',
          '**Direction:** the judge referred to an ‘**arrangement**’ between them, which suggested a mutual plan to meet. Her statements could prove only **her** state of mind, not his. Using them to prove his intentions or actions would be hearsay. Retrial was ordered and Hytch was acquitted.'] },
        { case: 'R v Campbell', short: 'Campbell', body: [
          'Campbell was convicted of fraudulently transferring a deceased man’s house to herself. His statements to others about planning to sell her only a **half share** were admissible under ***Walton***, as **conduct showing his state of mind**, not as proof the agreement existed. Because the hearsay element was only incidental, no hearsay warning was needed.'] },
        { h: 'State of mind about something that has already occurred' },
        { case: 'Pollitt v The Queen', short: 'Pollitt', body: [
          'Allen hired Pollitt to kill Williams, but Simpson was shot by mistake. Allen died before trial. Witnesses described three things:',
          { ul: ['**the phone call:** Allen told the caller he would ‘get the rest of the money when you do the job properly’;', '**straight after the call:** Allen said he had been speaking to ‘**Ray**’, who had ‘stuffed up’ a job; and', '**days later:** Allen said ‘**Roy got the wrong one** and he wants to be paid for it’.'] },
          { h: 'Brennan J (Deane, Toohey and McHugh JJ agreeing in analysis)' },
          { ul: ['**Phone call:** **original evidence**. The promise to pay supported an inference that the caller had agreed to do a job and had not done it. With other evidence that Pollitt rang Allen that morning, it helped prove the contract.', '**Later statements naming Ray or Roy:** **hearsay**. They proved the caller’s identity only if Allen’s assertion was true. Allen’s own knowledge or state of mind was irrelevant.'] },
          { h: 'Dawson and Gaudron JJ' },
          'The statements together were a **pattern of conduct** by Allen supporting the inference of a contract killing, so all were admissible.',
          { h: 'Mason CJ' },
          'The hearsay rule should be **relaxed** for statements made during a phone call that identify the other party. These are **implied assertions** that are **spontaneous** and likely to be **reliable**.',
          { h: 'Outcome' },
          'Appeal dismissed 4-3. Four judges found the later statements inadmissible. McHugh J was one of them, but he applied the **proviso**.'] },
      ] },

      { title: 'Potential Exceptions', ref: 'p.52', blocks: [
        { h: 'Telephone exception (narrow)' },
        { case: 'Walton', short: 'Walton', judge: 'Deane J (obiter)', body: [
          'The hearsay rule should not be so inflexibly applied so as to confound justice or common sense or produce the consequence that the law was unattuned to the circumstances of the society which it exists to serve. The hearsay rule should sometimes yield to admit a party’s statements made during (or just before or after) a phone call that identify the other party as the accused.'] },
        { p: 'Similar comments were made by Gaudron J and McHugh J in ***Benz*** and ***Pollitt***.' },
        { p: 'In ***Pollitt***, Mason CJ considered the hearsay rule should be relaxed so as to permit the reception of evidence of statement during the course of a telephone conversation, by a party to it, identifying the other party. These are implied assertions that are part of the conversation, spontaneous, and likely reliable.' },
        { h: 'General reliability exception (broad)' },
        { case: 'Bannon v The Queen', short: 'Bannon', judge: 'Brennan CJ', body: [
          'Rejected admitting hearsay whenever the judge considers it sufficiently reliable. It would transform the criminal trial. With no specific criteria, admissibility would turn only on the judge’s view of reliability against prejudice to an accused who cannot cross-examine the maker. That is not an appropriate power.'] },
        { case: 'Baker v The Queen', short: 'Baker', judge: 'French CJ, Hayne, Crennan, Kiefel and Bell JJ', body: [
          'Baker and LM were jointly tried for murder. LM admitted to police that he pushed the deceased, and Baker sought to use that admission to show his own innocence, however, it was inadmissible.',
          'The appeal was dismissed as there is no common law hearsay exception for the confessions of a co-accused or third party. Creating one would significantly change the common law in States that have not adopted the uniform Evidence Acts, including Queensland.',
          { h: 'Heydon J' },
          'Agreed with Brennan CJ’s reasons in ***Bannon*** for rejecting a relaxation for ‘sufficiently reliable’ evidence. There is **no general reliability exception**.'] },
      ] },

      { title: 'The Uniform Evidence Acts', ref: 'p.53', blocks: [
        { law: { act: 'Evidence Act 1995 (Cth)', short: 'EAC', items: [
          ['s 59(1)', 'Evidence of a previous representation is not admissible to prove a fact the person intended to assert by it.'],
          ['s 59(2)', 'That fact is an ***asserted fact***.'],
          ['s 59(2A)', 'In deciding what the person intended to assert, the court may consider the circumstances in which the representation was made.'],
          ['s 60(1)', 'The hearsay rule does not apply to evidence admitted because it is relevant for a non-hearsay purpose.'],
          ['s 60(2)', 'This applies whether or not the maker had personal knowledge of the asserted fact.'],
          ['s 60(3)', 'Section 60 does not apply in a criminal proceeding to an admission (which may still be admissible under ss 81-82).']] } },
        { p: 'Because s 59 only catches facts the maker **intended** to assert, unintended implied assertions fall outside the statutory rule. This differs from the common law position after ***Walton***.' },
        { p: 'The EAQ has no equivalent of Chapter 3 of the EAC. In Queensland, the rule against hearsay remains a **common law** rule (***Baker***), and the common law exceptions sit alongside specific statutory exceptions in the EAQ (Weeks 7 and 8).' },
      ] },
    ],

    method: { title: 'Approaching hearsay in a problem question', ref: 'p.53', steps: [
      { t: 'Is the evidence relevant?' },
      { t: 'Is it an out-of-court statement?', sub: ['Is it oral, written, or conduct designed to convey information?', 'Is the relevant fact asserted expressly, or only implied?'] },
      { t: 'What is it being used to prove?', sub: ['Its truth? Then it is hearsay.', 'That it was said? (***Subramaniam***, ***Rush***)', 'The maker’s state of mind? (***Ratten***, ***Matthews***)', 'The hearer’s state of mind? (***Bull***, ***Subramaniam***)', 'Someone’s knowledge? (***Kamleh***)', 'The maker’s intention, to infer what they later did? (***Walton***, ***Hytch***, ***Campbell***)'] },
      { t: 'If it is original evidence, is that use relevant to a fact in issue?', sub: ['Can the admissible use be separated from the hearsay use? (***Walton***, ***Bartzis***)', 'What direction is needed to confine its use? (e.g. it cannot prove the accused’s intentions or acts: ***Hytch***)'] },
      { t: 'If it is hearsay, does an exception apply?', sub: ['Consider admissions and confessions, statements of deceased persons, documents and business records, and res gestae (Weeks 7 and 8).', 'There is no telephone exception and no general reliability exception.'] },
    ] },

    cards: [
      // The Rule Against Hearsay
      { topic: 0, type: 'term', q: 'What is the rule against hearsay?', a: 'A witness may not give evidence of a statement made out of court in order to prove the truth of that statement.', ref: 'p.48' },
      { topic: 0, type: 'case', q: 'R v Christie: what does it say about hearsay?', a: 'Hearsay is no evidence of the thing heard.', ref: 'p.48' },
      { topic: 0, type: 'idea', q: 'Give the five reasons hearsay is excluded (Teper v The Queen).', a: 'It is not the best evidence; it is not given on oath; the maker’s truthfulness and accuracy cannot be tested by cross-examination; the court cannot observe the maker’s demeanour; and it is easily fabricated, and hard to disprove even when it is.', ref: 'p.48' },
      { topic: 0, type: 'idea', q: 'According to Wigmore, what is the theory behind the hearsay rule?', a: 'The deficiencies and sources of error beneath a bare untested assertion are best exposed by cross-examination, so the rule rejects assertions offered testimonially that have not been subjected to that test.', ref: 'p.48' },
      { topic: 0, type: 'idea', q: 'What counts as an out-of-court statement?', a: 'Verbal statements; written statements (with special exceptions for documentary hearsay); gestures or other non-verbal communication designed to convey information (Chandrasekera v The King); and express and, in general, implied assertions.', ref: 'p.48' },
      { topic: 0, type: 'idea', q: 'Is evidence of an accused’s out-of-court lie hearsay?', a: 'No. It is tendered because it is false, not to prove its contents (e.g. lies showing a consciousness of guilt, as in Baden-Clay).', ref: 'p.48' },
      { topic: 0, type: 'term', q: 'Express assertion v implied assertion?', a: 'An express assertion directly states the fact. An implied assertion assumes the fact rather than stating it.', ref: 'p.48' },
      { topic: 0, type: 'case', q: 'Pollitt (McHugh J): why does the hearsay rule apply to implied assertions?', a: 'An implied assertion is only as reliable as what was expressly said, so the same objections apply: the maker’s truthfulness, memory, perception and narration cannot be tested. Implied assertions are treated as ‘contained’ in the statement.', ref: 'p.48' },
      // Hearsay v Original Evidence
      { topic: 1, type: 'idea', q: 'What is the key question in distinguishing hearsay from original evidence?', a: 'What the statement is being used to prove.', ref: 'p.49' },
      { topic: 1, type: 'term', q: 'What is original evidence?', a: 'Evidence tendered to prove that the statement was made, or to prove some other fact (e.g. someone’s state of mind or knowledge), and not its truth. It must still be relevant to a fact in issue.', ref: 'p.49' },
      { topic: 1, type: 'case', q: 'Subramaniam v Public Prosecutor: why were the terrorists’ threats not hearsay?', a: 'They were tendered to prove the fact they were made, which was relevant to his state of mind and later conduct (a fact in issue for duress), not for their truth.', ref: 'p.49' },
      { topic: 1, type: 'case', q: 'Rush v Nationwide News (No 9): why were the articles original evidence?', a: 'They were tendered to prove they were published, and then that they were defamatory, not to prove their contents.', ref: 'p.49' },
      { topic: 1, type: 'case', q: 'R v Kennedy: what can a conversation with no relevant assertions prove?', a: 'That two people knew each other, despite claiming to be strangers.', ref: 'p.49' },
      { topic: 1, type: 'case', q: 'Kamleh v The Queen: what was the statement tendered to show?', a: 'That the co-offender knew the television had been turned up to full volume (knowledge).', ref: 'p.49' },
      { topic: 1, type: 'case', q: 'Ratten v The Queen: why was the call to the telephone operator admissible?', a: 'It was not hearsay: it was relevant to show the wife’s state of mind (fear) at the time. In any event it would have been admissible as res gestae.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'R v Bartzis: what was admissible about the 000 calls, and what was not?', a: 'The fact he called 000 was admissible as evidence of his fear. The contents were relevant only for their truth, so they were hearsay. The calls were not res gestae: they narrated past events and parts were false.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'R v Matthews: on what basis was the deceased’s fear of the accused admitted?', a: 'As evidence of her state of mind, not for its truth. It made his account of consensual intercourse incredible and gave the background to the relationship.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'How does R v Frawley sit uneasily with Matthews?', a: 'Gleeson CJ said the deceased’s fear does not itself prove the accused killed her. It would only do so if the fear was well-founded, which is the very thing the statement cannot be used to prove.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'Bull v The Queen: why was evidence of the phone call not hearsay?', a: 'Its relevance did not depend on the truth of what the complainant said, but on the fact that Bull said those things, she responded, and then went to the house: evidence of her reason for going, relevant to consent.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'Bull v The Queen: what direction would have been needed?', a: 'That the evidence could not be used to infer her sexual disposition. Whether events went beyond what she had in mind went to weight, for the jury.', ref: 'pp.49–52' },
      { topic: 1, type: 'idea', q: 'On what assumptions can a statement of intention be used to infer the maker later acted on it (R v Hytch)?', a: 'That the statement was sincerely made, that people generally do not assert intentions they do not have, and that they generally carry out the intentions they assert.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'Walton: why were Croad’s statements that she planned to meet Walton admissible?', a: 'As evidence of her state of mind, from which it could be inferred she carried out her intention. Not hearsay.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'Walton: why was ‘Hello Daddy’ inadmissible?', a: 'It was an implied assertion tendered for its truth (that the caller was Walton), so it was hearsay. The proviso was applied.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'What did the plurality in Bull say about Walton?', a: 'That Walton comes perilously close to using the assertions to prove the fact asserted, but ‘common sense pragmatism prevailed’.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'R v Hytch: what was wrong with the judge’s direction?', a: 'The judge referred to an ‘arrangement’, suggesting a mutual plan. Her statements could prove only her state of mind, not his. Using them to prove his intentions or actions would be hearsay.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'R v Campbell: why was no hearsay warning needed?', a: 'The deceased’s statements about selling only a half share were admitted under Walton as conduct showing his state of mind, and the hearsay element was only incidental.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'Pollitt (Brennan J): how were the phone call and the later statements treated?', a: 'The phone call was original evidence: the promise to pay supported an inference the caller had agreed to do a job and not done it. The later statements naming Ray or Roy were hearsay: they proved identity only if Allen’s assertion was true.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'Pollitt: what did Dawson and Gaudron JJ, and Mason CJ, say?', a: 'Dawson and Gaudron JJ: all the statements were a pattern of conduct supporting a contract killing, so all were admissible. Mason CJ: the rule should be relaxed for statements in a phone call identifying the other party.', ref: 'pp.49–52' },
      { topic: 1, type: 'case', q: 'What was the outcome in Pollitt?', a: 'Appeal dismissed 4-3. Four judges found the later statements inadmissible; McHugh J was one of them, but applied the proviso.', ref: 'pp.49–52' },
      // Potential Exceptions
      { topic: 2, type: 'case', q: 'What did Deane J say (obiter) in Walton about a telephone exception?', a: 'The rule should not be applied so inflexibly as to confound justice or common sense. It should sometimes yield to admit a party’s statements made during (or just before or after) a phone call identifying the other party as the accused.', ref: 'p.52' },
      { topic: 2, type: 'case', q: 'Bannon v The Queen: why did Brennan CJ reject a general reliability exception?', a: 'It would transform the criminal trial. With no specific criteria, admissibility would turn only on the judge’s view of reliability against prejudice to an accused who cannot cross-examine the maker.', ref: 'p.52' },
      { topic: 2, type: 'case', q: 'Baker v The Queen: could Baker use LM’s admission to show his own innocence?', a: 'No. There is no common law hearsay exception for confessions of a co-accused or third party. Creating one would significantly change the common law in non-uniform States, including Queensland.', ref: 'p.52' },
      { topic: 2, type: 'idea', q: 'Is there a telephone exception or a general reliability exception to hearsay in Queensland?', a: 'No. There is no telephone exception and no general reliability exception (Bannon; Baker).', ref: 'p.53' },
      // The Uniform Evidence Acts
      { topic: 3, type: 'law', q: 'EAC s 59(1): what does it provide?', a: 'Evidence of a previous representation is not admissible to prove a fact the person intended to assert by it.', ref: 'p.53' },
      { topic: 3, type: 'law', q: 'EAC s 60(1): what does it provide?', a: 'The hearsay rule does not apply to evidence admitted because it is relevant for a non-hearsay purpose.', ref: 'p.53' },
      { topic: 3, type: 'law', q: 'EAC s 60(3): what is the limit on s 60?', a: 'Section 60 does not apply in a criminal proceeding to an admission (which may still be admissible under ss 81-82).', ref: 'p.53' },
      { topic: 3, type: 'idea', q: 'How does EAC s 59 differ from the common law position after Walton?', a: 's 59 only catches facts the maker intended to assert, so unintended implied assertions fall outside the statutory rule.', ref: 'p.53' },
      { topic: 3, type: 'idea', q: 'In Queensland, is the rule against hearsay statutory or common law?', a: 'Common law (Baker). The EAQ has no equivalent of Chapter 3 of the EAC; common law exceptions sit alongside specific statutory exceptions in the EAQ.', ref: 'p.53' },
    ],

    quiz: [
      { topic: 0, q: 'An accused’s out-of-court lie, tendered to show consciousness of guilt, is…', options: ['Hearsay, so inadmissible', 'Not hearsay, because it is tendered because it is false', 'Hearsay, but within the res gestae exception', 'Only admissible under EAC s 60'], answer: 1, why: 'The rule only applies where a statement is used to prove its truth. A lie is tendered because it is false (e.g. Baden-Clay).', ref: 'p.48' },
      { topic: 0, q: 'Which of these is NOT one of the reasons for excluding hearsay given in Teper?', options: ['It is not given on oath', 'The maker cannot be cross-examined', 'It is always irrelevant', 'It is easily fabricated'], answer: 2, why: 'Teper lists: not the best evidence, not on oath, cannot be tested by cross-examination, demeanour cannot be observed, easily fabricated.', ref: 'p.48' },
      { topic: 1, q: 'In Subramaniam, the terrorists’ threats were admissible because they were relevant to…', options: ['The truth of the threats', 'Subramaniam’s state of mind, for duress', 'The terrorists’ identity', 'The res gestae of the offence'], answer: 1, why: 'They proved the fact the threats were made, which went to his state of mind and later conduct.', ref: 'p.49' },
      { topic: 1, q: 'In R v Bartzis, the contents of the accused’s 000 calls were…', options: ['Admissible as res gestae', 'Admissible as evidence of his fear', 'Hearsay, because relevant only for their truth', 'Admissible as original evidence of knowledge'], answer: 2, why: 'The fact of the calls showed fear; the contents mattered only if true, so they were hearsay.', ref: 'pp.49–52' },
      { topic: 1, q: 'In Walton, why was ‘Hello Daddy’ inadmissible?', options: ['It was irrelevant', 'It was an implied assertion tendered for its truth', 'The child was not competent', 'It was a prior consistent statement'], answer: 1, why: 'It was tendered to prove the caller was Walton, which depended on its truth, so it was hearsay.', ref: 'pp.49–52' },
      { topic: 1, q: 'R v Hytch shows that a deceased’s statement of intention to meet the accused can prove…', options: ['That the accused intended to meet her', 'An arrangement between them', 'Only her state of mind, not his', 'Nothing, because she was deceased'], answer: 2, why: 'Using her statements to prove his intentions or actions would be hearsay; the ‘arrangement’ direction was wrong.', ref: 'pp.49–52' },
      { topic: 1, q: 'In Pollitt, Brennan J treated Allen’s later statements that ‘Roy got the wrong one’ as…', options: ['Original evidence of a pattern of conduct', 'Hearsay', 'Admissible under a telephone exception', 'Admissible as an admission'], answer: 1, why: 'They proved the caller’s identity only if Allen’s assertion was true. Dawson and Gaudron JJ took the pattern-of-conduct view.', ref: 'pp.49–52' },
      { topic: 2, q: 'Which case rejected a common law exception for a co-accused’s confession?', options: ['Bannon v The Queen', 'Baker v The Queen', 'Walton', 'Ratten v The Queen'], answer: 1, why: 'Baker: no exception for confessions of a co-accused or third party; creating one would change the common law in non-uniform States.', ref: 'p.52' },
      { topic: 2, q: 'In Bannon, Brennan CJ rejected admitting hearsay whenever…', options: ['The maker has died', 'The judge considers it sufficiently reliable', 'It is an implied assertion', 'It identifies a caller on the phone'], answer: 1, why: 'A general reliability exception would turn only on the judge’s view of reliability against prejudice, which is not an appropriate power.', ref: 'p.52' },
      { topic: 3, q: 'Under EAC s 59, unintended implied assertions…', options: ['Are always hearsay', 'Fall outside the statutory rule', 'Are admissible only in civil cases', 'Must be excluded under s 60'], answer: 1, why: 's 59 only catches facts the maker intended to assert, unlike the common law after Walton.', ref: 'p.53' },
    ],
  });
})();
