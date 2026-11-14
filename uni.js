/* The content registry. Course files call UNI.addCourse and UNI.addWeek; app.js reads UNI.courses. */
window.UNI = {
  courses: [],
  byId: {},
  addCourse(c) {
    c.weeks = c.weeks || 13;
    c.content = {};
    this.courses.push(c);
    this.byId[c.id] = c;
  },
  addWeek(courseId, n, week) {
    const c = this.byId[courseId];
    if (!c) throw new Error('Unknown course: ' + courseId);
    c.content[n] = week;
  },
};
