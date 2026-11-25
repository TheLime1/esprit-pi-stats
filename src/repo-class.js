// Names vary by course (PI, PIDEV, PIFullstackJS), separator and casing.
export function getClassName(name) {
  const tail = name.toUpperCase().replace(/^ESPRIT[-_]?PI/, '')
    .replace(/([1-5])[-_]?ERP[-_]BI[-_]?(\d{1,2})(?=[-_]|$)/g, '$1ERPBI$2')
    .replace(/([1-5][A-Z]+)[-_](\d{1,2})(?=[-_]|$)/g, '$1$2')
  const full = tail.match(/(?:^|[-_])([1-5][A-Z]+\d{0,2})(?=[-_]|$)/)
  if (full) return full[1]
  const track = tail.match(/(?:^|[-_])((?:SAE|DS|ERPBI|ALINFO|BI)\d{1,2})(?=[-_]|$)/)
  return track?.[1] ?? null
}
