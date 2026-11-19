/* The University of Queensland's Semester 1, 2027 calendar, shown in the app as "Calendar".
 * Source: UQ academic calendar (about.uq.edu.au). Rows are weeks, Monday to Sunday.
 * Teaching weeks are 01 to 13, with the mid-semester break between weeks 05 and 06. */
window.UNI_CALENDAR = {
  name: 'Semester 1, 2027',
  source: 'University of Queensland · academic calendar (about.uq.edu.au)',
  note: 'Mid-semester break: Fri 26 Mar to Sun 4 Apr. Classes resume Mon 5 Apr.',
  rows: [
    { name: 'Orientation', start: '2027-02-15' },
    { week: 1, start: '2027-02-22' }, { week: 2, start: '2027-03-01' }, { week: 3, start: '2027-03-08' },
    { week: 4, start: '2027-03-15' }, { week: 5, start: '2027-03-22' },
    { name: 'Mid-sem break', start: '2027-03-29' },
    { week: 6, start: '2027-04-05' }, { week: 7, start: '2027-04-12' }, { week: 8, start: '2027-04-19' },
    { week: 9, start: '2027-04-26' }, { week: 10, start: '2027-05-03' }, { week: 11, start: '2027-05-10' },
    { week: 12, start: '2027-05-17' }, { week: 13, start: '2027-05-24' },
    { name: 'SWOTVAC', start: '2027-05-31' },
    { name: 'Exams', start: '2027-06-07' },
    { name: 'Exams', start: '2027-06-14' },
  ],
  // Shaded periods: break (light yellow), SWOTVAC (light blue), exams (light lilac)
  periods: [
    { from: '2027-03-26', to: '2027-04-04', kind: 'break' },
    { from: '2027-05-31', to: '2027-06-04', kind: 'swot' },
    { from: '2027-06-05', to: '2027-06-19', kind: 'exam' },
  ],
  // Key dates, written in their day
  keys: {
    '2027-02-15': 'O-week', '2027-02-22': 'Start', '2027-03-07': 'Add by',
    '2027-03-26': 'Break', '2027-03-31': 'Census', '2027-04-05': 'Resume',
    '2027-04-26': 'Anzac', '2027-04-30': 'Drop', '2027-05-03': 'Labour',
    '2027-05-28': 'Ends', '2027-06-04': 'Drop', '2027-06-19': 'Ends',
  },
};
