document.addEventListener("DOMContentLoaded", () => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  initNavigation(); initAccordion(); initSignalLab(reduced);
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
  gsap.timeline({ defaults: { ease: "power4.out" } })
    .from(".hero__eyebrow", { y: 18, opacity: 0, duration: .7 })
    .from(".hero__line", { yPercent: 110, opacity: 0, duration: 1.15, stagger: .1 }, "-=.35")
    .from(".hero__media", { clipPath: "polygon(100% 0,100% 0,100% 100%,100% 100%,100% 72%,100% 50%)", duration: 1.35 }, "-=1")
    .from(".hero__footer > *", { y: 20, opacity: 0, duration: .7, stagger: .12 }, "-=.6");
  gsap.to(".hero__media img", { yPercent: 10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  document.querySelectorAll(".text-scrub span").forEach((line, i) => gsap.to(line, { color: "#eee9dc", ease: "none", scrollTrigger: { trigger: line, start: "top 78%", end: "top 48%", scrub: true } }));
  document.querySelectorAll(".media-reveal img").forEach(img => gsap.fromTo(img, { scale: 1.1, opacity: .55 }, { scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top 92%", end: "center 55%", scrub: true } }));
  document.querySelectorAll(".role").forEach(role => ScrollTrigger.create({ trigger: role, start: "top 62%", end: "bottom 38%", onToggle: ({ isActive }) => role.classList.toggle("is-current", isActive) }));
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
  const canvas = document.getElementById("signal-canvas"), ctx = canvas.getContext("2d"), reset = document.getElementById("signal-reset");
  const scoreEl = document.getElementById("signal-score"), timeEl = document.getElementById("signal-time"), status = document.getElementById("signal-status");
  const keys = new Set(), player = { x: 0, y: 0, tx: 0, ty: 0, trail: [] };
  let width = 0, height = 0, nodes = [], score = 0, active = false, started = 0, last = performance.now();
  const node = () => ({ x: 42 + Math.random() * Math.max(20, width - 84), y: 42 + Math.random() * Math.max(20, height - 84), phase: Math.random() * Math.PI * 2 });
  function resize() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!player.x) { player.x = player.tx = width / 2; player.y = player.ty = height / 2; } if (!nodes.length) nodes = Array.from({ length: 5 }, node);
  }
  function start() { score = 0; active = true; started = performance.now(); nodes = Array.from({ length: 5 }, node); player.trail = []; scoreEl.textContent = "00/05"; timeEl.textContent = "30"; status.textContent = "Señal activa. Recolectá los cinco nodos."; canvas.focus({ preventScroll: true }); }
  function end(won) { active = false; status.textContent = won ? "SEÑAL CAPTURADA. Sistema sincronizado." : "TIEMPO AGOTADO. Reiniciá el sistema."; }
  function aim(e) { const r = canvas.getBoundingClientRect(); player.tx = Math.max(15, Math.min(width - 15, e.clientX - r.left)); player.ty = Math.max(15, Math.min(height - 15, e.clientY - r.top)); }
  canvas.addEventListener("pointermove", aim); canvas.addEventListener("pointerdown", e => { if (!active) start(); aim(e); }); reset.addEventListener("click", start);
  canvas.addEventListener("keydown", e => { if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) { e.preventDefault(); keys.add(e.key); if (!active) start(); } });
  canvas.addEventListener("keyup", e => keys.delete(e.key)); addEventListener("resize", resize);
  function draw(now) {
    const dt = Math.min(32, now - last); last = now; ctx.clearRect(0, 0, width, height);
    if (keys.has("ArrowLeft")) player.tx -= dt * .28; if (keys.has("ArrowRight")) player.tx += dt * .28; if (keys.has("ArrowUp")) player.ty -= dt * .28; if (keys.has("ArrowDown")) player.ty += dt * .28;
    player.tx = Math.max(15, Math.min(width - 15, player.tx)); player.ty = Math.max(15, Math.min(height - 15, player.ty)); player.x += (player.tx - player.x) * (reduced ? 1 : .13); player.y += (player.ty - player.y) * (reduced ? 1 : .13);
    ctx.fillStyle = "rgba(200,255,61,.16)"; for (let x=18;x<width;x+=32) for (let y=18;y<height;y+=32) ctx.fillRect(x,y,1,1);
    nodes.forEach(n => { const pulse = reduced ? 0 : Math.sin(now * .004 + n.phase) * 5; ctx.strokeStyle = "rgba(200,255,61,.34)"; ctx.lineWidth = 1; [18,28].forEach(r => { ctx.beginPath(); ctx.arc(n.x,n.y,r+pulse,0,Math.PI*2); ctx.stroke(); }); ctx.fillStyle="#c8ff3d"; ctx.shadowColor="#c8ff3d"; ctx.shadowBlur=18; ctx.beginPath(); ctx.arc(n.x,n.y,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; });
    if (!reduced) { player.trail.push({x:player.x,y:player.y}); if(player.trail.length>18) player.trail.shift(); ctx.beginPath(); player.trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.strokeStyle="rgba(255,90,54,.5)"; ctx.lineWidth=2; ctx.stroke(); }
    ctx.fillStyle="#ff5a36"; ctx.shadowColor="#ff5a36"; ctx.shadowBlur=22; ctx.beginPath(); ctx.arc(player.x,player.y,8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.strokeStyle="#ff5a36"; ctx.beginPath(); ctx.arc(player.x,player.y,17,0,Math.PI*2); ctx.stroke();
    if(active){ nodes=nodes.filter(n=>{if(Math.hypot(n.x-player.x,n.y-player.y)>=24)return true;score++;scoreEl.textContent=`${String(score).padStart(2,"0")}/05`;return false}); const remaining=Math.max(0,30-Math.floor((now-started)/1000));timeEl.textContent=String(remaining).padStart(2,"0");if(score===5)end(true);else if(!remaining)end(false); }
    requestAnimationFrame(draw);
  }
  resize(); requestAnimationFrame(draw);
}
