document.addEventListener("DOMContentLoaded", () => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  initNavigation(); initScrollSpy(); initAccordion(); initSignalLab(reduced);
  if (matchMedia("(hover: hover) and (pointer: fine)").matches && !reduced) initCursor();
  if (window.gsap && window.ScrollTrigger) initMotion(reduced);
});

function initNavigation() {
  const nav = document.querySelector(".nav"), toggle = document.querySelector(".nav__toggle"), links = document.querySelector(".nav__links");
  const update = () => nav.classList.toggle("is-scrolled", scrollY > 24);
  update(); addEventListener("scroll", update, { passive: true });
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", open); links.classList.toggle("is-open", open); document.body.classList.toggle("menu-open", open);
  });
  links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    toggle.setAttribute("aria-expanded", "false"); links.classList.remove("is-open"); document.body.classList.remove("menu-open");
  }));
}

// Marca dónde estás: la sección en el nav y la experiencia que estás leyendo.
// A propósito NO usa GSAP — antes el rol activo lo movía un ScrollTrigger dentro
// de initMotion(), así que con reduced-motion o con el CDN caído el resaltado
// quedaba clavado en el primero y no seguía el scroll.
function initScrollSpy() {
  const nav = document.querySelector(".nav");
  const links = [...document.querySelectorAll(".nav__links a[href^='#']")];
  const pares = links.map(a => [document.querySelector(a.getAttribute("href")), a]).filter(p => p[0]);
  const roles = [...document.querySelectorAll(".role")];
  if (!pares.length && !roles.length) return;
  let linkActual, rolActual, pendiente = false;

  // Sección activa: la que cruza la línea justo debajo de la barra fija.
  // Hero y Educación no tienen link, así que ahí no se ilumina nada.
  function elegirSeccion() {
    const linea = nav.getBoundingClientRect().height + 8;
    let encontrado = null;
    for (const [sec, link] of pares) {
      const r = sec.getBoundingClientRect();
      if (r.top <= linea && r.bottom > linea) encontrado = link;
    }
    if (encontrado === linkActual) return;
    linkActual = encontrado;
    links.forEach(a => {
      const on = a === encontrado;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    });
  }

  // Experiencia activa: la que tiene el título más cerca de la línea de lectura.
  // Se mide el <h3>, no la tarjeta: la tarjeta es mucho más alta que su contenido
  // (reserva el espacio del hover), así que su centro no dice dónde estás mirando.
  // Siempre queda exactamente una activa, nunca dos.
  function elegirRol() {
    const linea = innerHeight * 0.42;
    let mejor = null, mejorDist = Infinity;
    for (const rol of roles) {
      const t = (rol.querySelector("h3") || rol).getBoundingClientRect();
      if (t.bottom < 0 || t.top > innerHeight) continue;
      const d = Math.abs(t.top + t.height / 2 - linea);
      if (d < mejorDist) { mejorDist = d; mejor = rol; }
    }
    if (mejor === rolActual) return;
    rolActual = mejor;
    roles.forEach(r => r.classList.toggle("is-current", r === mejor));
  }

  function actualizar() { elegirSeccion(); elegirRol(); }
  function alScrollear() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; actualizar(); });
  }
  actualizar();
  addEventListener("scroll", alScrollear, { passive: true });
  addEventListener("resize", alScrollear, { passive: true });
}

function initCursor() {
  const ring = document.querySelector(".cursor"), dot = document.querySelector(".cursor-dot"), label = ring.querySelector(".cursor__label");
  const rx = gsap.quickTo(ring, "x", { duration: .45, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: .45, ease: "power3" });
  const dx = gsap.quickTo(dot, "x", { duration: .1, ease: "none" }), dy = gsap.quickTo(dot, "y", { duration: .1, ease: "none" });
  addEventListener("pointermove", e => { rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY); ring.style.opacity = dot.style.opacity = "1"; });
  document.addEventListener("mouseleave", () => ring.style.opacity = dot.style.opacity = "0");
  document.querySelectorAll("a,button,summary,[data-cursor]").forEach(el => {
    el.addEventListener("pointerenter", () => { ring.classList.add("is-active"); label.textContent = el.dataset.cursor || (el.tagName === "SUMMARY" ? "OPEN" : "GO"); });
    el.addEventListener("pointerleave", () => { ring.classList.remove("is-active"); label.textContent = ""; });
  });
}

function initAccordion() {
  const items = [...document.querySelectorAll(".skill-accordion details")];
  items.forEach(item => item.addEventListener("toggle", () => item.open && items.forEach(other => { if (other !== item) other.open = false; })));
}

function initMotion(reduced) {
  gsap.registerPlugin(ScrollTrigger); if (reduced) return;
  // El dimming de .role solo se activa si el motion realmente va a correr:
  // sin GSAP o con reduced-motion las experiencias quedan a opacidad plena.
  document.body.classList.add("motion-on");
  gsap.timeline({ defaults: { ease: "power4.out" } })
    .from(".hero__eyebrow", { y: 18, opacity: 0, duration: .7 })
    .from(".hero__line", { yPercent: 110, opacity: 0, duration: 1.15, stagger: .1 }, "-=.35")
    .from(".hero__media", { clipPath: "polygon(100% 0,100% 0,100% 100%,100% 100%,100% 72%,100% 50%)", duration: 1.35 }, "-=1")
    .from(".hero__footer > *", { y: 20, opacity: 0, duration: .7, stagger: .12 }, "-=.6");
  gsap.to(".hero__media img", { yPercent: 10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  document.querySelectorAll(".media-reveal img").forEach(img => gsap.fromTo(img, { scale: 1.1, opacity: .55 }, { scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top 92%", end: "center 55%", scrub: true } }));
  gsap.to(".experience__meter span", { width: "100%", ease: "none", scrollTrigger: { trigger: ".experience", start: "top 15%", end: "bottom 85%", scrub: true } });
  gsap.from(".education__route article", { y: 80, opacity: 0, stagger: .14, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".education__route", start: "top 78%" } });
  ScrollTrigger.matchMedia({ "(min-width: 781px)": () => {
    const section = document.querySelector(".projects"), track = document.querySelector(".projects__track"), progress = document.querySelector(".projects__progress span");
    const distance = () => Math.max(0, track.scrollWidth - innerWidth);
    const tween = gsap.to(track, { x: () => -distance(), ease: "none", scrollTrigger: { trigger: section, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true, onUpdate: s => gsap.set(progress, { width: `${s.progress * 100}%` }) } });
    return () => tween.kill();
  }});
}

function initSignalLab(reduced) {
  // Curva de dificultad: cada nivel suma un nodo, el reloj no perdona.
  const LEVELS = [{ nodes: 3, time: 5 }, { nodes: 4, time: 5 }, { nodes: 5, time: 5 }];
  const HOLD = 1500; // pausa entre niveles, para leer el cartel

  const lab = document.querySelector(".signal-lab"), canvas = document.getElementById("signal-canvas"), ctx = canvas.getContext("2d"), reset = document.getElementById("signal-reset");
  const scoreEl = document.getElementById("signal-score"), timeEl = document.getElementById("signal-time"), levelEl = document.getElementById("signal-level"), status = document.getElementById("signal-status");
  const keys = new Set(), player = { x: 0, y: 0, tx: 0, ty: 0, trail: [] };
  // phase: idle -> run -> (hold -> run)* -> won | lost
  let width = 0, height = 0, nodes = [], score = 0, level = 0, phase = "idle", started = 0, holdUntil = 0, last = performance.now();

  const pad2 = n => String(n).padStart(2, "0");
  const playing = () => phase === "run" || phase === "hold";

  function getLangText(key, fallback) {
    const lang = localStorage.getItem("lang") || "es";
    return (window.TRANSLATIONS && window.TRANSLATIONS[lang] && window.TRANSLATIONS[lang][key]) || fallback;
  }
  function say(key, fallback, vars, mood) {
    let txt = getLangText(key, fallback);
    for (const k in vars) txt = txt.split("{" + k + "}").join(vars[k]);
    status.textContent = txt;
    status.classList.toggle("is-win", mood === "win");
    status.classList.toggle("is-lose", mood === "lose");
    lab.classList.toggle("is-win", mood === "win");
    lab.classList.toggle("is-lose", mood === "lose");
  }

  // No spawnear encima de la sonda: sería un punto regalado.
  function spawn() {
    let n;
    for (let k = 0; k < 14; k++) {
      n = { x: 42 + Math.random() * Math.max(20, width - 84), y: 42 + Math.random() * Math.max(20, height - 84), phase: Math.random() * Math.PI * 2 };
      if (Math.hypot(n.x - player.x, n.y - player.y) > 90) break;
    }
    return n;
  }

  function hud(remaining) {
    levelEl.textContent = pad2(level + 1) + "/" + pad2(LEVELS.length);
    scoreEl.textContent = pad2(score) + "/" + pad2(LEVELS[level].nodes);
    timeEl.textContent = remaining.toFixed(1);
  }

  function beginLevel(i) {
    level = i; score = 0; player.trail = [];
    nodes = Array.from({ length: LEVELS[i].nodes }, spawn);
    started = performance.now(); phase = "run";
    say("signal_lab_level_start", "NIVEL {n} · {k} nodos en {t} segundos.", { n: i + 1, k: LEVELS[i].nodes, t: LEVELS[i].time }, "");
    hud(LEVELS[i].time);
  }
  // Perder siempre devuelve al nivel 1.
  function startGame() { beginLevel(0); canvas.focus({ preventScroll: true }); }

  function resize() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!player.x) { player.x = player.tx = width / 2; player.y = player.ty = height / 2; }
    if (!nodes.length && phase === "idle") { nodes = Array.from({ length: LEVELS[0].nodes }, spawn); hud(LEVELS[0].time); }
  }

  function aim(e) { const r = canvas.getBoundingClientRect(); player.tx = Math.max(15, Math.min(width - 15, e.clientX - r.left)); player.ty = Math.max(15, Math.min(height - 15, e.clientY - r.top)); }
  canvas.addEventListener("pointermove", aim);
  canvas.addEventListener("pointerdown", e => { if (!playing()) startGame(); aim(e); });
  reset.addEventListener("click", startGame);
  canvas.addEventListener("keydown", e => { if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) { e.preventDefault(); keys.add(e.key); if (!playing()) startGame(); } });
  canvas.addEventListener("keyup", e => keys.delete(e.key));
  addEventListener("resize", resize);

  function draw(now) {
    const dt = Math.min(32, now - last); last = now; ctx.clearRect(0, 0, width, height);
    // Con 5 segundos por nivel el teclado necesita ir más rápido para ser jugable.
    if (keys.has("ArrowLeft")) player.tx -= dt * .42; if (keys.has("ArrowRight")) player.tx += dt * .42; if (keys.has("ArrowUp")) player.ty -= dt * .42; if (keys.has("ArrowDown")) player.ty += dt * .42;
    player.tx = Math.max(15, Math.min(width - 15, player.tx)); player.ty = Math.max(15, Math.min(height - 15, player.ty)); player.x += (player.tx - player.x) * (reduced ? 1 : .13); player.y += (player.ty - player.y) * (reduced ? 1 : .13);
    ctx.fillStyle = "rgba(200,255,61,.16)"; for (let x=18;x<width;x+=32) for (let y=18;y<height;y+=32) ctx.fillRect(x,y,1,1);
    nodes.forEach(n => { const pulse = reduced ? 0 : Math.sin(now * .004 + n.phase) * 5; ctx.strokeStyle = "rgba(200,255,61,.34)"; ctx.lineWidth = 1; [18,28].forEach(r => { ctx.beginPath(); ctx.arc(n.x,n.y,r+pulse,0,Math.PI*2); ctx.stroke(); }); ctx.fillStyle="#c8ff3d"; ctx.shadowColor="#c8ff3d"; ctx.shadowBlur=18; ctx.beginPath(); ctx.arc(n.x,n.y,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; });
    if (!reduced) { player.trail.push({x:player.x,y:player.y}); if(player.trail.length>18) player.trail.shift(); ctx.beginPath(); player.trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.strokeStyle="rgba(255,90,54,.5)"; ctx.lineWidth=2; ctx.stroke(); }
    ctx.fillStyle="#ff5a36"; ctx.shadowColor="#ff5a36"; ctx.shadowBlur=22; ctx.beginPath(); ctx.arc(player.x,player.y,8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.strokeStyle="#ff5a36"; ctx.beginPath(); ctx.arc(player.x,player.y,17,0,Math.PI*2); ctx.stroke();

    if (phase === "run") {
      nodes = nodes.filter(n => { if (Math.hypot(n.x - player.x, n.y - player.y) >= 24) return true; score++; return false; });
      const remaining = Math.max(0, LEVELS[level].time - (now - started) / 1000);
      hud(remaining);
      if (!nodes.length) {
        if (level < LEVELS.length - 1) {
          phase = "hold"; holdUntil = now + HOLD;
          say("signal_lab_level_won", "¡NIVEL {n} SUPERADO! Ahí va el nivel {next}.", { n: level + 1, next: level + 2 }, "win");
        } else {
          phase = "won";
          say("signal_lab_won", "¡GANASTE! Los {total} niveles completados.", { total: LEVELS.length }, "win");
        }
      } else if (!remaining) {
        phase = "lost";
        say("signal_lab_lost", "PERDISTE. Se acabó el tiempo — volvés al nivel 1.", {}, "lose");
      }
    } else if (phase === "hold" && now >= holdUntil) {
      beginLevel(level + 1);
    }
    requestAnimationFrame(draw);
  }
  resize(); requestAnimationFrame(draw);
}
