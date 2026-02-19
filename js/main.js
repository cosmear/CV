// Initialize GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
  // --- Hero Animations ---
  const heroTl = gsap.timeline();

  heroTl.to(".hero-anim", {
    y: 0,
    opacity: 1,
    duration: 1,
    stagger: 0.2,
    ease: "power3.out",
  });

  // --- Navbar Blur on Scroll ---
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("bg-black/80", "backdrop-blur-md", "shadow-lg");
      navbar.classList.remove("py-4");
      navbar.classList.add("py-2");
    } else {
      navbar.classList.remove("bg-black/80", "backdrop-blur-md", "shadow-lg");
      navbar.classList.remove("py-2");
      navbar.classList.add("py-4");
    }
  });

  // --- Scroll Reveal Animations (General) ---
  // Animates elements with .scroll-reveal class as they slide into view
  const revealElements = document.querySelectorAll(".scroll-reveal");
  revealElements.forEach((el) => {
    gsap.fromTo(
      el,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%", // Animation starts when top of element hits 85% of viewport height
          toggleActions: "play none none reverse",
        },
      },
    );
  });

  // --- Canvas Particle/Network Background for Hero ---
  initCanvasAnimation();
});

function initCanvasAnimation() {
  const canvas = document.getElementById("hero-bg");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let width, height;
  let particles = [];

  // Configuration
  const particleCount = 80;
  const connectionDistance = 150;
  const color = "rgba(0, 255, 204, 0.5)"; // Cyan

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.size = Math.random() * 2 + 1;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Bounce off edges
      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;
    }

    draw() {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function init() {
    resize();
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    animate();
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();

      // Draw connections
      for (let j = i; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connectionDistance) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0, 255, 204, ${1 - dist / connectionDistance})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", () => {
    resize();
    particles = []; // Reset particles on resize to prevent clustering
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
  });

  init();
}
