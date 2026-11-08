/* نسخة عرض ثابتة (GitHub Pages) من نظام طلبات قسم الكهرباء والإلكترونيات.
   كل البيانات محفوظة في متصفح المستخدم (localStorage) — ما في سيرفر. */
(function () {
  "use strict";

  var KEY = "khafr_demo_v2";
  var LIMIT = 4;          // الحد الأعلى للاستئذانات بالشهر
  var PERM_MIN = 180;     // الاستئذان 3 ساعات بالضبط
  var KINDS = { perm: "استئذان", leave: "إجازة", emer: "إجازة طارئة (عارضة)", med: "اعتماد طبية (إجازة مرضية)", meet: "طلب مقابلة",
                pleave: "إجازة مهنيين", pexit: "إذن مغادرة (مهنيين)" };
  var PRO_KINDS = ["pleave", "pexit"]; // تمر على مسئول المهنيين قبل رئيس القسم
  // أقسام الطلبات: كل قسم بخانته
  var CATS = {
    perm: { t: "الاستئذانات", one: "استئذان", icon: "⏱️", kinds: ["perm"], d: "3 ساعات بالضبط — حد 4 بالشهر" },
    leave: { t: "الإجازات", one: "إجازة", icon: "🏖️", kinds: ["leave", "emer"], d: "إجازة عادية أو طارئة (عارضة)" },
    med: { t: "الطبيات", one: "طبية", icon: "🩺", kinds: ["med"], d: "اعتماد إجازة مرضية مع صورة" },
    meet: { t: "المقابلات", one: "مقابلة", icon: "🤝", kinds: ["meet"], d: "طلب مقابلة مسؤول" },
    pro: { t: "المهنيين", one: "مهنيين", icon: "🛠️", kinds: ["pleave", "pexit"], d: "إجازة أو إذن مغادرة للمهنيين" }
  };
  function catOf(kind) { for (var k in CATS) if (CATS[k].kinds.indexOf(kind) >= 0) return k; return ""; }
  function byCat(list, c) { return c && CATS[c] ? list.filter(function (r) { return catOf(r.kind) === c; }) : list; }
  function link(path, p) {
    var s = Object.keys(p || {}).filter(function (k) { return p[k]; }).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(p[k]); }).join("&");
    return "#/" + path + (s ? "?" + s : "");
  }
  function nav(h) { if (location.hash === h) render(); else location.hash = h; }
  var STATUS = { p: "قيد المراجعة", a: "موافق", r: "مرفوض" };
  var ROLES = { e: "موظف", m: "مسئول المهنيين", h: "رئيس قسم", o: "ضابط قسم", a: "إداري", s: "مدير النظام" };
  var PERIODS = { start: "بداية الدوام", during: "أثناء الدوام", end: "نهاية الدوام" };
  var HOME = { e: "my", m: "pro", h: "review", o: "review", a: "queue", s: "queue" };
  var CREDIT = "Created by: ABDULRAZZAQ ALHAJRI";
  var AR = "٠١٢٣٤٥٦٧٨٩";

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
  function isPro(r) { return PRO_KINDS.indexOf(r.kind) >= 0; }

  /* ---------- التخزين ---------- */
  var db = null, memUid = null;
  function seed() {
    var t = new Date(), now = t.getTime();
    function d(n) { return ymd(addDays(t, n)); }
    function at(n, h) { var x = addDays(t, n); x.setHours(h || 9, 15, 0, 0); return x.toISOString(); }
    var medImg = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380"><rect width="100%" height="100%" fill="#f8fafc" stroke="#0a2342" stroke-width="6"/>' +
      '<text x="50%" y="45%" font-size="34" text-anchor="middle" font-family="Tahoma" fill="#0a2342">صورة طبية تجريبية</text>' +
      '<text x="50%" y="62%" font-size="20" text-anchor="middle" font-family="Tahoma" fill="#e8501c">نسخة عرض فقط</text></svg>');
    // [id, اسم المستخدم, الصلاحية, الاسم, المسمى, الرتبة]
    var u = [
      [1, "admin", "s", "عبدالرزاق الهاجري", "مدير النظام", ""],
      [2, "head", "h", "فهد عبدالرحمن الفيلكاوي", "رئيس القسم", "مقدم مهندس بحري"],
      [3, "officer", "o", "فهد سالم المطيري", "ضابط القسم", ""],
      [4, "clerk", "a", "نورة عبدالله الشمري", "إداري شؤون الموظفين", ""],
      [5, "emp", "e", "أحمد علي الكندري", "فني كهرباء", ""],
      [6, "emp2", "e", "سارة يوسف الرشيدي", "مهندسة إلكترونيات", ""],
      [7, "pro", "m", "سالم ناصر العجمي", "مسئول المهنيين", ""],
      [8, "clerk2", "a", "مريم خالد العتيبي", "إداري", ""],
      [9, "pemp", "e", "راشد حمد الديحاني", "مهني كهرباء", ""]
    ].map(function (x) {
      return { id: x[0], username: x[1], password: "123456", role: x[2], full_name: x[3], job_title: x[4], rank: x[5],
               civil_id: "2900101000" + pad(x[0]), phone: "5000000" + x[0], duty: x[0] === 4 ? ymd(t) : "" };
    });
    function R(o) {
      return Object.assign({ date_to: "", depart_date: "", time_from: "", time_to: "", meet_with: "", perm_period: "", notes: "", med: "", secret: "",
        status: "p", pro_by: null, pro_at: null, decided_by: null, decided_at: null, reject_reason: "", auto_rejected: false,
        done_by: null, done_at: null, followups: [] }, o);
    }
    var reqs = [
      R({ id: 1, user_id: 5, kind: "perm", date_from: d(1), time_from: "07:00", time_to: "10:00", perm_period: "start", notes: "مراجعة مستشفى", secret: "1234", created: at(0, 8) }),
      R({ id: 2, user_id: 6, kind: "meet", date_from: d(2), time_from: "10:00", time_to: "10:30", meet_with: "رئيس القسم", secret: "5678", created: at(-1, 11) }),
      R({ id: 3, user_id: 5, kind: "leave", date_from: d(-12), date_to: d(-8), secret: "1234", status: "a", decided_by: 2, decided_at: at(-14), created: at(-15) }),
      R({ id: 4, user_id: 6, kind: "emer", date_from: d(-5), date_to: d(-4), status: "a", decided_by: 3, decided_at: at(-5), done_by: 4, done_at: at(-4, 12), created: at(-6) }),
      R({ id: 5, user_id: 5, kind: "med", date_from: d(-3), date_to: d(-2), med: medImg, secret: "1234", status: "a", decided_by: 2, decided_at: at(-2),
          followups: [{ note: "الطبية غير واضحة، يرجى إرسال نسخة أوضح", by: 4, at: at(-1, 10) }], created: at(-2, 8) }),
      R({ id: 6, user_id: 6, kind: "perm", date_from: d(-9), time_from: "11:00", time_to: "14:00", perm_period: "end", status: "r", decided_by: 2, decided_at: at(-9), reject_reason: "ضغط عمل في القسم ذلك اليوم", created: at(-10) }),
      R({ id: 7, user_id: 5, kind: "leave", date_from: d(-70), date_to: d(-63), status: "a", decided_by: 3, decided_at: at(-75), done_by: 4, done_at: at(-74), created: at(-76) }),
      R({ id: 8, user_id: 9, kind: "pleave", date_from: d(5), date_to: d(9), secret: "4321", created: at(0, 9) }),
      R({ id: 9, user_id: 9, kind: "pexit", depart_date: d(14), date_from: d(14), date_to: d(28), notes: "سفر خارج البلاد", secret: "4321", pro_by: 7, pro_at: at(-1, 12), created: at(-2, 10) })
    ];
    return { users: u, reqs: reqs, audit: [], statOk: {}, seq: { u: 10, r: 10 }, seeded: now };
  }
  function load() {
    if (db) return db;
    try { var s = localStorage.getItem(KEY); if (s) db = JSON.parse(s); } catch (e) { db = null; }
    if (!db || !db.users) { db = seed(); save(); }
    if (!db.statOk) db.statOk = {};
    return db;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch (e) { flash("err", "تعذّر حفظ البيانات في المتصفح (المساحة ممتلئة أو التخزين مقفل)"); return false; }
  }
  function getUid() { try { var v = sessionStorage.getItem(KEY + "_uid"); return v ? +v : memUid; } catch (e) { return memUid; } }
  function setUid(v) { memUid = v; try { if (v) sessionStorage.setItem(KEY + "_uid", v); else sessionStorage.removeItem(KEY + "_uid"); } catch (e) {} }
  function me() { var id = getUid(); return id ? userById(id) : null; }
  function userById(id) { return load().users.filter(function (u) { return u.id === id; })[0] || null; }
  function uname(id) { var u = userById(id); return u ? u.full_name : "—"; }
  function nameLine(u) { return u.rank ? u.rank + " / " + u.full_name : u.full_name; }
  function onDuty(u) { return u.duty === today(); }
  function log(action, target) { var u = me(); load().audit.unshift({ who: u ? u.id : null, action: action, target: typeof target === "number" ? "طلب " + target : target, at: new Date().toISOString() }); db.audit = db.audit.slice(0, 300); }

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
    stats: { roles: "hoas", view: viewStats },
    users: { roles: "s", view: viewUsers }
  };
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, ""), i = h.indexOf("?"), q = {};
    var path = i < 0 ? h : h.slice(0, i);
    if (i >= 0) h.slice(i + 1).split("&").forEach(function (kv) { var p = kv.split("="); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " ")); });
    return { path: path, q: q };
  }
  function go(path) { if (location.hash === "#/" + path) render(); else location.hash = "#/" + path; }

  function render() {
    var r = parseHash(), u = me(), route = ROUTES[r.path];
    if (!u) { if (!route || !route.anon) { if (r.path !== "login") return go("login"); } }
    else if (!route || route.anon) return go(HOME[u.role]);
    else if (route.roles.indexOf(u.role) < 0) { flash("err", "ما عندك صلاحية لهذه الصفحة"); return go(HOME[u.role]); }
    route = ROUTES[r.path];
    route.after = null;
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
    var h = '<header><img src="logo.png" alt=""><div class="t"><b>الإدارة العامة لخفر السواحل</b><span>قسم الكهرباء والإلكترونيات</span></div>';
    h += '<span class="u">' + esc(u.full_name) + " (" + ROLES[u.role] + ")</span>";
    if (u.role === "s") h += '<a href="#/users">الحسابات والصلاحيات</a>';
    h += '<button type="button" data-act="logout">خروج</button></header>';
    h += '<div class="demo noprint"><span>⚠️ نسخة عرض تجريبية — البيانات محفوظة في هذا المتصفح فقط. لا تُدخل أرقام سرية أو بيانات حقيقية.</span><button type="button" data-act="reset">إعادة ضبط البيانات التجريبية</button></div>';
    var links = [["my", "طلباتي", "emhoas"], ["pro", "اعتماد المهنيين", "ms"], ["review", "مراجعة الطلبات", "hos"], ["queue", "طلبات للتنفيذ", "as"], ["stats", "الإحصائيات", "hoas"]];
    h += '<nav class="nav noprint">' + links.filter(function (l) { return l[2].indexOf(u.role) >= 0; }).map(function (l) {
      return '<a href="#/' + l[0] + '"' + (l[0] === path ? ' class="on"' : "") + ">" + l[1] + "</a>";
    }).join("") + "</nav>";
    return h;
  }

  /* ---------- الختم: اسم الشخص ومسماه ---------- */
  // ختم رسمي بيضاوي: اسم الجهة على الإطار، وبالوسط نوع الإجراء + الرتبة + الاسم + المسمى + التاريخ
  var stampSeq = 0;
  function stamp(uid, label, at, tone, mini) {
    var u = userById(uid); if (!u) return "";
    var n = ++stampSeq, rot = ((n * 37) % 8) - 4;
    var svg = '<svg viewBox="0 0 260 170" aria-hidden="true"><defs>' +
      '<path id="stt' + n + '" d="M 36 85 A 94 55 0 0 1 224 85"/><path id="stb' + n + '" d="M 30 85 A 100 61 0 0 0 230 85"/></defs>' +
      '<ellipse cx="130" cy="85" rx="126" ry="81" fill="none" stroke="currentColor" stroke-width="3.4"/>' +
      '<ellipse cx="130" cy="85" rx="120" ry="75" fill="none" stroke="currentColor" stroke-width="1"/>' +
      '<ellipse cx="130" cy="85" rx="88" ry="50" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<text font-size="12.5" font-weight="800" text-anchor="middle"><textPath href="#stt' + n + '" startOffset="50%">الإدارة العامة لخفر السواحل</textPath></text>' +
      '<text font-size="11.5" font-weight="700" text-anchor="middle"><textPath href="#stb' + n + '" startOffset="50%">قسم الكهرباء والإلكترونيات</textPath></text>' +
      '<text x="26" y="89" font-size="12" text-anchor="middle">★</text><text x="234" y="89" font-size="12" text-anchor="middle">★</text></svg>';
    return '<div class="stamp' + (tone ? " " + tone : "") + (mini ? " mini" : "") + '" style="--rot:' + rot + 'deg" title="' + esc(label + " — " + nameLine(u)) + '">' + svg +
      '<div class="sc"><em>' + esc(label) + "</em>" + (u.rank ? "<small>" + esc(u.rank) + "</small>" : "") + "<b>" + esc(u.full_name) + "</b><span>" + esc(u.job_title) + "</span>" +
      (at ? "<i>" + ymdhm(at) + "</i>" : "") + "</div></div>";
  }
  function stamps(r) {
    var s = "";
    if (r.pro_by) s += stamp(r.pro_by, "موافقة مسئول المهنيين", r.pro_at);
    if (r.decided_by) {
      var rej = r.status === "r", byPro = rej && isPro(r) && !r.pro_by; // رفض من مسئول المهنيين نفسه
      s += stamp(r.decided_by, rej ? (byPro ? "رفض مسئول المهنيين" : "مرفوض") : "موافقة", r.decided_at, rej ? "red" : "");
    }
    if (r.done_by) s += stamp(r.done_by, "تم عمل اللازم", r.done_at, "green");
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
  function errHtml(errs, name) { return errs && errs[name] ? '<p class="err">' + esc(errs[name]) + "</p>" : ""; }
  function formData(form) { var o = {}; new FormData(form).forEach(function (v, k) { if (typeof v === "string") o[k] = v.trim(); }); return o; }

  /* ---------- تسجيل الدخول ---------- */
  var loginState = { errs: null, val: {} };
  var DEMO = ["admin", "head", "officer", "pro", "clerk", "clerk2", "emp", "emp2", "pemp"];
  function viewLogin() {
    var s = loginState; loginState = { errs: null, val: {} };
    var demo = DEMO.map(function (n) { return load().users.filter(function (u) { return u.username === n && u.password === "123456"; })[0]; }).filter(Boolean);
    return '<div class="auth">' + authHero() +
      '<form data-f="login">' + (s.errs ? '<p class="err">' + esc(s.errs) + "</p>" : "") +
      field("username", "اسم المستخدم", { autocomplete: "username", required: "" }, null, s.val.username) +
      field("password", "كلمة المرور", { type: "password", autocomplete: "current-password", required: "" }) +
      '<button class="p wide">دخول</button><a class="btn-out" href="#/register">موظف جديد؟ سجّل حسابك</a></form>' +
      (demo.length ? '<div class="demo-box"><p>حسابات تجريبية (كلمة المرور <b>123456</b>) — اضغط للدخول مباشرة:</p><div class="demo-users">' + demo.map(function (u) {
        return '<button type="button" data-act="quick" data-u="' + esc(u.username) + '">' + esc(u.username) + "<small>" + ROLES[u.role] + "</small></button>";
      }).join("") + "</div></div>" : "") +
      '<p class="note">نسخة تجريبية — أي بيانات تدخلها هنا والطلبات تُحفظ في هذا المتصفح فقط.</p><p class="credit in">' + CREDIT + "</p></div>";
  }
  function authHero() {
    return '<div class="hero"><img src="logo.png" alt=""><h1>الإدارة العامة لخفر السواحل</h1><p>قسم الكهرباء والإلكترونيات</p></div>';
  }
  function doLogin(d) {
    var u = load().users.filter(function (x) { return x.username.toLowerCase() === (d.username || "").toLowerCase(); })[0];
    if (!u || u.password !== d.password) { loginState = { errs: "اسم المستخدم أو كلمة المرور غير صحيحة", val: d }; return render(); }
    setUid(u.id); go(HOME[u.role]);
  }

  /* ---------- تسجيل موظف ---------- */
  var regState = { errs: {}, val: {} };
  function viewRegister() {
    var s = regState; regState = { errs: {}, val: {} };
    return '<div class="auth">' + authHero() + '<h2>تسجيل موظف جديد</h2><form data-f="register">' +
      field("username", "اسم المستخدم", { required: "" }, s.errs, s.val.username) +
      field("full_name", "الاسم الثلاثي", { required: "" }, s.errs, s.val.full_name) +
      field("job_title", "المسمى الوظيفي", { required: "" }, s.errs, s.val.job_title) +
      field("civil_id", "الرقم المدني", { required: "", inputmode: "numeric", maxlength: "12" }, s.errs, s.val.civil_id) +
      field("phone", "رقم التلفون", { required: "", inputmode: "numeric", maxlength: "8" }, s.errs, s.val.phone) +
      field("password1", "كلمة المرور", { type: "password", required: "", autocomplete: "new-password" }, s.errs) +
      field("password2", "تأكيد كلمة المرور", { type: "password", required: "", autocomplete: "new-password" }, s.errs) +
      '<button class="p wide">إنشاء الحساب</button><a class="btn-out" href="#/login">عندك حساب؟ سجّل دخولك</a></form><p class="credit in">' + CREDIT + "</p></div>";
  }
  function doRegister(d) {
    var e = {}, D = load();
    if (!/^[\w.@+-]{1,150}$/.test(d.username || "")) e.username = "اسم مستخدم غير صالح (حروف إنجليزية وأرقام فقط)";
    else if (D.users.some(function (u) { return u.username.toLowerCase() === d.username.toLowerCase(); })) e.username = "اسم المستخدم مستخدم من قبل";
    var fn = (d.full_name || "").split(/\s+/).filter(Boolean);
    if (fn.length < 3) e.full_name = "اكتب الاسم الثلاثي كامل";
    if (!d.job_title) e.job_title = "هذا الحقل مطلوب";
    var cid = enDigits(d.civil_id || ""), ph = enDigits(d.phone || "");
    if (!/^\d{12}$/.test(cid)) e.civil_id = "الرقم المدني لازم 12 رقم";
    if (!/^\d{8}$/.test(ph)) e.phone = "رقم التلفون لازم 8 أرقام";
    if ((d.password1 || "").length < 6) e.password1 = "كلمة المرور لازم 6 أحرف على الأقل";
    else if (d.password1 !== d.password2) e.password2 = "كلمتا المرور غير متطابقتين";
    if (Object.keys(e).length) { regState = { errs: e, val: d }; return render(); }
    D.users.push({ id: D.seq.u++, username: d.username, password: d.password1, role: "e", full_name: fn.join(" "), job_title: d.job_title, rank: "", civil_id: cid, phone: ph, duty: "" });
    save(); flash("ok", "تم إنشاء الحساب، سجّل دخولك"); go("login");
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
    meet: ["date_from", "time_from", "time_to", "meet_with"],
    pleave: ["date_from", "date_to"],
    pexit: ["depart_date", "date_from", "date_to"]
  };
  var OPTIONAL = ["depart_date", "date_to", "perm_period", "time_from", "time_to", "meet_with", "medical_image"];
  var myState = { errs: {}, val: {} };
  function viewMy(q, u) {
    var s = myState; myState = { errs: {}, val: {} };
    var t = new Date(), n = used(u.id, t.getFullYear(), t.getMonth()), v = s.val, e = s.errs, c = CATS[q.c] ? q.c : "", nw = CATS[q["new"]] ? q["new"] : "";
    var all = load().reqs.filter(function (r) { return r.user_id === u.id; }).sort(byCreated), items = byCat(all, c);
    ROUTES.my.after = toggleKind;
    setList("طلبات " + u.full_name + (c ? " — " + CATS[c].t : ""), items);
    var cnt = function (st) { return all.filter(function (r) { return r.status === st; }).length; };
    var head = hello(u, [[n + " / " + LIMIT, "استئذانات هذا الشهر"], [cnt("p"), "قيد المراجعة"], [cnt("a"), "موافق"]]) +
      "<h2>طلب جديد</h2><p class=\"sub\">اختر القسم اللي تبيه:</p>" +
      '<div class="cats">' + Object.keys(CATS).map(function (k) {
        return '<a href="' + link("my", { "new": k, c: c }) + '"' + (k === nw ? ' class="on"' : "") + "><i>" + CATS[k].icon + "</i><b>" + CATS[k].one + "</b><small>" + CATS[k].d + "</small></a>";
      }).join("") + "</div>";
    var list = "<h2>طلباتي</h2>" + catBar("my", { c: c }, all) + listTools(items.length) + (items.length ? items.map(myCard).join("") : "<p>ما في طلبات بهذا القسم.</p>");
    if (!nw) return head + list;
    var C = CATS[nw], kind = v.kind && catOf(v.kind) === nw ? v.kind : C.kinds[0], sub = {};
    C.kinds.forEach(function (k) { sub[k] = KINDS[k]; });
    return head +
      '<form class="box" data-f="req"><div class="fh"><b>' + C.icon + " طلب " + C.one + '</b><a href="' + link("my", { c: c }) + '">✕ إغلاق</a></div>' +
      (C.kinds.length > 1 ? select("kind", "النوع", sub, e, kind) : '<input type="hidden" name="kind" id="f_kind" value="' + kind + '">') +
      (nw === "perm" ? '<p class="msg">استئذاناتك هذا الشهر: <b>' + n + " من " + LIMIT + "</b> — مدة الاستئذان <b>3 ساعات بالضبط</b>، والزيادة عن الحد يرفضها النظام تلقائياً.</p>" : "") +
      '<p class="sub" id="pro-hint" hidden>هذا الطلب يروح أول لمسئول المهنيين للموافقة، وبعدها لرئيس القسم.</p>' +
      field("depart_date", "تاريخ المغادرة", { type: "date" }, e, v.depart_date) +
      '<div class="row">' + field("date_from", "التاريخ / من تاريخ", { type: "date", required: "" }, e, v.date_from) + field("date_to", "إلى تاريخ", { type: "date" }, e, v.date_to) + "</div>" +
      select("perm_period", "وقت الاستئذان", PERIODS, e, v.perm_period, true) +
      '<div class="row">' + field("time_from", "من الساعة", { type: "time" }, e, v.time_from) + field("time_to", "إلى الساعة", { type: "time" }, e, v.time_to) + "</div>" +
      field("meet_with", "المقابلة مع", { maxlength: "60" }, e, v.meet_with) +
      field("medical_image", "صورة الطبية", { type: "file", accept: "image/*" }, e) +
      field("notes", "ملاحظات", { type: "textarea", rows: "3" }, e, v.notes) +
      field("secret", "الرقم السري لسستم جابر", { type: "password", autocomplete: "off", required: "" }, e) +
      '<p class="sub">في النسخة التجريبية اكتب أي رقم (مثلاً 1234) — لا تكتب رقمك الحقيقي.</p>' +
      '<p><button class="p">إرسال الطلب</button></p></form>' + list;
  }
  function myCard(r) {
    var st = pill(r, "my");
    return '<div class="card"><div class="ch"><h3>' + KINDS[r.kind] + (r.perm_period ? " (" + PERIODS[r.perm_period] + ")" : "") + "</h3>" + chr(r, st) + "</div>" +
      "<p>" + dates(r) + "</p>" +
      (r.reject_reason ? '<p class="err">سبب الرفض: ' + esc(r.reject_reason) + "</p>" : "") +
      r.followups.map(function (f, i) { return '<p class="fu">متابعة ' + (i + 1) + ": " + esc(f.note) + " — " + esc(uname(f.by)) + "</p>"; }).join("") +
      (r.med ? '<p><a href="#" data-act="med" data-id="' + r.id + '">صورة الطبية</a></p>' : "") +
      stamps(r) + (r.status !== "r" && !r.done_at ? remindBox(r) : "") + "</div>";
  }
  // الحالة + زر طباعة الطلب
  function chr(r, st) {
    return '<div class="chr"><span class="pill ' + st[0] + '">' + st[1] + '</span><button type="button" class="pr" data-act="print-req" data-id="' + r.id + '">🖨 طباعة</button></div>';
  }
  // شريط الأقسام: الكل | الاستئذانات | الإجازات | ...
  function catBar(path, p, list) {
    var c = p.c || "";
    var tabs = [["", "الكل", list.length]].concat(Object.keys(CATS).map(function (k) {
      return [k, CATS[k].icon + " " + CATS[k].t, list.filter(function (r) { return catOf(r.kind) === k; }).length];
    }));
    return '<div class="cats-bar noprint">' + tabs.map(function (t) {
      return '<a href="' + link(path, Object.assign({}, p, { c: t[0] })) + '"' + (t[0] === c ? ' class="on"' : "") + ">" + t[1] + " <span>" + t[2] + "</span></a>";
    }).join("") + "</div>";
  }
  function listTools(n) {
    return n ? '<div class="ltools noprint"><button type="button" class="pbtn" data-act="print-list">🖨 طباعة القائمة (' + n + ")</button></div>" : "";
  }
  // تذكير الإداري المداوم بالطلب على الواتساب
  function remindBox(r) {
    var admins = load().users.filter(function (x) { return x.role === "a" && x.phone; })
      .sort(function (a, b) { return (onDuty(b) ? 1 : 0) - (onDuty(a) ? 1 : 0); });
    if (!admins.length) return "";
    return '<div class="remind"><span>الإداري ما شاف طلبك؟ ذكّره:</span><select id="rm' + r.id + '">' + admins.map(function (a) {
      return '<option value="' + a.id + '">' + (onDuty(a) ? "🟢 " : "⚪ ") + esc(a.full_name) + (onDuty(a) ? " (مداوم اليوم)" : " (غير مداوم)") + "</option>";
    }).join("") + '</select><button type="button" class="wa sm" data-act="remind" data-id="' + r.id + '">تذكير واتساب</button></div>';
  }
  function remindLink(r, admin) {
    var emp = userById(r.user_id) || {};
    var msg = "السلام عليكم " + admin.full_name + "،\nتذكير بطلب " + KINDS[r.kind] + " للموظف " + emp.full_name + " بتاريخ " + r.date_from +
      (r.date_to ? " إلى " + r.date_to : "") + "\nحالة الطلب: " + pill(r, "my")[1] + "\nيرجى الاطلاع واتخاذ اللازم، وشكراً.\n\nنظام الطلبات - قسم الكهرباء والإلكترونيات";
    return "https://wa.me/965" + encodeURIComponent(admin.phone) + "?text=" + encodeURIComponent(msg);
  }
  function dates(r) {
    return (r.depart_date ? "تاريخ المغادرة: " + esc(r.depart_date) + " — " : "") +
      (r.kind === "pexit" ? "تاريخ الإجازة: " : "") + esc(r.date_from) + (r.date_to ? " إلى " + esc(r.date_to) : "") +
      (r.time_from ? " — من " + esc(r.time_from) + (r.time_to ? " إلى " + esc(r.time_to) : "") : "") +
      (r.meet_with ? " — المقابلة مع: " + esc(r.meet_with) : "");
  }
  function toggleKind() {
    var k = document.getElementById("f_kind"); if (!k) return;
    var show = SHOW[k.value] || [];
    OPTIONAL.forEach(function (n) { var el = document.querySelector('[data-fld="' + n + '"]'); if (el) el.hidden = show.indexOf(n) < 0; });
    var lf = document.querySelector('label[for="f_date_from"]'); if (lf) lf.textContent = k.value === "pexit" ? "تاريخ الإجازة (من)" : "التاريخ / من تاريخ";
    var tt = document.getElementById("f_time_to"), lt = document.querySelector('label[for="f_time_to"]');
    if (tt) { tt.readOnly = k.value === "perm"; lt.textContent = k.value === "perm" ? "إلى الساعة (تلقائي: 3 ساعات)" : "إلى الساعة"; }
    var ph = document.getElementById("pro-hint"); if (ph) ph.hidden = PRO_KINDS.indexOf(k.value) < 0;
    syncPermTime();
  }
  function syncPermTime() {
    var k = document.getElementById("f_kind"), tf = document.getElementById("f_time_from"), tt = document.getElementById("f_time_to");
    if (!k || !tf || k.value !== "perm") return;
    tt.value = tf.value && toMin(tf.value) + PERM_MIN < 1440 ? fromMin(toMin(tf.value) + PERM_MIN) : "";
  }
  function doReq(form) {
    var d = formData(form), e = {}, u = me(), show = SHOW[d.kind];
    if (!show) e.kind = "اختر نوع الطلب";
    else OPTIONAL.forEach(function (n) { if (show.indexOf(n) < 0) d[n] = ""; });
    var file = show && show.indexOf("medical_image") >= 0 ? form.medical_image.files[0] : null;
    if (!d.date_from) e.date_from = "هذا الحقل مطلوب";
    if (!d.secret) e.secret = "هذا الحقل مطلوب";
    if (d.kind === "perm") {
      if (!d.perm_period) e.perm_period = "اختر: بداية الدوام أو أثناء الدوام أو نهاية الدوام";
      if (!d.time_from) e.time_from = "حدد ساعة بداية الاستئذان";
      else if (toMin(d.time_from) + PERM_MIN >= 1440) e.time_from = "الاستئذان 3 ساعات ولازم ينتهي بنفس اليوم";
      else d.time_to = fromMin(toMin(d.time_from) + PERM_MIN); // 3 ساعات بالضبط، لا أكثر ولا أقل
    }
    if (d.kind === "pexit" && !d.depart_date) e.depart_date = "اكتب تاريخ المغادرة";
    if (d.kind === "med" && !file) e.medical_image = "ارفق صورة الطبية";
    if (file && !/^image\//.test(file.type)) e.medical_image = "الملف لازم يكون صورة";
    if (d.kind !== "perm" && d.time_from && d.time_to && d.time_to <= d.time_from) e.time_to = "وقت النهاية لازم يكون بعد البداية";
    if (d.date_to && d.date_from && d.date_to < d.date_from) e.date_to = "تاريخ النهاية قبل البداية";
    if (Object.keys(e).length) { delete d.secret; myState = { errs: e, val: d }; return render(); }
    (file ? shrink(file) : Promise.resolve("")).then(function (img) {
      var D = load(), df = parseDate(d.date_from);
      var r = { id: D.seq.r++, user_id: u.id, kind: d.kind, date_from: d.date_from, date_to: d.date_to, depart_date: d.depart_date, time_from: d.time_from, time_to: d.time_to,
        meet_with: d.meet_with, perm_period: d.perm_period, notes: d.notes, med: img, secret: "", status: "p", pro_by: null, pro_at: null, decided_by: null, decided_at: null,
        reject_reason: "", auto_rejected: false, done_by: null, done_at: null, followups: [], created: new Date().toISOString() };
      if (r.kind === "perm" && used(u.id, df.getFullYear(), df.getMonth()) >= LIMIT) {
        r.status = "r"; r.auto_rejected = true; r.decided_at = r.created;
        r.reject_reason = "تجاوزت الحد الشهري (" + LIMIT + " استئذانات)";
        D.reqs.push(r); save(); flash("err", r.reject_reason + " - تم رفض الطلب تلقائياً"); return render();
      }
      r.secret = d.secret;
      D.reqs.push(r);
      if (save()) { flash("ok", isPro(r) ? "تم إرسال الطلب لمسئول المهنيين" : "تم إرسال الطلب"); return nav(link("my", { c: catOf(r.kind) })); }
      D.reqs.pop(); render();
    }, function () { myState = { errs: { medical_image: "تعذّر قراءة الصورة" }, val: d }; render(); });
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
    return '<form class="flt" data-f="filter" data-path="' + path + '"><input type="hidden" name="c" value="' + esc(c || "") + '"><input name="q" value="' + esc(q) + '" placeholder="ابحث بالاسم"><select name="f">' +
      filters.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === f ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select><button>بحث</button></form>";
  }
  function byName(list, q) { return q ? list.filter(function (r) { return uname(r.user_id).indexOf(q) >= 0; }) : list; }
  // ترحيب + مربعات عدّادات: [[العدد، العنوان، رابط اختياري، مفعّل؟]]
  function hello(u, tiles) {
    return '<div class="hello">أهلاً، ' + esc((u.full_name || u.username).split(" ")[0]) + "</div>" +
      '<div class="tiles">' + tiles.map(function (t) {
        var tag = t[2] ? "a" : "div";
        return "<" + tag + (t[2] ? ' href="' + t[2] + '"' : "") + (t[3] ? ' class="on"' : "") + "><b>" + t[0] + "</b>" + t[1] + "</" + tag + ">";
      }).join("") + "</div>";
  }

  /* مسئول المهنيين: إجازة مهنيين + إذن مغادرة */
  function viewPro(q, u) {
    var f = q.f || "w", s = (q.q || "").trim();
    var base = load().reqs.filter(isPro);
    var W = function (r) { return r.status === "p" && !r.pro_by; }, OK = function (r) { return !!r.pro_by && r.status !== "r"; }, RJ = function (r) { return r.status === "r"; };
    var items = base.filter(f === "w" ? W : f === "ok" ? OK : f === "r" ? RJ : function () { return true; });
    items = byName(items, s).sort(byCreated);
    var FL = { w: "بانتظار موافقتك", ok: "تمت موافقتك", r: "مرفوض", all: "الكل" };
    setList("طلبات المهنيين — " + (FL[f] || "الكل") + (s ? " — بحث: " + s : ""), items);
    return hello(u, [[base.filter(W).length, "بانتظار موافقتك", "#/pro?f=w", f === "w"], [base.filter(OK).length, "تمت موافقتك", "#/pro?f=ok", f === "ok"], [base.filter(RJ).length, "مرفوض", "#/pro?f=r", f === "r"]]) +
      filterBar("pro", s, f, [["w", "بانتظار موافقتك"], ["ok", "تمت موافقتك"], ["r", "مرفوض"], ["all", "الكل"]]) + listTools(items.length) + cards(items, "pro");
  }
  function viewReview(q, u) {
    var f = q.f || "p", s = (q.q || "").trim(), c = CATS[q.c] ? q.c : "", all = byCat(load().reqs, c);
    var cnt = function (st) { return all.filter(function (r) { return r.status === st; }).length; };
    var items = load().reqs.filter(function (r) { return f === "all" || r.status === f; });
    items = byName(items, s).sort(byCreated);
    var shown = byCat(items, c), FL = { p: "قيد المراجعة", a: "موافق", r: "مرفوض", all: "الكل" };
    setList((c ? CATS[c].t : "كل الطلبات") + " — " + (FL[f] || "الكل") + (s ? " — بحث: " + s : ""), shown);
    return hello(u, [[cnt("p"), "قيد المراجعة", link("review", { f: "p", c: c }), f === "p"], [cnt("a"), "موافق", link("review", { f: "a", c: c }), f === "a"], [cnt("r"), "مرفوض", link("review", { f: "r", c: c }), f === "r"]]) +
      filterBar("review", s, f, [["p", "قيد المراجعة"], ["a", "موافق"], ["r", "مرفوض"], ["all", "الكل"]], c) +
      catBar("review", { f: f, q: s, c: c }, items) + listTools(shown.length) + cards(shown, "review");
  }
  function viewQueue(q, u) {
    var f = q.f || "all", s = (q.q || "").trim(), c = CATS[q.c] ? q.c : "";
    // الإداري ما يشوف إلا اللي قرر عليه رئيس القسم/الضابط
    var all0 = load().reqs.filter(function (r) { return r.status !== "p" && !r.auto_rejected; }), base = byCat(all0, c);
    var nNew = base.filter(function (r) { return !r.done_at && !r.followups.length; }).length,
        nFu = base.filter(function (r) { return !r.done_at && r.followups.length; }).length,
        nDone = base.filter(function (r) { return r.done_at; }).length;
    var items = all0.filter(function (r) {
      if (f === "n") return !r.done_at && !r.followups.length;
      if (f === "f") return !r.done_at && r.followups.length;
      if (f === "d") return !!r.done_at;
      if (f === "r") return r.status === "r";
      return true;
    });
    items = byName(items, s).sort(byCreated);
    var shown = byCat(items, c), FL = { all: "الكل", n: "جديد بانتظار الإجراء", f: "يرجى المتابعة", d: "تم عمل اللازم", r: "مرفوض" };
    setList((c ? CATS[c].t : "كل الطلبات") + " — " + (FL[f] || "الكل") + (s ? " — بحث: " + s : ""), shown);
    var duty = u.role === "a" ? '<div class="duty"><span>حالتك اليوم: ' + (onDuty(u) ? "🟢 <b>مداوم</b>" : "⚪ <b>غير مداوم</b>") +
      '</span><button type="button" data-act="duty">' + (onDuty(u) ? "تسجيل غير مداوم" : "تسجيل مداوم اليوم") + "</button></div>" : "";
    return hello(u, [[nNew, "جديد بانتظار الإجراء", link("queue", { f: "n", c: c }), f === "n"], [nFu, "يرجى المتابعة", link("queue", { f: "f", c: c }), f === "f"], [nDone, "تم عمل اللازم", link("queue", { f: "d", c: c }), f === "d"]]) + duty +
      filterBar("queue", s, f, [["all", "الكل"], ["n", "جديد بانتظار الإجراء"], ["f", "يرجى المتابعة"], ["d", "تم عمل اللازم"], ["r", "مرفوض"]], c) +
      catBar("queue", { f: f, q: s, c: c }, items) + listTools(shown.length) + cards(shown, "queue");
  }
  function cards(items, mode) {
    if (!items.length) return "<p>لا توجد طلبات.</p>";
    return items.map(function (r) {
      var u = userById(r.user_id) || {}, st = pill(r, mode);
      var h = '<div class="card"><div class="ch"><h3>' + esc(u.full_name) + " — " + KINDS[r.kind] + "</h3>" + chr(r, st) + "</div>";
      h += '<p class="sub">' + esc(u.job_title) + " — هاتف: " + esc(u.phone) + (mode === "queue" ? " — مدني: " + esc(u.civil_id) : "") + "</p>";
      h += "<p>" + (r.perm_period ? PERIODS[r.perm_period] + " — " : "") + dates(r) + "</p>";
      if (r.notes) h += "<p>" + esc(r.notes) + "</p>";
      if (r.med) h += '<p><a href="#" data-act="med" data-id="' + r.id + '">صورة الطبية</a></p>';
      if (r.reject_reason) h += '<p class="err">السبب: ' + esc(r.reject_reason) + "</p>";
      h += r.followups.map(function (x, i) { return '<p class="fu">متابعة ' + (i + 1) + ": " + esc(x.note) + " — " + esc(uname(x.by)) + " — " + ymdhm(x.at) + "</p>"; }).join("");
      h += stamps(r);
      if (mode === "pro" && r.status === "p" && !r.pro_by) {
        h += '<form class="acts" data-f="pro" data-id="' + r.id + '"><input name="reason" placeholder="سبب الرفض (إجباري عند الرفض)"><button class="g" name="do" value="a">موافقة مسئول المهنيين</button><button class="r" name="do" value="r">رفض</button></form>';
      }
      if (mode === "review" && r.status === "p") {
        if (isPro(r) && !r.pro_by) h += '<p class="wait">⏳ بانتظار موافقة مسئول المهنيين أولاً</p>';
        else h += '<form class="acts" data-f="decide" data-id="' + r.id + '"><input name="reason" placeholder="سبب الرفض (إجباري عند الرفض)"><button class="g" name="do" value="a">موافقة</button><button class="r" name="do" value="r">رفض</button></form>';
      }
      if (mode === "queue" && !r.done_at) {
        if (r.secret) h += '<p>الرقم السري: <span id="s' + r.id + '">••••••</span> <button type="button" class="s" data-act="reveal" data-id="' + r.id + '">إظهار</button></p>';
        h += '<form class="qa" data-f="qact" data-id="' + r.id + '"><input name="note" placeholder="شنو المطلوب متابعته (للمتابعة فقط)">' +
          '<button class="g" name="do" value="done">تم عمل اللازم</button><button class="o" name="do" value="follow">يرجى المتابعة</button></form>';
      }
      if (mode === "queue" && u.phone) h += '<a class="wa" target="_blank" rel="noopener" href="' + waLink(r, u) + '">أرسل واتساب</a>';
      return h + "</div>";
    }).join("");
  }
  // لون ونص حالة الطلب في رأس البطاقة
  function pill(r, mode) {
    if (r.status === "r") return ["r", "مرفوض"];
    if (mode === "queue") {
      if (r.done_at) return ["g", "تم عمل اللازم"];
      if (r.followups.length) return ["f", "يرجى المتابعة"];
      return ["y", "جديد"];
    }
    if (r.status === "p" && isPro(r)) return r.pro_by ? ["y", "بانتظار رئيس القسم"] : ["y", mode === "pro" ? "بانتظار موافقتك" : "بانتظار مسئول المهنيين"];
    if (r.status === "a" && r.done_at) return ["g", "تم عمل اللازم"];
    if (r.status === "a" && r.followups.length) return ["f", "يرجى المتابعة"];
    return [{ p: "y", a: "g" }[r.status], STATUS[r.status]];
  }
  // رسالة واتساب جاهزة للموظف (أرقام الكويت 8 خانات + 965)
  function waLink(r, u) {
    var st = r.status === "r" ? "مرفوض" + (r.reject_reason ? " — السبب: " + r.reject_reason : "")
      : r.done_at ? "تمت الموافقة وتم عمل اللازم"
      : r.followups.length ? "يرجى المتابعة: " + r.followups[r.followups.length - 1].note
      : "تمت الموافقة وجاري التنفيذ";
    var msg = "مرحباً " + u.full_name + "،\nبخصوص طلب " + KINDS[r.kind] + " بتاريخ " + r.date_from + (r.date_to ? " إلى " + r.date_to : "") +
      ":\n" + st + "\n\nقسم الكهرباء والإلكترونيات - خفر السواحل";
    return "https://wa.me/965" + encodeURIComponent(u.phone) + "?text=" + encodeURIComponent(msg);
  }
  function reqById(id) { return load().reqs.filter(function (r) { return r.id === id; })[0]; }
  function doPro(form, submitter) {
    var r = reqById(+form.dataset.id), why = form.reason.value.trim(), act = submitter && submitter.value, now = new Date().toISOString();
    if (!r || r.status !== "p" || r.pro_by || !isPro(r)) return render();
    if (act === "r" && !why) { flash("err", "لازم تكتب سبب الرفض"); return render(); }
    if (act === "a") { r.pro_by = me().id; r.pro_at = now; log("موافقة مسئول المهنيين", r.id); flash("ok", "تمت الموافقة، والطلب الحين عند رئيس القسم"); }
    else { r.status = "r"; r.reject_reason = why; r.decided_by = me().id; r.decided_at = now; log("رفض مسئول المهنيين", r.id); }
    save(); render();
  }
  function doDecide(form, submitter) {
    var r = reqById(+form.dataset.id), why = form.reason.value.trim(), act = submitter && submitter.value;
    if (!r || r.status !== "p") return render();
    if (isPro(r) && !r.pro_by) { flash("err", "لازم موافقة مسئول المهنيين أولاً"); return render(); }
    if (act === "r" && !why) { flash("err", "لازم تكتب سبب الرفض"); return render(); }
    r.status = act === "a" ? "a" : "r"; r.reject_reason = act === "r" ? why : "";
    r.decided_by = me().id; r.decided_at = new Date().toISOString();
    log(act === "a" ? "موافقة" : "رفض", r.id); save(); render();
  }
  function doFollowup(form) {
    var r = reqById(+form.dataset.id), note = form.note.value.trim();
    if (!r || r.done_at) return render();
    if (!note) { flash("err", "اكتب شنو المطلوب متابعته"); return render(); }
    r.followups.push({ note: note, by: me().id, at: new Date().toISOString() });
    log("متابعة", r.id); save(); render();
  }
  function doDone(form) {
    var r = reqById(+form.dataset.id);
    if (!r || r.done_at) return render();
    r.done_by = me().id; r.done_at = new Date().toISOString(); r.secret = ""; // يحذف الرقم السري
    log("تم عمل اللازم", r.id); save(); render();
  }

  /* ---------- الطباعة: نموذج طلب واحد أو كشف القائمة الحالية ---------- */
  var lastList = { title: "", items: [] };
  function setList(title, items) { lastList = { title: title, items: items.slice() }; }
  function letterhead() {
    return '<div class="lh"><div class="r"><b>الإدارة العامة لخفر السواحل</b><span>قسم الكهرباء والإلكترونيات</span></div><div class="c"><img src="logo.png" alt=""></div>' +
      '<div class="l"><span>تاريخ الطباعة</span><b>' + ymd(new Date()) + "</b></div></div>";
  }
  function printFoot() { return '<div class="ft">نظام الطلبات الإدارية - قسم الكهرباء والإلكترونيات - للاستخدام الداخلي — طُبع ' + ymdhm(new Date().toISOString()) + " — " + CREDIT + "</div>"; }
  function canSee(u, r) { return u.role === "e" ? r.user_id === u.id : u.role === "m" ? (r.user_id === u.id || isPro(r)) : true; }
  function printReq(r) {
    var u = userById(r.user_id) || {}, days = r.date_to ? Math.round((parseDate(r.date_to) - parseDate(r.date_from)) / 864e5) + 1 : 0;
    var rows = [
      ["نوع الطلب", KINDS[r.kind]],
      r.perm_period && ["وقت الاستئذان", PERIODS[r.perm_period]],
      r.depart_date && ["تاريخ المغادرة", r.depart_date],
      [r.kind === "pexit" ? "تاريخ الإجازة" : r.date_to ? "الفترة" : "التاريخ", r.date_from + (r.date_to ? " إلى " + r.date_to : "")],
      days && ["عدد الأيام", days + " يوم"],
      r.time_from && ["الوقت", "من " + r.time_from + (r.time_to ? " إلى " + r.time_to : "")],
      r.meet_with && ["المقابلة مع", r.meet_with],
      r.notes && ["ملاحظات", r.notes],
      ["الحالة", pill(r, "my")[1]],
      r.reject_reason && ["سبب الرفض", r.reject_reason],
      ["تاريخ التقديم", ymdhm(r.created)]
    ].filter(Boolean);
    var doc = letterhead() + '<div class="rt"><h1>نموذج طلب ' + KINDS[r.kind] + "</h1><p>رقم الطلب: " + r.id + "</p></div>" +
      '<h3 class="sh">بيانات الموظف</h3><table class="meta"><tr><th>الاسم</th><td>' + esc(u.full_name) + "</td><th>المسمى</th><td>" + esc(u.job_title) + "</td></tr>" +
      "<tr><th>الرقم المدني</th><td>" + esc(u.civil_id) + "</td><th>الهاتف</th><td>" + esc(u.phone) + "</td></tr></table>" +
      '<h3 class="sh">تفاصيل الطلب</h3><table class="meta det">' + rows.map(function (x) { return "<tr><th>" + x[0] + "</th><td>" + esc(x[1]) + "</td></tr>"; }).join("") + "</table>" +
      (r.followups.length ? '<h3 class="sh">المتابعات</h3><table><thead><tr><th>#</th><th>المطلوب</th><th>بواسطة</th><th>الوقت</th></tr></thead><tbody>' +
        r.followups.map(function (f, i) { return "<tr><td>" + (i + 1) + "</td><td>" + esc(f.note) + "</td><td>" + esc(uname(f.by)) + "</td><td>" + ymdhm(f.at) + "</td></tr>"; }).join("") + "</tbody></table>" : "") +
      '<h3 class="sh">الاعتمادات</h3>' + (stamps(r) || '<p class="sub">لا توجد اعتمادات بعد.</p>') +
      (r.med ? '<h3 class="sh">مرفق: صورة الطبية</h3><img class="att" src="' + r.med + '" alt="صورة الطبية">' : "") + printFoot();
    log("طباعة الطلب", r.id); save();
    doPrint(doc);
  }
  function printList() {
    var L = lastList;
    var rows = L.items.map(function (r, i) {
      var u = userById(r.user_id) || {}, ap = r.decided_by ? userById(r.decided_by) : null, dn = r.done_by ? userById(r.done_by) : null;
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(u.full_name) + "<br><small>" + esc(u.job_title) + "</small></td><td>" + KINDS[r.kind] + "</td><td>" +
        (r.depart_date ? "مغادرة: " + r.depart_date + "<br>" : "") + r.date_from + (r.date_to ? "<br>إلى " + r.date_to : "") + "</td><td>" + (r.time_from ? r.time_from + (r.time_to ? " - " + r.time_to : "") : "—") + "</td><td>" +
        pill(r, "my")[1] + (r.reject_reason ? "<br><small>" + esc(r.reject_reason) + "</small>" : "") + "</td><td>" +
        (r.pro_by ? "<small>المهنيين: " + esc(uname(r.pro_by)) + "</small><br>" : "") + (ap ? esc(nameLine(ap)) : "—") + "</td><td>" +
        (dn ? esc(dn.full_name) + "<br><small>" + ymdhm(r.done_at) + "</small>" : "—") + "</td></tr>";
    }).join("");
    var doc = letterhead() + '<div class="rt"><h1>كشف ' + esc(L.title) + "</h1><p>عدد الطلبات: " + L.items.length + "</p></div>" +
      '<table class="lst"><thead><tr><th>م</th><th>الموظف</th><th>النوع</th><th>التاريخ</th><th>الوقت</th><th>الحالة</th><th>الاعتماد</th><th>التنفيذ</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="8">لا توجد طلبات</td></tr>') + "</tbody></table>" + printFoot();
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
    if (!document.body.classList.contains("pmode")) return;
    document.body.classList.remove("pmode"); document.getElementById("print").innerHTML = "";
  });

  /* ---------- الإحصائيات ---------- */
  function viewStats(q, u) {
    var PER = { week: "أسبوع (آخر 7 أيام)", month: "شهر (من أول الشهر)", "3m": "3 شهور", "6m": "6 شهور", year: "سنة كاملة (يناير - ديسمبر)" };
    var p = PER[q.p] ? q.p : "month", s = (q.q || "").trim(), now = new Date(), since, until, end;
    if (p === "week") { since = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -7); until = new Date(+now + 6e4); end = now; }
    else {
      var back = { month: 0, "3m": 2, "6m": 5, year: now.getMonth() }[p];
      since = new Date(now.getFullYear(), now.getMonth() - back, 1);
      until = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      if (p === "year") until = new Date(since.getFullYear() + 1, 0, 1);
      end = addDays(until, -1);
    }
    var D = load(), qs = byName(D.reqs.filter(function (r) { var c = new Date(r.created); return c >= since && c < until; }), s);
    var kinds = {}, tot = { all: 0, p: 0, a: 0, r: 0 }, emp = {}, lv = { leave: [0, 0], emer: [0, 0], med: [0, 0], pleave: [0, 0], pexit: [0, 0] };
    qs.forEach(function (r) {
      tot.all++; tot[r.status]++;
      kinds[KINDS[r.kind]] = (kinds[KINDS[r.kind]] || 0) + 1;
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
    var key = p + "|" + s + "|" + ymd(since), ok = D.statOk[key], canOk = "as".indexOf(u.role) >= 0;
    var head = D.users.filter(function (x) { return x.role === "h"; })[0];
    var okBar = ok ? '<p class="msg ok noprint">✔ الإحصائية معتمدة من ' + esc(nameLine(userById(ok.by) || {})) + " — " + ymdhm(ok.at) + "</p>"
      : canOk ? '<p class="noprint"><button class="p g" type="button" data-act="stat-ok" data-key="' + esc(key) + '">اعتماد الإحصائية</button> <small class="sub">(يظهر ختمك في خانة الاعتماد)</small></p>'
      : '<p class="msg noprint">الإحصائية غير معتمدة بعد — الاعتماد من الإداري.</p>';
    return '<form class="flt noprint" data-f="filter" data-path="stats"><input name="q" value="' + esc(s) + '" placeholder="ابحث باسم الموظف"><select name="p">' +
      Object.keys(PER).map(function (k) { return '<option value="' + k + '"' + (k === p ? " selected" : "") + ">" + PER[k] + "</option>"; }).join("") + "</select><button>عرض</button></form>" +
      okBar +
      '<p class="noprint"><button class="p" type="button" data-act="print">تصدير PDF</button> <small class="sub">(من نافذة الطباعة اختر «حفظ بصيغة PDF»)</small></p>' +
      '<div class="lh"><div class="r"><b>الإدارة العامة لخفر السواحل</b><span>قسم الكهرباء والإلكترونيات</span></div><div class="c"><img src="logo.png" alt=""></div><div class="l"><span>تاريخ الإصدار</span><b>' + ymd(now) + "</b></div></div>" +
      '<div class="rt"><h1>تقرير إحصائية الطلبات الإدارية</h1><p>' + PER[p] + "</p></div>" +
      '<div class="tw"><table class="meta"><tr><th>الفترة</th><td>من ' + ymd(since) + " إلى " + ymd(end) + "</td><th>الموظف</th><td>" + esc(s || "جميع الموظفين") + "</td></tr>" +
      "<tr><th>الاعتماد</th><td>" + (ok ? esc(nameLine(userById(ok.by) || {})) + " (" + esc((userById(ok.by) || {}).job_title) + ")" : "غير معتمدة بعد") + "</td><th>وقت الإصدار</th><td>" + nowS + "</td></tr></table></div>" +
      '<div class="kp"><div><b>' + tot.all + "</b>إجمالي الطلبات</div><div><b>" + tot.p + "</b>قيد المراجعة</div><div><b>" + tot.a + "</b>موافق</div><div><b>" + tot.r + "</b>مرفوض</div><div><b>" + ln + "</b>عدد الإجازات</div><div><b>" + ld + "</b>أيام الإجازات</div></div>" +
      '<h3 class="sh">1. الطلبات حسب النوع</h3><div class="tw"><table><thead><tr><th>النوع</th><th>العدد</th><th>النسبة</th></tr></thead><tbody>' + (kRows || '<tr><td colspan="3">لا توجد طلبات</td></tr>') + "</tbody></table></div>" +
      '<h3 class="sh">2. إحصائية الإجازات</h3><div class="tw"><table><thead><tr><th>نوع الإجازة</th><th>عدد الطلبات</th><th>عدد الأيام</th></tr></thead><tbody>' +
      Object.keys(lv).map(function (k) { return "<tr><td>" + KINDS[k] + "</td><td>" + lv[k][0] + "</td><td>" + lv[k][1] + "</td></tr>"; }).join("") +
      "</tbody><tfoot><tr><th>المجموع</th><th>" + ln + "</th><th>" + ld + "</th></tr></tfoot></table></div>" +
      '<h3 class="sh">3. تفصيل حسب الموظف</h3><div class="tw"><table><thead><tr><th>الموظف</th><th>الاستئذانات (الحد ' + LIMIT + "/شهر)</th><th>الإجازات</th><th>أيام الإجازات</th><th>المرفوض</th></tr></thead><tbody>" +
      (eRows || '<tr><td colspan="5">لا توجد بيانات</td></tr>') + "</tbody></table></div>" +
      '<div class="sig"><div><span>رئيس القسم</span><i></i><p>' + (head ? esc(nameLine(head)) : "&nbsp;") + "</p></div>" +
      "<div><span>الاعتماد</span>" + (ok ? '<div class="stamps c">' + stamp(ok.by, "اعتماد الإحصائية", ok.at) + "</div>" : "<i></i><p>&nbsp;</p>") + "</div></div>" +
      '<div class="ft">تقرير آلي من نظام الطلبات الإدارية - قسم الكهرباء والإلكترونيات - للاستخدام الداخلي — ' + CREDIT + "</div>";
  }

  /* ---------- الحسابات والصلاحيات (مدير النظام) ---------- */
  function viewUsers() {
    var D = load(), opts = { e: ROLES.e, m: ROLES.m, h: ROLES.h, o: ROLES.o, a: ROLES.a };
    function inp(u, f, ph) { return '<input data-uf="' + f + '" data-uid="' + u.id + '" value="' + esc(u[f] || "") + '" placeholder="' + ph + '">'; }
    return "<h2>الحسابات والصلاحيات</h2><p class=\"sub\">الاسم والرتبة والمسمى هي اللي تطلع في الختم. عدّل الخانة واضغط خارجها للحفظ.</p>" +
      '<div class="tw"><table class="ut"><thead><tr><th>المستخدم</th><th>الاسم</th><th>الرتبة</th><th>المسمى</th><th>الصلاحية</th><th>الختم</th></tr></thead><tbody>' +
      D.users.map(function (u) {
        var cell = u.role === "s" ? ROLES.s : '<select data-role="' + u.id + '">' + Object.keys(opts).map(function (k) { return '<option value="' + k + '"' + (k === u.role ? " selected" : "") + ">" + opts[k] + "</option>"; }).join("") + "</select>";
        return "<tr><td>" + esc(u.username) + "</td><td>" + inp(u, "full_name", "الاسم") + "</td><td>" + inp(u, "rank", "مثال: مقدم مهندس بحري") + "</td><td>" + inp(u, "job_title", "المسمى") + "</td><td>" + cell + '</td><td><div class="stamps c">' + stamp(u.id, ROLES[u.role], null, "", true) + "</div></td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<h2>سجل العمليات</h2><div class="tw"><table><thead><tr><th>الوقت</th><th>المستخدم</th><th>العملية</th><th>الهدف</th></tr></thead><tbody>' +
      (D.audit.length ? D.audit.slice(0, 50).map(function (a) { return "<tr><td>" + ymdhm(a.at) + "</td><td>" + esc(uname(a.who)) + "</td><td>" + esc(a.action) + "</td><td>" + esc(a.target) + "</td></tr>"; }).join("")
        : '<tr><td colspan="4">لا توجد عمليات بعد</td></tr>') + "</tbody></table></div>";
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
    else if (kind === "qact") { if (ev.submitter && ev.submitter.value === "done") doDone(f); else doFollowup(f); }
    else if (kind === "filter") {
      var d = formData(f), qs = Object.keys(d).filter(function (k) { return d[k]; }).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(d[k]); }).join("&");
      go(f.dataset.path + (qs ? "?" + qs : ""));
    }
  });
  app.addEventListener("input", function (ev) { if (ev.target.id === "f_time_from") syncPermTime(); });
  app.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.id === "f_kind") toggleKind();
    if (t.id === "f_time_from") syncPermTime();
    if (t.dataset.role) { var u = userById(+t.dataset.role); if (u && u.role !== "s") { u.role = t.value; save(); flash("ok", "تم تحديث صلاحية " + u.full_name); render(); } }
    if (t.dataset.uf) {
      var u2 = userById(+t.dataset.uid), v = t.value.trim();
      if (u2 && (v || t.dataset.uf === "rank")) { u2[t.dataset.uf] = v; save(); flash("ok", "تم حفظ بيانات " + u2.username); render(); }
    }
  });
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-act],[data-close]"); if (!b) return;
    if (b.hasAttribute("data-close")) return closeModal();
    var act = b.dataset.act, u0 = me();
    ev.preventDefault();
    if (act === "logout") { setUid(null); go("login"); }
    else if (act === "reset") {
      if (confirm("سيتم حذف كل البيانات التجريبية في هذا المتصفح وإرجاعها للبداية. متأكد؟")) {
        try { localStorage.removeItem(KEY); } catch (e) {}
        db = null; setUid(null); load(); flash("ok", "تمت إعادة ضبط البيانات التجريبية"); go("login");
      }
    }
    else if (act === "quick") { var u = load().users.filter(function (x) { return x.username === b.dataset.u; })[0]; if (u) { setUid(u.id); go(HOME[u.role]); } }
    else if (act === "print") window.print();
    else if (act === "print-req") { var pr = reqById(+b.dataset.id); if (pr && u0 && canSee(u0, pr)) printReq(pr); }
    else if (act === "print-list") printList();
    else if (act === "duty" && u0 && u0.role === "a") { u0.duty = onDuty(u0) ? "" : today(); save(); render(); }
    else if (act === "stat-ok" && u0 && "as".indexOf(u0.role) >= 0) {
      load().statOk[b.dataset.key] = { by: u0.id, at: new Date().toISOString() };
      log("اعتماد الإحصائية", "إحصائية " + b.dataset.key.split("|")[0]); save(); flash("ok", "تم اعتماد الإحصائية"); render();
    }
    else if (act === "remind") {
      var rq = reqById(+b.dataset.id), sel = document.getElementById("rm" + b.dataset.id), adm = sel && userById(+sel.value);
      if (!rq || !adm || !u0 || rq.user_id !== u0.id) return;
      log("تذكير الإداري " + adm.full_name, rq.id); save();
      window.open(remindLink(rq, adm), "_blank", "noopener");
    }
    else if (act === "reveal") {
      var r = reqById(+b.dataset.id); if (!r || r.done_at) return;
      log("عرض الرقم السري", r.id); save();
      document.getElementById("s" + r.id).textContent = r.secret; b.remove();
    }
    else if (act === "med") {
      var q = reqById(+b.dataset.id); if (!q || !q.med || !u0) return;
      if ((u0.role === "e" || u0.role === "m") && q.user_id !== u0.id) return;
      document.getElementById("modal-body").innerHTML = '<p><b>صورة الطبية — ' + esc(uname(q.user_id)) + "</b></p>";
      var img = new Image(); img.src = q.med; img.alt = "صورة الطبية";
      document.getElementById("modal-body").appendChild(img);
      document.getElementById("modal").hidden = false;
    }
  });
  function closeModal() { document.getElementById("modal").hidden = true; document.getElementById("modal-body").innerHTML = ""; }
  document.getElementById("modal").addEventListener("click", function (ev) { if (ev.target.id === "modal") closeModal(); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") closeModal(); });
  window.addEventListener("hashchange", render);

  load();
  render();
})();
