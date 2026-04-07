/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    // Core colours — static utility names
    'text-bull','text-bear','text-warn','text-ts','text-tm','text-tp',
    'bg-bull','bg-bear','bg-warn','bg-ts',
    'bg-bull-d','bg-bear-d','bg-warn-d',
    'bg-bg-e','bg-bg-s','bg-bg-c','bg-bg-h',
    'border-bull','border-bear','border-warn','border-ts','border-bd',
    // Gradient direction classes
    'from-bull-d','from-bear-d','from-warn-d','from-bg-s',
    'via-bg-c','via-bull','via-bear','via-warn','via-ts',
    'to-bull-d','to-bear-d','to-warn-d','to-bg-s',
    // before: pseudo top-bar strips
    'before:bg-bull','before:bg-bear','before:bg-warn','before:bg-ts',
    // Opacity variants — bg
    'bg-bull/6','bg-bull/8','bg-bull/10','bg-bull/12','bg-bull/15','bg-bull/20','bg-bull/22','bg-bull/25',
    'bg-bear/6','bg-bear/8','bg-bear/10','bg-bear/12','bg-bear/15','bg-bear/20','bg-bear/22','bg-bear/25','bg-bear/35','bg-bear/38',
    'bg-warn/6','bg-warn/7','bg-warn/8','bg-warn/10','bg-warn/12','bg-warn/15','bg-warn/20','bg-warn/25',
    // Opacity variants — border
    'border-bull/20','border-bull/25','border-bull/30','border-bull/35','border-bull/40',
    'border-bear/20','border-bear/25','border-bear/30','border-bear/35','border-bear/40',
    'border-warn/20','border-warn/25','border-warn/30','border-warn/35','border-warn/40',
    // Opacity variants — text
    'text-bull/60','text-bull/70','text-bull/80',
    'text-bear/60','text-bear/70','text-bear/80',
    'text-warn/60','text-warn/70','text-warn/80',
    // hover: variants used in dynamic contexts
    'hover:bg-warn/80','hover:border-bull/30','hover:border-bear/30','hover:border-warn/30',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#07080f',
        'bg-s':  '#0d1220',
        'bg-c':  '#111827',
        'bg-h':  '#161f30',
        'bg-e':  '#1c2740',
        bd:      '#1e2d45',
        'bd-x':  '#141e2e',
        tp:      '#e2eaf5',
        ts:      '#6e80a0',
        tm:      '#3d4f68',
        bull:    '#05d09a',
        'bull-d':'#053d2c',
        bear:    '#ef4444',
        'bear-d':'#3d1010',
        warn:    '#f0b429',
        'warn-d':'#3d2a08',
      },
      fontFamily: {
        display:['"Bebas Neue"',   'sans-serif'],
        mono:   ['"IBM Plex Mono"','monospace' ],
        sans:   ['"DM Sans"',      'sans-serif'],
      },
      keyframes: {
        pulse2:    {'0%,100%':{opacity:1},'50%':{opacity:0.2}},
        fadeUp:    {from:{opacity:0,transform:'translateY(8px)'},to:{opacity:1,transform:'none'}},
        scan:      {'0%':{left:'-100%'},'100%':{left:'100%'}},
        dataFlash: {'0%':{backgroundColor:'rgba(240,180,41,.15)'},'100%':{backgroundColor:'transparent'}},
        spin:      {to:{transform:'rotate(360deg)'}},
      },
      animation: {
        pulse2:    'pulse2 2s ease-in-out infinite',
        pulseFast: 'pulse2 1.1s ease-in-out infinite',
        fadeUp:    'fadeUp 0.28s ease forwards',
        scan:      'scan 4s linear infinite',
        dataFlash: 'dataFlash 1.2s ease forwards',
        spin:      'spin 0.8s linear infinite',
      },
    },
  },
  plugins:[],
}
