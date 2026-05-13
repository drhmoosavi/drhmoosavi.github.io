// theme.js
const toggle = document.querySelector('.toggle');
const root   = document.documentElement;

// initialize
if (root.getAttribute('data-theme') === 'light') {
  toggle.classList.add('toggle-on');
} else {
  toggle.classList.remove('toggle-on');
}

// on click: flip theme & class
toggle.addEventListener('click', () => {
  const isDark = root.getAttribute('data-theme') === 'dark';
  if (isDark) {
    root.setAttribute('data-theme', 'light');
    toggle.classList.add('toggle-on');
  } else {
    root.setAttribute('data-theme', 'dark');
    toggle.classList.remove('toggle-on');
  }
});