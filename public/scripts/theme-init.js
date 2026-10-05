(function () {
  try {
    var stored = localStorage.getItem('theme')
    var preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    var theme = stored || preferred
    var root = document.documentElement
    var meta = document.getElementById('meta-color-scheme')
    var tc = document.getElementById('meta-theme-color')
    if (theme === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
      if (meta) meta.content = 'dark'
      if (tc) tc.content = '#0D1B2A'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
      if (meta) meta.content = 'light'
      if (tc) tc.content = '#F7F6F0'
    }
  } catch (e) {}
})()
