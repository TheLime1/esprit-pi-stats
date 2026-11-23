// Adapted from Aceternity UI's Bento Grid (Manu Arora).
// https://ui.aceternity.com/components/bento-grid
// The local stylesheet implements the layout and hover treatment without a runtime.
export function BentoGrid({ children, className = '' }) {
  return <div className={'bento-grid ' + className}>{children}</div>
}

export function BentoGridItem({ header, icon, title, description }) {
  return (
    <div className="bento-item">
      {header}
      <div className="bento-body">
        {icon}
        <div className="bento-title">{title}</div>
        <div className="bento-description">{description}</div>
      </div>
    </div>
  )
}
