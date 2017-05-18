'use babel'
/* global atom */

import { CompositeDisposable } from 'atom'
import fs from 'fs-extra'
import path from 'path'

const inFile = (file, cb) =>
  fs.writeFileSync(file, cb(fs.readFileSync(file, 'utf-8')), 'utf-8')

const themesPath = path.join(__dirname, '..', 'themes')

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
    console.log('Theme created', newThemePath)
  },

  onConfigurationChange() {
    this.createThemeIfNotExist()
    atom.themes.activateThemes()
  },

  activate() {
    this.createThemeIfNotExist()

    this.getImportPaths = atom.themes.getImportPaths.bind(atom.themes)
    atom.themes.getImportPaths = this.getImportPathsPatched.bind(this)

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      atom.config.onDidChange('one-theme-color-by-project',
      this.onConfigurationChange.bind(this)))
  },

  getImportPathsPatched() {
    return this.getImportPaths().map(theme => {
      if (~theme.indexOf('one-dark-syntax/styles')) {
        const rv = path.join(themesPath, this.getThemeName(), 'styles')
        console.log('Replacing', theme, 'by', rv)
        return rv
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
    atom.themes.getImportPaths = this.getImportPaths
    this.subscriptions.dispose()
    atom.themes.activateThemes()
  },
}
