const fs = require("fs");
const os = require("os");
const path = require("path");

const gulp = require('gulp');
const watchify = require('watchify');
const fancy_log = require('fancy-log');
const ts = require('gulp-typescript');
const tsReporter = ts.reporter.longReporter();
const merge = require("merge-stream");
const _rimraf = require("rimraf")
const tsProject = ts.createProject("tsconfig.json");

const DIST = 'dist'

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
  const tsResult = tsProject.src()
    .pipe(tsProject(tsReporter));

  return merge(
    tsResult.js.pipe(gulp.dest(DIST)),
    tsResult.dts.pipe(gulp.dest(DIST))
  );
}
const buildAll = gulp.series(tscNode);

const ci = gulp.series(clean, buildAll);

exports.clean = clean;
exports.tscNode = tscNode;
exports.default = buildAll;
exports.ci = ci;