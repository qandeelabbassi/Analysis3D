'use strict'

class Menufy {
  constructor(structure) {
    this.structure = structure
    this.menu = null
    this.x = 0
    this.y = 0
    this.assetsFolder = './assets/'

    this.hideDefaultContextMenu = true
    this.checkClasses = true

    // Middleware functions
    this.moveTo = (x, y) => {
      this.menu.style.left = x + 'px'
      this.menu.style.top = y + 'px'
    }

    this.init = () => {
      this.buildDOM(this.structure)
    }

    if (document.readyState === 'complete') this.init()
    else window.addEventListener('load', this.init, false)
  }

  show(x, y) {
    if (this.hideDefaultContextMenu)
      document.oncontextmenu = () => false; // hides default right click menu
    this.moveTo(x, y)
    this.menu.style.display = 'block'
  }

  hide() {
    document.oncontextmenu = null;
    this.menu.style.display = 'none'
  }

  destroy() {
    document.oncontextmenu = null;
    this.menu.style.display = 'none'
    if (this.menu && this.menu.parentNode) {
      this.menu.parentNode.removeChild(this.menu);
    }
  }

  buildDOM(structure) {
    if (this.menu && this.menu.parentNode) {
      this.menu.parentNode.removeChild(this.menu);
    }
    this.menu = document.createElement('div')
    this.menu.style.visibility = 'none'
    this.menu.style.position = 'absolute'
    this.menu.style.zIndex = 100
    this.menu.classList.add('menufy-menu')

    structure.forEach((action, index) => {
      // Avoiding interpreting meta
      if (index == 0 && action['meta']) return

      let act = document.createElement('span')
      let icon = document.createElement('img')

      // Parsing propertie into DOM attribute
      for (let attr in action) {
        if (attr != 'action') act.setAttribute(attr, action[attr])
      }

      act.classList.add('menufy-action')
      act.style.display = 'table'
      if(action.icon) {
        icon.setAttribute('src', this.assetsFolder+action.icon);
        act.innerHTML = icon.outerHTML+action.label;
      } else {
        act.innerText = action.label
      }

      if (action.action) act.onclick = () => {
        setTimeout(() => action.action(), 10)
      }

      this.menu.appendChild(act)
    })

    document.getElementsByTagName('body')[0].appendChild(this.menu)
  }
}
