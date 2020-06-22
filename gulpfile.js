const gulp = require('gulp');
const watchify = require('watchify');
const fancy_log = require('fancy-log');
const ts = require('gulp-typescript');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const tsify = require('tsify');
const _rimraf = require("rimraf")

const DIST = 'dist'
const tsProject = ts.createProject('tsconfig.json');

const rimraf = (dirname) => {
  return new Promise((resolve, reject) => {
      _rimraf(dirname, (err) => {
          if (err) reject(err);
          else resolve();
      });
  });
}

const clean = () => rimraf(DIST)

const tscNode = () => {
  return tsProject.src()
      .pipe(tsProject())
      .js.pipe(gulp.dest(DIST));
}

const watchedBrowserify = watchify(browserify({
  basedir: '.',
  debug: true,
  entries: tsProject.src(),
  cache: {},
  packageCache: {}
}).plugin(tsify));
const tscWeb = () => watchedBrowserify
      .bundle()
      .on('error', fancy_log)
      .pipe(source('bundle.js'))
      .pipe(gulp.dest(DIST));
watchedBrowserify.on('update', tscWeb);
watchedBrowserify.on('log', fancy_log);

const buildAll = gulp.parallel(tscNode);

exports.clean = clean;
exports.tscNode = tscNode;
exports.tscWeb = tscWeb;
exports.default = buildAll;