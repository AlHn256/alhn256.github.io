const panels = document.querySelectorAll('.panel')

function toggleOpen() {
  this.classList.toggle('open')
}

function toggleActive(e) {
  if (e.propertyName === 'flex-grow' || e.propertyName === 'flex') {
    this.classList.toggle('open-active')
  }
}

panels.forEach(panel => {
  panel.addEventListener('click', toggleOpen)
  panel.addEventListener('transitionend', toggleActive)
})