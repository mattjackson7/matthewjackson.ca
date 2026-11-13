/* The site's icon set: thin line drawings in the same stroke as the figures,
   added to the page once as an SVG sprite. Use with
   <svg class="ico"><use href="#i-name"/></svg>; they take currentColor. */
(function () {
  var PATHS = {
    // projects
    payoff: '<path d="M3 20h18M3 4v16"/><path d="M5 17h7l7-9"/><circle cx="12" cy="17" r="1.2" fill="currentColor"/>',
    bell: '<path d="M2 20h20"/><path d="M3 19.5c3 0 4-1 5.5-5S11 4 12 4s2 6 3.5 10.5S18 19.5 21 19.5"/><path d="M4.5 19.5V17M6 19.5v-3" />',
    frontier: '<path d="M3 21V3M3 21h18"/><path d="M8 19c0-6 3-11 11-13"/><circle cx="13.2" cy="10.2" r="1.8" fill="currentColor"/><path d="M3 15l17-9" stroke-dasharray="2 2"/>',
    // roles
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/><path d="M22 9v6"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12h18"/><path d="M11 12v2h2v-2"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/><path d="M10 14l2-4 2 4"/>',
    board: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20l2-4M16 20l-2-4"/><path d="M6 12c1.5-4 3-4 4.5 0s3 4 4.5 0"/>',
    atom: '<circle cx="12" cy="12" r="1.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
    // skill groups
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    tools: '<path d="M14.5 6.5a4 4 0 0 0-5 5L3 18l3 3 6.5-6.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    sigma: '<path d="M18 5H6l6 7-6 7h12"/>',
    // results
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5A3.5 3.5 0 0 1 16.5 11"/><path d="M12 14v4M8 21h8M9.5 18h5v3h-5z"/>',
    medal: '<path d="M8 3l2.5 6M16 3l-2.5 6M6 3h4M14 3h4"/><circle cx="12" cy="15" r="6"/><path d="M12 12l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
    wave: '<circle cx="16.5" cy="6" r="2"/><path d="M4 11.5l5-3 3.5 2.5L9 13.5"/><path d="M2 16c2.5-2 4.5 2 7 0s4.5-2 7 0 4.5 2 6 0M2 20c2.5-2 4.5 2 7 0s4.5-2 7 0 4.5 2 6 0"/>',
    // small marks
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>'
  };
  // Tool and skill marks are single path strings, so the canvases can draw
  // the same shapes with Path2D (window.Icons.path(name)).
  function o(x, y, r) { return 'M' + (x - r) + ' ' + y + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0'; }
  var D = {
    // languages
    python: 'M12 3H9.5A3 3 0 0 0 6.5 6v2.5H12M6.5 8.5H5.5A2.5 2.5 0 0 0 3 11v2a3 3 0 0 0 3 3h1.5v-2.5a2 2 0 0 1 2-2h5a2 2 0 0 0 2-2V6a3 3 0 0 0-3-3H12' +
      'M12 21h2.5a3 3 0 0 0 3-3v-2.5H12M17.5 15.5h1a2.5 2.5 0 0 0 2.5-2.5v-2a3 3 0 0 0-3-3h-1.5v2.5a2 2 0 0 1-2 2h-5a2 2 0 0 0-2 2V18a3 3 0 0 0 3 3H12' + o(9.6, 5.6, 0.4) + o(14.4, 18.4, 0.4),
    sql: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    r: 'M18.5 8C17 6 14.2 4.8 11 4.8 6.6 4.8 3 7.4 3 10.8c0 2.6 2.1 4.8 5 5.7M10 20V9.5h5.5a2.6 2.6 0 0 1 0 5.2H10M14.5 14.7L18 20',
    vba: 'M4 4h16v16H4zM4 9h16M9 4v16M12.5 12l4.5 5.5M17 12l-4.5 5.5',
    js: 'M9 4H8a2 2 0 0 0-2 2v3.5L4.5 12 6 14.5V18a2 2 0 0 0 2 2h1M15 4h1a2 2 0 0 1 2 2v3.5l1.5 2.5-1.5 2.5V18a2 2 0 0 1-2 2h-1' + o(12, 12, 0.5),
    html: 'M3 5h18v14H3zM3 9h18M10 12l-2.2 2.2L10 16.4M14 12l2.2 2.2-2.2 2.2' + o(5.6, 7, 0.3) + o(7.6, 7, 0.3),
    shell: 'M3 5h18v14H3zM7 10l3 2.2L7 14.4M12.5 15h4.5',
    // libraries and tools
    numpy: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9M8 5.25l8 4.5',
    scipy: 'M13 4.5c-1.8-1-3.1 0-3.5 2.2L8 17.3c-.4 2.2-1.7 3.2-3.5 2.2M13.5 13c1.1-2.2 2.2-2.2 3.3 0s2.2 2.2 3.2 0',
    pandas: o(12, 13.5, 7) + o(6.2, 6.8, 2.2) + o(17.8, 6.8, 2.2) + 'M8.3 11.8c.6-1 2.2-1 2.2.4s-1.9 1.9-2.4 1c-.3-.5-.1-1 .2-1.4zM15.7 11.8c-.6-1-2.2-1-2.2.4s1.9 1.9 2.4 1c.3-.5.1-1-.2-1.4z' + o(12, 16.4, 0.5),
    pytorch: 'M12.5 3L7.1 8.4a7 7 0 1 0 9.9 0' + o(15.4, 6.1, 0.7),
    streamlit: 'M3 8.5c3-3 6 3 9 0s6-3 9 0M3 13.5c3-3 6 3 9 0s6-3 9 0M6 19h12',
    plotly: 'M4 3v17h17M7 16l4-5 3 3 5-7' + o(7, 16, 0.6) + o(11, 11, 0.6) + o(14, 14, 0.6) + o(19, 7, 0.6),
    powerbi: 'M4 20h16M6 20v-5h3v5M11 20V9.5h3V20M16 20V4h3v16',
    bloomberg: 'M3 4h18v12.5H3zM9 20.5h6M12 16.5v4M6 13l3.2-3.4 2.8 2 5.5-5.6M14.8 6h2.7v2.7',
    git: o(6, 5.5, 2.2) + o(6, 18.5, 2.2) + o(18, 8, 2.2) + 'M6 7.7v8.6M18 10.2c0 4.2-5.5 3.6-10.6 6.6',
    // methods and fields
    montecarlo: 'M3 12c3.5 0 4.5-6 9-6s5.5 2 9 .5M3 12c3.5 0 5 2.5 9 2.5s5-3 9-2.5M3 12c3.5 0 5.5 5.5 9 6.5s5.5.5 9 1.5M3 12c3 0 5-3 9-2.5s6 1.5 9 0',
    payoff: 'M3 20h18M3 4v16M5 16.5h7l7-9' + o(12, 16.5, 0.6),
    econ: 'M3 20L21 6' + o(5, 15, 0.6) + o(8, 17, 0.6) + o(10, 12, 0.6) + o(13, 13.5, 0.6) + o(15, 9, 0.6) + o(18, 10.5, 0.6) + o(19, 5.5, 0.6),
    bell: 'M2 20h20M3 19.5c3 0 4-1 5.5-5S11 4 12 4s2 6 3.5 10.5S18 19.5 21 19.5M4.5 19.5V18M6 19.5v-2.6',
    frontier: 'M3 21V3M3 21h18M7.5 19c0-6 3-11 11.5-13' + o(13, 9.8, 1.2) + 'M3 15l17-9',
    agent: 'M5 8h14v11H5zM12 8V5.2M2.5 12.5v3M21.5 12.5v3M9 16h6' + o(12, 4, 1.1) + o(9.2, 12.2, 0.6) + o(14.8, 12.2, 0.6),
    llm: 'M4 4.5h16v11.5H9.5L4 20.5zM8.5 10.2l2.5 2.5 4.6-4.9',
    sigma: 'M18 5H6l6 7-6 7h12',
    atom: 'M2 12a10 4 0 1 0 20 0a10 4 0 1 0-20 0M17 20.66a10 4 60 1 0-10-17.32a10 4 60 1 0 10 17.32M7 20.66a10 4 120 1 0 10-17.32a10 4 120 1 0-10 17.32' + o(12, 12, 0.6),
    teach: 'M3 4h18v12H3zM8 20l2-4M16 20l-2-4M6 12c1.5-4 3-4 4.5 0s3 4 4.5 0'
  };
  // which mark goes with which label, and the colour it is drawn in
  var TOOLS = {
    'Python': ['python', '#ffd166'], 'SQL': ['sql', '#7cc4ff'], 'R': ['r', '#8fa8ff'], 'VBA': ['vba', '#5fd3b0'],
    'Excel/VBA': ['vba', '#5fd3b0'], 'Excel / VBA': ['vba', '#5fd3b0'], 'JavaScript': ['js', '#ffe066'], 'HTML/CSS': ['html', '#ff8a5c'],
    'PowerShell': ['shell', '#6fb6ff'], 'NumPy': ['numpy', '#6fc3ff'], 'SciPy': ['scipy', '#8fa8ff'], 'NumPy / SciPy': ['numpy', '#6fc3ff'],
    'pandas': ['pandas', '#c39bff'], 'PyTorch': ['pytorch', '#ff6a55'], 'Streamlit': ['streamlit', '#ff6f7d'], 'Plotly': ['plotly', '#7cc4ff'],
    'Power BI': ['powerbi', '#ffb14e'], 'Bloomberg': ['bloomberg', '#ff9a3c'], 'Bloomberg Terminal': ['bloomberg', '#ff9a3c'], 'Git': ['git', '#ff7a59'],
    'Monte Carlo': ['montecarlo', '#ffb14e'], 'Derivatives': ['payoff', '#ff6a55'], 'Econometrics': ['econ', '#7cc4ff'],
    'Portfolio risk': ['bell', '#ffb14e'], 'Optimization': ['frontier', '#5fd3b0'], 'AI agents': ['agent', '#5fd3b0'],
    'LLM evaluation': ['llm', '#5fd3b0'], 'Mathematics': ['sigma', '#c39bff'], 'Physics': ['atom', '#ff6a55'],
    'Economics': ['econ', '#7cc4ff'], 'Teaching': ['teach', '#c39bff']
  };
  for (var d in D) PATHS[d] = PATHS[d] || '<path d="' + D[d] + '"/>';
  window.Icons = {
    path: function (name) { return D[name] ? new Path2D(D[name]) : null; },
    tool: function (label) { return TOOLS[label] || null; }
  };

  var NS = 'http://www.w3.org/2000/svg';
  var sprite = document.createElementNS(NS, 'svg');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  var html = '';
  for (var k in PATHS) {
    html += '<symbol id="i-' + k + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + PATHS[k] + '</symbol>';
  }
  sprite.innerHTML = html;
  document.body.insertBefore(sprite, document.body.firstChild);

  // give every chip that names a tool or field its mark
  var chips = document.querySelectorAll('.chips li');
  for (var i = 0; i < chips.length; i++) {
    var t = TOOLS[chips[i].textContent.trim()];
    if (!t) continue;
    chips[i].classList.add('has-ico');
    chips[i].insertAdjacentHTML('afterbegin', '<svg class="ico" aria-hidden="true" style="color:' + t[1] + '"><use href="#i-' + t[0] + '"/></svg>');
  }
})();
