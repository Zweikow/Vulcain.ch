(function () {
  try {
    var stored = localStorage.getItem('theme')
    var preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    var theme = stored || preferred
    var root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  } catch (e) {}
})()
