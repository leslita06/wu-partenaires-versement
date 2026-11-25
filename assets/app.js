(function () {
'use strict';
var D = window.D;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var NM = D.mois.length, NW = D.semaines.length;
var PART = {}; D.partenaires.forEach(function (p) { PART[p.id] = p; });
var PAYS = {}; D.pays.forEach(function (p) { PAYS[p.k] = p.l; });
var ENV = {}; D.envoi.forEach(function (p) { ENV[p.k] = p.l; });
var MODE = {}; D.modes.forEach(function (p) { MODE[p.k] = p.l; });
var TYPE = {}; D.types.forEach(function (p) { TYPE[p.k] = p.l; });
var MCOL = { compte: '#000000', mobile: '#FFDD00', especes: '#9a9a9a' };
var TYPEPL = { banque: 'Banques', mf: 'Microfinances', mobile: 'Portefeuilles mobiles' };

/* ---------- format ---------- */
function grp(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
function nInt(n) { return grp(Math.round(n)); }
function dec(x, k) { return x.toFixed(k).replace('.', ','); }
function fcfa(x) {
  var a = Math.abs(x);
  if (a >= 1e9) return dec(x / 1e9, a >= 1e11 ? 0 : 1) + ' Md';
  if (a >= 1e6) return dec(x / 1e6, a >= 1e8 ? 0 : 1) + ' M';
  return nInt(x);
}
function pct(x, k) { return dec(x * 100, k == null ? 1 : k) + ' %'; }
function delta(x) { if (!isFinite(x)) return ''; return (x > 0 ? '+' : x < 0 ? '−' : '') + dec(Math.abs(x) * 100, 1) + ' %'; }
function dur(m) {
  if (!isFinite(m)) return '–';
  if (m < 60) return dec(m, m < 10 ? 1 : 0) + ' min';
  var h = Math.floor(m / 60), r = Math.round(m - h * 60); if (r === 60) { h++; r = 0; }
  return h + ' h ' + (r < 10 ? '0' : '') + r;
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* ---------- state ---------- */
var S = { pays: '', type: '', per: 'm11', crit: 'fr', sort: 'amt', dir: -1, sel: { s: '', c: '' }, th: { fr: 3, vol: 10, dl: 30 }, done: {} };
var PERS = [
  { k: 'm11', l: D.mois[11].l.replace(/^./, function (c) { return c.toUpperCase(); }), a: 11, b: 11 },
  { k: 'm10', l: D.mois[10].l.replace(/^./, function (c) { return c.toUpperCase(); }), a: 10, b: 10 },
  { k: 'm9', l: D.mois[9].l.replace(/^./, function (c) { return c.toUpperCase(); }), a: 9, b: 9 },
  { k: 'q', l: '3 derniers mois (août à octobre)', a: 9, b: 11 },
  { k: 's', l: '6 derniers mois (mai à octobre)', a: 6, b: 11 },
  { k: 'y', l: '12 derniers mois', a: 0, b: 11 }
];
function per() { for (var i = 0; i < PERS.length; i++) if (PERS[i].k === S.per) return PERS[i]; return PERS[0]; }
function prevRange(p) { var L = p.b - p.a + 1; return p.a - L >= 0 ? { a: p.a - L, b: p.a - 1 } : null; }
function okP(pid) { var p = PART[pid]; return (!S.pays || p.pays === S.pays) && (!S.type || p.type === S.type); }
function scopeTxt() {
  var t = [];
  if (S.type) t.push(TYPEPL[S.type].toLowerCase());
  if (S.pays) t.push(PAYS[S.pays]);
  return t.length ? t.join(', ') : 'tous pays, tous partenaires';
}

/* ---------- aggregation ---------- */
function agg(a, b, f) {
  f = f || {};
  var r = { n: 0, amt: 0, fails: 0, dl: 0, nc: 0 };
  D.M.forEach(function (x) {
    if (x[0] < a || x[0] > b || !okP(x[1])) return;
    if (f.pid && x[1] !== f.pid) return;
    var c = PART[x[1]].pays;
    if (f.c && c !== f.c) return; if (f.s && x[2] !== f.s) return; if (f.mode && x[3] !== f.mode) return;
    r.n += x[4]; r.amt += x[5];
    if (x[3] !== 'especes') r.nc += x[4];
  });
  if (!f.s) D.Q.forEach(function (x) {
    if (x[0] < a || x[0] > b || !okP(x[1])) return;
    if (f.pid && x[1] !== f.pid) return;
    if (f.c && PART[x[1]].pays !== f.c) return; if (f.mode && x[2] !== f.mode) return;
    r.fails += x[3]; r.dl += x[4];
  });
  r.fr = r.n + r.fails ? r.fails / (r.n + r.fails) : 0;
  r.dlm = r.nc ? r.dl / r.nc : NaN;
  r.avg = r.n ? r.amt / r.n : 0;
  return r;
}
function by(a, b, key) { // key: 'pays' | 'mode' | 'pid' | 'send' | 'cs'
  var o = {};
  D.M.forEach(function (x) {
    if (x[0] < a || x[0] > b || !okP(x[1])) return;
    var k = key === 'pays' ? PART[x[1]].pays : key === 'mode' ? x[3] : key === 'pid' ? x[1] : key === 'send' ? x[2] : x[2] + '|' + PART[x[1]].pays;
    var r = o[k] || (o[k] = { n: 0, amt: 0, fails: 0, dl: 0, nc: 0 });
    r.n += x[4]; r.amt += x[5]; if (x[3] !== 'especes') r.nc += x[4];
  });
  if (key === 'pays' || key === 'mode' || key === 'pid') D.Q.forEach(function (x) {
    if (x[0] < a || x[0] > b || !okP(x[1])) return;
    var k = key === 'pays' ? PART[x[1]].pays : key === 'mode' ? x[2] : x[1];
    var r = o[k]; if (!r) return; r.fails += x[3]; r.dl += x[4];
  });
  Object.keys(o).forEach(function (k) { var r = o[k]; r.fr = r.n + r.fails ? r.fails / (r.n + r.fails) : 0; r.dlm = r.nc ? r.dl / r.nc : NaN; r.avg = r.n ? r.amt / r.n : 0; });
  return o;
}
function wk(pid, a, b) {
  var r = { n: 0, amt: 0, fails: 0, dl: 0, nc: 0 };
  D.W.forEach(function (x) { if (x[1] === pid && x[0] >= a && x[0] <= b) { r.n += x[2]; r.amt += x[3]; r.fails += x[4]; r.dl += x[5]; r.nc += x[6]; } });
  r.fr = r.n + r.fails ? r.fails / (r.n + r.fails) : 0; r.dlm = r.nc ? r.dl / r.nc : NaN; return r;
}

/* ---------- alertes ---------- */
function alerts(th, all) {
  var out = [];
  D.partenaires.forEach(function (p) {
    if (!all && !okP(p.id)) return;
    var l2 = wk(p.id, NW - 2, NW - 1), l4 = wk(p.id, NW - 4, NW - 1), p4 = wk(p.id, NW - 8, NW - 5), p8 = wk(p.id, NW - 10, NW - 3);
    var net = netFr(p.type);
    if (l2.fr * 100 > th.fr) out.push({ k: 'fr', p: p, v: l2.fr, hi: l2.fr * 100 > th.fr * 1.5, l2: l2, ref: net,
      titre: 'Taux d\'échec à ' + pct(l2.fr) + ' sur deux semaines',
      why: nInt(l2.fails) + ' versements en échec sur ' + nInt(l2.n + l2.fails) + ' tentatives, contre ' + pct(net) + ' en moyenne pour les ' + TYPEPL[p.type].toLowerCase() + ' du réseau.',
      act: 'Appel', actd: 'Appeler le responsable technique du partenaire sous 48 h et demander le détail des rejets : comptes ou numéros erronés, plafonds de portefeuille atteints, interruptions de service.' });
    var ev = p4.amt ? l4.amt / p4.amt - 1 : 0;
    if (-ev * 100 > th.vol) out.push({ k: 'vol', p: p, v: ev, hi: -ev * 100 > th.vol * 1.5,
      titre: 'Volume en baisse de ' + dec(-ev * 100, 1) + ' % sur quatre semaines',
      why: fcfa(l4.amt) + ' FCFA versés sur les 4 dernières semaines, contre ' + fcfa(p4.amt) + ' FCFA sur les 4 précédentes (' + nInt(l4.n) + ' transferts contre ' + nInt(p4.n) + ').',
      act: 'Revue', actd: 'Programmer une revue d\'activité avec le partenaire : disponibilité de la trésorerie de versement, points de service ouverts, offres concurrentes sur ses corridors.' });
    if (p.type !== 'x') {
      var dv = p8.dlm ? l2.dlm / p8.dlm - 1 : 0;
      if (dv * 100 > th.dl) out.push({ k: 'dl', p: p, v: dv, hi: dv * 100 > th.dl * 1.5,
        titre: 'Délai de crédit allongé de ' + dec(dv * 100, 0) + ' %',
        why: 'Délai moyen de ' + dur(l2.dlm) + ' sur les deux dernières semaines, contre ' + dur(p8.dlm) + ' sur les huit semaines d\'avant.',
        act: 'Rappel des engagements de service', actd: 'Adresser un rappel écrit du délai de crédit convenu et demander un plan de retour à la normale, daté, avec un point de suivi la semaine suivante.' });
    }
  });
  out.sort(function (a, b) { return (b.hi - a.hi) || (b.p.type === a.p.type ? 0 : 0); });
  return out;
}
var NETFR = {};
function netFr(t) {
  if (NETFR[t] != null) return NETFR[t];
  var n = 0, f = 0;
  D.W.forEach(function (x) { if (PART[x[1]].type === t && x[0] >= NW - 2) { n += x[2]; f += x[4]; } });
  return (NETFR[t] = f / (n + f));
}

/* ---------- charts (SVG) ---------- */
var tip = null;
function showTip(host, x, y, html) {
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; }
  host.appendChild(tip); tip.innerHTML = html; tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.style.display = 'block';
}
function hideTip() { if (tip) tip.style.display = 'none'; }
function niceMax(v) { if (v <= 0) return 1; var e = Math.pow(10, Math.floor(Math.log10(v))), m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e; }
function stackBars(el, labels, series, opt) {
  // series: [{k, col, vals[]}] ; opt: {hl:[a,b], fmt, h}
  var W = el.clientWidth || 600, mob = W < 520, H = opt.h || (mob ? 220 : 260), pl = mob ? 40 : 52, pb = 26, pt = 10;
  var n = labels.length, tot = labels.map(function (_, i) { return series.reduce(function (s, x) { return s + x.vals[i]; }, 0); });
  var mx = niceMax(Math.max.apply(null, tot)), bw = (W - pl) / n, g = '';
  for (var t = 0; t <= 4; t++) { var y = pt + (H - pt - pb) * (1 - t / 4); g += '<line x1="' + pl + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="#eee"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + opt.fmt(mx * t / 4) + '</text>'; }
  labels.forEach(function (lb, i) {
    var x = pl + i * bw + bw * .18, w = bw * .64, y0 = H - pb, hl = opt.hl && i >= opt.hl[0] && i <= opt.hl[1];
    if (opt.hl) g += hl ? '<rect x="' + (pl + i * bw + 1) + '" y="' + pt + '" width="' + (bw - 2) + '" height="' + (H - pt - pb) + '" fill="#fffbe0"/>' : '';
    series.forEach(function (s) { var h = (H - pt - pb) * s.vals[i] / mx; y0 -= h; g += '<rect x="' + x + '" y="' + y0 + '" width="' + w + '" height="' + Math.max(0, h) + '" fill="' + s.col + '" opacity="' + (opt.hl && !hl ? .55 : 1) + '"/>'; });
    if (!mob || (n - 1 - i) % 2 === 0) g += '<text x="' + (pl + i * bw + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + lb + '</text>';
    g += '<rect class="hit" data-i="' + i + '" x="' + (pl + i * bw) + '" y="' + pt + '" width="' + bw + '" height="' + (H - pt - pb) + '" fill="transparent"/>';
  });
  el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + g + '</svg>';
  $$('.hit', el).forEach(function (r) {
    var f = function () { var i = +r.getAttribute('data-i'); showTip(el, pl + i * bw + bw / 2, pt + 10, opt.tip(i, tot[i])); };
    r.addEventListener('mouseenter', f); r.addEventListener('click', f); r.addEventListener('mouseleave', hideTip);
  });
}
function lineBars(el, labels, bars, line, opt) {
  // bars: vals (FCFA) ; line: vals (rate) ; dual axes
  var W = el.clientWidth || 420, H = opt.h || 200, pl = 44, pr = 40, pb = 24, pt = 10, n = labels.length;
  var mx = niceMax(Math.max.apply(null, bars)), lm = niceMax(Math.max.apply(null, line.filter(isFinite)) * 1.15 || 1), bw = (W - pl - pr) / n, g = '', pts = [];
  for (var t = 0; t <= 4; t++) { var y = pt + (H - pt - pb) * (1 - t / 4); g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" stroke="#eee"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + opt.fb(mx * t / 4) + '</text><text x="' + (W - pr + 6) + '" y="' + (y + 4) + '">' + opt.fl(lm * t / 4) + '</text>'; }
  labels.forEach(function (lb, i) {
    var h = (H - pt - pb) * bars[i] / mx, x = pl + i * bw;
    g += '<rect x="' + (x + bw * .2) + '" y="' + (H - pb - h) + '" width="' + bw * .6 + '" height="' + h + '" fill="' + (opt.bc || '#000') + '"/>';
    if (bw >= 34 || (n - 1 - i) % 3 === 0) g += '<text x="' + (x + bw / 2) + '" y="' + (H - 7) + '" text-anchor="middle">' + lb + '</text>';
    if (isFinite(line[i])) pts.push([x + bw / 2, pt + (H - pt - pb) * (1 - line[i] / lm)]);
  });
  g += '<polyline fill="none" stroke="' + (opt.lc || '#e0a800') + '" stroke-width="2.5" points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '"/>';
  pts.forEach(function (p) { g += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="#fff" stroke="' + (opt.lc || '#e0a800') + '" stroke-width="2"/>'; });
  labels.forEach(function (_, i) { g += '<rect class="hit" data-i="' + i + '" x="' + (pl + i * bw) + '" y="' + pt + '" width="' + bw + '" height="' + (H - pt - pb) + '" fill="transparent"/>'; });
  el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + g + '</svg>' + (opt.leg ? '<div class="legend" style="margin-top:6px">' + opt.leg + '</div>' : '');
  $$('.hit', el).forEach(function (r) {
    var f = function () { var i = +r.getAttribute('data-i'); showTip(el, pl + i * bw + bw / 2, pt + 10, opt.tip(i)); };
    r.addEventListener('mouseenter', f); r.addEventListener('click', f); r.addEventListener('mouseleave', hideTip);
  });
}
function spark(vals) {
  var w = 84, h = 24, mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals), rg = mx - mn || 1;
  var pts = vals.map(function (v, i) { return (i * w / (vals.length - 1)).toFixed(1) + ',' + (2 + (h - 4) * (1 - (v - mn) / rg)).toFixed(1); });
  var up = vals[vals.length - 1] >= vals[0];
  return '<svg class="spark" width="' + w + '" height="' + h + '"><polyline fill="none" stroke="' + (up ? '#1f7a4d' : '#c0392b') + '" stroke-width="1.8" points="' + pts.join(' ') + '"/></svg>';
}

/* ---------- vues ---------- */
function rEnsemble() {
  var p = per(), pr = prevRange(p), cur = agg(p.a, p.b), prev = pr ? agg(pr.a, pr.b) : null;
  $('#t-ens').textContent = 'Vue d\'ensemble, ' + p.l.charAt(0).toLowerCase() + p.l.slice(1);
  $('#s-ens').textContent = fcfa(cur.amt) + ' FCFA versés en ' + nInt(cur.n) + ' transferts (' + scopeTxt() + ').' + (prev ? ' Comparaison avec la période précédente de même durée.' : '');
  function k(l, v, d, inv) { return '<div class="kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="d">' + (d == null ? '&nbsp;' : '<span class="' + ((inv ? -d : d) >= 0 ? 'up' : 'down') + '">' + delta(d) + '</span> vs période précédente') + '</div></div>'; }
  $('#k-ens').innerHTML =
    k('Volume versé', fcfa(cur.amt) + ' <small style="font-size:13px;font-weight:500">FCFA</small>', prev ? cur.amt / prev.amt - 1 : null) +
    k('Transferts versés', nInt(cur.n), prev ? cur.n / prev.n - 1 : null) +
    k('Montant moyen', nInt(cur.avg) + ' <small style="font-size:13px;font-weight:500">FCFA</small>', prev ? cur.avg / prev.avg - 1 : null) +
    '<div class="kpi"><div class="l">Taux d\'échec</div><div class="v">' + pct(cur.fr, 2) + '</div><div class="d">' + (prev ? (cur.fr > prev.fr ? '<span class="down">+' : '<span class="up">−') + dec(Math.abs(cur.fr - prev.fr) * 100, 2) + ' pt</span> vs période précédente' : '&nbsp;') + '</div></div>';
  // pays
  var bp = by(p.a, p.b, 'pays'), m = $('#sw-pays .on').getAttribute('data-m');
  var rows = D.pays.map(function (c) { return { k: c.k, l: c.l, r: bp[c.k] }; }).filter(function (x) { return x.r; }).sort(function (a, b) { return b.r[m] - a.r[m]; });
  var mx = Math.max.apply(null, rows.map(function (x) { return x.r[m]; })) || 1, tot = rows.reduce(function (s, x) { return s + x.r[m]; }, 0);
  $('#c-pays').innerHTML = rows.map(function (x) {
    return '<div class="hb' + (S.pays === x.k ? ' sel' : '') + '" data-c="' + x.k + '"><span>' + x.l + '</span><div class="tr"><div class="fl" style="width:' + (100 * x.r[m] / mx).toFixed(1) + '%"></div></div><span class="n">' + (m === 'amt' ? fcfa(x.r.amt) : nInt(x.r.n)) + '<small>' + dec(100 * x.r[m] / tot, 0) + ' %</small></span></div>';
  }).join('') || '<p class="muted">Aucun partenaire dans ce périmètre.</p>';
  $$('#c-pays .hb').forEach(function (h) { h.onclick = function () { var c = h.getAttribute('data-c'); S.pays = S.pays === c ? '' : c; $('#f-pays').value = S.pays; render(); }; });
  // modes
  var bm = by(p.a, p.b, 'mode'), tm = D.modes.reduce(function (s, x) { return s + (bm[x.k] ? bm[x.k].amt : 0); }, 0) || 1;
  $('#c-modes').innerHTML = D.modes.map(function (x) {
    var r = bm[x.k]; if (!r) return '';
    return '<div class="mode"><span class="t">' + x.l + '</span><span class="p">' + dec(100 * r.amt / tm, 0) + ' %</span><span class="s">' + fcfa(r.amt) + ' FCFA, ' + nInt(r.n) + ' transferts, moyenne ' + nInt(r.avg) + ' FCFA, échec ' + pct(r.fr, 2) + (x.k !== 'especes' ? ', crédit en ' + dur(r.dlm) : '') + '</span><div class="bar2"><i style="width:' + (100 * r.amt / tm).toFixed(1) + '%;background:' + MCOL[x.k] + '"></i></div></div>';
  }).join('') || '<p class="muted">Aucun versement dans ce périmètre.</p>';
  // mois
  var ser = D.modes.map(function (md) { return { k: md.k, col: MCOL[md.k], vals: D.mois.map(function (_, i) { return agg(i, i, { mode: md.k }).amt; }) }; }).filter(function (s) { return s.vals.some(function (v) { return v > 0; }); });
  $('#lg-mois').innerHTML = ser.map(function (s) { return '<span><i style="background:' + s.col + (s.k === 'mobile' ? ';outline:1px solid #e0c400' : '') + '"></i>' + MODE[s.k] + '</span>'; }).join('');
  stackBars($('#c-mois'), D.mois.map(function (x) { return x.c; }), ser, { hl: [p.a, p.b], fmt: function (v) { return v ? fcfa(v) : '0'; },
    tip: function (i, t) { return D.mois[i].l + ' : <b>' + fcfa(t) + ' FCFA</b>' + ser.map(function (s) { return '<br>' + MODE[s.k] + ' ' + fcfa(s.vals[i]); }).join(''); } });
}

function pRows() {
  var p = per(), pr = prevRange(p), bp = by(p.a, p.b, 'pid'), bq = pr ? by(pr.a, pr.b, 'pid') : {};
  return D.partenaires.filter(function (x) { return okP(x.id) && bp[x.id]; }).map(function (x) {
    var r = bp[x.id], q = bq[x.id];
    var six = []; for (var i = 6; i <= 11; i++) six.push(agg(i, i, { pid: x.id }).amt);
    return { p: x, amt: r.amt, n: r.n, fr: r.fr, dl: r.dlm, ev: q ? r.amt / q.amt - 1 : six[5] / six[0] - 1, six: six };
  });
}
function rPartenaires() {
  var p = per(), rows = pRows(), pr = prevRange(p);
  $('#t-par').textContent = 'Partenaires, ' + p.l.charAt(0).toLowerCase() + p.l.slice(1);
  $('#s-par').textContent = rows.length + ' partenaires de versement (' + scopeTxt() + '). Le délai de crédit ne concerne que les versements sur compte et sur portefeuille ; les espèces sont remises au guichet.';
  // classement : à type comparable, le délai n'a de sens qu'au sein d'un même type
  var c = S.crit, better = { fr: 1, dl: 1, ev: -1, amt: -1 }[c];
  var rk = rows.filter(function (r) { return isFinite(r[c]); });
  var note = { fr: 'Part des tentatives de versement en échec sur la période.', dl: 'Délai moyen entre la mise à disposition et le crédit du compte ou du portefeuille. Les portefeuilles mobiles créditent en minutes, les banques et microfinances en heures : le classement se lit au sein d\'un même type.', ev: pr ? 'Évolution du volume versé par rapport à la période précédente de même durée.' : 'Évolution du volume entre mai et octobre.', amt: 'Volume versé sur la période, en FCFA.' }[c];
  if (c === 'dl' && !S.type) { rk = rk.filter(function (r) { return r.p.type !== 'mobile'; }); note += ' Ici : banques et microfinances. Choisissez « Portefeuilles mobiles » dans le filtre pour classer ces derniers.'; }
  rk.sort(function (a, b) { return better * (a[c] - b[c]); });
  var f = function (r) { return c === 'fr' ? pct(r.fr, 2) : c === 'dl' ? dur(r.dl) : c === 'ev' ? delta(r.ev) : fcfa(r.amt) + ' FCFA'; };
  var li = function (r) { return '<li data-p="' + r.p.id + '"><span>' + esc(r.p.nom) + ' <span class="pt">' + PAYS[r.p.pays] + '</span></span><b>' + f(r) + '</b></li>'; };
  var k = Math.min(5, Math.floor(rk.length / 2));
  $('#rk-top').innerHTML = rk.slice(0, k).map(li).join('') || '<li><span class="muted">Pas assez de partenaires dans ce périmètre</span></li>';
  $('#rk-bot').innerHTML = rk.slice(rk.length - k).reverse().map(li).join('') || '<li><span class="muted">Pas assez de partenaires dans ce périmètre</span></li>';
  $('#rk-note').textContent = note;
  // tableau
  rows.sort(function (a, b) {
    var va = S.sort === 'nom' ? a.p.nom : a[S.sort], vb = S.sort === 'nom' ? b.p.nom : b[S.sort];
    if (S.sort === 'nom') return S.dir * va.localeCompare(vb, 'fr', { numeric: true });
    if (!isFinite(va)) return 1; if (!isFinite(vb)) return -1; return S.dir * (va - vb);
  });
  var AL = alerts(S.th), alp = {}; AL.forEach(function (a) { alp[a.p.id] = (alp[a.p.id] || 0) + 1; });
  var th = function (k, l, r) { return '<th data-s="' + k + '" class="' + (r ? 'r ' : '') + (S.sort === k ? 'sorted' : '') + '">' + l + (S.sort === k ? (S.dir > 0 ? ' ↑' : ' ↓') : '') + '</th>'; };
  $('#tb-par').innerHTML = '<thead><tr>' + th('nom', 'Partenaire') + th('amt', 'Volume (FCFA)', 1) + th('n', 'Transferts', 1) + th('fr', 'Taux d\'échec', 1) + th('dl', 'Délai de crédit', 1) + th('ev', pr ? 'Évolution' : 'Évolution mai-oct.', 1) + '<th>6 mois</th><th></th></tr></thead><tbody>' +
    rows.map(function (r) {
      return '<tr class="row" data-p="' + r.p.id + '"><td><div class="pn">' + esc(r.p.nom) + '</div><div class="pt">' + PAYS[r.p.pays] + ', ' + TYPE[r.p.type] + '</div></td><td class="r">' + fcfa(r.amt) + '</td><td class="r">' + nInt(r.n) + '</td><td class="r">' + pct(r.fr, 2) + '</td><td class="r">' + dur(r.dl) + '</td><td class="r ' + (r.ev >= 0 ? 'up' : 'down') + '">' + delta(r.ev) + '</td><td>' + spark(r.six) + '</td><td>' + (alp[r.p.id] ? '<span class="chip bad">' + alp[r.p.id] + ' alerte' + (alp[r.p.id] > 1 ? 's' : '') + '</span>' : '') + '</td></tr>';
    }).join('') + '</tbody>';
  $('#n-par').textContent = 'Touchez une ligne pour le détail';
  $$('#tb-par th[data-s]').forEach(function (h) { h.onclick = function () { var s = h.getAttribute('data-s'); if (S.sort === s) S.dir = -S.dir; else { S.sort = s; S.dir = s === 'nom' || s === 'fr' || s === 'dl' ? 1 : -1; } rPartenaires(); }; });
  $$('#tb-par tr.row, #rk-top li[data-p], #rk-bot li[data-p]').forEach(function (t) { t.onclick = function () { openP(t.getAttribute('data-p')); }; });
}

function openP(pid) {
  var p = PART[pid], six = [], fr = [], dl = [], lb = [];
  for (var i = 6; i <= 11; i++) { var r = agg(i, i, { pid: pid }); six.push(r.amt); fr.push(r.fr * 100); dl.push(r.dlm); lb.push(D.mois[i].c.split(' ')[0]); }
  var oct = agg(11, 11, { pid: pid }), bs = {};
  D.M.forEach(function (x) { if (x[0] === 11 && x[1] === pid) bs[x[2]] = (bs[x[2]] || 0) + x[5]; });
  var w = []; for (var j = NW - 8; j < NW; j++) w.push(wk(pid, j, j));
  var al = alerts(S.th, true).filter(function (a) { return a.p.id === pid; });
  $('#dr').innerHTML = '<p class="pt">' + PAYS[p.pays] + ', ' + TYPE[p.type] + '</p><h3>' + esc(p.nom) + '</h3>' +
    '<div class="dgrid"><div class="kpi"><div class="l">Volume, octobre</div><div class="v">' + fcfa(oct.amt) + '</div><div class="d">FCFA</div></div><div class="kpi"><div class="l">Transferts, octobre</div><div class="v">' + nInt(oct.n) + '</div><div class="d">moyenne ' + nInt(oct.avg) + ' FCFA</div></div>' +
    '<div class="kpi"><div class="l">Taux d\'échec, octobre</div><div class="v">' + pct(oct.fr, 2) + '</div></div><div class="kpi"><div class="l">Délai de crédit, octobre</div><div class="v">' + dur(oct.dlm) + '</div></div></div>' +
    (al.length ? '<p class="dsec">Alertes en cours</p>' + al.map(function (a) { return '<p style="margin:0 0 6px"><span class="chip ' + (a.hi ? 'bad' : 'warn') + '">' + a.act + '</span> ' + a.titre + '</p>'; }).join('') : '') +
    '<p class="dsec">Six derniers mois : volume et taux d\'échec</p><div id="dr-c1" class="chart"></div>' +
    '<p class="dsec">Huit dernières semaines</p><div class="tw"><table class="tbl"><thead><tr><th>Semaine</th><th class="r">Transferts</th><th class="r">Échec</th><th class="r">Crédit</th></tr></thead><tbody>' +
    w.map(function (r, i) { var s = D.semaines[NW - 8 + i]; return '<tr><td>' + s.d + ' au ' + s.f + '</td><td class="r">' + nInt(r.n) + '</td><td class="r">' + pct(r.fr, 2) + '</td><td class="r">' + dur(r.dlm) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
    '<p class="dsec">Volume d\'octobre par pays d\'envoi</p>' + D.envoi.map(function (e) { return bs[e.k] ? '<div class="hb" style="cursor:default"><span>' + e.l + '</span><div class="tr"><div class="fl" style="width:' + (100 * bs[e.k] / oct.amt).toFixed(1) + '%"></div></div><span class="n">' + fcfa(bs[e.k]) + '</span></div>' : ''; }).join('');
  $('#drawer').classList.add('on'); $('#scrim').classList.add('on'); $('#drawer').setAttribute('aria-hidden', 'false');
  setTimeout(function () {
    lineBars($('#dr-c1'), lb, six, fr, { h: 190, fb: function (v) { return v ? fcfa(v) : '0'; }, fl: function (v) { return dec(v, 1) + ' %'; },
      leg: '<span><i style="background:#000"></i>Volume (FCFA)</span><span><i style="background:#e0a800"></i>Taux d\'échec</span>',
      tip: function (i) { return lb[i] + ' : <b>' + fcfa(six[i]) + ' FCFA</b><br>échec ' + dec(fr[i], 2) + ' %' + (isFinite(dl[i]) ? '<br>crédit ' + dur(dl[i]) : ''); } });
  }, 30);
}
function closeP() { $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on'); $('#drawer').setAttribute('aria-hidden', 'true'); }

function rCorridors() {
  var p = per(), cs = by(p.a, p.b, 'cs');
  var cols = D.pays.filter(function (c) { return !S.pays || c.k === S.pays; });
  $('#t-cor').textContent = 'Corridors, ' + p.l.charAt(0).toLowerCase() + p.l.slice(1);
  $('#s-cor').textContent = 'Du pays d\'envoi au pays de réception (' + scopeTxt() + '). Montants versés en FCFA.';
  var mxv = 0; Object.keys(cs).forEach(function (k) { if (cs[k].amt > mxv) mxv = cs[k].amt; });
  var colT = {}, rowT = {};
  var h = '<thead><tr><th></th>' + cols.map(function (c) { return '<th>' + c.l + '</th>'; }).join('') + (cols.length > 1 ? '<th>Total</th>' : '') + '</tr></thead><tbody>';
  D.envoi.forEach(function (e) {
    h += '<tr><th>' + e.l + '</th>';
    cols.forEach(function (c) {
      var r = cs[e.k + '|' + c.k]; var v = r ? r.amt : 0; colT[c.k] = (colT[c.k] || 0) + v; rowT[e.k] = (rowT[e.k] || 0) + v;
      var a = mxv ? v / mxv : 0, bg = 'rgba(255,221,0,' + (0.08 + .92 * Math.pow(a, .7)).toFixed(2) + ')';
      h += '<td data-s="' + e.k + '" data-c="' + c.k + '" style="background:' + bg + '" class="' + (S.sel.s === e.k && S.sel.c === c.k ? 'sel' : '') + '">' + (v ? fcfa(v) : '–') + (r ? '<small>moy. ' + nInt(r.avg / 1000) + ' k</small>' : '') + '</td>';
    });
    if (cols.length > 1) h += '<td class="tot">' + fcfa(rowT[e.k]) + '</td>';
    h += '</tr>';
  });
  h += '<tr><th>Total</th>' + cols.map(function (c) { return '<td class="tot">' + fcfa(colT[c.k]) + '</td>'; }).join('') + (cols.length > 1 ? '<td class="tot">' + fcfa(Object.keys(rowT).reduce(function (s, k) { return s + rowT[k]; }, 0)) + '</td>' : '') + '</tr></tbody>';
  $('#mx').innerHTML = h;
  $$('#mx td[data-s]').forEach(function (td) { td.onclick = function () { var s = td.getAttribute('data-s'), c = td.getAttribute('data-c'); S.sel = (S.sel.s === s && S.sel.c === c) ? { s: '', c: '' } : { s: s, c: c }; rCorridors(); }; });
  // saisonnalité
  var sel = S.sel; if (sel.c && S.pays && sel.c !== S.pays) sel = S.sel = { s: '', c: '' };
  var f = { s: sel.s, c: sel.c || S.pays };
  var lab = (sel.s ? ENV[sel.s] : 'Tous pays d\'envoi') + ' vers ' + (f.c ? PAYS[f.c] : 'l\'ensemble des pays de réception');
  $('#t-saison').textContent = 'Saisonnalité : ' + lab;
  var ms = D.mois.map(function (_, i) { return agg(i, i, f); }), cur = agg(p.a, p.b, f);
  var avgM = ms.reduce(function (s, r) { return s + r.amt; }, 0) / NM;
  $('#k-cor').innerHTML = '<div class="kpi"><div class="l">Volume sur la période</div><div class="v">' + fcfa(cur.amt) + '</div></div><div class="kpi"><div class="l">Transferts</div><div class="v">' + nInt(cur.n) + '</div></div><div class="kpi"><div class="l">Montant moyen</div><div class="v">' + nInt(cur.avg) + '</div></div><div class="kpi"><div class="l">Moyenne mensuelle sur 12 mois</div><div class="v">' + fcfa(avgM) + '</div></div>';
  var lb = D.mois.map(function (x) { return x.c; });
  lineBars($('#c-saison'), lb, ms.map(function (r) { return r.amt; }), ms.map(function (r) { return r.avg / 1000; }), { h: 220, bc: '#111', lc: '#e0a800',
    fb: function (v) { return v ? fcfa(v) : '0'; }, fl: function (v) { return nInt(v) + ' k'; },
    leg: '<span><i style="background:#111"></i>Volume versé (FCFA)</span><span><i style="background:#e0a800"></i>Montant moyen (milliers de FCFA)</span>',
    tip: function (i) { return D.mois[i].l + ' : <b>' + fcfa(ms[i].amt) + ' FCFA</b><br>' + nInt(ms[i].n) + ' transferts, moyenne ' + nInt(ms[i].avg) + ' FCFA<br>' + delta(ms[i].amt / avgM - 1) + ' vs moyenne mensuelle'; } });
  var ss = [['Tabaski', 6, 'Mai 2026, fête le 27 mai'], ['Fin d\'année', 1, 'Décembre 2025'], ['Rentrée scolaire', 10, 'Septembre 2026']];
  $('#saisons').innerHTML = ss.map(function (s) { var r = ms[s[1]], d = r.amt / avgM - 1; return '<div class="ss"><b>' + s[0] + '</b><span class="v ' + (d >= 0 ? 'up' : 'down') + '">' + delta(d) + '</span><br>' + s[2] + ' : ' + fcfa(r.amt) + ' FCFA, contre ' + fcfa(avgM) + ' en moyenne mensuelle</div>'; }).join('');
}

function rAlertes() {
  $('#o-fr').textContent = dec(S.th.fr, 1) + ' %'; $('#o-vol').textContent = S.th.vol + ' %'; $('#o-dl').textContent = S.th.dl + ' %';
  var AL = alerts(S.th), s = D.semaines[NW - 1];
  $('#s-al').textContent = 'Semaine du ' + s.d + ' au ' + s.f + ' (' + scopeTxt() + '). ' + (AL.length ? AL.length + ' alerte' + (AL.length > 1 ? 's' : '') + ' aux seuils choisis. Chaque alerte propose l\'action à mener.' : 'Aucune alerte aux seuils choisis.');
  $('#al-list').innerHTML = AL.length ? AL.map(function (a) {
    var id = a.p.id + a.k, d = S.done[id];
    return '<div class="al' + (a.hi ? ' hi' : '') + '"><div><p class="pt" style="margin:0 0 2px">' + (a.hi ? '<span class="chip bad">Prioritaire</span> ' : '<span class="chip warn">À suivre</span> ') + PAYS[a.p.pays] + ', ' + TYPE[a.p.type] + '</p><h4><a href="javascript:void 0" data-p="' + a.p.id + '">' + esc(a.p.nom) + '</a> : ' + a.titre + '</h4><p class="why">' + a.why + '</p></div><div class="act"><b>Action proposée : ' + a.act + '</b>' + a.actd + '<br><button class="bt2' + (d ? ' done' : '') + '" data-id="' + id + '">' + (d ? 'Action lancée' : 'Lancer l\'action') + '</button></div></div>';
  }).join('') : '<div class="empty">Aucun partenaire ne dépasse les seuils choisis. Abaissez un seuil pour voir les partenaires les plus proches de la limite.</div>';
  $$('#al-list [data-p]').forEach(function (x) { x.onclick = function () { openP(x.getAttribute('data-p')); }; });
  $$('#al-list .bt2').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-id'); S.done[id] = !S.done[id]; rAlertes(); }; });
  var n = alerts(S.th).length; $('#nb-al').textContent = n || '';
}

/* ---------- accueil ---------- */
function rAccueil() {
  var AL = alerts({ fr: 3, vol: 10, dl: 30 }, true), seen = {}, vAl = 0;
  AL.forEach(function (a) { if (!seen[a.p.id]) { seen[a.p.id] = 1; vAl += agg(11, 11, { pid: a.p.id }).amt; } });
  var save = { pays: S.pays, type: S.type }; S.pays = ''; S.type = '';
  var tot = agg(11, 11);
  // échecs au-dessus de la moyenne de leur type, 4 dernières semaines
  var ex = 0, exAmt = 0;
  ['banque', 'mf', 'mobile'].forEach(function (t) {
    var n = 0, f = 0; D.W.forEach(function (x) { if (PART[x[1]].type === t && x[0] >= NW - 4) { n += x[2]; f += x[4]; } });
    var rt = f / (n + f);
    D.partenaires.filter(function (p) { return p.type === t; }).forEach(function (p) { var r = wk(p.id, NW - 4, NW - 1), e = r.fails - rt * (r.n + r.fails); if (e > 0) { ex += e; exAmt += e * r.amt / r.n; } });
  });
  // délai : écart de crédit entre portefeuilles et comptes bancaires
  var mob = agg(11, 11, { mode: 'mobile' }), cpt = agg(11, 11, { mode: 'compte' });
  S.pays = save.pays; S.type = save.type;
  var np = Object.keys(seen).length;
  $('#impacts').innerHTML = [
    { v: fcfa(vAl) + ' FCFA', l: 'de volume mensuel chez ' + np + ' partenaires signalés cette semaine', m: 'Somme des montants versés en octobre 2026 par les ' + np + ' partenaires qui déclenchent au moins une alerte dans la semaine du ' + D.semaines[NW - 1].d + ' au ' + D.semaines[NW - 1].f + ', aux seuils par défaut (échec au-dessus de 3 %, volume en baisse de plus de 10 % sur 4 semaines, délai de crédit allongé de plus de 30 %). Cela représente ' + dec(100 * vAl / tot.amt, 0) + ' % des ' + fcfa(tot.amt) + ' FCFA versés en octobre.' },
    { v: nInt(ex), l: 'versements en échec de trop sur quatre semaines, soit ' + fcfa(exAmt) + ' FCFA de versements retardés', m: 'Pour chaque partenaire, nombre d\'échecs des 4 dernières semaines au-delà de ce qu\'aurait donné le taux moyen de son type (banque, microfinance ou portefeuille mobile). Seuls les excédents sont additionnés. Le montant applique à ces échecs le montant moyen du partenaire sur la même période.' },
    { v: dur(cpt.dlm - mob.dlm), l: 'de crédit en plus sur compte bancaire que sur portefeuille mobile', m: 'Délai moyen de crédit d\'octobre 2026 pour les versements sur compte bancaire (' + dur(cpt.dlm) + ', ' + nInt(cpt.n) + ' transferts) moins celui des versements sur portefeuille mobile (' + dur(mob.dlm) + ', ' + nInt(mob.n) + ' transferts). Les remises en espèces au guichet ne sont pas comptées.' }
  ].map(function (x) { return '<div class="imp"><div class="v">' + x.v + '</div><div class="l">' + x.l + '</div><details><summary>Méthode de calcul</summary><p>' + x.m + '</p></details></div>'; }).join('');
  window.__IMP = { vAl: vAl, np: np, part: vAl / tot.amt, ex: ex, exAmt: exAmt, dlc: cpt.dlm, dlm: mob.dlm, tot: tot.amt, ntot: tot.n };
}

/* ---------- routage ---------- */
var VIEWS = ['ensemble', 'partenaires', 'corridors', 'alertes'];
function cur() { var h = (location.hash || '').slice(1); return h === 'accueil' || !h ? 'accueil' : VIEWS.indexOf(h) >= 0 ? h : 'accueil'; }
function render() {
  var v = cur(); closeP(); hideTip();
  $('#accueil').hidden = v !== 'accueil'; $('#app').hidden = v === 'accueil';
  if (v === 'accueil') { rAccueil(); return; }
  $$('.view').forEach(function (x) { x.classList.toggle('on', x.id === 'v-' + v); });
  $$('#tabs a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-v') === v); });
  $('#lab-per').hidden = v === 'alertes';
  ({ ensemble: rEnsemble, partenaires: rPartenaires, corridors: rCorridors, alertes: rAlertes })[v]();
  $('#nb-al').textContent = alerts(S.th).length || '';
}
function init() {
  $$('.asof').forEach(function (x) { x.textContent = D.asof; });
  $('#h-asof').textContent = '25 partenaires, 8 pays, données au ' + D.asof;
  $('#f-pays').innerHTML = '<option value="">Tous les pays</option>' + D.pays.map(function (p) { return '<option value="' + p.k + '">' + p.l + '</option>'; }).join('');
  $('#f-type').innerHTML = '<option value="">Tous les types</option>' + D.types.map(function (t) { return '<option value="' + t.k + '">' + TYPEPL[t.k] + '</option>'; }).join('');
  $('#f-per').innerHTML = PERS.map(function (p) { return '<option value="' + p.k + '">' + p.l + '</option>'; }).join('');
  $('#f-pays').onchange = function () { S.pays = this.value; render(); };
  $('#f-type').onchange = function () { S.type = this.value; render(); };
  $('#f-per').onchange = function () { S.per = this.value; render(); };
  $('#f-crit').onchange = function () { S.crit = this.value; rPartenaires(); };
  $$('#sw-pays button').forEach(function (b) { b.onclick = function () { $$('#sw-pays button').forEach(function (x) { x.classList.toggle('on', x === b); }); rEnsemble(); }; });
  [['th-fr', 'fr'], ['th-vol', 'vol'], ['th-dl', 'dl']].forEach(function (x) { var el = $('#' + x[0]); el.value = S.th[x[1]]; el.oninput = function () { S.th[x[1]] = +el.value; rAlertes(); }; });
  $('#scrim').onclick = closeP; $('#dr-x').onclick = closeP;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeP(); });
  document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.chart')) hideTip(); });
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (cur() !== 'accueil') render(); }, 200); });
  render();
}
window.__S = S; window.__alerts = alerts; window.__agg = agg;
init();
})();
