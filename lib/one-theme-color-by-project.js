'use babel'
/* global atom */

import { CompositeDisposable } from 'atom'
import fs from 'fs-extra'
import path from 'path'

const inFile = (file, cb) =>
  fs.writeFileSync(file, cb(fs.readFileSync(file, 'utf-8')), 'utf-8')

const themesPath = path.join(__dirname, '..', 'themes')

const log = (...args) => atom.config.get(
  'one-theme-color-by-project.debug') && console.log(...args)

export default {
  config: {
    saturation: {
      type: 'integer',
      default: 13,
      minimum: 0,
      maximum: 100,
    },
    brightness: {
      type: 'integer',
      default: 18,
      minimum: 0,
      maximum: 100,
    },
    baseHue: {
      type: 'integer',
      default: 1,
      minimum: 0,
      maximum: 359,
    },
    debug: {
      type: 'boolean',
      default: false,
      order: 0
    }
  },

  getThemeName() {
    const [hue, saturation, brightness] = this.getCurrentArgs()
    return `one-theme-color-variation-${
       hue }-${ saturation }-${ brightness }-syntax`
  },

  getCurrentArgs() {
    const hash = this.hashProject()
    const hue = (hash +
             atom.config.get('one-theme-color-by-project.baseHue')) % 360
    const saturation = atom.config.get('one-theme-color-by-project.saturation')
    const brightness = atom.config.get('one-theme-color-by-project.brightness')
    return [hue, saturation, brightness]
  },

  createThemeIfNotExist() {
    const [hue, saturation, brightness] = this.getCurrentArgs()
    const themeName = this.getThemeName()
    const oneDarkSyntax = atom.themes.getLoadedThemes().find(
      theme => theme.name === 'one-dark-syntax')
    const newThemePath = path.join(themesPath, themeName)
    if (fs.existsSync(newThemePath)) {
      log('Theme already existing', newThemePath)
      return
    }
    fs.copySync(oneDarkSyntax.path, newThemePath)
    inFile(path.join(newThemePath, 'package.json'), content =>
      content.replace(
        '"name": "one-dark-syntax"',
        `"name": "${ themeName }"`))
    inFile(path.join(newThemePath, 'styles', 'colors.less'), content =>
      content.replace(
        '@syntax-hue:          220;',
        `@syntax-hue:          ${ hue };`)
        .replace(
          '@syntax-saturation:   13%;',
          `@syntax-saturation:   ${ saturation }%;`)
        .replace(
          '@syntax-brightness:   18%;',
          `@syntax-brightness:   ${ brightness }%;`)
    )
    log('Theme created', newThemePath)
  },

  changeConfig() {
    this.debounce = null
    this.createThemeIfNotExist()
    atom.notifications.addInfo(
      `[one-theme-color] Activating theme. ${ this.getCurrentArgs() }`)
    atom.themes.activateThemes()
  },

  onConfigurationChange() {
    if (this.debounce) {
      clearTimeout(this.debounce)
    }
    this.debounce = setTimeout(this.changeConfig.bind(this), 500)
  },

  activate() {
    this.createThemeIfNotExist()
    this.getEnabledThemeNames = atom.themes.getEnabledThemeNames.bind(
      atom.themes)
    atom.themes.getEnabledThemeNames = this.getEnabledThemeNamesPatched.bind(
      this)
    atom.config.get(
      'one-theme-color-by-project.debug') && atom.notifications.addInfo(
      `[one-theme-color] Setting theme. ${ this.getCurrentArgs() }`)
    const oneShotDisposable = atom.packages.onDidActivateInitialPackages(() => {
      log('Refreshing')
      oneShotDisposable.dispose()
      atom.packages.reloadActivePackageStyleSheets()
    })

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      atom.config.onDidChange('one-theme-color-by-project',
      this.onConfigurationChange.bind(this)))
  },

  getEnabledThemeNamesPatched() {
    return this.getEnabledThemeNames().map(theme => {
      if (theme === 'one-dark-syntax') {
        return path.join(themesPath, this.getThemeName())
      }
      return theme
    })
  },

  hash(s) {
    /* http://stackoverflow.com/questions/7616461/\
     generate-a-hash-from-string-in-javascript-jquery
    */
    let hash = 0, i, chr, len
    if (s.length === 0) {
      return hash
    }
    for (i = 0, len = s.length; i < len; i++) {
      chr = s.charCodeAt(i)
      hash = (hash << 5) - hash + chr
      hash |= 0 // Convert to 32bit integer
    }
    return hash
  },

  hashProject() {
    return Math.abs(atom.project.getDirectories()
      .map(dir => dir.getPath())
      .map(path_ => this.hash(path_))
      .reduce((h, i) => h + i, 0))
  },

  deactivate() {
    atom.themes.getEnabledThemeNames = this.getEnabledThemeNames
    this.subscriptions.dispose()
    atom.themes.activateThemes()
  },
}
