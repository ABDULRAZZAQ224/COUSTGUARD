/* نسخة عرض ثابتة (GitHub Pages) من نظام طلبات قسم الكهرباء والإلكترونيات.
   كل البيانات محفوظة في متصفح المستخدم (localStorage) — ما في سيرفر. */
(function () {
  "use strict";

  var KEY = "khafr_demo_v1";
  var LIMIT = 4; // الحد الأعلى للاستئذانات بالشهر
  var KINDS = { perm: "استئذان", leave: "إجازة", emer: "إجازة طارئة (عارضة)", med: "اعتماد طبية (إجازة مرضية)", meet: "طلب مقابلة" };
  var STATUS = { p: "قيد المراجعة", a: "موافق", r: "مرفوض" };
  var ROLES = { e: "موظف", h: "رئيس قسم", o: "ضابط قسم", a: "إداري", s: "مدير النظام" };
  var PERIODS = { start: "بداية الدوام", during: "أثناء الدوام", end: "نهاية الدوام" };
  var HOME = { e: "my", h: "review", o: "review", a: "queue", s: "queue" };
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
    var u = [
      [1, "admin", "s", "مدير النظام", "مدير النظام"],
      [2, "head", "h", "خالد محمد العنزي", "رئيس قسم الكهرباء والإلكترونيات"],
      [3, "officer", "o", "فهد سالم المطيري", "ضابط القسم"],
      [4, "clerk", "a", "نورة عبدالله الشمري", "إداري شؤون الموظفين"],
      [5, "emp", "e", "أحمد علي الكندري", "فني كهرباء"],
      [6, "emp2", "e", "سارة يوسف الرشيدي", "مهندسة إلكترونيات"]
    ].map(function (x) {
      return { id: x[0], username: x[1], password: "123456", role: x[2], full_name: x[3], job_title: x[4], civil_id: "2900101000" + pad(x[0]), phone: "5000000" + x[0] };
    });
    function R(o) {
      return Object.assign({ date_to: "", time_from: "", time_to: "", meet_with: "", perm_period: "", notes: "", med: "", secret: "",
        status: "p", decided_by: null, decided_at: null, reject_reason: "", auto_rejected: false, done_by: null, done_at: null, followups: [] }, o);
    }
    var reqs = [
      R({ id: 1, user_id: 5, kind: "perm", date_from: d(1), time_from: "07:00", time_to: "09:00", perm_period: "start", notes: "مراجعة مستشفى", secret: "1234", created: at(0, 8) }),
      R({ id: 2, user_id: 6, kind: "meet", date_from: d(2), time_from: "10:00", meet_with: "رئيس القسم", secret: "5678", created: at(-1, 11) }),
      R({ id: 3, user_id: 5, kind: "leave", date_from: d(-12), date_to: d(-8), secret: "1234", status: "a", decided_by: 2, decided_at: at(-14), created: at(-15) }),
      R({ id: 4, user_id: 6, kind: "emer", date_from: d(-5), date_to: d(-4), secret: "", status: "a", decided_by: 3, decided_at: at(-5), done_by: 4, done_at: at(-4, 12), created: at(-6) }),
      R({ id: 5, user_id: 5, kind: "med", date_from: d(-3), date_to: d(-2), med: medImg, secret: "1234", status: "a", decided_by: 2, decided_at: at(-2),
          followups: [{ note: "الطبية غير واضحة، يرجى إرسال نسخة أوضح", by: 4, at: at(-1, 10) }], created: at(-2, 8) }),
      R({ id: 6, user_id: 6, kind: "perm", date_from: d(-9), time_from: "12:00", time_to: "14:00", perm_period: "end", secret: "", status: "r", decided_by: 2, decided_at: at(-9), reject_reason: "ضغط عمل في القسم ذلك اليوم", created: at(-10) }),
      R({ id: 7, user_id: 5, kind: "leave", date_from: d(-70), date_to: d(-63), secret: "", status: "a", decided_by: 3, decided_at: at(-75), done_by: 4, done_at: at(-74), created: at(-76) })
    ];
    return { users: u, reqs: reqs, audit: [], seq: { u: 7, r: 8 }, seeded: now };
  }
  function load() {
    if (db) return db;
    try { var s = localStorage.getItem(KEY); if (s) db = JSON.parse(s); } catch (e) { db = null; }
    if (!db || !db.users) { db = seed(); save(); }
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
  function log(action, pk) { var u = me(); load().audit.unshift({ who: u ? u.id : null, action: action, target: "طلب " + pk, at: new Date().toISOString() }); db.audit = db.audit.slice(0, 300); }

  /* ---------- رسائل ---------- */
  var flashes = [];
  function flash(type, text) { flashes.push({ type: type, text: text }); }

  /* ---------- التوجيه ---------- */
  var ROUTES = {
    login: { anon: true, view: viewLogin },
    register: { anon: true, view: viewRegister },
    my: { roles: "ehoas", view: viewMy },
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
    var body = route.view(r.q, u);
    var msgs = flashes.map(function (m) { return '<p class="msg ' + m.type + '">' + esc(m.text) + "</p>"; }).join("");
    flashes = [];
    document.body.classList.toggle("auth-bg", !u);
    document.body.classList.toggle("app-bg", !!u);
    document.getElementById("app").innerHTML = shell(u, r.path) + "<main>" + msgs + body + "</main>";
    window.scrollTo(0, 0);
    if (route.after) route.after();
  }

  function shell(u, path) {
    if (!u) return ""; // صفحات الدخول والتسجيل: خلفية كاملة بدون هيدر
    var h = '<header><img src="logo.png" alt=""><div class="t"><b>الإدارة العامة لخفر السواحل</b><span>قسم الكهرباء والإلكترونيات</span></div>';
    h += '<span class="u">' + esc(u.full_name) + " (" + ROLES[u.role] + ")</span>";
    if (u.role === "s") h += '<a href="#/users">الحسابات والصلاحيات</a>';
    h += '<button type="button" data-act="logout">خروج</button>';
    h += "</header>";
    h += '<div class="demo noprint"><span>⚠️ نسخة عرض تجريبية — البيانات محفوظة في هذا المتصفح فقط. لا تُدخل أرقام سرية أو بيانات حقيقية.</span><button type="button" data-act="reset">إعادة ضبط البيانات التجريبية</button></div>';
    {
      var links = [["my", "طلباتي", "ehoas"], ["review", "مراجعة الطلبات", "hos"], ["queue", "طلبات للتنفيذ", "as"], ["stats", "الإحصائيات", "hoas"]];
      h += '<nav class="nav noprint">' + links.filter(function (l) { return l[2].indexOf(u.role) >= 0; }).map(function (l) {
        return '<a href="#/' + l[0] + '"' + (l[0] === path ? ' class="on"' : "") + ">" + l[1] + "</a>";
      }).join("") + "</nav>";
    }
    return h;
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
  function viewLogin() {
    var s = loginState; loginState = { errs: null, val: {} };
    var demo = load().users.filter(function (u) { return ["admin", "head", "officer", "clerk", "emp", "emp2"].indexOf(u.username) >= 0 && u.password === "123456"; });
    return '<div class="auth">' + authHero() +
      '<form data-f="login">' + (s.errs ? '<p class="err">' + esc(s.errs) + "</p>" : "") +
      field("username", "اسم المستخدم", { autocomplete: "username", required: "" }, null, s.val.username) +
      field("password", "كلمة المرور", { type: "password", autocomplete: "current-password", required: "" }) +
      '<button class="p wide">دخول</button><a class="btn-out" href="#/register">موظف جديد؟ سجّل حسابك</a></form>' +
      (demo.length ? '<div class="demo-box"><p>حسابات تجريبية (كلمة المرور <b>123456</b>) — اضغط للدخول مباشرة:</p><div class="demo-users">' + demo.map(function (u) {
        return '<button type="button" data-act="quick" data-u="' + esc(u.username) + '">' + esc(u.username) + "<small>" + ROLES[u.role] + "</small></button>";
      }).join("") + "</div></div>" : "") +
      '<p class="note">نسخة تجريبية — أي بيانات تدخلها هنا والطلبات تُحفظ في هذا المتصفح فقط.</p></div>';
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
      '<button class="p wide">إنشاء الحساب</button><a class="btn-out" href="#/login">عندك حساب؟ سجّل دخولك</a></form></div>';
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
    D.users.push({ id: D.seq.u++, username: d.username, password: d.password1, role: "e", full_name: fn.join(" "), job_title: d.job_title, civil_id: cid, phone: ph });
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
    meet: ["date_from", "time_from", "time_to", "meet_with"]
  };
  var myState = { errs: {}, val: { kind: "perm" } };
  function viewMy(q, u) {
    var s = myState; myState = { errs: {}, val: { kind: "perm" } };
    var t = new Date(), n = used(u.id, t.getFullYear(), t.getMonth()), v = s.val, e = s.errs;
    var items = load().reqs.filter(function (r) { return r.user_id === u.id; }).sort(byCreated);
    ROUTES.my.after = toggleKind;
    var cnt = function (st) { return items.filter(function (r) { return r.status === st; }).length; };
    return hello(u, [[n + " / " + LIMIT, "استئذانات هذا الشهر"], [cnt("p"), "قيد المراجعة"], [cnt("a"), "موافق"]]) +
      '<p class="msg">استئذاناتك هذا الشهر: <b>' + n + " من " + LIMIT + "</b> (الحد الأعلى " + LIMIT + "، وأي استئذان زيادة يرفضه النظام تلقائياً)</p>" +
      "<h2>طلب جديد</h2>" +
      '<form class="box" data-f="req">' +
      select("kind", "نوع الطلب", KINDS, e, v.kind) +
      '<div class="row">' + field("date_from", "التاريخ / من تاريخ", { type: "date", required: "" }, e, v.date_from) + field("date_to", "إلى تاريخ", { type: "date" }, e, v.date_to) + "</div>" +
      select("perm_period", "وقت الاستئذان", PERIODS, e, v.perm_period, true) +
      '<div class="row">' + field("time_from", "من الساعة", { type: "time" }, e, v.time_from) + field("time_to", "إلى الساعة", { type: "time" }, e, v.time_to) + "</div>" +
      field("meet_with", "المقابلة مع", { maxlength: "60" }, e, v.meet_with) +
      field("medical_image", "صورة الطبية", { type: "file", accept: "image/*" }, e) +
      field("notes", "ملاحظات", { type: "textarea", rows: "3" }, e, v.notes) +
      field("secret", "الرقم السري لسستم جابر", { type: "password", autocomplete: "off", required: "" }, e) +
      '<p class="sub">في النسخة التجريبية اكتب أي رقم (مثلاً 1234) — لا تكتب رقمك الحقيقي.</p>' +
      '<p><button class="p">إرسال الطلب</button></p></form>' +
      "<h2>طلباتي</h2>" + (items.length ? items.map(function (r) {
        return '<div class="card"><b>' + KINDS[r.kind] + "</b>" + (r.perm_period ? " (" + PERIODS[r.perm_period] + ")" : "") + " — " + esc(r.date_from) + (r.date_to ? " إلى " + esc(r.date_to) : "") +
          "<p>" + badge(r.status) + (r.reject_reason ? " — سبب الرفض: " + esc(r.reject_reason) : "") + (r.done_at ? ' — <span class="ok">تم عمل اللازم</span>' : "") + "</p>" +
          r.followups.map(function (f, i) { return '<p class="fu">متابعة ' + (i + 1) + ": " + esc(f.note) + " — " + esc(uname(f.by)) + "</p>"; }).join("") +
          (r.med ? '<p><a href="#" data-act="med" data-id="' + r.id + '">صورة الطبية</a></p>' : "") + "</div>";
      }).join("") : "<p>ما عندك طلبات بعد.</p>");
  }
  function toggleKind() {
    var k = document.getElementById("f_kind"); if (!k) return;
    var show = SHOW[k.value] || [];
    ["date_to", "perm_period", "time_from", "time_to", "meet_with", "medical_image"].forEach(function (n) {
      var el = document.querySelector('[data-fld="' + n + '"]'); if (el) el.hidden = show.indexOf(n) < 0;
    });
  }
  function doReq(form) {
    var d = formData(form), e = {}, u = me(), show = SHOW[d.kind];
    if (!show) e.kind = "اختر نوع الطلب";
    else ["date_to", "perm_period", "time_from", "time_to", "meet_with"].forEach(function (n) { if (show.indexOf(n) < 0) d[n] = ""; });
    var file = show && show.indexOf("medical_image") >= 0 ? form.medical_image.files[0] : null;
    if (!d.date_from) e.date_from = "هذا الحقل مطلوب";
    if (!d.secret) e.secret = "هذا الحقل مطلوب";
    if (d.kind === "perm" && !d.perm_period) e.perm_period = "اختر: بداية الدوام أو أثناء الدوام أو نهاية الدوام";
    if (d.kind === "med" && !file) e.medical_image = "ارفق صورة الطبية";
    if (file && !/^image\//.test(file.type)) e.medical_image = "الملف لازم يكون صورة";
    if (d.time_from && d.time_to && d.time_to <= d.time_from) e.time_to = "وقت النهاية لازم يكون بعد البداية";
    if (d.date_to && d.date_from && d.date_to < d.date_from) e.date_to = "تاريخ النهاية قبل البداية";
    if (Object.keys(e).length) { delete d.secret; myState = { errs: e, val: d }; return render(); }
    (file ? shrink(file) : Promise.resolve("")).then(function (img) {
      var D = load(), df = parseDate(d.date_from);
      var r = { id: D.seq.r++, user_id: u.id, kind: d.kind, date_from: d.date_from, date_to: d.date_to, time_from: d.time_from, time_to: d.time_to,
        meet_with: d.meet_with, perm_period: d.perm_period, notes: d.notes, med: img, secret: "", status: "p", decided_by: null, decided_at: null,
        reject_reason: "", auto_rejected: false, done_by: null, done_at: null, followups: [], created: new Date().toISOString() };
      if (r.kind === "perm" && used(u.id, df.getFullYear(), df.getMonth()) >= LIMIT) {
        r.status = "r"; r.auto_rejected = true; r.decided_at = r.created;
        r.reject_reason = "تجاوزت الحد الشهري (" + LIMIT + " استئذانات)";
        D.reqs.push(r); save(); flash("err", r.reject_reason + " - تم رفض الطلب تلقائياً"); return render();
      }
      r.secret = d.secret;
      D.reqs.push(r);
      if (save()) flash("ok", "تم إرسال الطلب"); else D.reqs.pop();
      render();
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

  /* ---------- قوائم المراجعة والتنفيذ ---------- */
  function byCreated(a, b) { return a.created < b.created ? 1 : -1; }
  function badge(s) { return '<span class="b ' + s + '">' + STATUS[s] + "</span>"; }
  function filterBar(path, q, f, filters) {
    return '<form class="flt" data-f="filter" data-path="' + path + '"><input name="q" value="' + esc(q) + '" placeholder="ابحث بالاسم"><select name="f">' +
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
  function viewReview(q, u) {
    var f = q.f || "p", s = (q.q || "").trim(), all = load().reqs;
    var cnt = function (st) { return all.filter(function (r) { return r.status === st; }).length; };
    var items = all.filter(function (r) { return f === "all" || r.status === f; });
    items = byName(items, s).sort(byCreated);
    return hello(u, [[cnt("p"), "قيد المراجعة", "#/review?f=p", f === "p"], [cnt("a"), "موافق", "#/review?f=a", f === "a"], [cnt("r"), "مرفوض", "#/review?f=r", f === "r"]]) +
      filterBar("review", s, f, [["p", "قيد المراجعة"], ["a", "موافق"], ["r", "مرفوض"], ["all", "الكل"]]) + cards(items, "review");
  }
  function viewQueue(q, u) {
    var f = q.f || "all", s = (q.q || "").trim();
    // الإداري ما يشوف إلا اللي قرر عليه رئيس القسم/الضابط
    var base = load().reqs.filter(function (r) { return r.status !== "p" && !r.auto_rejected; });
    var nNew = base.filter(function (r) { return !r.done_at && !r.followups.length; }).length,
        nFu = base.filter(function (r) { return !r.done_at && r.followups.length; }).length,
        nDone = base.filter(function (r) { return r.done_at; }).length;
    var items = base.filter(function (r) {
      if (f === "n") return !r.done_at && !r.followups.length;
      if (f === "f") return !r.done_at && r.followups.length;
      if (f === "d") return !!r.done_at;
      if (f === "r") return r.status === "r";
      return true;
    });
    items = byName(items, s).sort(byCreated);
    return hello(u, [[nNew, "جديد بانتظار الإجراء", "#/queue?f=n", f === "n"], [nFu, "يرجى المتابعة", "#/queue?f=f", f === "f"], [nDone, "تم عمل اللازم", "#/queue?f=d", f === "d"]]) +
      filterBar("queue", s, f, [["all", "الكل"], ["n", "جديد بانتظار الإجراء"], ["f", "يرجى المتابعة"], ["d", "تم عمل اللازم"], ["r", "مرفوض"]]) + cards(items, "queue");
  }
  function cards(items, mode) {
    if (!items.length) return "<p>لا توجد طلبات.</p>";
    return items.map(function (r) {
      var u = userById(r.user_id) || {}, st = pill(r, mode);
      var h = '<div class="card"><div class="ch"><h3>' + esc(u.full_name) + " — " + KINDS[r.kind] + '</h3><span class="pill ' + st[0] + '">' + st[1] + "</span></div>";
      h += '<p class="sub">' + esc(u.job_title) + " — هاتف: " + esc(u.phone) + (mode === "queue" ? " — مدني: " + esc(u.civil_id) : "") + "</p>";
      h += "<p>" + (r.perm_period ? PERIODS[r.perm_period] + " — " : "") + esc(r.date_from) + (r.date_to ? " إلى " + esc(r.date_to) : "") +
        (r.time_from ? " من " + esc(r.time_from) + (r.time_to ? " إلى " + esc(r.time_to) : "") : "") + (r.meet_with ? " — المقابلة مع: " + esc(r.meet_with) : "") + "</p>";
      if (r.notes) h += "<p>" + esc(r.notes) + "</p>";
      if (r.med) h += '<p><a href="#" data-act="med" data-id="' + r.id + '">صورة الطبية</a></p>';
      h += "<p>" + badge(r.status) + (r.decided_by ? " (" + esc(uname(r.decided_by)) + ")" : "") + (r.reject_reason ? " — السبب: " + esc(r.reject_reason) : "") + "</p>";
      h += r.followups.map(function (x, i) { return '<p class="fu">متابعة ' + (i + 1) + ": " + esc(x.note) + " — " + esc(uname(x.by)) + " — " + ymdhm(x.at) + "</p>"; }).join("");
      if (r.done_at) h += '<p class="ok">✔ تم عمل اللازم بواسطة ' + esc(uname(r.done_by)) + " — " + ymdhm(r.done_at) + "</p>";
      if (mode === "review" && r.status === "p") {
        h += '<form class="acts" data-f="decide" data-id="' + r.id + '"><input name="reason" placeholder="سبب الرفض (إجباري عند الرفض)"><button class="g" name="do" value="a">موافقة</button><button class="r" name="do" value="r">رفض</button></form>';
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
    if (mode === "queue") {
      if (r.status === "r") return ["r", "مرفوض"];
      if (r.done_at) return ["g", "تم عمل اللازم"];
      if (r.followups.length) return ["f", "يرجى المتابعة"];
      return ["y", "جديد"];
    }
    return [{ p: "y", a: "g", r: "r" }[r.status], STATUS[r.status]];
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
  function doDecide(form, submitter) {
    var r = reqById(+form.dataset.id), why = form.reason.value.trim(), act = submitter && submitter.value;
    if (!r || r.status !== "p") return render();
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

  /* ---------- الإحصائيات ---------- */
  function viewStats(q, u) {
    var PER = { week: "أسبوع (آخر 7 أيام)", month: "شهر (من أول الشهر)", "3m": "3 شهور", "6m": "6 شهور", year: "سنة كاملة (يناير - ديسمبر)" };
    var p = PER[q.p] ? q.p : "month", s = (q.q || "").trim(), now = new Date(), since, until, end;
    if (p === "week") { since = new Date(now - 7 * 864e5); until = new Date(+now + 6e4); end = now; }
    else {
      var back = { month: 0, "3m": 2, "6m": 5, year: now.getMonth() }[p];
      since = new Date(now.getFullYear(), now.getMonth() - back, 1);
      until = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      if (p === "year") until = new Date(since.getFullYear() + 1, 0, 1);
      end = addDays(until, -1);
    }
    var qs = byName(load().reqs.filter(function (r) { var c = new Date(r.created); return c >= since && c < until; }), s);
    var kinds = {}, tot = { all: 0, p: 0, a: 0, r: 0 }, emp = {}, lv = { leave: [0, 0], emer: [0, 0], med: [0, 0] };
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
    return '<form class="flt noprint" data-f="filter" data-path="stats"><input name="q" value="' + esc(s) + '" placeholder="ابحث باسم الموظف"><select name="p">' +
      Object.keys(PER).map(function (k) { return '<option value="' + k + '"' + (k === p ? " selected" : "") + ">" + PER[k] + "</option>"; }).join("") + "</select><button>عرض</button></form>" +
      '<p class="noprint"><button class="p" type="button" data-act="print">تصدير PDF</button> <small class="sub">(من نافذة الطباعة اختر «حفظ بصيغة PDF»)</small></p>' +
      '<div class="lh"><div class="r"><b>الإدارة العامة لخفر السواحل</b><span>قسم الكهرباء والإلكترونيات</span></div><div class="c"><img src="logo.png" alt=""></div><div class="l"><span>تاريخ الإصدار</span><b>' + ymd(now) + "</b></div></div>" +
      '<div class="rt"><h1>تقرير إحصائية الطلبات الإدارية</h1><p>' + PER[p] + "</p></div>" +
      '<div class="tw"><table class="meta"><tr><th>الفترة</th><td>من ' + ymd(since) + " إلى " + ymd(end) + "</td><th>الموظف</th><td>" + esc(s || "جميع الموظفين") + "</td></tr>" +
      "<tr><th>أعدّه</th><td>" + esc(u.full_name || u.username) + " (" + ROLES[u.role] + ")</td><th>وقت الإصدار</th><td>" + nowS + "</td></tr></table></div>" +
      '<div class="kp"><div><b>' + tot.all + "</b>إجمالي الطلبات</div><div><b>" + tot.p + "</b>قيد المراجعة</div><div><b>" + tot.a + "</b>موافق</div><div><b>" + tot.r + "</b>مرفوض</div><div><b>" + ln + "</b>عدد الإجازات</div><div><b>" + ld + "</b>أيام الإجازات</div></div>" +
      '<h3 class="sh">1. الطلبات حسب النوع</h3><div class="tw"><table><thead><tr><th>النوع</th><th>العدد</th><th>النسبة</th></tr></thead><tbody>' + (kRows || '<tr><td colspan="3">لا توجد طلبات</td></tr>') + "</tbody></table></div>" +
      '<h3 class="sh">2. إحصائية الإجازات</h3><div class="tw"><table><thead><tr><th>نوع الإجازة</th><th>عدد الطلبات</th><th>عدد الأيام</th></tr></thead><tbody>' +
      Object.keys(lv).map(function (k) { return "<tr><td>" + KINDS[k] + "</td><td>" + lv[k][0] + "</td><td>" + lv[k][1] + "</td></tr>"; }).join("") +
      "</tbody><tfoot><tr><th>المجموع</th><th>" + ln + "</th><th>" + ld + "</th></tr></tfoot></table></div>" +
      '<h3 class="sh">3. تفصيل حسب الموظف</h3><div class="tw"><table><thead><tr><th>الموظف</th><th>الاستئذانات (الحد ' + LIMIT + "/شهر)</th><th>الإجازات</th><th>أيام الإجازات</th><th>المرفوض</th></tr></thead><tbody>" +
      (eRows || '<tr><td colspan="5">لا توجد بيانات</td></tr>') + "</tbody></table></div>" +
      '<div class="sig"><div><span>أعدّه</span><i></i><p>' + esc(u.full_name || u.username) + "</p></div><div><span>رئيس القسم</span><i></i><p>&nbsp;</p></div><div><span>الاعتماد</span><i></i><p>&nbsp;</p></div></div>" +
      '<div class="ft">تقرير آلي من نظام الطلبات الإدارية - قسم الكهرباء والإلكترونيات - للاستخدام الداخلي</div>';
  }

  /* ---------- الحسابات والصلاحيات (مدير النظام) ---------- */
  function viewUsers() {
    var D = load(), opts = { e: ROLES.e, h: ROLES.h, o: ROLES.o, a: ROLES.a };
    return "<h2>الحسابات والصلاحيات</h2>" +
      '<div class="tw"><table><thead><tr><th>المستخدم</th><th>الاسم</th><th>المسمى</th><th>الصلاحية</th></tr></thead><tbody>' +
      D.users.map(function (u) {
        var cell = u.role === "s" ? ROLES.s : '<select data-role="' + u.id + '">' + Object.keys(opts).map(function (k) { return '<option value="' + k + '"' + (k === u.role ? " selected" : "") + ">" + opts[k] + "</option>"; }).join("") + "</select>";
        return "<tr><td>" + esc(u.username) + "</td><td>" + esc(u.full_name) + "</td><td>" + esc(u.job_title) + "</td><td>" + cell + "</td></tr>";
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
    else if (kind === "decide") doDecide(f, ev.submitter);
    else if (kind === "qact") { if (ev.submitter && ev.submitter.value === "done") doDone(f); else doFollowup(f); }
    else if (kind === "filter") {
      var d = formData(f), qs = Object.keys(d).filter(function (k) { return d[k]; }).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(d[k]); }).join("&");
      go(f.dataset.path + (qs ? "?" + qs : ""));
    }
  });
  app.addEventListener("change", function (ev) {
    if (ev.target.id === "f_kind") toggleKind();
    var rid = ev.target.dataset && ev.target.dataset.role;
    if (rid) { var u = userById(+rid); if (u && u.role !== "s") { u.role = ev.target.value; save(); flash("ok", "تم تحديث صلاحية " + u.full_name); render(); } }
  });
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-act],[data-close]"); if (!b) return;
    if (b.hasAttribute("data-close")) return closeModal();
    var act = b.dataset.act;
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
    else if (act === "reveal") {
      var r = reqById(+b.dataset.id); if (!r || r.done_at) return;
      log("عرض الرقم السري", r.id); save();
      document.getElementById("s" + r.id).textContent = r.secret; b.remove();
    }
    else if (act === "med") {
      var q = reqById(+b.dataset.id), u2 = me(); if (!q || !q.med || !u2) return;
      if (u2.role === "e" && q.user_id !== u2.id) return;
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
