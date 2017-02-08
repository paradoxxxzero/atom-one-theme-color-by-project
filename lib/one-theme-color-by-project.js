'use babel';
import path from 'path'
import fs from 'fs'

export default {

  activate(state) {
    this.patch()
    atom.themes.activateThemes()
  },

  hash(s) {
    // http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
    let hash = 0, i, chr, len
    if (s.length === 0){
      return hash
    }
    for (i = 0, len = s.length; i < len; i++) {
      chr   = s.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  },

  hashProject() {
    return Math.abs(atom.project.getDirectories()
      .map(dir => dir.getPath())
      .map(path => this.hash(path))
      .reduce((h, i) => h + i, 0)) % 360
  },

  patch: function patch() {
    this.loadLessStylesheet = atom.themes.loadLessStylesheet.bind(atom.themes)
    atom.themes.loadLessStylesheet = this.loadLessStylesheetPatched.bind(this)
  },

  loadLessStylesheetPatched: function loadLessStylesheetPatched(
      lessStylesheetPath, importFallbackVariables) {
    let theme
    if (theme = [
      'one-dark-syntax',
      'one-dark-ui',
      'one-light-syntax',
      'one-light-ui'].find(theme => (
      !!~lessStylesheetPath.indexOf(path.join('node_modules', theme, 'index.less'))
    ))) {
      baseVarImports = "@import \"variables/ui-variables\";\n@import \"variables/syntax-variables\";"
      less = fs.readFileSync(lessStylesheetPath, 'utf8')
      let hue = this.hashProject()
      patch = `
        @syntax-hue: ${ hue };
      `
      if (!!~theme.indexOf('one-light')) {
        patch += `
          @syntax-saturation: 25%;
          @syntax-brightness: 90%;
        `
      }
      console.log(
        'Color index ', hue, 'for',
        atom.project.getDirectories().map(dir => dir.getPath()))
      return atom.themes.lessCache.cssForFile(
        lessStylesheetPath, [baseVarImports, less, patch].join('\n'))
    }
    return this.loadLessStylesheet(lessStylesheetPath, importFallbackVariables)
  },

  deactivate() {
    atom.themes.loadLessStylesheet = this.loadLessStylesheet
    atom.themes.activateThemes()
  },
};
