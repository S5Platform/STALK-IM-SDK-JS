var gulp = require('gulp');
var runSequence = require('run-sequence');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minify = require('gulp-minify-css');
var rimraf = require('rimraf');
var rename     = require('gulp-rename');

gulp.task('default', ['build']);

gulp.task('clean', function (cb) {
  rimraf('build/', cb);
});

/** STALK **/
var stalk_paths = {
  scripts: [
    'node_modules/socket.io-client/dist/socket.io.js',
    'src/*.js'
  ]
};

gulp.task('compile', [], function () {
  return gulp.src(stalk_paths.scripts)
    .pipe(concat('stalk-im.js'))
    .pipe(gulp.dest('build'));
});

gulp.task('move', [], function () {
  return gulp.src('build/**/*')
    .pipe(gulp.dest('./dist'));
});

gulp.task('minify', function() {
  return gulp.src('dist/stalk-im.js')
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest('./dist'))
});

// The default task (called when you run `gulp` from cli)
gulp.task('build', function (cb) {

  runSequence('clean',
    ['compile'],
    'move',
    'minify',
    cb);

});
