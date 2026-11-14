// ── Algorithm tab switcher ────────────────────────────────────────
document.querySelectorAll('.algo-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const algo = tab.dataset.algo

    document.querySelectorAll('.algo-tab').forEach((t) => t.classList.remove('active'))
    document.querySelectorAll('.algo-panel').forEach((p) => p.classList.remove('active'))

    tab.classList.add('active')
    document.querySelector(`.algo-panel[data-algo="${algo}"]`).classList.add('active')
  })
})

// ── Copy install command ──────────────────────────────────────────
function copyInstall() {
  const cmd = document.getElementById('installCmd').textContent
  navigator.clipboard.writeText(cmd).then(() => {
    const btn = document.querySelector('.install-box__copy')
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
    setTimeout(() => {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
    }, 2000)
  })
}

// ── Smooth nav active state on scroll ────────────────────────────
const sections = document.querySelectorAll('section[id]')
const navLinks  = document.querySelectorAll('.nav__links a[href^="#"]')

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      navLinks.forEach((link) => {
        link.style.color = link.getAttribute('href') === `#${entry.target.id}`
          ? 'var(--color-text)'
          : ''
      })
    }
  })
}, { threshold: 0.4 })

sections.forEach((s) => observer.observe(s))
