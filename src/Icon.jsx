const paths = {
  folder: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
  users: 'M16 20v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M17 4a4 4 0 0 1 0 7 M20 20v-2a4 4 0 0 0-3-3.87',
  owner: 'M15.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z M5 20v-1a7 6 0 0 1 14 0v1Z',
  star: 'm12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9Z',
  sort: 'M4 6h15 M4 12h10 M4 18h5',
  search: 'M16.5 10.5a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z m-1.5 4.5 5.5 5.5',
  chevronDown: 'm6 9 6 6 6-6', chevronLeft: 'm14 6-6 6 6 6', chevronRight: 'm9 6 6 6-6 6',
  arrowUpRight: 'M6 18 18 6 M6 6h12v12',
  chart: 'M4 3v17h17 M8 15v-4 M13 15V7 M18 15v-6',
  grid: 'M3 4h7v7H3z M14 4h7v7h-7z M3 15h7v6H3z M14 15h7v6h-7z',
  present: 'M3 4h18 M5 4v12h14V4 M12 16v5 M9 21l3-2 3 2',
  calendar: 'M4 6h16v15H4z M4 10h16 M8 3v5 M16 3v5',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  activity: 'M2 12h5l3-8 5 16 3-8h4',
}
export default function Icon({ name, size = 18, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>
}
