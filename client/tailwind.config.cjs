module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        board:         '#FAF6E8',
        'paper-lost':  '#FBE89A',
        'paper-found': '#F2E6CC',
        'paper-note':  '#FFF8DC',
        ink:           '#1A1814',
        'ink-2':       '#5A5246',
        'ink-3':       '#8B826F',
        rule:          '#D9CFB6',
        accent:        '#C8331A',
        'accent-soft': '#FBE0D9',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tracked:        '0.16em',
        'tracked-tight':'0.08em',
      },
      boxShadow: {
        'flyer':       '4px 4px 0 #1A1814',
        'flyer-hover': '6px 6px 0 #1A1814',
        'stamp':       '3px 3px 0 #1A1814',
      },
    },
  },
  plugins: [],
}
