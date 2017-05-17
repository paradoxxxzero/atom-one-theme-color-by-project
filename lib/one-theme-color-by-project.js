'use babel'
/* global atom */

import { CompositeDisposable } from 'atom'
import fs from 'fs'
import path from 'path'

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

  activate() {
    this.patch()
    this.reload()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      atom.config.onDidChange('one-theme-color-by-project', this.reload))
  },

  reload() {
    atom.themes.activateThemes()
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

  patch: function patch() {
    this.loadLessStylesheet = atom.themes.loadLessStylesheet.bind(atom.themes)
    atom.themes.loadLessStylesheet = this.loadLessStylesheetPatched.bind(this)
  },

  loadLessStylesheetPatched: function loadLessStylesheetPatched(
      lessStylesheetPath, importFallbackVariables) {
    const theme = [
      'one-dark-syntax',
      'one-dark-ui',
      'one-light-syntax',
      'one-light-ui'].find(theme_ => !!~lessStylesheetPath.indexOf(
        path.join('node_modules', theme_, 'index.less')))

    if (theme) {
      const baseVarImports = '@import "variables/ui-variables";\n' +
                             '@import "variables/syntax-variables";'
      const less = fs.readFileSync(lessStylesheetPath, 'utf8')
      const patch = `
        @syntax-hue: ${ (this.hashProject() +
          atom.config.get('one-theme-color-by-project.baseHue')) % 360 };
        @syntax-saturation: ${
          atom.config.get('one-theme-color-by-project.saturation') }%;
        @syntax-brightness: ${
          atom.config.get('one-theme-color-by-project.brightness') }%;
      `
      return atom.themes.lessCache.cssForFile(
        lessStylesheetPath, [baseVarImports, less, patch].join('\n'))
    }
    return this.loadLessStylesheet(lessStylesheetPath, importFallbackVariables)
  },

  deactivate() {
    this.subscriptions.dispose()
    atom.themes.loadLessStylesheet = this.loadLessStylesheet
    this.reload()
  },
}
