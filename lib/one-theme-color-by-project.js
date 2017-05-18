'use babel'
/* global atom */

import { CompositeDisposable } from 'atom'
import fs from 'fs-extra'
import path from 'path'

const inFile = (file, cb) =>
  fs.writeFileSync(file, cb(fs.readFileSync(file, 'utf-8')), 'utf-8')

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
  },

  getThemeName(hue, saturation, brightness) {
    return `one-theme-color-variation-${
       hue }-${ saturation }-${ brightness }-syntax`
  },

  createProjectTheme(hue, saturation, brightness) {
    const themeName = this.getThemeName(hue, saturation, brightness)
    const [packagesDir] = atom.packages.getPackageDirPaths().slice(-1)
    const oneDarkSyntax = atom.themes.getLoadedThemes().find(
      theme => theme.name === 'one-dark-syntax')
    const newThemePath = path.join(packagesDir, themeName)
    if (fs.existsSync(newThemePath)) {
      console.log('Theme already existing', newThemePath)
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
  },

  setSyntaxTheme(theme) {
    const [ui, syntax] = atom.config.get('core.themes')
    console.log('Changing core.themes config', syntax, theme, ui)
    atom.config.set('core.themes', [ui, theme])
  },

  activateTheme() {
    const hash = this.hashProject()
    const hue = (hash +
             atom.config.get('one-theme-color-by-project.baseHue')) % 360
    const saturation = atom.config.get('one-theme-color-by-project.saturation')
    const brightness = atom.config.get('one-theme-color-by-project.brightness')

    const projectThemeName = this.getThemeName(hue, saturation, brightness)
    const [currentSyntaxTheme] = atom.themes.getActiveThemeNames()
    this.originalTheme = currentSyntaxTheme
    if (currentSyntaxTheme === projectThemeName) {
      console.log('Theme is already active', projectThemeName)
      return
    }
    if (!~atom.themes.getLoadedThemeNames().indexOf(projectThemeName)) {
      console.log('Theme not loaded', projectThemeName)
      this.createProjectTheme(hue, saturation, brightness)
      console.log('Theme created', projectThemeName)
      atom.packages.loadPackage(projectThemeName)
      console.log('Theme enabled', projectThemeName)
    }
    this.setSyntaxTheme(projectThemeName)
    console.log('Theme activated', projectThemeName)
  },

  activate() {
    if (atom.themes.getActiveThemeNames().lenght) {
      console.log('There are active themes, go!.')
      this.activateTheme()
    } else {
      console.log('No active themes, waiting for activation.')
      const oneShotDisposable = atom.themes.onDidChangeActiveThemes(() => {
        console.log('Active themes finally available, go!')
        oneShotDisposable.dispose()
        this.activateTheme()
      })
    }


    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      atom.config.onDidChange('one-theme-color-by-project',
      this.activateTheme.bind(this)))
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
    this.subscriptions.dispose()
    this.originalTheme && this.setSyntaxTheme(this.originalTheme)
  },
}
