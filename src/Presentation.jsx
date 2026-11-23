import { useEffect, useMemo, useRef, useState } from 'react'
import { summarize } from './analytics-model.js'
import './analytics.css'

function getSlides(repositories) {
  const stats = summarize(repositories)
  const topRepo = stats.topRepos[0]
  const topClass = stats.topClasses[0]
  return [
    { title: 'Tracked repositories', value: repositories.length.toLocaleString() },
    { title: 'Total stars', value: stats.stars.toLocaleString() },
    { title: 'Unique contributors', value: stats.contributors.toLocaleString() },
    { title: 'Most starred repository', value: topRepo?.label ?? '—', detail: topRepo && count(topRepo.value, 'star'), long: true },
    { title: 'Largest class', value: topClass?.label ?? '—', detail: topClass && count(topClass.value, 'repository', 'repositories') },
  ]
}

function count(value, singular, plural = singular + 's') {
  return value.toLocaleString() + ' ' + (value === 1 ? singular : plural)
}

export default function Presentation({ repositories, onClose }) {
  const dialog = useRef(null)
  const touchStart = useRef(null)
  const slides = useMemo(() => getSlides(repositories), [repositories])
  const [index, setIndex] = useState(0)
  const slide = slides[index]

  useEffect(() => {
    const element = dialog.current
    const opener = document.activeElement
    const overflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = overflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  function move(direction) {
    setIndex(current => (current + direction + slides.length) % slides.length)
  }

  function handleKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      move(event.key === 'ArrowLeft' ? -1 : 1)
    }
  }

  function handleSwipe(event) {
    const start = touchStart.current
    const end = event.changedTouches[0]
    touchStart.current = null
    if (!start || !end) return
    const dx = end.clientX - start.clientX
    if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(end.clientY - start.clientY)) move(dx < 0 ? 1 : -1)
  }

  return (
    <dialog ref={dialog} className="stats-deck" aria-label="Repository statistics presentation"
      onCancel={event => { event.preventDefault(); onClose() }} onKeyDown={handleKey}>
      <header className="deck-top">
        <span>ESPRIT PI <i>/</i> Presentation</span>
        <button type="button" onClick={onClose} aria-label="Close presentation">Close <span aria-hidden="true">×</span></button>
      </header>
      <div className="deck-slide" aria-live="polite" aria-atomic="true"
        onTouchStart={event => { touchStart.current = event.touches.length === 1 ? event.touches[0] : null }}
        onTouchEnd={handleSwipe} onTouchCancel={() => { touchStart.current = null }}>
        <div className="deck-slide-inner">
          <h2>{slide.title}</h2>
          <p className={slide.long ? 'deck-long-value' : 'deck-value'}>{slide.value}</p>
          {slide.detail && <p className="deck-detail">{slide.detail}</p>}
        </div>
      </div>
      <footer className="deck-bottom">
        <nav className="deck-index" aria-label="Choose a slide">
          {slides.map((item, i) => <button type="button" key={item.title} aria-label={'Slide ' + (i + 1) + ': ' + item.title}
            aria-current={index === i ? 'step' : undefined} onClick={() => setIndex(i)} />)}
        </nav>
        <div className="deck-controls">
          <span>{String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
          <button type="button" aria-label="Previous slide" onClick={() => move(-1)}>←</button>
          <button type="button" aria-label="Next slide" onClick={() => move(1)}>→</button>
        </div>
      </footer>
    </dialog>
  )
}
