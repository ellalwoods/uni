/* The Ballroom: disco balls you unlock by reaching milestones. app.js decides when a milestone is reached;
 * this file only draws the balls. Each look is a function of a tile's column i, row j and diagonal d
 * (0 at the top left, 16 at the bottom right) that returns the tile's colour. */
(function () {
  const shade = (a, b, c) => (i, j, d) => d < 6 ? a : d < 12 ? b : c;
  const hash = (i, j) => (i * 73 + j * 151) % 17;
  const CAP = '<g><path d="M256 40 L430 96 L256 152 L82 96Z" fill="#1a1a1a"/><path d="M160 122 V170 Q256 210 352 170 V122 L256 152Z" fill="#2b2b2b"/><path d="M410 102 V170" stroke="#ffe800" stroke-width="10"/><circle cx="410" cy="178" r="14" fill="#ffe800"/></g>';
  const SPARK = '<path d="M424 60 Q430 96 466 102 Q430 108 424 144 Q418 108 382 102 Q418 96 424 60Z" fill="#ff48b0"/>';

  // In milestone order: the first is yours from the start.
  const LOOKS = [
    { id: 'classic', name: 'Classic', f: shade('#ffb3dc', '#ff48b0', '#d92f8f') },
    { id: 'rosegold', name: 'Rose Gold', f: (i, j, d) => hash(i, j) === 4 ? '#fff4ee' : shade('#f9d3c5', '#e8a58f', '#c27a66')(i, j, d) },
    { id: 'gold', name: 'Gold Rush', f: (i, j, d) => hash(i, j) === 3 ? '#fff6d6' : shade('#ffe9a3', '#f2c14e', '#c9921f')(i, j, d) },
    { id: 'risoblue', name: 'Riso Blue', f: shade('#8fc3e6', '#0078bf', '#005489') },
    { id: 'holo', name: 'Holographic', f: (i, j) => `hsl(${(i * 28 + j * 17) % 360} 85% 72%)` },
    { id: 'lilac', name: 'Lilac', f: shade('#dccdf5', '#a98ee0', '#765ba7') },
    { id: 'tangerine', name: 'Tangerine', f: (i, j, d) => hash(i, j) === 6 ? '#fff1d6' : shade('#ffc49e', '#ff8b3d', '#e2611e')(i, j, d) },
    { id: 'strawberry', name: 'Strawberry', f: (i, j, d) => hash(i, j) % 5 === 0 ? '#ffe58a' : shade('#ff8f9b', '#f15060', '#c0313f')(i, j, d) },
    { id: 'seafoam', name: 'Seafoam', f: shade('#c4f0e6', '#5fcdb8', '#00838a') },
    { id: 'midnight', name: 'Midnight', f: (i, j, d) => hash(i, j) < 2 ? '#ffffff' : shade('#5b72c4', '#3255a4', '#1d2f66')(i, j, d) },
    { id: 'glitter', name: 'Glitter Bomb', f: (i, j, d) => hash(i, j) % 3 === 0 ? '#ffffff' : shade('#ffc7e5', '#ff79c4', '#ff48b0')(i, j, d) },
    { id: 'mintchoc', name: 'Mint Choc', f: (i, j, d) => hash(i, j) % 6 === 1 ? '#5a3a2a' : shade('#c8f0dc', '#7ad3a8', '#3fae7b')(i, j, d) },
    { id: 'moon', name: 'Moonball', f: (i, j, d) => [[3, 3], [3, 4], [4, 3], [6, 5], [2, 6]].some(([a, b]) => a === i && b === j) ? '#9a978f' : shade('#ecebe6', '#cfccc4', '#aeaaa1')(i, j, d) },
    { id: 'sunset', name: 'Sunset', f: (i, j) => ['#ffe800', '#ffc23d', '#ff8b3d', '#ff6c2f', '#f15060', '#d94a8a', '#9a4fb0', '#765ba7', '#5a4a9a'][j] },
    { id: 'pixel', name: 'Pixel Party', f: (i, j) => ['#ff48b0', '#0078bf', '#00a95c', '#ff6c2f', '#ffe800'][(i + j * 2) % 5] },
    { id: 'candy', name: 'Candy Stripe', f: (i, j) => (i + j) % 3 === 0 ? '#ffffff' : (i + j) % 3 === 1 ? '#ff79c4' : '#ffb3dc' },
    { id: 'ice', name: 'Ice', f: (i, j, d) => hash(i, j) % 4 === 0 ? '#ffffff' : shade('#e6f6ff', '#b6e0f7', '#7cc1e6')(i, j, d) },
    { id: 'chequered', name: 'Chequered', f: (i, j) => (i + j) % 2 ? '#1a1a1a' : '#ff48b0' },
    { id: 'peacock', name: 'Peacock', f: (i, j, d) => ['#00838a', '#0078bf', '#00a95c', '#3255a4'][hash(i, j) % 4] },
    { id: 'galaxy', name: 'Galaxy', f: (i, j, d) => hash(i, j) === 0 ? '#ffe800' : hash(i, j) === 9 ? '#ff79c4' : hash(i, j) === 13 ? '#ffffff' : shade('#4a3f8f', '#2b2566', '#17133d')(i, j, d) },
    { id: 'inferno', name: 'Inferno', f: (i, j) => ['#ffe800', '#ffd23d', '#ffb02e', '#ff8b2e', '#ff6c2f', '#f15060', '#e23a4d', '#c42a3f', '#a01f33'][j] },
    { id: 'platinum', name: 'Platinum', f: (i, j, d) => hash(i, j) % 5 === 2 ? '#ffffff' : shade('#f2f2f2', '#d4d6db', '#a9adb5')(i, j, d) },
    { id: 'graduation', name: 'Graduation', f: shade('#ffb3dc', '#ff48b0', '#d92f8f'), extra: CAP },
  ];

  function ball(look, size, opts = {}) {
    const n = 9, r = 176, cx = 256, cy = 270, s = 2 * r / n, f = opts.locked ? () => '#e8e6e0' : look.f;
    let o = '';
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = cx - r + i * s, y = cy - r + j * s, dx = x + s / 2 - cx, dy = y + s / 2 - cy;
      if (dx * dx + dy * dy > (r * 1.03) ** 2) continue;
      o += `<rect x="${(x + 4).toFixed(1)}" y="${(y + 4).toFixed(1)}" width="${(s - 8).toFixed(1)}" height="${(s - 8).toFixed(1)}" rx="5" fill="${f(i, j, i + j)}"/>`;
    }
    const extra = opts.locked ? '' : (look.extra || '') + (opts.spark ? SPARK : '');
    return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" aria-hidden="true" focusable="false">${o}${extra}</svg>`;
  }
  window.BALLROOM = { LOOKS, ball, byId: id => LOOKS.find(l => l.id === id) || LOOKS[0] };
})();
