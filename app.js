/* نسخة عرض ثابتة (GitHub Pages) من نظام طلبات قسم الكهرباء والإلكترونيات — عربي / English.
   كل البيانات محفوظة في متصفح المستخدم (localStorage) — ما في سيرفر. */
(function () {
  "use strict";

  var KEY = "khafr_demo_v2", LKEY = "khafr_lang";
  var LANG = "ar";
  try { if (localStorage.getItem(LKEY) === "en") LANG = "en"; } catch (e) {}
  function L(ar, en) { return LANG === "en" ? en : ar; }
  function T(p) { return p ? p[LANG === "en" ? 1 : 0] : ""; }

  var LIMIT = 4;          // الحد الأعلى للاستئذانات بالشهر
  var PERM_MIN = 180;     // الاستئذان 3 ساعات بالضبط
  var LATE_DAYS = 2;      // بعد يومين من تاريخ الطلب: يوصل عادي للإداري مع تنبيه احتمال الرفض
  var LATE_KINDS = ["perm", "leave", "emer", "med", "pleave", "ext"];
  var LEAVE_KINDS = ["leave", "emer", "pleave", "pexit", "ext"]; // تنبيه الحضور للقسم بعد الإجازة
  // التمديد للإجازة الاعتيادية فقط (أو تمديد سابق لها)
  function extable(r) { return r.kind === "leave" || (r.kind === "ext" && r.ext_kind === "leave"); }
  var PRO_KINDS = ["pleave", "pexit"];                     // يعتمدها مسؤول المهنيين
  var KINDS = {
    perm: ["استئذان", "Permission"], leave: ["إجازة", "Leave"], emer: ["إجازة عارضة (طارئة)", "Casual (emergency) leave"],
    med: ["اعتماد طبية (إجازة مرضية)", "Medical certificate (sick leave)"], meet: ["طلب مقابلة", "Meeting request"],
    pleave: ["إجازة مهنيين", "Professionals leave"], pexit: ["إذن مغادرة (مهنيين)", "Exit permit (professionals)"],
    ext: ["تمديد إجازة", "Leave extension"]
  };
  // اسم التمديد حسب نوع الإجازة الأصلية
  var EXTN = { leave: ["تمديد إجازة", "Leave extension"], emer: ["تمديد إجازة عارضة", "Casual leave extension"], med: ["تمديد إجازة مرضية", "Sick leave extension"],
               pleave: ["تمديد إجازة مهنيين", "Professionals leave extension"], pexit: ["تمديد إذن مغادرة (مهنيين)", "Exit permit extension (professionals)"] };
  // أقسام الطلبات: كل قسم بخانته
  var CATS = {
    perm: { t: ["الاستئذانات", "Permissions"], one: ["استئذان", "Permission"], icon: "⏱️", kinds: ["perm"], d: ["3 ساعات بالضبط — 4 في الشهر كحد أقصى", "Exactly 3 hours — max 4 a month"] },
    leave: { t: ["الإجازات", "Leaves"], one: ["إجازة", "Leave"], icon: "🏖️", kinds: ["leave", "emer"], d: ["إجازة اعتيادية أو عارضة", "Regular or casual leave"] },
    ext: { t: ["التمديدات", "Extensions"], one: ["تمديد إجازة", "Leave extension"], icon: "⏩", kinds: ["ext"], d: ["تمديد آخر إجازة اعتيادية إلى تاريخ جديد", "Extend your last regular leave to a new date"] },
    med: { t: ["الطبيات", "Medical"], one: ["طبية", "Medical"], icon: "🩺", kinds: ["med"], d: ["اعتماد إجازة مرضية مع صورة", "Sick leave with a photo"] },
    meet: { t: ["المقابلات", "Meetings"], one: ["مقابلة", "Meeting"], icon: "🤝", kinds: ["meet"], d: ["طلب مقابلة أحد المسؤولين", "Request to meet an official"] },
    pro: { t: ["المهنيين", "Professionals"], one: ["مهنيين", "Professionals"], icon: "🛠️", kinds: ["pleave", "pexit"], d: ["إجازة أو إذن مغادرة للمهنيين", "Leave or exit permit for professionals"] }
  };
  var ROLES = { e: ["موظف", "Employee"], m: ["مسؤول المهنيين", "Professionals Officer"], h: ["رئيس القسم", "Head of Department"],
                o: ["ضابط القسم", "Section Officer"], a: ["إداري", "Administrative Clerk"], s: ["مدير النظام", "System Administrator"] };
  var PERIODS = { start: ["بداية الدوام", "Start of shift"], during: ["أثناء الدوام", "During shift"], end: ["نهاية الدوام", "End of shift"] };
  var MEET = { head: ["رئيس القسم", "Head of Department"], officer: ["ضابط القسم", "Section Officer"],
               dirdept: ["مدير الإدارة", "Department Director"], dirgen: ["المدير العام", "Director General"] };
  var HOME = { e: "my", m: "pro", h: "review", o: "review", a: "queue", s: "queue" };
  var ORG = ["الإدارة العامة لخفر السواحل", "General Administration of Coast Guard"];
  var DEPT = ["قسم الكهرباء والإلكترونيات", "Electrical & Electronics Department"];
  var CREDIT = "Created by: ABDULRAZZAQ ALHAJRI";
  var AR = "٠١٢٣٤٥٦٧٨٩";

  function K(k) { return T(KINDS[k]) || k; }
  function roleName(r) { return T(ROLES[r]); }
  function meetName(v) { return MEET[v] ? T(MEET[v]) : v; }
  function catOf(kind) { for (var k in CATS) if (CATS[k].kinds.indexOf(kind) >= 0) return k; return ""; }
  function byCat(list, c) { return c && CATS[c] ? list.filter(function (r) { return catOf(r.kind) === c; }) : list; }
  function link(path, p) {
    var s = Object.keys(p || {}).filter(function (k) { return p[k]; }).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(p[k]); }).join("&");
    return "#/" + path + (s ? "?" + s : "");
  }
  function nav(h) { if (location.hash === h) render(); else location.hash = h; }

  /* ---------- أدوات ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function ymdhm(iso) { var d = new Date(iso); return ymd(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function parseDate(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function enDigits(s) { return String(s).replace(/[٠-٩]/g, function (c) { return AR.indexOf(c); }).trim(); }
  function today() { return ymd(new Date()); }
  function toMin(t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; }
  function fromMin(m) { return pad(Math.floor(m / 60)) + ":" + pad(m % 60); }
  function isPro(r) { return PRO_KINDS.indexOf(r.kind) >= 0 || (r.kind === "ext" && PRO_KINDS.indexOf(r.ext_kind) >= 0); }
  function KR(r) { return r.kind === "ext" ? T(EXTN[r.ext_kind] || KINDS.ext) : K(r.kind); }
  function nextDay(s) { return ymd(addDays(parseDate(s), 1)); }
  function spanDays(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 864e5) + 1; }
  function daysTxt(n) { return L(n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n + (n <= 10 ? " أيام" : " يومًا"), n + (n === 1 ? " day" : " days")); }

  /* ---------- التأخير في التقديم + تنبيه الإجازة ---------- */
  // كم يوم تأخر الموظف في إرسال الطلب بعد تاريخه (0 = ما تأخر)
  function lateBy(kind, dateFrom, sentAt) {
    if (LATE_KINDS.indexOf(kind) < 0 || !dateFrom) return 0;
    var s = new Date(sentAt || Date.now()), n = Math.round((new Date(s.getFullYear(), s.getMonth(), s.getDate()) - parseDate(dateFrom)) / 864e5);
    return n > LATE_DAYS ? n : 0;
  }
  function lateOf(r) { return lateBy(r.kind, r.date_from, r.created); }
  function lateCard(n) {
    return L("⚠️ تنبيه: قُدِّم هذا الطلب بعد مضيّ " + daysTxt(n) + " على تاريخه، وقد يتعرّض للرفض بسبب التأخر في تقديمه.",
      "⚠️ Notice: this request was submitted " + daysTxt(n) + " after its date and may be rejected due to late submission.");
  }
  function lateForm(n, pro) {
    return L("⚠️ تنبيه: مضى على تاريخ الطلب " + daysTxt(n) + ". يمكنك إرسال الطلب وسيصل إلى " + (pro ? "مسؤول المهنيين" : "الإداري") +
      " للاعتماد، إلا أنه قد يتعرّض للرفض بسبب التأخر في تقديمه.",
      "⚠️ Notice: " + daysTxt(n) + " have passed since the request date. You may still submit it and it will reach " + (pro ? "the Professionals Officer" : "the administrative clerk") +
      " for approval; however, it may be rejected due to late submission.");
  }
  function lateBox(r) { var n = lateOf(r); return n ? '<p class="late">' + lateCard(n) + "</p>" : ""; }
  function leaveNote() {
    return L("📌 تنبيه: يجب على الموظف عند تقديم طلب الإجازة الحضور إلى القسم لاعتمادها، كما يجب عليه الحضور إلى القسم ومباشرة العمل فور انتهاء الإجازة.",
      "📌 Notice: when submitting a leave request, the employee must attend the department in person for its approval, and must also report to the department and resume duty immediately after the leave ends.");
  }
  function leaveBox(r) { return LEAVE_KINDS.indexOf(r.kind) >= 0 && r.status !== "r" ? '<p class="note-l">' + leaveNote() + "</p>" : ""; }

  /* ---------- مراحل الطلب: من يعتمده؟ ----------
     مهنيين ← مسؤول المهنيين | غير ذلك (حتى المتأخر) ← الإداري. رئيس القسم وضابط القسم للاطلاع فقط
     بعد الاعتماد ← الإداري للتنفيذ. مدير النظام يقدر على كل المراحل. */
  function stage(r) {
    if (r.status === "r") return "rej";
    if (r.status === "a") return r.done_at ? "done" : "exec";
    if (isPro(r) && !r.pro_by) return "pro";
    return "clerk";
  }
  var STAGE_ROLES = { pro: "ms", clerk: "as", exec: "as" };
  function canAct(u, r) { var s = STAGE_ROLES[stage(r)]; return !!(u && s && s.indexOf(u.role) >= 0); }
  function rejText(r) { return r.auto_rejected ? L("تجاوز الحد الشهري للاستئذانات (" + LIMIT + ")", "Monthly permission limit (" + LIMIT + ") exceeded") : r.reject_reason; }

  /* ---------- التخزين ---------- */
  var db = null, memUid = null;
  function nextRef(D, when) {
    var y = new Date(when).getFullYear();
    D.seq.out = D.seq.out || {};
    D.seq.out[y] = (D.seq.out[y] || 0) + 1;
    return y + "/" + ("000" + D.seq.out[y]).slice(-4);
  }
  function seed() {
    var t = new Date(), now = t.getTime();
    function d(n) { return ymd(addDays(t, n)); }
    function at(n, h) { var x = addDays(t, n); x.setHours(h || 9, 15, 0, 0); return x.toISOString(); }
    var medImg = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380"><rect width="100%" height="100%" fill="#f8fafc" stroke="#0a2342" stroke-width="6"/>' +
      '<text x="50%" y="45%" font-size="34" text-anchor="middle" font-family="Tahoma" fill="#0a2342">صورة طبية تجريبية</text>' +
      '<text x="50%" y="62%" font-size="20" text-anchor="middle" font-family="Tahoma" fill="#e8501c">Demo only</text></svg>');
    // [id, اسم المستخدم, الصلاحية, الاسم, المسمى, الرتبة]
    var u = [
      [1, "admin", "s", "عبدالرزاق الهاجري", "مدير النظام", ""],
      [2, "head", "h", "فهد عبدالرحمن الفيلكاوي", "رئيس القسم", "مقدم مهندس بحري"],
      [3, "officer", "o", "فهد سالم المطيري", "ضابط القسم", ""],
      [4, "clerk", "a", "نورة عبدالله الشمري", "إداري شؤون الموظفين", ""],
      [5, "emp", "e", "أحمد علي الكندري", "فني كهرباء", ""],
      [6, "emp2", "e", "سارة يوسف الرشيدي", "مهندسة إلكترونيات", ""],
      [7, "pro", "m", "سالم ناصر العجمي", "مسؤول المهنيين", ""],
      [8, "clerk2", "a", "مريم خالد العتيبي", "إداري", ""],
      [9, "pemp", "e", "راشد حمد الديحاني", "مهني كهرباء", ""]
    ].map(function (x) {
      return { id: x[0], username: x[1], password: "123456", role: x[2], full_name: x[3], job_title: x[4], rank: x[5],
               civil_id: "2900101000" + pad(x[0]), phone: "5000000" + x[0], duty: x[0] === 4 ? ymd(t) : "" };
    });
    function R(o) {
      return Object.assign({ date_to: "", depart_date: "", time_from: "", time_to: "", meet_with: "", meet_reason: "", perm_period: "", notes: "", med: "", secret: "",
        status: "p", pro_by: null, pro_at: null, pro_proxy: false, decided_by: null, decided_at: null, dec_role: "", reject_reason: "", auto_rejected: false,
        done_by: null, done_at: null, followups: [] }, o);
    }
    var reqs = [
      R({ id: 1, user_id: 5, kind: "perm", date_from: d(1), time_from: "07:00", time_to: "10:00", perm_period: "start", notes: "مراجعة مستشفى", secret: "1234", created: at(0, 8) }),
      R({ id: 2, user_id: 6, kind: "meet", date_from: d(2), time_from: "10:00", time_to: "10:30", meet_with: "head", meet_reason: "مناقشة جدول المناوبات للشهر القادم", secret: "5678", created: at(-1, 11) }),
      R({ id: 3, user_id: 5, kind: "leave", date_from: d(-12), date_to: d(-8), secret: "1234", status: "a", decided_by: 4, decided_at: at(-14), dec_role: "clerk", created: at(-15) }),
      R({ id: 4, user_id: 6, kind: "emer", date_from: d(-5), date_to: d(-4), status: "a", decided_by: 4, decided_at: at(-5), dec_role: "clerk", done_by: 4, done_at: at(-4, 12), created: at(-6) }),
      R({ id: 5, user_id: 5, kind: "med", date_from: d(-3), date_to: d(-2), med: medImg, secret: "1234", status: "a", decided_by: 8, decided_at: at(-2), dec_role: "clerk",
          followups: [{ note: "الطبية غير واضحة، يرجى إرسال نسخة أوضح", by: 4, at: at(-1, 10) }], created: at(-2, 8) }),
      R({ id: 6, user_id: 6, kind: "perm", date_from: d(-9), time_from: "11:00", time_to: "14:00", perm_period: "end", status: "r", decided_by: 4, decided_at: at(-9), dec_role: "clerk", reject_reason: "ضغط عمل في القسم ذلك اليوم", created: at(-10) }),
      R({ id: 7, user_id: 5, kind: "leave", date_from: d(-70), date_to: d(-63), status: "a", decided_by: 4, decided_at: at(-75), dec_role: "clerk", done_by: 4, done_at: at(-74), created: at(-76) }),
      R({ id: 8, user_id: 9, kind: "pleave", date_from: d(5), date_to: d(9), secret: "4321", created: at(0, 9) }),
      R({ id: 9, user_id: 9, kind: "pexit", depart_date: d(14), date_from: d(14), date_to: d(28), notes: "سفر خارج البلاد", secret: "4321", status: "a", pro_by: 7, pro_at: at(-1, 12), created: at(-2, 10) }),
      R({ id: 10, user_id: 6, kind: "emer", date_from: d(-6), date_to: d(-5), notes: "ظرف عائلي", secret: "5678", created: at(0, 7) }),
      R({ id: 11, user_id: 5, kind: "med", date_from: d(-9), date_to: d(-8), med: medImg, status: "a", decided_by: 8, decided_at: at(-3, 11), dec_role: "clerk", done_by: 4, done_at: at(-2, 9), created: at(-4, 8) })
    ];
    // زام الإداري التجريبي: إداريّان بالتناوب (يوم عمل ويوم راحة) + مدير النظام بأيام ثابتة
    var roster = [
      { id: 1, uid: 4, name: "", phone: "", mode: "cycle", days: [], on: 1, off: 1, start: d(0) },
      { id: 2, uid: 8, name: "", phone: "", mode: "cycle", days: [], on: 1, off: 1, start: d(1) },
      { id: 3, uid: 1, name: "", phone: "", mode: "week", days: [0, 1, 2, 3, 4], on: 1, off: 0, start: d(0) }
    ];
    var D = { users: u, reqs: reqs, roster: roster, audit: [], statOk: {}, seq: { u: 10, r: 12, out: {}, d: 4 }, seeded: now };
    reqs.slice().sort(function (a, b) { return a.created < b.created ? -1 : 1; }).forEach(function (r) { r.ref = nextRef(D, r.created); });
    return D;
  }
  function load() {
    if (db) return db;
    try { var s = localStorage.getItem(KEY); if (s) db = JSON.parse(s); } catch (e) { db = null; }
    if (!db || !db.users) { db = seed(); save(); }
    if (!db.statOk) db.statOk = {};
    if (!db.seq.out) db.seq.out = {};
    if (!db.roster) { // ترقية: أنشئ زام الإداري من الإداريين الحاليين
      var t0 = today(), t1 = ymd(addDays(new Date(), 1));
      db.roster = db.users.filter(function (u) { return u.role === "a"; }).map(function (u, i) {
        return { id: i + 1, uid: u.id, name: "", phone: "", mode: "cycle", days: [], on: 1, off: 1, start: u.duty === t0 ? t0 : t1 };
      });
      db.seq.d = db.roster.length + 1; save();
    }
    // ترقية بيانات النسخة السابقة: رقم صادر لكل طلب، وربط سجل العمليات بالطلب
    var miss = db.reqs.filter(function (r) { return !r.ref; }).sort(function (a, b) { return a.created < b.created ? -1 : 1; });
    miss.forEach(function (r) { r.ref = nextRef(db, r.created); });
    db.audit.forEach(function (a) { if (a.rid == null && a.target) { var m = /^طلب (\d+)$/.exec(a.target); if (m) a.rid = +m[1]; } });
    if (miss.length) save();
    return db;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) { flash("err", L("تعذّر حفظ البيانات في المتصفح (المساحة ممتلئة أو التخزين مقفل)", "Could not save data in the browser (storage full or blocked)")); return false; }
  }
  function getUid() { try { var v = sessionStorage.getItem(KEY + "_uid"); return v ? +v : memUid; } catch (e) { return memUid; } }
  function setUid(v) { memUid = v; try { if (v) sessionStorage.setItem(KEY + "_uid", v); else sessionStorage.removeItem(KEY + "_uid"); } catch (e) {} }
  function me() { var id = getUid(); return id ? userById(id) : null; }
  function userById(id) { return load().users.filter(function (u) { return u.id === id; })[0] || null; }
  function uname(id) { var u = userById(id); return u ? u.full_name : "—"; }
  function nameLine(u) { return u.rank ? u.rank + " / " + u.full_name : u.full_name; }
  /* ---------- زام الإداري: مدير النظام يحدد المداومين وآلية العمل، والنظام يحسب تلقائيًا ---------- */
  var WD = [["الأحد", "Sun"], ["الإثنين", "Mon"], ["الثلاثاء", "Tue"], ["الأربعاء", "Wed"], ["الخميس", "Thu"], ["الجمعة", "Fri"], ["السبت", "Sat"]];
  function dutyName(e) { var u = e.uid ? userById(e.uid) : null; return u ? u.full_name : e.name; }
  function dutyPhone(e) { var u = e.uid ? userById(e.uid) : null; return e.phone || (u ? u.phone : ""); }
  function dutyOn(e, d) {
    d = d || new Date();
    var day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (e.mode === "cycle") {
      var len = (+e.on || 0) + (+e.off || 0); if (!len || !e.start) return false;
      var diff = Math.round((day - parseDate(e.start)) / 864e5);
      return ((diff % len) + len) % len < +e.on;
    }
    return (e.days || []).indexOf(day.getDay()) >= 0;
  }
  function dutyOf(u) { return load().roster.filter(function (e) { return e.uid === u.id; })[0] || null; }
  function onDuty(u) { var e = dutyOf(u); return !!(e && dutyOn(e)); }
  function nextDuty(e) { for (var i = 1; i <= 120; i++) { var d = addDays(new Date(), i); if (dutyOn(e, d)) return d; } return null; }
  function dutyRule(e) {
    if (e.mode === "cycle") return L("مناوبة دورية: أيام العمل " + e.on + " / أيام الراحة " + e.off + "، بدءًا من " + e.start,
      "Rotation: " + daysTxt(+e.on) + " on, " + daysTxt(+e.off) + " off, starting " + e.start);
    return L("أيام ثابتة: ", "Fixed days: ") + (e.days || []).slice().sort().map(function (i) { return T(WD[i]); }).join(L("، ", ", "));
  }
  function dutyToday() { return load().roster.filter(function (e) { return dutyOn(e); }); }
  function reqById(id) { return load().reqs.filter(function (r) { return r.id === id; })[0]; }

  /* ---------- سجل العمليات ---------- */
  var ACTS = {
    submit: ["تقديم الطلب", "Request submitted"], late: ["تقديم طلب متأخر", "Late request submitted"],
    auto: ["رفض تلقائي لتجاوز الحد الشهري", "Auto-rejected (monthly limit exceeded)"],
    pro_ok: ["اعتماد مسؤول المهنيين", "Professionals Officer approval"], pro_rej: ["رفض مسؤول المهنيين", "Professionals Officer rejection"],
    ok: ["اعتماد الطلب", "Request approved"], ok_late: ["اعتماد طلب متأخر", "Late request approved"], rej: ["رفض الطلب", "Request rejected"],
    follow: ["طلب متابعة", "Follow-up requested"], done: ["تم عمل اللازم", "Completed"], print: ["طباعة الطلب", "Request printed"],
    reveal: ["عرض الرقم السري", "Secret number viewed"], remind: ["تذكير الإداري", "Clerk reminded"], stat: ["اعتماد الإحصائية", "Statistics approved"],
    duty_add: ["إضافة إلى زام الإداري", "Added to duty roster"], duty_edit: ["تعديل زام الإداري", "Duty roster edited"], duty_del: ["حذف من زام الإداري", "Removed from duty roster"]
  };
  function log(act, rid, x) {
    var u = me();
    load().audit.unshift({ who: u ? u.id : null, act: act, rid: rid || null, x: x == null ? "" : x, at: new Date().toISOString() });
    db.audit = db.audit.slice(0, 400);
  }
  function actText(a) {
    if (!a.act) return a.action || "";
    var t = T(ACTS[a.act]) || a.act;
    if (a.act === "late") t += " (" + daysTxt(+a.x) + ")";
    else if (a.x === "proxy") t += L(" (بالنيابة)", " (on behalf)");
    else if (a.x) t += " — " + a.x;
    return t;
  }

  /* ---------- رسائل ---------- */
  var flashes = [];
  function flash(type, text) { flashes.push({ type: type, text: text }); }

  /* ---------- التوجيه ---------- */
  var ROUTES = {
    login: { anon: true, view: viewLogin },
    register: { anon: true, view: viewRegister },
    my: { roles: "emhoas", view: viewMy },
    pro: { roles: "ms", view: viewPro },
    review: { roles: "hos", view: viewReview },
    queue: { roles: "as", view: viewQueue },
    stats: { roles: "mhoas", view: viewStats },
    users: { roles: "s", view: viewUsers },
    duty: { roles: "s", view: viewDuty }
  };
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, ""), i = h.indexOf("?"), q = {};
    var path = i < 0 ? h : h.slice(0, i);
    if (i >= 0) h.slice(i + 1).split("&").forEach(function (kv) { var p = kv.split("="); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " ")); });
    return { path: path, q: q };
  }
  function go(path) { if (location.hash === "#/" + path) render(); else location.hash = "#/" + path; }
  function applyLang() {
    var h = document.documentElement;
    h.lang = LANG; h.dir = LANG === "en" ? "ltr" : "rtl";
    document.title = T(["خفر السواحل - قسم الكهرباء والإلكترونيات", "Coast Guard - Electrical & Electronics Dept."]);
  }
  function langBtn(cls) { return '<button type="button" class="' + (cls || "lang") + '" data-act="lang">' + L("English", "عربي") + "</button>"; }

  function render() {
    var r = parseHash(), u = me(), route = ROUTES[r.path];
    if (!u) { if (!route || !route.anon) { if (r.path !== "login") return go("login"); } }
    else if (!route || route.anon) return go(HOME[u.role]);
    else if (route.roles.indexOf(u.role) < 0) { flash("err", L("ليس لديك صلاحية لهذه الصفحة", "You do not have access to this page")); return go(HOME[u.role]); }
    route = ROUTES[r.path];
    route.after = null;
    if (r.path !== "stats") statTemp = null;
    var body = route.view(r.q, u);
    var msgs = flashes.map(function (m) { return '<p class="msg ' + m.type + '">' + esc(m.text) + "</p>"; }).join("");
    flashes = [];
    document.body.classList.toggle("auth-bg", !u);
    document.body.classList.toggle("app-bg", !!u);
    document.getElementById("app").innerHTML = shell(u, r.path) + "<main>" + msgs + body + "</main>" +
      (u ? '<footer class="credit noprint">' + CREDIT + "</footer>" : "");
    window.scrollTo(0, 0);
    if (route.after) route.after();
  }

  function shell(u, path) {
    if (!u) return ""; // صفحات الدخول والتسجيل: خلفية كاملة بدون هيدر
    var h = '<header><img src="logo.png" alt=""><div class="t"><b>' + T(ORG) + "</b><span>" + T(DEPT) + "</span></div>";
    h += '<span class="u">' + esc(u.full_name) + " (" + roleName(u.role) + ")</span>";
    if (u.role === "s") h += '<a href="#/users">' + L("الحسابات وسجل العمليات", "Accounts & audit log") + "</a>";
    h += langBtn() + '<button type="button" data-act="logout">' + L("خروج", "Log out") + "</button></header>";
    h += '<div class="demo noprint"><span>' + L("⚠️ نسخة عرض تجريبية — البيانات محفوظة في هذا المتصفح فقط. لا تُدخل أرقامًا سرية أو بيانات حقيقية.",
      "⚠️ Demo version — data is stored in this browser only. Do not enter real secret numbers or personal data.") +
      '</span><button type="button" data-act="reset">' + L("إعادة ضبط البيانات التجريبية", "Reset demo data") + "</button></div>";
    var links = [["my", L("طلباتي", "My requests"), "emhoas"], ["pro", L("اعتماد المهنيين", "Professionals approval"), "ms"],
      ["review", L("متابعة الطلبات", "Requests overview"), "hos"], ["queue", L("اعتماد وتنفيذ الطلبات", "Approve & execute"), "as"], ["stats", L("الإحصائيات", "Statistics"), "mhoas"], ["duty", L("زام الإداري", "Duty roster"), "s"]];
    h += '<nav class="nav noprint">' + links.filter(function (l) { return l[2].indexOf(u.role) >= 0; }).map(function (l) {
      return '<a href="#/' + l[0] + '"' + (l[0] === path ? ' class="on"' : "") + ">" + l[1] + "</a>";
    }).join("") + "</nav>";
    return h;
  }

  /* ---------- الختم: اسم الشخص ومسماه ---------- */
  // ختم رسمي بيضاوي: اسم الجهة على الإطار (بالعربي دائمًا)، وبالوسط نوع الإجراء + الرتبة + الاسم + المسمى + التاريخ
  var stampSeq = 0;
  function stamp(uid, label, at, tone, mini) {
    var u = userById(uid); if (!u) return "";
    var n = ++stampSeq, rot = ((n * 37) % 8) - 4;
    var svg = '<svg viewBox="0 0 260 170" aria-hidden="true">' +
      '<ellipse cx="130" cy="85" rx="126" ry="81" fill="none" stroke="currentColor" stroke-width="3.4"/>' +
      '<ellipse cx="130" cy="85" rx="120" ry="75" fill="none" stroke="currentColor" stroke-width="1"/>' +
      '<ellipse cx="130" cy="85" rx="88" ry="50" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<text x="26" y="89" font-size="12" text-anchor="middle">★</text><text x="234" y="89" font-size="12" text-anchor="middle">★</text></svg>';
    return '<div class="stamp' + (tone ? " " + tone : "") + (mini ? " mini" : "") + '" style="--rot:' + rot + 'deg" title="' + esc(label + " — " + nameLine(u)) + '">' + svg + '<div class="ring"></div>' +
      '<div class="sc"><em>' + esc(label) + "</em>" + (u.rank ? "<small>" + esc(u.rank) + "</small>" : "") + "<b>" + esc(u.full_name) + "</b><span>" + esc(u.job_title) + "</span>" +
      (at ? "<i>" + ymdhm(at) + "</i>" : "") + "</div></div>";
  }
  // كلام إطار الختم: SVG textPath يقطّع الحروف العربية في Safari/الآيفون،
  // فنكتب السطر عدل (متصل) على canvas ثم نحنيه شريحة شريحة على القوس، ونستخدمه كقناع للختم.
  function buildRing() {
    try {
      var S = 4, cv = document.createElement("canvas"); cv.width = 260 * S; cv.height = 170 * S;
      var ctx = cv.getContext("2d"); if (!ctx) return;
      var arc = function (txt, font, rx, ry, top) {
        var src = document.createElement("canvas"), sx = src.getContext("2d"), px = font[1] * S;
        sx.font = font[0] + " " + px + "px Tajawal, Tahoma, sans-serif";
        var W = Math.ceil(sx.measureText(txt).width) + 4, H = Math.ceil(px * 1.8), base = Math.round(px * 1.25);
        src.width = W; src.height = H;
        sx.font = font[0] + " " + px + "px Tajawal, Tahoma, sans-serif"; sx.direction = "rtl"; sx.textAlign = "center"; sx.fillStyle = "#000";
        sx.fillText(txt, W / 2, base);
        // جدول طول القوس: من اليسار إلى اليمين، فوق (θ من π إلى 2π) أو تحت (θ من π إلى 0)
        var N = 720, pts = [], len = [0], cx = 130 * S, cy = 85 * S;
        for (var i = 0; i <= N; i++) {
          var t = Math.PI + (top ? 1 : -1) * Math.PI * i / N;
          pts.push([cx + rx * S * Math.cos(t), cy + ry * S * Math.sin(t)]);
          if (i) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        }
        var s0 = (len[N] - W) / 2, j = 0;
        for (var x = 0; x < W; x++) {
          var s = s0 + x + 0.5;
          while (j < N - 1 && len[j + 1] < s) j++;
          var f = (s - len[j]) / (len[j + 1] - len[j] || 1), a = pts[j], b = pts[j + 1];
          ctx.save();
          ctx.translate(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
          ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
          ctx.drawImage(src, x, 0, 1, H, -0.5, -base, 1.6, H);
          ctx.restore();
        }
      };
      arc(ORG[0], ["800", 12.5], 94, 55, true);
      arc(DEPT[0], ["700", 11.5], 100, 61, false);
      document.documentElement.style.setProperty("--ring", 'url("' + cv.toDataURL("image/png") + '")');
    } catch (e) { /* يبقى الختم بدون كلام الإطار */ }
  }
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load("800 50px Tajawal", "الإدارة"), document.fonts.load("700 46px Tajawal", "قسم")]).then(buildRing, buildRing);
  } else buildRing();

  function stamps(r) {
    var s = "", proLbl = r.pro_proxy ? L("عن مسؤول المهنيين", "for Professionals Officer") : L("مسؤول المهنيين", "Professionals Officer");
    if (r.pro_by) s += stamp(r.pro_by, L("اعتماد ", "Approved — ") + proLbl, r.pro_at);
    if (r.decided_by) {
      var rej = r.status === "r", role = r.dec_role || (rej && isPro(r) && !r.pro_by ? "pro" : "");
      var lbl = rej ? (role === "pro" ? L("رفض ", "Rejected — ") + proLbl : L("مرفوض", "Rejected"))
        : role === "chief" || (role !== "pro" && lateOf(r)) ? L("اعتماد (طلب متأخر)", "Approved (late request)") : L("اعتماد", "Approved");
      s += stamp(r.decided_by, lbl, r.decided_at, rej ? "red" : "");
    }
    if (r.done_by) s += stamp(r.done_by, L("تم عمل اللازم", "Completed"), r.done_at, "green");
    return s ? '<div class="stamps">' + s + "</div>" : "";
  }

  /* ---------- حقول النماذج ---------- */
  function field(name, label, attrs, errs, val) {
    attrs = attrs || {};
    var type = attrs.type || "text", a = "";
    Object.keys(attrs).forEach(function (k) { if (k !== "type") a += " " + k + '="' + esc(attrs[k]) + '"'; });
    var inp = type === "textarea" ? '<textarea name="' + name + '" id="f_' + name + '"' + a + ">" + esc(val) + "</textarea>"
      : '<input type="' + type + '" name="' + name + '" id="f_' + name + '"' + a + (type === "file" || type === "password" ? "" : ' value="' + esc(val) + '"') + ">";
    return '<div class="fld" data-fld="' + name + '"><label for="f_' + name + '">' + label + "</label>" + inp + errHtml(errs, name) + "</div>";
  }
  function select(name, label, opts, errs, val, blank) {
    var o = (blank ? '<option value="">---------</option>' : "") + Object.keys(opts).map(function (k) {
      return '<option value="' + k + '"' + (k === val ? " selected" : "") + ">" + esc(opts[k]) + "</option>";
    }).join("");
    return '<div class="fld" data-fld="' + name + '"><label for="f_' + name + '">' + label + '</label><select name="' + name + '" id="f_' + name + '">' + o + "</select>" + errHtml(errs, name) + "</div>";
  }
  function opts(map) { var o = {}; Object.keys(map).forEach(function (k) { o[k] = T(map[k]); }); return o; }
  function errHtml(errs, name) { return errs && errs[name] ? '<p class="err">' + esc(errs[name]) + "</p>" : ""; }
  function formData(form) { var o = {}; new FormData(form).forEach(function (v, k) { if (typeof v === "string") o[k] = v.trim(); }); return o; }
  function req() { return L("هذا الحقل مطلوب", "This field is required"); }

  /* ---------- تسجيل الدخول ---------- */
  var loginState = { errs: null, val: {} };
  var DEMO = ["admin", "head", "officer", "pro", "clerk", "clerk2", "emp", "emp2", "pemp"];
  function viewLogin() {
    var s = loginState; loginState = { errs: null, val: {} };
    var demo = DEMO.map(function (n) { return load().users.filter(function (u) { return u.username === n && u.password === "123456"; })[0]; }).filter(Boolean);
    return '<div class="auth">' + '<div class="lang-sw">' + langBtn("lang lt") + "</div>" + authHero() +
      '<form data-f="login">' + (s.errs ? '<p class="err">' + esc(s.errs) + "</p>" : "") +
      field("username", L("اسم المستخدم", "Username"), { autocomplete: "username", required: "" }, null, s.val.username) +
      field("password", L("كلمة المرور", "Password"), { type: "password", autocomplete: "current-password", required: "" }) +
      '<button class="p wide">' + L("دخول", "Sign in") + '</button><a class="btn-out" href="#/register">' + L("موظف جديد؟ سجّل حسابك", "New employee? Create an account") + "</a></form>" +
      (demo.length ? '<div class="demo-box"><p>' + L("حسابات تجريبية (كلمة المرور <b>123456</b>) — اضغط للدخول مباشرة:", "Demo accounts (password <b>123456</b>) — tap to sign in:") + '</p><div class="demo-users">' + demo.map(function (u) {
        return '<button type="button" data-act="quick" data-u="' + esc(u.username) + '">' + esc(u.username) + "<small>" + roleName(u.role) + "</small></button>";
      }).join("") + "</div></div>" : "") +
      '<p class="note">' + L("نسخة تجريبية — أي بيانات أو طلبات تُدخلها هنا تُحفظ في هذا المتصفح فقط.", "Demo version — anything you enter here is saved in this browser only.") +
      '</p><p class="credit in">' + CREDIT + "</p></div>";
  }
  function authHero() {
    return '<div class="hero"><img src="logo.png" alt=""><h1>' + T(ORG) + "</h1><p>" + T(DEPT) + "</p></div>";
  }
  function doLogin(d) {
    var u = load().users.filter(function (x) { return x.username.toLowerCase() === (d.username || "").toLowerCase(); })[0];
    if (!u || u.password !== d.password) { loginState = { errs: L("اسم المستخدم أو كلمة المرور غير صحيحة", "Incorrect username or password"), val: d }; return render(); }
    setUid(u.id); go(HOME[u.role]);
  }

  /* ---------- تسجيل موظف ---------- */
  var regState = { errs: {}, val: {} };
  function viewRegister() {
    var s = regState; regState = { errs: {}, val: {} };
    return '<div class="auth">' + '<div class="lang-sw">' + langBtn("lang lt") + "</div>" + authHero() + "<h2>" + L("تسجيل موظف جديد", "New employee registration") + '</h2><form data-f="register">' +
      field("username", L("اسم المستخدم", "Username"), { required: "" }, s.errs, s.val.username) +
      field("full_name", L("الاسم الثلاثي", "Full name (three parts)"), { required: "" }, s.errs, s.val.full_name) +
      field("job_title", L("المسمى الوظيفي", "Job title"), { required: "" }, s.errs, s.val.job_title) +
      field("civil_id", L("الرقم المدني", "Civil ID"), { required: "", inputmode: "numeric", maxlength: "12" }, s.errs, s.val.civil_id) +
      field("phone", L("رقم الهاتف", "Phone number"), { required: "", inputmode: "numeric", maxlength: "8" }, s.errs, s.val.phone) +
      field("password1", L("كلمة المرور", "Password"), { type: "password", required: "", autocomplete: "new-password" }, s.errs) +
      field("password2", L("تأكيد كلمة المرور", "Confirm password"), { type: "password", required: "", autocomplete: "new-password" }, s.errs) +
      '<button class="p wide">' + L("إنشاء الحساب", "Create account") + '</button><a class="btn-out" href="#/login">' + L("لديك حساب؟ سجّل دخولك", "Have an account? Sign in") + '</a></form><p class="credit in">' + CREDIT + "</p></div>";
  }
  function doRegister(d) {
    var e = {}, D = load();
    if (!/^[\w.@+-]{1,150}$/.test(d.username || "")) e.username = L("اسم مستخدم غير صالح (حروف إنجليزية وأرقام فقط)", "Invalid username (English letters and digits only)");
    else if (D.users.some(function (u) { return u.username.toLowerCase() === d.username.toLowerCase(); })) e.username = L("اسم المستخدم مستخدم من قبل", "Username already taken");
    var fn = (d.full_name || "").split(/\s+/).filter(Boolean);
    if (fn.length < 3) e.full_name = L("اكتب الاسم الثلاثي كاملًا", "Enter your full three-part name");
    if (!d.job_title) e.job_title = req();
    var cid = enDigits(d.civil_id || ""), ph = enDigits(d.phone || "");
    if (!/^\d{12}$/.test(cid)) e.civil_id = L("الرقم المدني يجب أن يكون 12 رقمًا", "Civil ID must be 12 digits");
    if (!/^\d{8}$/.test(ph)) e.phone = L("رقم الهاتف يجب أن يكون 8 أرقام", "Phone number must be 8 digits");
    if ((d.password1 || "").length < 6) e.password1 = L("كلمة المرور 6 أحرف على الأقل", "Password must be at least 6 characters");
    else if (d.password1 !== d.password2) e.password2 = L("كلمتا المرور غير متطابقتين", "Passwords do not match");
    if (Object.keys(e).length) { regState = { errs: e, val: d }; return render(); }
    D.users.push({ id: D.seq.u++, username: d.username, password: d.password1, role: "e", full_name: fn.join(" "), job_title: d.job_title, rank: "", civil_id: cid, phone: ph, duty: "" });
    save(); flash("ok", L("تم إنشاء الحساب، سجّل دخولك", "Account created — please sign in")); go("login");
  }

  /* ---------- طلباتي ---------- */
  function used(uid, y, m) {
    return load().reqs.filter(function (r) {
      var d = parseDate(r.date_from);
      return r.user_id === uid && r.kind === "perm" && d.getFullYear() === y && d.getMonth() === m && r.status !== "r";
    }).length;
  }
  // الحقول الظاهرة لكل نوع طلب
  var SHOW = {
    perm: ["date_from", "perm_period", "time_from", "time_to"],
    leave: ["date_from", "date_to"],
    emer: ["date_from", "date_to"],
    med: ["date_from", "date_to", "medical_image"],
    meet: ["date_from", "time_from", "time_to", "meet_with", "meet_reason"],
    pleave: ["date_from", "date_to"],
    pexit: ["depart_date", "date_from", "date_to"],
    ext: ["date_from", "date_to"]
  };
  var OPTIONAL = ["depart_date", "date_to", "perm_period", "time_from", "time_to", "meet_with", "meet_reason", "medical_image"];
  var myState = { errs: {}, val: {} };
  function viewMy(q, u) {
    var s = myState; myState = { errs: {}, val: {} };
    var t = new Date(), n = used(u.id, t.getFullYear(), t.getMonth()), v = s.val, e = s.errs, c = CATS[q.c] ? q.c : "", nw = CATS[q["new"]] ? q["new"] : "";
    var all = load().reqs.filter(function (r) { return r.user_id === u.id; }).sort(byCreated), items = byCat(all, c);
    ROUTES.my.after = toggleKind;
    setList(L("طلبات ", "Requests of ") + u.full_name + (c ? " — " + T(CATS[c].t) : ""), items);
    var cnt = function (st) { return all.filter(function (r) { return r.status === st; }).length; };
    var head = hello(u, [[n + " / " + LIMIT, L("استئذانات هذا الشهر", "Permissions this month")], [cnt("p"), L("قيد الاعتماد", "Pending")], [cnt("a"), L("معتمد", "Approved")]]) +
      "<h2>" + L("طلب جديد", "New request") + '</h2><p class="sub">' + L("اختر القسم المطلوب:", "Choose a section:") + "</p>" +
      '<div class="cats">' + Object.keys(CATS).map(function (k) {
        return '<a href="' + link("my", { "new": k, c: c }) + '"' + (k === nw ? ' class="on"' : "") + "><i>" + CATS[k].icon + "</i><b>" + T(CATS[k].one) + "</b><small>" + T(CATS[k].d) + "</small></a>";
      }).join("") + "</div>";
    var list = "<h2>" + L("طلباتي", "My requests") + "</h2>" + catBar("my", { c: c }, all) + listTools(items.length) +
      (items.length ? items.map(myCard).join("") : "<p>" + L("لا توجد طلبات في هذا القسم.", "No requests in this section.") + "</p>");
    if (!nw) return head + list;
    if (nw === "ext") return head + extForm(u, e, v, c) + list;
    var C = CATS[nw], kind = v.kind && catOf(v.kind) === nw ? v.kind : C.kinds[0], sub = {};
    C.kinds.forEach(function (k) { sub[k] = K(k); });
    return head +
      '<form class="box" data-f="req"><div class="fh"><b>' + C.icon + " " + L("طلب ", "Request: ") + T(C.one) + '</b><a href="' + link("my", { c: c }) + '">✕ ' + L("إغلاق", "Close") + "</a></div>" +
      (C.kinds.length > 1 ? select("kind", L("النوع", "Type"), sub, e, kind) : '<input type="hidden" name="kind" id="f_kind" value="' + kind + '">') +
      (nw === "perm" ? '<p class="msg">' + L("استئذاناتك هذا الشهر: <b>" + n + " من " + LIMIT + "</b> — مدة الاستئذان <b>3 ساعات بالضبط</b>، وما زاد على الحد يرفضه النظام تلقائيًا.",
        "Your permissions this month: <b>" + n + " of " + LIMIT + "</b> — a permission is <b>exactly 3 hours</b>; anything over the limit is rejected automatically.") + "</p>" : "") +
      '<p class="sub" id="route-hint">' + L("يعتمد الإداريُّ هذا الطلب.", "The administrative clerk approves this request.") + "</p>" +
      '<p class="sub" id="pro-hint" hidden>' + L("يُحال هذا الطلب إلى مسؤول المهنيين لاعتماده.", "This request goes to the Professionals Officer for approval.") + "</p>" +
      field("depart_date", L("تاريخ المغادرة", "Departure date"), { type: "date" }, e, v.depart_date) +
      '<div class="row">' + field("date_from", L("التاريخ / من تاريخ", "Date / from"), { type: "date", required: "" }, e, v.date_from) + field("date_to", L("إلى تاريخ", "To date"), { type: "date" }, e, v.date_to) + "</div>" +
      '<p class="late" id="late-hint" hidden></p>' +
      '<p class="note-l" id="leave-hint" hidden>' + leaveNote() + "</p>" +
      select("perm_period", L("وقت الاستئذان", "Permission time"), opts(PERIODS), e, v.perm_period, true) +
      '<div class="row">' + field("time_from", L("من الساعة", "From"), { type: "time" }, e, v.time_from) + field("time_to", L("إلى الساعة", "To"), { type: "time" }, e, v.time_to) + "</div>" +
      select("meet_with", L("المقابلة مع", "Meeting with"), opts(MEET), e, v.meet_with, true) +
      field("meet_reason", L("سبب المقابلة (إلزامي)", "Reason for the meeting (required)"), { type: "textarea", rows: "3", maxlength: "500" }, e, v.meet_reason) +
      field("medical_image", L("صورة الطبية", "Medical certificate photo"), { type: "file", accept: "image/*" }, e) +
      field("notes", L("ملاحظات", "Notes"), { type: "textarea", rows: "3" }, e, v.notes) +
      field("secret", L("الرقم السري لنظام جابر", "Jaber system secret number"), { type: "password", autocomplete: "off", required: "" }, e) +
      '<p class="sub">' + L("في النسخة التجريبية اكتب أي رقم (مثلًا 1234) — لا تكتب رقمك الحقيقي.", "In the demo, type any number (e.g. 1234) — never your real one.") + "</p>" +
      '<p><button class="p">' + L("إرسال الطلب", "Submit request") + "</button></p></form>" + list;
  }
  /* ---------- تمديد الإجازة: تُعبّأ بيانات آخر إجازة تلقائيًا، والموظف يختار تاريخ نهاية التمديد فقط ---------- */
  function extBases(uid) {
    return load().reqs.filter(function (r) { return r.user_id === uid && extable(r) && r.status !== "r"; })
      .sort(function (a, b) { var x = a.date_to || a.date_from, y = b.date_to || b.date_from; return x < y ? 1 : x > y ? -1 : byCreated(a, b); }).slice(0, 6);
  }
  function extInfo(b) {
    if (!b) return "";
    var end = b.date_to || b.date_from;
    return "<b>" + L("الإجازة الأصلية: ", "Original leave: ") + esc(KR(b)) + "</b><br>" + L("رقم الصادر: ", "Outgoing no.: ") + esc(b.ref) +
      " — " + L("من ", "from ") + esc(b.date_from) + L(" إلى ", " to ") + esc(end) + " (" + daysTxt(spanDays(b.date_from, end)) + ")" +
      " — " + L("الحالة: ", "Status: ") + pill(b, "my")[1];
  }
  function extForm(u, e, v, c) {
    var top = '<form class="box" data-f="req"><div class="fh"><b>⏩ ' + L("تمديد إجازة", "Leave extension") + '</b><a href="' + link("my", { c: c }) + '">✕ ' + L("إغلاق", "Close") + "</a></div>";
    var bases = extBases(u.id);
    if (!bases.length) return top + '<p class="msg">' + L("لا توجد لديك إجازة اعتيادية سابقة يمكن تمديدها (التمديد للإجازة الاعتيادية فقط).", "You have no previous regular leave to extend (extensions are for regular leave only).") + "</p></form>";
    var b = bases.filter(function (x) { return x.id === +v.ext_of; })[0] || bases[0], from = nextDay(b.date_to || b.date_from);
    return top + '<input type="hidden" name="kind" id="f_kind" value="ext">' +
      '<p class="sub">' + L("تُعبّأ بيانات آخر إجازة لك تلقائيًا، واختر فقط تاريخ نهاية التمديد.", "Your last leave is filled in automatically — just choose the new end date.") + "</p>" +
      '<div class="fld"><label for="f_ext_of">' + L("الإجازة المراد تمديدها", "Leave to extend") + '</label><select name="ext_of" id="f_ext_of">' + bases.map(function (x) {
        return '<option value="' + x.id + '"' + (x === b ? " selected" : "") + ">" + esc(KR(x)) + " — " + esc(x.date_from) + (x.date_to ? L(" إلى ", " to ") + esc(x.date_to) : "") + " — " + esc(x.ref) + "</option>";
      }).join("") + "</select>" + errHtml(e, "ext_of") + "</div>" +
      '<div class="extbox" id="ext-box">' + extInfo(b) + "</div>" +
      '<div class="row">' + field("date_from", L("يبدأ التمديد من (تلقائيًا)", "Extension starts (automatic)"), { type: "date", readonly: "" }, e, from) +
      field("date_to", L("تمديد إلى تاريخ", "Extend until"), { type: "date", required: "", min: from }, e, v.date_to) + "</div>" +
      '<p class="ok" id="ext-days"></p>' +
      '<p class="sub" id="route-hint">' + L("يعتمد الإداريُّ هذا الطلب.", "The administrative clerk approves this request.") + "</p>" +
      '<p class="sub" id="pro-hint" hidden>' + L("يُحال هذا الطلب إلى مسؤول المهنيين لاعتماده.", "This request goes to the Professionals Officer for approval.") + "</p>" +
      '<p class="late" id="late-hint" hidden></p>' +
      '<p class="note-l" id="leave-hint">' + leaveNote() + "</p>" +
      field("notes", L("سبب التمديد / ملاحظات", "Reason / notes"), { type: "textarea", rows: "3" }, e, v.notes) +
      field("secret", L("الرقم السري لنظام جابر", "Jaber system secret number"), { type: "password", autocomplete: "off", required: "" }, e) +
      '<p class="sub">' + L("في النسخة التجريبية اكتب أي رقم (مثلًا 1234) — لا تكتب رقمك الحقيقي.", "In the demo, type any number (e.g. 1234) — never your real one.") + "</p>" +
      '<p><button class="p">' + L("إرسال طلب التمديد", "Submit extension") + "</button></p></form>";
  }
  function extPro() { var s0 = document.getElementById("f_ext_of"), b = s0 && reqById(+s0.value); return !!(b && isPro(b)); }
  function syncExt() {
    var s0 = document.getElementById("f_ext_of"); if (!s0) return;
    var b = reqById(+s0.value), df = document.getElementById("f_date_from"), dt = document.getElementById("f_date_to"); if (!b) return;
    df.value = nextDay(b.date_to || b.date_from); dt.min = df.value;
    document.getElementById("ext-box").innerHTML = extInfo(b);
    var n = dt.value && dt.value >= df.value ? spanDays(df.value, dt.value) : 0;
    document.getElementById("ext-days").textContent = n ? L("مدة التمديد: ", "Extension length: ") + daysTxt(n) + L(" — حتى ", " — until ") + dt.value : "";
    var pro = isPro(b);
    document.getElementById("pro-hint").hidden = !pro; document.getElementById("route-hint").hidden = pro;
    syncLate();
  }
  // سطر يربط التمديد بالإجازة الأصلية
  function extLine(r) {
    if (r.kind !== "ext") return "";
    var b = reqById(r.ext_of), n = r.date_to ? spanDays(r.date_from, r.date_to) : 0;
    return '<p class="ext">⏩ ' + L("تمديد للإجازة رقم الصادر ", "Extends request no. ") +
      (b ? '<button type="button" class="lnk inl" data-act="open-req" data-id="' + b.id + '">' + esc(b.ref) + "</button> (" + esc(KR(b)) + L(" من ", " from ") + esc(b.date_from) + L(" إلى ", " to ") + esc(b.date_to || b.date_from) + ")" : "—") +
      (n ? " — " + L("مدة التمديد: ", "extension: ") + daysTxt(n) : "") + "</p>";
  }
  function refLine(r) {
    return '<p class="ref">' + L("رقم الصادر: ", "Outgoing no.: ") + "<b>" + esc(r.ref) + "</b> — " + L("تاريخ التقديم: ", "Submitted: ") + ymdhm(r.created) + "</p>";
  }
  function myCard(r) {
    var st = pill(r, "my"), sg = stage(r);
    return '<div class="card"><div class="ch"><h3>' + KR(r) + (r.perm_period ? " (" + T(PERIODS[r.perm_period]) + ")" : "") + "</h3>" + chr(r, st) + "</div>" +
      refLine(r) + "<p>" + dates(r) + "</p>" + extLine(r) + meetLine(r) + lateBox(r) + leaveBox(r) +
      (r.status === "r" ? '<p class="err">' + L("سبب الرفض: ", "Rejection reason: ") + esc(rejText(r)) + "</p>" : "") +
      r.followups.map(function (f, i) { return '<p class="fu">' + L("متابعة ", "Follow-up ") + (i + 1) + ": " + esc(f.note) + " — " + esc(uname(f.by)) + "</p>"; }).join("") +
      (r.med ? '<p><a href="#" data-act="med" data-id="' + r.id + '">' + L("صورة الطبية", "Medical photo") + "</a></p>" : "") +
      stamps(r) + (sg === "clerk" || sg === "exec" ? remindBox(r) : "") + "</div>";
  }
  function meetLine(r) { return r.meet_reason ? "<p>" + L("سبب المقابلة: ", "Meeting reason: ") + esc(r.meet_reason) + "</p>" : ""; }
  // الحالة + زر طباعة الطلب
  function chr(r, st) {
    return '<div class="chr"><span class="pill ' + st[0] + '">' + st[1] + '</span><button type="button" class="pr" data-act="print-req" data-id="' + r.id + '">🖨 ' + L("طباعة", "Print") + "</button></div>";
  }
  // شريط الأقسام: الكل | الاستئذانات | الإجازات | ...
  function catBar(path, p, list) {
    var c = p.c || "";
    var tabs = [["", L("الكل", "All"), list.length]].concat(Object.keys(CATS).map(function (k) {
      return [k, CATS[k].icon + " " + T(CATS[k].t), list.filter(function (r) { return catOf(r.kind) === k; }).length];
    }));
    return '<div class="cats-bar noprint">' + tabs.map(function (t) {
      return '<a href="' + link(path, Object.assign({}, p, { c: t[0] })) + '"' + (t[0] === c ? ' class="on"' : "") + ">" + t[1] + " <span>" + t[2] + "</span></a>";
    }).join("") + "</div>";
  }
  function listTools(n) {
    return n ? '<div class="ltools noprint"><button type="button" class="pbtn" data-act="print-list">🖨 ' + L("طباعة القائمة", "Print list") + " (" + n + ")</button></div>" : "";
  }
  // تذكير الإداري المداوم بالطلب على الواتساب
  function remindBox(r) {
    var list = load().roster.filter(function (e) { return dutyPhone(e); })
      .sort(function (a, b) { return (dutyOn(b) ? 1 : 0) - (dutyOn(a) ? 1 : 0); });
    if (!list.length) return "";
    return '<div class="remind"><span>' + L("لم يطّلع الإداري على طلبك؟ ذكّر المداوم:", "Not seen yet? Remind the person on duty:") + '</span><select id="rm' + r.id + '">' + list.map(function (e) {
      var on = dutyOn(e);
      return '<option value="' + e.id + '">' + (on ? "🟢 " : "⚪ ") + esc(dutyName(e)) + (on ? L(" (مداوم اليوم)", " (on duty today)") : L(" (غير مداوم)", " (off duty)")) + "</option>";
    }).join("") + '</select><button type="button" class="wa sm" data-act="remind" data-id="' + r.id + '">' + L("تذكير واتساب", "WhatsApp reminder") + "</button></div>";
  }
  function remindLink(r, e) {
    var emp = userById(r.user_id) || {}, admin = { full_name: dutyName(e), phone: dutyPhone(e) };
    var msg = L("السلام عليكم " + admin.full_name + "،\nتذكير بالطلب رقم الصادر " + r.ref + " (" + KR(r) + ") للموظف " + emp.full_name + " بتاريخ " + r.date_from +
      (r.date_to ? " إلى " + r.date_to : "") + "\nحالة الطلب: " + pill(r, "my")[1] + "\nيرجى الاطلاع واتخاذ اللازم، وشكرًا.\n\nنظام الطلبات - قسم الكهرباء والإلكترونيات",
      "Hello " + admin.full_name + ",\nA reminder about request no. " + r.ref + " (" + KR(r) + ") for " + emp.full_name + " dated " + r.date_from +
      (r.date_to ? " to " + r.date_to : "") + "\nStatus: " + pill(r, "my")[1] + "\nPlease review and take the necessary action. Thank you.\n\nRequests System - Electrical & Electronics Dept.");
    return "https://wa.me/965" + encodeURIComponent(admin.phone) + "?text=" + encodeURIComponent(msg);
  }
  function dates(r) {
    return (r.depart_date ? L("تاريخ المغادرة: ", "Departure: ") + esc(r.depart_date) + " — " : "") +
      (r.kind === "pexit" ? L("تاريخ الإجازة: ", "Leave: ") : "") + esc(r.date_from) + (r.date_to ? L(" إلى ", " to ") + esc(r.date_to) : "") +
      (r.time_from ? L(" — من ", " — from ") + esc(r.time_from) + (r.time_to ? L(" إلى ", " to ") + esc(r.time_to) : "") : "") +
      (r.meet_with ? L(" — المقابلة مع: ", " — Meeting with: ") + esc(meetName(r.meet_with)) : "");
  }
  function toggleKind() {
    var k = document.getElementById("f_kind"); if (!k) return;
    var show = SHOW[k.value] || [], pro = k.value === "ext" ? extPro() : PRO_KINDS.indexOf(k.value) >= 0;
    OPTIONAL.forEach(function (n) { var el = document.querySelector('[data-fld="' + n + '"]'); if (el) el.hidden = show.indexOf(n) < 0; });
    var lf = k.value !== "ext" && document.querySelector('label[for="f_date_from"]'); if (lf) lf.textContent = k.value === "pexit" ? L("تاريخ الإجازة (من)", "Leave from") : L("التاريخ / من تاريخ", "Date / from");
    var tt = document.getElementById("f_time_to"), lt = document.querySelector('label[for="f_time_to"]');
    if (tt) { tt.readOnly = k.value === "perm"; lt.textContent = k.value === "perm" ? L("إلى الساعة (تلقائيًا: 3 ساعات)", "To (automatic: 3 hours)") : L("إلى الساعة", "To"); }
    var ph = document.getElementById("pro-hint"); if (ph) ph.hidden = !pro;
    var rh = document.getElementById("route-hint"); if (rh) rh.hidden = pro;
    var lh = document.getElementById("leave-hint"); if (lh) lh.hidden = LEAVE_KINDS.indexOf(k.value) < 0;
    syncPermTime(); syncLate();
    if (k.value === "ext") syncExt();
  }
  function syncLate() {
    var k = document.getElementById("f_kind"), df = document.getElementById("f_date_from"), lh = document.getElementById("late-hint");
    if (!k || !df || !lh) return;
    var n = lateBy(k.value, df.value);
    lh.hidden = !n; lh.textContent = n ? lateForm(n, k.value === "ext" ? extPro() : PRO_KINDS.indexOf(k.value) >= 0) : "";
  }
  function syncPermTime() {
    var k = document.getElementById("f_kind"), tf = document.getElementById("f_time_from"), tt = document.getElementById("f_time_to");
    if (!k || !tf || k.value !== "perm") return;
    tt.value = tf.value && toMin(tf.value) + PERM_MIN < 1440 ? fromMin(toMin(tf.value) + PERM_MIN) : "";
  }
  function doReq(form) {
    var d = formData(form), e = {}, u = me(), show = SHOW[d.kind];
    if (!show) e.kind = L("اختر نوع الطلب", "Choose a request type");
    else OPTIONAL.forEach(function (n) { if (show.indexOf(n) < 0) d[n] = ""; });
    var file = show && show.indexOf("medical_image") >= 0 ? form.medical_image.files[0] : null, base = null;
    if (d.kind === "ext") {
      base = reqById(+d.ext_of);
      if (!base || base.user_id !== u.id || !extable(base) || base.status === "r") { base = null; e.ext_of = L("اختر الإجازة المراد تمديدها", "Choose the leave to extend"); }
      else d.date_from = nextDay(base.date_to || base.date_from); // بداية التمديد = اليوم التالي لنهاية الإجازة
      if (!d.date_to) e.date_to = L("اختر تاريخ نهاية التمديد", "Choose the extension end date");
    }
    if (!d.date_from) e.date_from = req();
    if (!d.secret) e.secret = req();
    if (d.kind === "perm") {
      if (!d.perm_period) e.perm_period = L("اختر: بداية الدوام أو أثناء الدوام أو نهاية الدوام", "Choose start, during or end of shift");
      if (!d.time_from) e.time_from = L("حدّد ساعة بداية الاستئذان", "Set the permission start time");
      else if (toMin(d.time_from) + PERM_MIN >= 1440) e.time_from = L("الاستئذان 3 ساعات ويجب أن ينتهي في اليوم نفسه", "A permission is 3 hours and must end the same day");
      else d.time_to = fromMin(toMin(d.time_from) + PERM_MIN); // 3 ساعات بالضبط، لا أكثر ولا أقل
    }
    if (d.kind === "meet") {
      if (!MEET[d.meet_with]) e.meet_with = L("اختر المسؤول المطلوب مقابلته", "Choose who you want to meet");
      if (!d.meet_reason) e.meet_reason = L("اكتب سبب المقابلة", "Write the reason for the meeting");
    }
    if (d.kind === "pexit" && !d.depart_date) e.depart_date = L("اكتب تاريخ المغادرة", "Enter the departure date");
    if (d.kind === "med" && !file) e.medical_image = L("أرفق صورة الطبية", "Attach the medical certificate photo");
    if (file && !/^image\//.test(file.type)) e.medical_image = L("يجب أن يكون الملف صورة", "The file must be an image");
    if (d.kind !== "perm" && d.time_from && d.time_to && d.time_to <= d.time_from) e.time_to = L("وقت النهاية يجب أن يكون بعد البداية", "End time must be after start time");
    if (d.date_to && d.date_from && d.date_to < d.date_from) e.date_to = L("تاريخ النهاية قبل البداية", "End date is before start date");
    if (Object.keys(e).length) { delete d.secret; myState = { errs: e, val: d }; return render(); }
    (file ? shrink(file) : Promise.resolve("")).then(function (img) {
      var D = load(), df = parseDate(d.date_from), nowIso = new Date().toISOString();
      var r = { id: D.seq.r++, ref: "", user_id: u.id, kind: d.kind, date_from: d.date_from, date_to: d.date_to, depart_date: d.depart_date, time_from: d.time_from, time_to: d.time_to,
        meet_with: d.meet_with, meet_reason: d.meet_reason, perm_period: d.perm_period, notes: d.notes, med: img, secret: "", status: "p",
        ext_of: base ? base.id : null, ext_kind: base ? (base.kind === "ext" ? base.ext_kind : base.kind) : "",
        pro_by: null, pro_at: null, pro_proxy: false, decided_by: null, decided_at: null, dec_role: "",
        reject_reason: "", auto_rejected: false, done_by: null, done_at: null, followups: [], created: nowIso };
      var over = r.kind === "perm" && used(u.id, df.getFullYear(), df.getMonth()) >= LIMIT;
      r.ref = nextRef(D, nowIso);
      if (over) {
        r.status = "r"; r.auto_rejected = true; r.decided_at = r.created;
        D.reqs.push(r); log("auto", r.id); save();
        flash("err", L("رقم الصادر " + r.ref + ": رُفض الطلب تلقائيًا لتجاوز الحد الشهري (" + LIMIT + " استئذانات).", "Outgoing no. " + r.ref + ": rejected automatically — monthly limit (" + LIMIT + " permissions) exceeded."));
        return render();
      }
      r.secret = d.secret;
      D.reqs.push(r);
      var lt = lateOf(r);
      log(lt ? "late" : "submit", r.id, lt || "");
      if (save()) {
        var to = isPro(r) ? L("مسؤول المهنيين", "the Professionals Officer") : L("الإداري", "the administrative clerk");
        var okm = L("أُرسل الطلب برقم الصادر " + r.ref + "، وهو الآن لدى " + to + " للاعتماد.", "Request sent — outgoing no. " + r.ref + ". It is now with " + to + " for approval.");
        if (lt) flash("warn", okm + " " + lateCard(lt)); else flash("ok", okm);
        return nav(link("my", { c: catOf(r.kind) }));
      }
      D.reqs.pop(); render();
    }, function () { myState = { errs: { medical_image: L("تعذّرت قراءة الصورة", "Could not read the image") }, val: d }; render(); });
  }
  // تصغير الصورة قبل حفظها بالمتصفح
  function shrink(file) {
    return new Promise(function (ok, bad) {
      var fr = new FileReader();
      fr.onerror = bad;
      fr.onload = function () {
        var img = new Image();
        img.onerror = bad;
        img.onload = function () {
          var k = Math.min(1, 1200 / Math.max(img.width, img.height)), c = document.createElement("canvas");
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          ok(c.toDataURL("image/jpeg", 0.75));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- القوائم ---------- */
  function byCreated(a, b) { return a.created < b.created ? 1 : -1; }
  function filterBar(path, q, f, filters, c) {
    return '<form class="flt" data-f="filter" data-path="' + path + '"><input type="hidden" name="c" value="' + esc(c || "") + '"><input name="q" value="' + esc(q) + '" placeholder="' +
      L("ابحث بالاسم أو رقم الصادر", "Search by name or outgoing no.") + '"><select name="f">' +
      filters.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === f ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select><button>" + L("بحث", "Search") + "</button></form>";
  }
  function byName(list, q) { return q ? list.filter(function (r) { return uname(r.user_id).indexOf(q) >= 0 || (r.ref || "").indexOf(q) >= 0; }) : list; }
  // ترحيب + مربعات عدّادات: [[العدد، العنوان، رابط اختياري، مفعّل؟]]
  function hello(u, tiles) {
    return '<div class="hello">' + L("أهلًا، ", "Welcome, ") + esc((u.full_name || u.username).split(" ")[0]) + "</div>" +
      '<div class="tiles">' + tiles.map(function (t) {
        var tag = t[2] ? "a" : "div";
        return "<" + tag + (t[2] ? ' href="' + t[2] + '"' : "") + (t[3] ? ' class="on"' : "") + "><b>" + t[0] + "</b>" + t[1] + "</" + tag + ">";
      }).join("") + "</div>";
  }
  function listView(path, u, q, base, defF, F, mode, intro) {
    var f = F.some(function (x) { return x[0] === q.f; }) ? q.f : defF, s = (q.q || "").trim(), c = CATS[q.c] ? q.c : "";
    var test = function (k) { for (var i = 0; i < F.length; i++) if (F[i][0] === k) return F[i][2]; return null; };
    var cat = byCat(base, c), items = byName(base.filter(test(f)), s).sort(byCreated), shown = byCat(items, c);
    var label = F.filter(function (x) { return x[0] === f; })[0][1];
    setList((c ? T(CATS[c].t) : L("كل الطلبات", "All requests")) + " — " + label + (s ? L(" — بحث: ", " — search: ") + s : ""), shown);
    var tiles = F.filter(function (x) { return x[3]; }).map(function (x) { return [cat.filter(x[2]).length, x[1], link(path, { f: x[0], c: c }), f === x[0]]; });
    return hello(u, tiles) + (intro || "") + filterBar(path, s, f, F.map(function (x) { return [x[0], x[1]]; }), c) +
      catBar(path, { f: f, q: s, c: c }, items) + listTools(shown.length) + cards(shown, mode);
  }
  var ALL = function () { return true; };
  /* مسؤول المهنيين: إجازة مهنيين + إذن مغادرة */
  function viewPro(q, u) {
    return listView("pro", u, q, load().reqs.filter(isPro), "w", [
      ["w", L("بانتظار اعتمادك", "Awaiting your approval"), function (r) { return stage(r) === "pro"; }, true],
      ["ok", L("اعتمدتَها", "Approved by you"), function (r) { return !!r.pro_by && r.status !== "r"; }, true],
      ["r", L("مرفوض", "Rejected"), function (r) { return r.status === "r"; }, true],
      ["all", L("الكل", "All"), ALL]
    ], "pro");
  }
  /* ضابط القسم / رئيس القسم: متابعة الطلبات للاطلاع فقط (الاعتماد عند الإداري ومسؤول المهنيين ومدير النظام) */
  function viewReview(q, u) {
    var intro = '<p class="msg">' + L("👁️ هذه الصفحة للاطلاع والمتابعة فقط — اعتماد الطلبات لدى الإداري ومسؤول المهنيين ومدير النظام.",
      "👁️ This page is for viewing and follow-up only — requests are approved by the administrative clerk, the Professionals Officer and the System Administrator.") + "</p>";
    return listView("review", u, q, load().reqs, "p", [
      ["p", L("قيد الاعتماد", "Pending"), function (r) { return r.status === "p"; }, true],
      ["a", L("معتمد", "Approved"), function (r) { return r.status === "a"; }, true],
      ["late", L("مقدّمة متأخرة", "Submitted late"), function (r) { return !!lateOf(r); }, true],
      ["r", L("مرفوض", "Rejected"), function (r) { return r.status === "r"; }],
      ["all", L("الكل", "All"), ALL]
    ], "review", intro);
  }
  /* الإداري: اعتماد الطلبات في موعدها + تنفيذ كل الطلبات المعتمدة */
  function viewQueue(q, u) {
    var mine = dutyOf(u), nd = mine && !dutyOn(mine) ? nextDuty(mine) : null, tl = dutyToday();
    var duty = '<div class="duty"><span>' + (u.role === "a" ? (mine ? L("حالتك اليوم حسب زام الإداري: ", "Today, per the duty roster: ") +
        (dutyOn(mine) ? "🟢 <b>" + L("مداوم", "On duty") + "</b>" : "⚪ <b>" + L("غير مداوم", "Off duty") + "</b>" + (nd ? L(" — مداومتك القادمة: ", " — next duty: ") + T(WD[nd.getDay()]) + " " + ymd(nd) : ""))
        : L("لست مُدرجًا في زام الإداري", "You are not on the duty roster")) + "<br>" : "") +
      L("المداومون اليوم: ", "On duty today: ") + "<b>" + (tl.length ? tl.map(function (e) { return esc(dutyName(e)); }).join(L("، ", ", ")) : "—") + "</b></span>" +
      (u.role === "s" ? '<a class="pbtn" href="#/duty">' + L("إدارة زام الإداري", "Manage duty roster") + "</a>" : "") + "</div>";
    return listView("queue", u, q, load().reqs.filter(function (r) { return !r.auto_rejected; }), "w", [
      ["w", L("بانتظار اعتمادك", "Awaiting your approval"), function (r) { return stage(r) === "clerk"; }, true],
      ["n", L("معتمد بانتظار التنفيذ", "Approved — to execute"), function (r) { return stage(r) === "exec" && !r.followups.length; }, true],
      ["f", L("يرجى المتابعة", "Follow-up needed"), function (r) { return stage(r) === "exec" && r.followups.length; }, true],
      ["d", L("تم عمل اللازم", "Completed"), function (r) { return stage(r) === "done"; }, true],
      ["o", L("لدى جهة أخرى", "With another approver"), function (r) { return stage(r) === "pro"; }],
      ["r", L("مرفوض", "Rejected"), function (r) { return r.status === "r"; }],
      ["all", L("الكل", "All"), ALL]
    ], "queue", duty);
  }
  function reqDetails(r, u, mode) {
    var h = refLine(r);
    h += '<p class="sub">' + esc(u.job_title) + " — " + L("هاتف: ", "Phone: ") + esc(u.phone) + (mode === "queue" ? " — " + L("مدني: ", "Civil ID: ") + esc(u.civil_id) : "") + "</p>";
    h += "<p>" + (r.perm_period ? T(PERIODS[r.perm_period]) + " — " : "") + dates(r) + "</p>" + extLine(r) + meetLine(r) + lateBox(r) + leaveBox(r);
    if (r.notes) h += "<p>" + esc(r.notes) + "</p>";
    if (r.med) h += '<p><a href="#" data-act="med" data-id="' + r.id + '">' + L("صورة الطبية", "Medical photo") + "</a></p>";
    if (r.status === "r") h += '<p class="err">' + L("السبب: ", "Reason: ") + esc(rejText(r)) + "</p>";
    h += r.followups.map(function (x, i) { return '<p class="fu">' + L("متابعة ", "Follow-up ") + (i + 1) + ": " + esc(x.note) + " — " + esc(uname(x.by)) + " — " + ymdhm(x.at) + "</p>"; }).join("");
    return h + stamps(r);
  }
  function decideForm(type, id, okLabel) {
    return '<form class="acts" data-f="' + type + '" data-id="' + id + '"><input name="reason" placeholder="' + L("سبب الرفض (إلزامي عند الرفض)", "Rejection reason (required to reject)") +
      '"><button class="g" name="do" value="a">' + okLabel + '</button><button class="r" name="do" value="r">' + L("رفض", "Reject") + "</button></form>";
  }
  function cards(items, mode) {
    if (!items.length) return "<p>" + L("لا توجد طلبات.", "No requests.") + "</p>";
    var who = me() || {}, isAdm = who.role === "s";
    return items.map(function (r) {
      var u = userById(r.user_id) || {}, st = pill(r, mode), sg = stage(r), can = canAct(who, r);
      var h = '<div class="card"><div class="ch"><h3>' + esc(u.full_name) + " — " + KR(r) + "</h3>" + chr(r, st) + "</div>" + reqDetails(r, u, mode);
      if (mode === "view") return h + "</div>";
      if (sg === "pro") {
        if (can) h += (isAdm ? '<p class="wait">✍️ ' + L("توقيعك هنا يكون بالنيابة عن مسؤول المهنيين (بختمك)", "You sign here on behalf of the Professionals Officer (with your stamp)") + "</p>" : "") +
          decideForm("pro", r.id, isAdm ? L("اعتماد عن مسؤول المهنيين", "Approve for Professionals Officer") : L("اعتماد", "Approve"));
        else h += '<p class="wait">⏳ ' + L("بانتظار اعتماد مسؤول المهنيين", "Awaiting the Professionals Officer") + "</p>";
      } else if (sg === "clerk") {
        if (can) h += decideForm("decide", r.id, L("اعتماد", "Approve"));
        else h += '<p class="wait">⏳ ' + L("بانتظار اعتماد الإداري", "Awaiting the administrative clerk") + "</p>";
      } else if (sg === "exec" && mode === "queue" && can) {
        if (r.secret) h += "<p>" + L("الرقم السري: ", "Secret number: ") + '<span id="s' + r.id + '">••••••</span> <button type="button" class="s" data-act="reveal" data-id="' + r.id + '">' + L("إظهار", "Show") + "</button></p>";
        h += '<form class="qa" data-f="qact" data-id="' + r.id + '"><input name="note" placeholder="' + L("المطلوب متابعته (للمتابعة فقط)", "What needs follow-up (follow-up only)") + '">' +
          '<button class="g" name="do" value="done">' + L("تم عمل اللازم", "Completed") + '</button><button class="o" name="do" value="follow">' + L("يرجى المتابعة", "Needs follow-up") + "</button></form>";
      }
      if (mode === "queue" && u.phone && sg !== "pro" && sg !== "clerk") h += '<a class="wa" target="_blank" rel="noopener" href="' + waLink(r, u) + '">' + L("أرسل واتساب", "Send WhatsApp") + "</a>";
      return h + "</div>";
    }).join("");
  }
  // لون ونص حالة الطلب في رأس البطاقة
  function pill(r, mode) {
    var sg = stage(r);
    if (sg === "rej") return ["r", L("مرفوض", "Rejected")];
    if (sg === "done") return ["g", L("تم عمل اللازم", "Completed")];
    if (sg === "exec") return r.followups.length ? ["f", L("يرجى المتابعة", "Follow-up needed")] : mode === "queue" ? ["y", L("بانتظار التنفيذ", "To execute")] : ["g", L("معتمد", "Approved")];
    if (sg === "pro") return ["y", mode === "pro" ? L("بانتظار اعتمادك", "Awaiting your approval") : L("بانتظار مسؤول المهنيين", "With Professionals Officer")];
    return ["y", mode === "queue" ? L("بانتظار اعتمادك", "Awaiting your approval") : L("بانتظار اعتماد الإداري", "With admin clerk")];
  }
  // رسالة واتساب جاهزة للموظف (أرقام الكويت 8 خانات + 965)
  function waLink(r, u) {
    var st = r.status === "r" ? L("مرفوض", "Rejected") + (rejText(r) ? L(" — السبب: ", " — reason: ") + rejText(r) : "")
      : r.done_at ? L("تم اعتماد الطلب وعمل اللازم", "Approved and completed")
      : r.followups.length ? L("يرجى المتابعة: ", "Follow-up needed: ") + r.followups[r.followups.length - 1].note
      : L("تم اعتماد الطلب وجارٍ تنفيذه", "Approved and being processed");
    var msg = L("مرحبًا " + u.full_name + "،\nبخصوص الطلب رقم الصادر " + r.ref + " (" + KR(r) + ") بتاريخ " + r.date_from + (r.date_to ? " إلى " + r.date_to : "") +
      ":\n" + st + "\n\nقسم الكهرباء والإلكترونيات - خفر السواحل",
      "Hello " + u.full_name + ",\nRegarding request no. " + r.ref + " (" + KR(r) + ") dated " + r.date_from + (r.date_to ? " to " + r.date_to : "") +
      ":\n" + st + "\n\nElectrical & Electronics Dept. - Coast Guard");
    return "https://wa.me/965" + encodeURIComponent(u.phone) + "?text=" + encodeURIComponent(msg);
  }
  function doPro(form, submitter) {
    var r = reqById(+form.dataset.id), why = form.reason.value.trim(), act = submitter && submitter.value, now = new Date().toISOString(), who = me();
    if (!r || !who || stage(r) !== "pro" || !canAct(who, r)) return render();
    if (act === "r" && !why) { flash("err", L("يجب كتابة سبب الرفض", "A rejection reason is required")); return render(); }
    r.pro_proxy = who.role !== "m"; // توقيع مدير النظام بالنيابة عن مسؤول المهنيين
    if (act === "a") {
      r.pro_by = who.id; r.pro_at = now;
      r.status = "a"; // اعتماد مسؤول المهنيين نهائي، والتنفيذ عند الإداري
      log("pro_ok", r.id, r.pro_proxy ? "proxy" : "");
      flash("ok", L("تم اعتماد الطلب، وأُحيل إلى الإداري للتنفيذ.", "Request approved and sent to the administrative clerk for execution."));
    } else {
      r.status = "r"; r.reject_reason = why; r.decided_by = who.id; r.decided_at = now; r.dec_role = "pro";
      log("pro_rej", r.id, r.pro_proxy ? "proxy" : "");
    }
    save(); render();
  }
  function doDecide(form, submitter) {
    var r = reqById(+form.dataset.id), why = form.reason.value.trim(), act = submitter && submitter.value, who = me(), sg = r && stage(r);
    if (!r || sg !== "clerk" || !canAct(who, r)) return render();
    if (act === "r" && !why) { flash("err", L("يجب كتابة سبب الرفض", "A rejection reason is required")); return render(); }
    r.status = act === "a" ? "a" : "r"; r.reject_reason = act === "r" ? why : "";
    r.decided_by = who.id; r.decided_at = new Date().toISOString(); r.dec_role = sg;
    log(act === "a" ? (lateOf(r) ? "ok_late" : "ok") : "rej", r.id);
    flash("ok", act === "a" ? L("تم اعتماد الطلب رقم الصادر " + r.ref, "Request " + r.ref + " approved") : L("تم رفض الطلب رقم الصادر " + r.ref, "Request " + r.ref + " rejected"));
    save(); render();
  }
  function doFollowup(form) {
    var r = reqById(+form.dataset.id), note = form.note.value.trim();
    if (!r || stage(r) !== "exec") return render();
    if (!note) { flash("err", L("اكتب المطلوب متابعته", "Write what needs follow-up")); return render(); }
    r.followups.push({ note: note, by: me().id, at: new Date().toISOString() });
    log("follow", r.id); save(); render();
  }
  function doDone(form) {
    var r = reqById(+form.dataset.id);
    if (!r || stage(r) !== "exec") return render();
    r.done_by = me().id; r.done_at = new Date().toISOString(); r.secret = ""; // يحذف الرقم السري
    log("done", r.id); save(); render();
  }

  /* ---------- عرض الطلب (من سجل العمليات) ---------- */
  function canSee(u, r) { return u.role === "e" ? r.user_id === u.id : u.role === "m" ? (r.user_id === u.id || isPro(r)) : true; }
  function openReq(r) {
    document.getElementById("modal-body").innerHTML = '<p class="mh">' + L("الكتاب رقم الصادر ", "Document — outgoing no. ") + "<b>" + esc(r.ref) + "</b></p>" + cards([r], "view") +
      '<h3 class="sh">' + L("سجل عمليات هذا الكتاب", "This document's audit trail") + "</h3>" + auditTable(load().audit.filter(function (a) { return a.rid === r.id; }), false);
    document.getElementById("modal").hidden = false;
  }

  /* ---------- الطباعة: نموذج طلب واحد أو كشف القائمة الحالية ---------- */
  var lastList = { title: "", items: [] };
  function setList(title, items) { lastList = { title: title, items: items.slice() }; }
  function letterhead(lbl) {
    return '<div class="lh"><div class="r"><b>' + T(ORG) + "</b><span>" + T(DEPT) + '</span></div><div class="c"><img src="logo.png" alt=""></div>' +
      '<div class="l"><span>' + (lbl || L("تاريخ الطباعة", "Printed on")) + "</span><b>" + ymd(new Date()) + "</b></div></div>";
  }
  function printFoot() {
    return '<div class="ft">' + L("نظام الطلبات الإدارية - قسم الكهرباء والإلكترونيات - للاستخدام الداخلي — طُبع ", "Administrative Requests System - Electrical & Electronics Dept. - internal use — printed ") +
      ymdhm(new Date().toISOString()) + " — " + CREDIT + "</div>";
  }
  function printReq(r) {
    var u = userById(r.user_id) || {}, days = r.date_to ? Math.round((parseDate(r.date_to) - parseDate(r.date_from)) / 864e5) + 1 : 0;
    var rows = [
      [L("رقم الصادر", "Outgoing no."), r.ref],
      [L("نوع الطلب", "Request type"), KR(r)],
      r.kind === "ext" && reqById(r.ext_of) && [L("تمديد للإجازة", "Extends"), (function (b) { return L("رقم الصادر ", "No. ") + b.ref + " — " + KR(b) + L(" من ", " from ") + b.date_from + L(" إلى ", " to ") + (b.date_to || b.date_from); })(reqById(r.ext_of))],
      r.perm_period && [L("وقت الاستئذان", "Permission time"), T(PERIODS[r.perm_period])],
      r.depart_date && [L("تاريخ المغادرة", "Departure date"), r.depart_date],
      [r.kind === "pexit" ? L("تاريخ الإجازة", "Leave dates") : r.date_to ? L("الفترة", "Period") : L("التاريخ", "Date"), r.date_from + (r.date_to ? L(" إلى ", " to ") + r.date_to : "")],
      days && [L("عدد الأيام", "Days"), daysTxt(days)],
      r.time_from && [L("الوقت", "Time"), L("من ", "from ") + r.time_from + (r.time_to ? L(" إلى ", " to ") + r.time_to : "")],
      r.meet_with && [L("المقابلة مع", "Meeting with"), meetName(r.meet_with)],
      r.meet_reason && [L("سبب المقابلة", "Meeting reason"), r.meet_reason],
      r.notes && [L("ملاحظات", "Notes"), r.notes],
      [L("الحالة", "Status"), pill(r, "my")[1]],
      r.status === "r" && [L("سبب الرفض", "Rejection reason"), rejText(r)],
      [L("تاريخ التقديم", "Submitted"), ymdhm(r.created)],
      lateOf(r) && [L("تنبيه التأخير", "Late notice"), lateCard(lateOf(r)).replace(/^⚠️\s*/, "")],
      LEAVE_KINDS.indexOf(r.kind) >= 0 && r.status !== "r" && [L("تنبيه", "Notice"), leaveNote().replace(/^📌\s*/, "")]
    ].filter(Boolean);
    var doc = letterhead() + '<div class="rt"><h1>' + L("نموذج طلب ", "Request form: ") + KR(r) + "</h1><p>" + L("رقم الصادر: ", "Outgoing no.: ") + esc(r.ref) + "</p></div>" +
      '<h3 class="sh">' + L("بيانات الموظف", "Employee details") + '</h3><table class="meta"><tr><th>' + L("الاسم", "Name") + "</th><td>" + esc(u.full_name) + "</td><th>" + L("المسمى", "Job title") + "</th><td>" + esc(u.job_title) + "</td></tr>" +
      "<tr><th>" + L("الرقم المدني", "Civil ID") + "</th><td>" + esc(u.civil_id) + "</td><th>" + L("الهاتف", "Phone") + "</th><td>" + esc(u.phone) + "</td></tr></table>" +
      '<h3 class="sh">' + L("تفاصيل الطلب", "Request details") + '</h3><table class="meta det">' + rows.map(function (x) { return "<tr><th>" + x[0] + "</th><td>" + esc(x[1]) + "</td></tr>"; }).join("") + "</table>" +
      (r.followups.length ? '<h3 class="sh">' + L("المتابعات", "Follow-ups") + "</h3><table><thead><tr><th>#</th><th>" + L("المطلوب", "Required") + "</th><th>" + L("بواسطة", "By") + "</th><th>" + L("الوقت", "Time") + "</th></tr></thead><tbody>" +
        r.followups.map(function (f, i) { return "<tr><td>" + (i + 1) + "</td><td>" + esc(f.note) + "</td><td>" + esc(uname(f.by)) + "</td><td>" + ymdhm(f.at) + "</td></tr>"; }).join("") + "</tbody></table>" : "") +
      '<h3 class="sh">' + L("الاعتمادات", "Approvals") + "</h3>" + (stamps(r) || '<p class="sub">' + L("لا توجد اعتمادات بعد.", "No approvals yet.") + "</p>") +
      (r.med ? '<h3 class="sh">' + L("مرفق: صورة الطبية", "Attachment: medical certificate") + '</h3><img class="att" src="' + r.med + '" alt="">' : "") + printFoot();
    log("print", r.id); save();
    doPrint(doc);
  }
  function printList() {
    var Lst = lastList;
    var rows = Lst.items.map(function (r, i) {
      var u = userById(r.user_id) || {}, ap = r.decided_by ? userById(r.decided_by) : null, dn = r.done_by ? userById(r.done_by) : null;
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(r.ref) + "</td><td>" + esc(u.full_name) + "<br><small>" + esc(u.job_title) + "</small></td><td>" + KR(r) + "</td><td>" +
        (r.depart_date ? L("مغادرة: ", "Departure: ") + r.depart_date + "<br>" : "") + r.date_from + (r.date_to ? "<br>" + L("إلى ", "to ") + r.date_to : "") +
        (lateOf(r) ? '<br><small class="lt">⚠️ ' + L("متأخر ", "late by ") + daysTxt(lateOf(r)) + "</small>" : "") + "</td><td>" + (r.time_from ? r.time_from + (r.time_to ? " - " + r.time_to : "") : "—") + "</td><td>" +
        pill(r, "my")[1] + (r.status === "r" ? "<br><small>" + esc(rejText(r)) + "</small>" : "") + "</td><td>" +
        (r.pro_by ? "<small>" + L("المهنيين: ", "Professionals: ") + esc(uname(r.pro_by)) + "</small><br>" : "") + (ap ? esc(nameLine(ap)) : r.pro_by ? "" : "—") + "</td><td>" +
        (dn ? esc(dn.full_name) + "<br><small>" + ymdhm(r.done_at) + "</small>" : "—") + "</td></tr>";
    }).join("");
    var doc = letterhead() + '<div class="rt"><h1>' + L("كشف ", "Report: ") + esc(Lst.title) + "</h1><p>" + L("عدد الطلبات: ", "Requests: ") + Lst.items.length + "</p></div>" +
      '<table class="lst"><thead><tr><th>' + L("م", "#") + "</th><th>" + L("الصادر", "Out no.") + "</th><th>" + L("الموظف", "Employee") + "</th><th>" + L("النوع", "Type") + "</th><th>" + L("التاريخ", "Date") + "</th><th>" +
      L("الوقت", "Time") + "</th><th>" + L("الحالة", "Status") + "</th><th>" + L("الاعتماد", "Approval") + "</th><th>" + L("التنفيذ", "Execution") + "</th></tr></thead><tbody>" +
      (rows || '<tr><td colspan="9">' + L("لا توجد طلبات", "No requests") + "</td></tr>") + "</tbody></table>" + printFoot();
    doPrint(doc);
  }
  function doPrint(html) {
    var p = document.getElementById("print");
    p.innerHTML = html;
    document.body.classList.add("pmode");
    var imgs = [].slice.call(p.querySelectorAll("img")).map(function (im) {
      return im.complete ? Promise.resolve() : new Promise(function (ok) { im.onload = im.onerror = ok; setTimeout(ok, 1500); });
    });
    Promise.all(imgs).then(function () { window.print(); });
  }
  window.addEventListener("afterprint", function () {
    if (statTemp) { statTemp = null; render(); } // اعتماد الإحصائية لمرة واحدة: يرجع التقرير طبيعي بعد الطباعة
    if (!document.body.classList.contains("pmode")) return;
    document.body.classList.remove("pmode"); document.getElementById("print").innerHTML = "";
  });

  /* ---------- الإحصائيات ---------- */
  var PER = { week: ["أسبوع (آخر 7 أيام)", "Week (last 7 days)"], month: ["شهر (من أول الشهر)", "Month (since the 1st)"], "3m": ["3 أشهر", "3 months"],
              "6m": ["6 أشهر", "6 months"], year: ["سنة كاملة (يناير - ديسمبر)", "Full year (Jan - Dec)"] };
  // اعتماد الإحصائية مؤقت (لهذه الطباعة فقط) — لا يُحفظ، ويُلغى بعد الطباعة أو عند تغيير التقرير
  var statTemp = null;
  function viewStats(q, u) {
    var p = PER[q.p] ? q.p : "month", now = new Date(), since, until, end;
    var eu = q.e ? userById(+q.e) : null, eid = eu ? eu.id : 0;
    if (p === "week") { since = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -7); until = new Date(+now + 6e4); end = now; }
    else {
      var back = { month: 0, "3m": 2, "6m": 5, year: now.getMonth() }[p];
      since = new Date(now.getFullYear(), now.getMonth() - back, 1);
      until = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      if (p === "year") until = new Date(since.getFullYear() + 1, 0, 1);
      end = addDays(until, -1);
    }
    var D = load(), qs = D.reqs.filter(function (r) { var c = new Date(r.created); return c >= since && c < until && (!eid || r.user_id === eid); });
    var kinds = {}, tot = { all: 0, p: 0, a: 0, r: 0 }, late = 0, emp = {}, lv = { leave: [0, 0], emer: [0, 0], med: [0, 0], pleave: [0, 0], pexit: [0, 0], ext: [0, 0] };
    qs.forEach(function (r) {
      tot.all++; tot[r.status]++; if (lateOf(r)) late++;
      kinds[KR(r)] = (kinds[KR(r)] || 0) + 1;
      var n = uname(r.user_id), e = emp[n] || (emp[n] = { perm: 0, leave: 0, days: 0, rej: 0 });
      if (r.status === "r") { e.rej++; return; }
      if (r.kind === "perm") e.perm++;
      if (lv[r.kind]) {
        var d = Math.round((parseDate(r.date_to || r.date_from) - parseDate(r.date_from)) / 864e5) + 1;
        lv[r.kind][0]++; lv[r.kind][1] += d; e.leave++; e.days += d;
      }
    });
    var mx = Math.max.apply(null, [1].concat(Object.keys(kinds).map(function (k) { return kinds[k]; })));
    var ln = 0, ld = 0; Object.keys(lv).forEach(function (k) { ln += lv[k][0]; ld += lv[k][1]; });
    var kRows = Object.keys(kinds).sort().map(function (k) { return "<tr><td>" + k + "</td><td>" + kinds[k] + '</td><td class="bc"><i style="width:' + Math.round(kinds[k] * 100 / mx) + '%"></i></td></tr>'; }).join("");
    var eRows = Object.keys(emp).sort(function (a, b) { return a.localeCompare(b, "ar"); }).map(function (n) { var e = emp[n]; return "<tr><td>" + esc(n) + "</td><td>" + e.perm + "</td><td>" + e.leave + "</td><td>" + e.days + "</td><td>" + e.rej + "</td></tr>"; }).join("");
    var nowS = ymd(now) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes());
    // الاعتماد = الإداري اللي صدّر الإحصائية (زر اعتماد)
    var key = p + "|" + eid + "|" + ymd(since), canOk = "ams".indexOf(u.role) >= 0;
    if (statTemp && statTemp.key !== key) statTemp = null;
    var ok = statTemp, head = D.users.filter(function (x) { return x.role === "h"; })[0];
    var okBar = ok ? '<p class="msg ok noprint">✔ ' + L("معتمدة لهذه الطباعة فقط — تعود الإحصائية بدون اعتماد تلقائيًا بعد الطباعة.", "Approved for this printout only — it returns to unapproved automatically after printing.") + "</p>"
      : canOk ? '<p class="noprint"><button class="p g" type="button" data-act="stat-ok" data-key="' + esc(key) + '">✍️ ' + L("اعتماد وطباعة هذه الإحصائية", "Approve & print this report") +
        '</button> <small class="sub">' + L("(يظهر ختمك لهذه الطباعة فقط، ثم تعود الإحصائية طبيعية بدون اعتماد)", "(your stamp appears for this printout only, then the report returns to normal)") + "</small></p>"
      : '<p class="msg noprint">' + L("الاعتماد عند الطباعة من الإداري أو مسؤول المهنيين.", "Approval is added at print time by the administrative clerk or the Professionals Officer.") + "</p>";
    var people = D.users.slice().sort(function (a, b) { return a.full_name.localeCompare(b.full_name, "ar"); });
    return '<form class="flt noprint" data-f="filter" data-path="stats"><select name="e"><option value="">' + L("جميع الموظفين", "All employees") + "</option>" +
      people.map(function (x) { return '<option value="' + x.id + '"' + (x.id === eid ? " selected" : "") + ">" + esc(x.full_name) + " — " + esc(x.job_title) + "</option>"; }).join("") + '</select><select name="p">' +
      Object.keys(PER).map(function (k) { return '<option value="' + k + '"' + (k === p ? " selected" : "") + ">" + T(PER[k]) + "</option>"; }).join("") + "</select><button>" + L("عرض", "Show") + "</button></form>" +
      okBar +
      '<p class="noprint"><button class="p" type="button" data-act="print">' + L("تصدير PDF", "Export PDF") + '</button> <small class="sub">' + L("(من نافذة الطباعة اختر «حفظ بصيغة PDF»)", "(choose “Save as PDF” in the print dialog)") + "</small></p>" +
      letterhead(L("تاريخ الإصدار", "Issued on")) +
      '<div class="rt"><h1>' + L("تقرير إحصائية الطلبات الإدارية", "Administrative Requests Statistics") + (eu ? " — " + esc(eu.full_name) : "") + "</h1><p>" + T(PER[p]) + "</p></div>" +
      '<div class="tw"><table class="meta"><tr><th>' + L("الفترة", "Period") + "</th><td>" + L("من ", "from ") + ymd(since) + L(" إلى ", " to ") + ymd(end) + "</td><th>" + L("الموظف", "Employee") + "</th><td>" + (eu ? esc(eu.full_name) + " (" + esc(eu.job_title) + ")" : L("جميع الموظفين", "All employees")) + "</td></tr>" +
      "<tr><th>" + L("الاعتماد", "Approval") + "</th><td>" + (ok ? esc(nameLine(userById(ok.by) || {})) + " (" + esc((userById(ok.by) || {}).job_title) + ")" : L("غير معتمدة بعد", "Not approved yet")) + "</td><th>" + L("وقت الإصدار", "Issued at") + "</th><td>" + nowS + "</td></tr></table></div>" +
      '<div class="kp"><div><b>' + tot.all + "</b>" + L("إجمالي الطلبات", "Total requests") + "</div><div><b>" + tot.p + "</b>" + L("قيد الاعتماد", "Pending") + "</div><div><b>" + tot.a + "</b>" + L("معتمد", "Approved") +
      "</div><div><b>" + tot.r + "</b>" + L("مرفوض", "Rejected") + "</div><div><b>" + late + "</b>" + L("مقدّمة متأخرة", "Submitted late") + "</div><div><b>" + ld + "</b>" + L("أيام الإجازات", "Leave days") + "</div></div>" +
      '<h3 class="sh">' + L("1. الطلبات حسب النوع", "1. Requests by type") + '</h3><div class="tw"><table><thead><tr><th>' + L("النوع", "Type") + "</th><th>" + L("العدد", "Count") + "</th><th>" + L("النسبة", "Share") + "</th></tr></thead><tbody>" +
      (kRows || '<tr><td colspan="3">' + L("لا توجد طلبات", "No requests") + "</td></tr>") + "</tbody></table></div>" +
      '<h3 class="sh">' + L("2. إحصائية الإجازات", "2. Leave statistics") + '</h3><div class="tw"><table><thead><tr><th>' + L("نوع الإجازة", "Leave type") + "</th><th>" + L("عدد الطلبات", "Requests") + "</th><th>" + L("عدد الأيام", "Days") + "</th></tr></thead><tbody>" +
      Object.keys(lv).map(function (k) { return "<tr><td>" + K(k) + "</td><td>" + lv[k][0] + "</td><td>" + lv[k][1] + "</td></tr>"; }).join("") +
      "</tbody><tfoot><tr><th>" + L("المجموع", "Total") + "</th><th>" + ln + "</th><th>" + ld + "</th></tr></tfoot></table></div>" +
      '<h3 class="sh">' + L("3. تفصيل حسب الموظف", "3. By employee") + '</h3><div class="tw"><table><thead><tr><th>' + L("الموظف", "Employee") + "</th><th>" + L("الاستئذانات (الحد ", "Permissions (limit ") + LIMIT + L("/شهر)", "/month)") +
      "</th><th>" + L("الإجازات", "Leaves") + "</th><th>" + L("أيام الإجازات", "Leave days") + "</th><th>" + L("المرفوض", "Rejected") + "</th></tr></thead><tbody>" +
      (eRows || '<tr><td colspan="5">' + L("لا توجد بيانات", "No data") + "</td></tr>") + "</tbody></table></div>" +
      '<div class="sig"><div><span>' + L("رئيس القسم", "Head of Department") + "</span><i></i><p>" + (head ? esc(nameLine(head)) : "&nbsp;") + "</p></div>" +
      "<div><span>" + L("الاعتماد", "Approval") + "</span>" + (ok ? '<div class="stamps c">' + stamp(ok.by, L("اعتماد الإحصائية", "Statistics approved"), ok.at) + "</div>" : "<i></i><p>&nbsp;</p>") + "</div></div>" +
      '<div class="ft">' + L("تقرير آلي من نظام الطلبات الإدارية - قسم الكهرباء والإلكترونيات - للاستخدام الداخلي — ", "Automatic report — Administrative Requests System - Electrical & Electronics Dept. - internal use — ") + CREDIT + "</div>";
  }

  /* ---------- زام الإداري (مدير النظام) ---------- */
  function dutyForm(e) {
    var isNew = !e;
    e = e || { id: "", uid: null, name: "", phone: "", mode: "week", days: [0, 1, 2, 3, 4], on: 1, off: 1, start: today() };
    var nd = !isNew && !dutyOn(e) ? nextDuty(e) : null;
    var opt = function (v, t, on) { return '<option value="' + v + '"' + (on ? " selected" : "") + ">" + t + "</option>"; };
    return '<form class="box dform" data-f="duty" data-id="' + e.id + '" data-mode="' + e.mode + '">' +
      (isNew ? '<div class="fh"><b>➕ ' + L("إضافة شخص إلى زام الإداري", "Add a person to the roster") + "</b></div>"
        : '<div class="fh"><b>' + (dutyOn(e) ? "🟢 " : "⚪ ") + esc(dutyName(e)) + '</b><button type="button" class="pbtn del" data-act="duty-del" data-id="' + e.id + '">🗑 ' + L("حذف من الجدول", "Remove") + "</button></div>" +
          '<p class="sub">' + esc(dutyRule(e)) + " — " + (dutyOn(e) ? L("مداوم اليوم", "on duty today") : L("غير مداوم اليوم", "off today") + (nd ? L("، مداومته القادمة ", ", next duty ") + T(WD[nd.getDay()]) + " " + ymd(nd) : "")) + "</p>") +
      '<div class="row"><div class="fld"><label>' + L("من حسابات النظام", "System account") + '</label><select name="uid">' + opt("", L("— اسم من خارج النظام —", "— not a system user —"), !e.uid) +
      load().users.map(function (u) { return opt(u.id, esc(u.full_name) + " (" + roleName(u.role) + ")", e.uid === u.id); }).join("") + "</select></div>" +
      '<div class="fld"><label>' + L("الاسم (لمن ليس له حساب)", "Name (if no account)") + '</label><input name="name" dir="auto" value="' + esc(e.uid ? "" : e.name) + '"></div></div>' +
      '<div class="row"><div class="fld"><label>' + L("رقم الواتساب (8 أرقام)", "WhatsApp number (8 digits)") + '</label><input name="phone" inputmode="numeric" maxlength="8" value="' + esc(e.phone) +
      '" placeholder="' + esc(e.uid ? (userById(e.uid) || {}).phone || "" : "") + '"></div>' +
      '<div class="fld"><label>' + L("آلية العمل", "Work pattern") + '</label><select name="mode">' + opt("week", L("أيام ثابتة من الأسبوع", "Fixed weekdays"), e.mode !== "cycle") +
      opt("cycle", L("مناوبة دورية (عمل ثم راحة)", "Rotation (on then off)"), e.mode === "cycle") + "</select></div></div>" +
      '<div class="wk"><label>' + L("أيام الدوام", "Working days") + '</label><div class="days">' + WD.map(function (w, i) {
        return '<label><input type="checkbox" name="d' + i + '"' + ((e.days || []).indexOf(i) >= 0 ? " checked" : "") + "> " + T(w) + "</label>";
      }).join("") + "</div></div>" +
      '<div class="cyc row3"><div class="fld"><label>' + L("أيام العمل", "Days on") + '</label><input name="on" type="number" min="1" max="30" value="' + esc(e.on) + '"></div>' +
      '<div class="fld"><label>' + L("أيام الراحة", "Days off") + '</label><input name="off" type="number" min="0" max="30" value="' + esc(e.off) + '"></div>' +
      '<div class="fld"><label>' + L("أول يوم عمل", "First day on") + '</label><input name="start" type="date" value="' + esc(e.start) + '"></div></div>' +
      '<p><button class="p">' + (isNew ? L("إضافة", "Add") : L("حفظ التعديل", "Save")) + "</button></p></form>";
  }
  function viewDuty() {
    var R = load().roster, days = [], on = dutyToday();
    for (var i = 0; i < 14; i++) days.push(addDays(new Date(), i));
    var grid = '<div class="tw"><table class="dgrid"><thead><tr><th>' + L("الاسم", "Name") + "</th>" + days.map(function (d, i) {
        return "<th" + (i ? "" : ' class="td"') + ">" + T(WD[d.getDay()]) + "<br><small>" + pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "</small></th>";
      }).join("") + "</tr></thead><tbody>" + R.map(function (e) {
        return "<tr><td>" + esc(dutyName(e)) + "</td>" + days.map(function (d) { return dutyOn(e, d) ? '<td class="on">●</td>' : '<td class="off">—</td>'; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
    return "<h2>" + L("زام الإداري", "Duty roster") + '</h2><p class="sub">' +
      L("حدّد الأشخاص المداومين وآلية عمل كل شخص، والنظام يحسب تلقائيًا من المداوم ومن غير المداوم في كل يوم. المداوم اليوم يظهر أولًا في تذكير الواتساب.",
        "Set who is on the roster and each person's work pattern; the system works out automatically who is on duty each day. Today's on-duty people come first in WhatsApp reminders.") + "</p>" +
      '<div class="tiles"><div><b>' + on.length + "</b>" + L("مداوم اليوم", "On duty today") + "</div><div><b>" + (R.length - on.length) + "</b>" + L("غير مداوم اليوم", "Off today") +
      "</div><div><b>" + R.length + "</b>" + L("في الجدول", "On the roster") + "</div></div>" +
      '<div class="duty"><span>🟢 ' + L("المداومون اليوم: ", "On duty today: ") + "<b>" + (on.length ? on.map(function (e) { return esc(dutyName(e)); }).join(L("، ", ", ")) : "—") + "</b></span></div>" +
      '<h3 class="sh">' + L("الأيام الـ14 القادمة", "Next 14 days") + "</h3>" + (R.length ? grid : "<p>" + L("الجدول فارغ.", "The roster is empty.") + "</p>") +
      '<h3 class="sh">' + L("الأشخاص وآلية العمل", "People & work patterns") + "</h3>" + R.map(function (e) { return dutyForm(e); }).join("") + dutyForm(null);
  }
  function doDuty(form) {
    var who = me(); if (!who || who.role !== "s") return render();
    var d = formData(form), D = load(), id = +form.dataset.id || 0, u = d.uid ? userById(+d.uid) : null;
    var name = u ? u.full_name : d.name, ph = enDigits(d.phone || ""), on = parseInt(d.on, 10), off = parseInt(d.off, 10);
    var days = WD.map(function (w, i) { return i; }).filter(function (i) { return d["d" + i]; });
    var err = !name ? L("اختر حسابًا من النظام أو اكتب الاسم", "Choose a system account or type a name")
      : u && D.roster.some(function (e) { return e.uid === u.id && e.id !== id; }) ? L("هذا الشخص موجود في الجدول مسبقًا", "This person is already on the roster")
      : ph && !/^\d{8}$/.test(ph) ? L("رقم الواتساب يجب أن يكون 8 أرقام", "The WhatsApp number must be 8 digits")
      : d.mode === "cycle" ? (!(on >= 1) || !(off >= 0) || !d.start ? L("حدّد أيام العمل وأيام الراحة وأول يوم عمل", "Set days on, days off and the first day on") : "")
      : !days.length ? L("اختر يومًا واحدًا على الأقل", "Pick at least one day") : "";
    if (err) { flash("err", err); return render(); }
    var e = id ? D.roster.filter(function (x) { return x.id === id; })[0] : { id: D.seq.d++ };
    if (!e) return render();
    Object.assign(e, { uid: u ? u.id : null, name: u ? "" : name, phone: ph, mode: d.mode === "cycle" ? "cycle" : "week", days: days, on: on || 1, off: off >= 0 ? off : 0, start: d.start || today() });
    if (!id) D.roster.push(e);
    log(id ? "duty_edit" : "duty_add", null, name); save();
    flash("ok", (id ? L("تم حفظ مداومة ", "Saved: ") : L("تمت إضافة ", "Added: ")) + name + " — " + (dutyOn(e) ? L("مداوم اليوم", "on duty today") : L("غير مداوم اليوم", "off today")));
    render();
  }

  /* ---------- الحسابات + سجل العمليات (مدير النظام) ---------- */
  function auditTable(list, withDoc) {
    return '<div class="tw"><table class="audit"><thead><tr><th>' + L("الوقت", "Time") + "</th><th>" + L("المستخدم", "User") + "</th><th>" + L("العملية", "Action") + "</th>" +
      (withDoc ? "<th>" + L("الكتاب (رقم الصادر)", "Document (outgoing no.)") + "</th>" : "") + "</tr></thead><tbody>" +
      (list.length ? list.map(function (a) {
        var r = a.rid ? reqById(a.rid) : null;
        var doc = r ? '<button type="button" class="lnk" data-act="open-req" data-id="' + r.id + '">📄 ' + esc(r.ref) + "</button><small>" + esc(uname(r.user_id)) + " — " + KR(r) + "</small>"
          : esc(a.target && !a.rid ? a.target : "—");
        return "<tr><td>" + ymdhm(a.at) + "</td><td>" + esc(uname(a.who)) + "</td><td>" + esc(actText(a)) + "</td>" + (withDoc ? "<td>" + doc + "</td>" : "") + "</tr>";
      }).join("") : '<tr><td colspan="' + (withDoc ? 4 : 3) + '">' + L("لا توجد عمليات", "No activity") + "</td></tr>") + "</tbody></table></div>";
  }
  function viewUsers(q) {
    var D = load(), ro = { e: roleName("e"), m: roleName("m"), h: roleName("h"), o: roleName("o"), a: roleName("a") }, s = (q.q || "").trim();
    function inp(u, f, ph) { return '<input data-uf="' + f + '" data-uid="' + u.id + '" value="' + esc(u[f] || "") + '" placeholder="' + ph + '" dir="auto">'; }
    var aud = D.audit.filter(function (a) {
      if (!s) return true;
      var r = a.rid ? reqById(a.rid) : null;
      return (r && ((r.ref || "").indexOf(s) >= 0 || uname(r.user_id).indexOf(s) >= 0)) || uname(a.who).indexOf(s) >= 0 || actText(a).indexOf(s) >= 0;
    }).slice(0, 150);
    return "<h2>" + L("الحسابات والصلاحيات", "Accounts & permissions") + '</h2><p class="sub">' + L("الاسم والرتبة والمسمى هي ما يظهر في الختم. عدّل الخانة ثم اضغط خارجها للحفظ.", "Name, rank and title are what appear on the stamp. Edit a cell and click outside it to save.") + "</p>" +
      '<div class="tw"><table class="ut"><thead><tr><th>' + L("المستخدم", "User") + "</th><th>" + L("الاسم", "Name") + "</th><th>" + L("الرتبة", "Rank") + "</th><th>" + L("المسمى", "Title") + "</th><th>" + L("الصلاحية", "Role") + "</th><th>" + L("الختم", "Stamp") + "</th></tr></thead><tbody>" +
      D.users.map(function (u) {
        var cell = u.role === "s" ? roleName("s") : '<select data-role="' + u.id + '">' + Object.keys(ro).map(function (k) { return '<option value="' + k + '"' + (k === u.role ? " selected" : "") + ">" + ro[k] + "</option>"; }).join("") + "</select>";
        return "<tr><td>" + esc(u.username) + "</td><td>" + inp(u, "full_name", L("الاسم", "Name")) + "</td><td>" + inp(u, "rank", L("مثال: مقدم مهندس بحري", "e.g. Lt. Col. Marine Eng.")) + "</td><td>" + inp(u, "job_title", L("المسمى", "Title")) +
          "</td><td>" + cell + '</td><td><div class="stamps c">' + stamp(u.id, roleName(u.role), null, "", true) + "</div></td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<h2 id="audit">' + L("سجل العمليات", "Audit log") + '</h2><p class="sub">' + L("لكل طلب رقم صادر؛ اضغط على رقم الصادر لفتح الكتاب وسجله.", "Every request has an outgoing number — click it to open the document and its history.") + "</p>" +
      '<form class="flt" data-f="filter" data-path="users"><input name="q" value="' + esc(s) + '" placeholder="' + L("ابحث برقم الصادر أو الاسم أو العملية", "Search by outgoing no., name or action") + '"><button>' + L("بحث", "Search") + "</button></form>" +
      auditTable(aud, true);
  }

  /* ---------- الأحداث ---------- */
  var app = document.getElementById("app");
  app.addEventListener("submit", function (ev) {
    var f = ev.target, kind = f.dataset.f; if (!kind) return;
    ev.preventDefault();
    if (kind === "login") doLogin(formData(f));
    else if (kind === "register") doRegister(formData(f));
    else if (kind === "req") doReq(f);
    else if (kind === "pro") doPro(f, ev.submitter);
    else if (kind === "decide") doDecide(f, ev.submitter);
    else if (kind === "duty") doDuty(f);
    else if (kind === "qact") { if (ev.submitter && ev.submitter.value === "done") doDone(f); else doFollowup(f); }
    else if (kind === "filter") {
      var d = formData(f), qs = Object.keys(d).filter(function (k) { return d[k]; }).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(d[k]); }).join("&");
      go(f.dataset.path + (qs ? "?" + qs : ""));
    }
  });
  app.addEventListener("input", function (ev) { if (ev.target.id === "f_time_from") syncPermTime(); if (ev.target.id === "f_date_from") syncLate(); if (ev.target.id === "f_date_to") syncExt(); });
  app.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.id === "f_kind") toggleKind();
    if (t.id === "f_time_from") syncPermTime();
    if (t.id === "f_date_from") syncLate();
    if (t.id === "f_ext_of" || t.id === "f_date_to") syncExt();
    if (t.name === "mode" && t.form && t.form.classList.contains("dform")) t.form.dataset.mode = t.value;
    if (t.dataset.role) { var u = userById(+t.dataset.role); if (u && u.role !== "s") { u.role = t.value; save(); flash("ok", L("تم تحديث صلاحية ", "Role updated: ") + u.full_name); render(); } }
    if (t.dataset.uf) {
      var u2 = userById(+t.dataset.uid), v = t.value.trim();
      if (u2 && (v || t.dataset.uf === "rank")) { u2[t.dataset.uf] = v; save(); flash("ok", L("تم حفظ بيانات ", "Saved: ") + u2.username); render(); }
    }
  });
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-act],[data-close]"); if (!b) return;
    if (b.hasAttribute("data-close")) return closeModal();
    var act = b.dataset.act, u0 = me();
    ev.preventDefault();
    if (act === "logout") { setUid(null); go("login"); }
    else if (act === "lang") {
      LANG = LANG === "en" ? "ar" : "en";
      try { localStorage.setItem(LKEY, LANG); } catch (e) {}
      applyLang(); closeModal(); render();
    }
    else if (act === "reset") {
      if (confirm(L("سيتم حذف كل البيانات التجريبية في هذا المتصفح وإرجاعها إلى البداية. هل أنت متأكد؟", "All demo data in this browser will be deleted and restored to the start. Are you sure?"))) {
        try { localStorage.removeItem(KEY); } catch (e) {}
        db = null; setUid(null); load(); flash("ok", L("تمت إعادة ضبط البيانات التجريبية", "Demo data reset")); go("login");
      }
    }
    else if (act === "quick") { var u = load().users.filter(function (x) { return x.username === b.dataset.u; })[0]; if (u) { setUid(u.id); go(HOME[u.role]); } }
    else if (act === "print") window.print();
    else if (act === "print-req") { var pr = reqById(+b.dataset.id); if (pr && u0 && canSee(u0, pr)) { closeModal(); printReq(pr); } }
    else if (act === "print-list") printList();
    else if (act === "open-req") { var orq = reqById(+b.dataset.id); if (orq && u0 && canSee(u0, orq)) openReq(orq); }
    else if (act === "duty-del" && u0 && u0.role === "s") {
      var D0 = load(), de = D0.roster.filter(function (x) { return x.id === +b.dataset.id; })[0];
      if (de && confirm(L("حذف " + dutyName(de) + " من زام الإداري؟", "Remove " + dutyName(de) + " from the duty roster?"))) {
        D0.roster = D0.roster.filter(function (x) { return x !== de; });
        log("duty_del", null, dutyName(de)); save(); flash("ok", L("تم الحذف من زام الإداري: ", "Removed from the roster: ") + dutyName(de)); render();
      }
    }
    else if (act === "stat-ok" && u0 && "ams".indexOf(u0.role) >= 0) {
      var sk = b.dataset.key.split("|"), se = +sk[1] ? userById(+sk[1]) : null;
      statTemp = { key: b.dataset.key, by: u0.id, at: new Date().toISOString() };
      log("stat", null, T(PER[sk[0]] || ["", ""]) + " — " + (se ? se.full_name : L("جميع الموظفين", "All employees"))); save();
      render();
      setTimeout(function () { window.print(); }, 350); // الختم يظهر بالطباعة، وبعدها يرجع التقرير طبيعي
    }
    else if (act === "remind") {
      var rq = reqById(+b.dataset.id), sel = document.getElementById("rm" + b.dataset.id), adm = sel && load().roster.filter(function (x) { return x.id === +sel.value; })[0];
      if (!rq || !adm || !dutyPhone(adm) || !u0 || rq.user_id !== u0.id) return;
      log("remind", rq.id, dutyName(adm)); save();
      window.open(remindLink(rq, adm), "_blank", "noopener");
    }
    else if (act === "reveal") {
      var r = reqById(+b.dataset.id); if (!r || r.done_at) return;
      log("reveal", r.id); save();
      document.getElementById("s" + r.id).textContent = r.secret; b.remove();
    }
    else if (act === "med") {
      var q = reqById(+b.dataset.id); if (!q || !q.med || !u0) return;
      if ((u0.role === "e" || u0.role === "m") && q.user_id !== u0.id) return;
      document.getElementById("modal-body").innerHTML = "<p><b>" + L("صورة الطبية — ", "Medical photo — ") + esc(uname(q.user_id)) + "</b></p>";
      var img = new Image(); img.src = q.med; img.alt = "";
      document.getElementById("modal-body").appendChild(img);
      document.getElementById("modal").hidden = false;
    }
  });
  function closeModal() { document.getElementById("modal").hidden = true; document.getElementById("modal-body").innerHTML = ""; }
  document.getElementById("modal").addEventListener("click", function (ev) { if (ev.target.id === "modal") closeModal(); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") closeModal(); });
  window.addEventListener("hashchange", render);

  applyLang();
  load();
  render();
})();
