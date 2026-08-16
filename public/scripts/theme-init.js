(function () {
  try {
    var stored = localStorage.getItem('theme')
    var preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    var theme = stored || preferred
    if (theme === 'dark') document.documentElement.classList.add('dark')
  } catch (e) {}
})()
