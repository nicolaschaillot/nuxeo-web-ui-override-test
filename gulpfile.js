/*
(C) Copyright Nuxeo Corp. (http://nuxeo.com/)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

// Include Gulp & tools we'll use
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var merge = require('merge-stream');
var path = require('path');
var fs = require('fs');
var historyApiFallback = require('connect-history-api-fallback');
var through = require('through2');
var mergeJson = require('gulp-merge-json');

var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

var DIST = 'target/classes/web/nuxeo.war/ui';

var dist = function(subpath) {
  return !subpath ? DIST : path.join(DIST, subpath);
};

var APP = '.';

var app = function(subpath) {
  return !subpath ? APP : path.join(APP, subpath);
};

var NUXEO_WEBUI_APP = '../nuxeo-web-ui';

var nuxeo_web_ui_app = function(subpath) {
  return !subpath ? NUXEO_WEBUI_APP : path.join(NUXEO_WEBUI_APP, subpath);
};

var styleTask = function(stylesPath, srcs) {
  return gulp.src(srcs.map(function(src) {
    return path.join(app(), stylesPath, src);
  }))
      .pipe($.changed(stylesPath, {extension: '.css'}))
      .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
      .pipe(gulp.dest('.tmp/' + stylesPath))
      .pipe($.minifyCss())
      .pipe(gulp.dest(dist(stylesPath)))
      .pipe($.size({title: stylesPath}));
};

var imageOptimizeTask = function(src, dest) {
  return gulp.src(path.join(app(), src))
      .pipe($.imagemin({
        progressive: true,
        interlaced: true
      }))
      .pipe(gulp.dest(dest))
      .pipe($.size({title: 'images'}));
};

var optimizeHtmlTask = function(src, dest) {
  return gulp.src(src)
    // Concatenate and minify JavaScript
      .pipe($.if('*.js', $.uglify({
        preserveComments: 'some'
      })))
    // Concatenate and minify styles
    // In case you are still using useref build blocks
      .pipe($.if('*.css', $.minifyCss()))
      .pipe($.useref({
        searchPath: ['.tmp', app(), dist()]
      }))
    // Minify any HTML
      .pipe($.if('*.html', $.minifyHtml({
        quotes: true,
        empty: true,
        spare: true
      })))
    // Output files
      .pipe(gulp.dest(dest))
      .pipe($.size({
        title: 'html'
      }));
};

// Compile and automatically prefix stylesheets
gulp.task('styles', function() {
  return styleTask('styles', ['**/*.css']);
});

gulp.task('elements', function() {
  return styleTask('elements', ['**/*.css']);
});

// Lint JavaScript
gulp.task('lint', function() {
  return gulp.src([
    'elements/**/*.js',
    'elements/**/*.html',
    'gulpfile.js'
  ])
      .pipe(reload({
        stream: true,
        once: true
      }))

      .pipe($.eslint())
      .pipe($.eslint.format())
      .pipe($.if(!browserSync.active, $.eslint.failAfterError()));
});

// Optimize images
gulp.task('images', function() {
  return imageOptimizeTask('images/**/*', dist('images'));
});

gulp.task('copy', function() {
  var application = gulp.src([
    app('*.{html,ico}'),
    app('manifest.json'),
    app('elements/**/*'),
    app('i18n/**/*'),
    app('styles/**/*'),
    app('themes/**/*')
  ], {
    base: app()
  }).pipe(gulp.dest(dist()));

  return merge(application);
});

// Scan your HTML for assets & optimize them
gulp.task('html', function() {
  return optimizeHtmlTask(
      [app('index.html')],
      dist());
});

gulp.task('copy-nuxeo-web-ui', ['clean-nuxeo-webui'], function() {
  
  return gulp.src([
    nuxeo_web_ui_app('*.{html,ico}'),
    nuxeo_web_ui_app('manifest.json'),
    nuxeo_web_ui_app('elements/**/*'),
    nuxeo_web_ui_app('i18n/**/*'),
    nuxeo_web_ui_app('styles/**/*'),
    nuxeo_web_ui_app('themes/**/*'),
  ], {
    base: nuxeo_web_ui_app()
  }).pipe(gulp.dest('.nuxeo-web-ui'));

});

gulp.task('merge-local-in-nuxeo-web-ui',['copy-nuxeo-web-ui'], function() {

  return gulp.src([
    app('*.{html,ico}'),
    app('manifest.json'),
    app('elements/**/*'),
    //app('i18n/**/*'),
    app('styles/**/*'),
    app('themes/**/*')
  ], {
    base: app()
  }).pipe(gulp.dest('.nuxeo-web-ui'));

  //return merge(nuxeo_web_ui, application);
});

// merge message files from nuxeo-ui-elements, keendoo-web-ui
// in case of conflict, keendoo-web-ui prevails
gulp.task('merge-message-files', ['merge-local-in-nuxeo-web-ui'], function() {
  var i18ndist = dist('i18n');
  var i18ntmp = '.tmp/i18n';
  return gulp.src(['bower_components/nuxeo-ui-elements/i18n/messages*.json'])
             .pipe($.if(function(file) {
               return fs.existsSync(path.join('i18n', path.basename(file.path)));
             }, through.obj(function(file, enc, callback) {
               gulp.src([file.path, path.join('i18n', path.basename(file.path))])
                   .pipe(mergeJson(path.basename(file.path)))
                   .pipe(gulp.dest(i18ntmp))
                   .pipe(gulp.dest(i18ndist));
               callback();
             })))
             .pipe(gulp.dest(i18ntmp))
             .pipe(gulp.dest(i18ndist))
             .pipe($.size({title: 'merge-message-files'}));
});

// merge message files from nuxeo-ui-elements, keendoo-web-ui 
// in case of conflict, keendoo-web-ui prevails
gulp.task('merge-message-files-nuxeo-web-ui', ['merge-message-files'],  function() {
  var i18ndist = dist('i18n');
  var i18ntmp = '.tmp/i18n';
  //var i18nwebui = '.nuxeo-web-ui/i18n';
  return gulp.src(['.nuxeo-web-ui/i18n/messages*.json'])
             .pipe(gulp.dest(i18ntmp))
             .pipe(gulp.dest(i18ndist))
             .pipe($.size({title: 'merge-message-files-nuxeo-web-ui'}));
});

gulp.task('merge-message-files-prod', function() {
  var i18ndist = dist('i18n');
  return gulp.src([dist('bower_components/nuxeo-ui-elements/i18n/messages*.json')])
      .pipe($.if(function(file) {
        return fs.existsSync(path.join(i18ndist, path.basename(file.path)));
      }, through.obj(function(file, enc, callback) {
        gulp.src([file.path, path.join(i18ndist, path.basename(file.path))])
            .pipe(mergeJson(path.basename(file.path)))
            .pipe(gulp.dest(i18ndist));
        callback();
      })))
      .pipe(gulp.dest(i18ndist))
      .pipe($.size({title: 'merge-message-files'}));
});

// Vulcanize granular configuration
gulp.task('vulcanize', function() {
  return gulp.src(dist('elements/keendoo-app/keendoo-elements.html'))
      .pipe($.vulcanize({
        stripComments: true,
        inlineCss: true,
        inlineScripts: true,
        stripExcludes: false,
        excludes: ['bower_components/polymer/polymer-micro.html'],
        excludes: ['bower_components/polymer/polymer-mini.html'],
        excludes: ['bower_components/polymer/polymer.html'],
        //excludes: {'imports': ['../bower_components/polymer/polymer.html']}
        }
      }))
      .pipe($.replace('..\/..\/bower_components', '..\/bower_components'))
      //.pipe($.minifyInline())
      .pipe(gulp.dest(dist()))
      .pipe($.size({title: 'vulcanize'}));
});


// Move dynamic layouts to root
gulp.task('move-layouts', function() {
  return gulp.src([
    dist('elements/document/**'), '!' + dist('elements/document/*.html'),
    dist('elements/directory/**'), '!' + dist('elements/directory/*.html'),
    dist('elements/search/**'), '!' + dist('elements/search/*.html'),
    dist('elements/workflow/**'), '!' + dist('elements/workflow/*.html'),
    dist('elements/nuxeo-*.html')
  ], {base: dist('elements')}).pipe(gulp.dest(dist()));
});

// Strip unnecessary stuff
gulp.task('strip', function() {
  return del([
    dist('index.html'), // use our JSP
    dist('elements'),
    dist('bower_components/**'),
    '!' + dist('bower_components'),
    '!' + dist('bower_components/webcomponentsjs'),
    '!' + dist('bower_components/webcomponentsjs/webcomponents.min.js'),
    '!' + dist('bower_components/webcomponentsjs/webcomponents-lite.min.js'),
    '!' + dist('bower_components/nuxeo-ui-elements'),
    '!' + dist('bower_components/nuxeo-ui-elements/viewers'),
    '!' + dist('bower_components/nuxeo-ui-elements/viewers/pdfjs'),
    '!' + dist('bower_components/nuxeo-ui-elements/viewers/pdfjs/**'),
    // keep Alloy editor assets
    '!' + dist('bower_components/alloyeditor'),
    '!' + dist('bower_components/alloyeditor/dist'),
    '!' + dist('bower_components/alloyeditor/dist/alloy-editor'),
    '!' + dist('bower_components/alloyeditor/dist/alloy-editor/assets'),
    '!' + dist('bower_components/alloyeditor/dist/alloy-editor/assets/**'),
  ]);
});


// Clean .nuxeo-web-ui directory
gulp.task('clean-nuxeo-webui', function() {
  return del(['.nuxeo-web-ui']);
});

// Clean output directory
gulp.task('clean', function() {
  return del(['.tmp']);
});

// Build production files
gulp.task('build', ['clean'], function(cb) {
  runSequence(
      ['copy', 'styles'],
      'merge-message-files-prod',
      ['images', 'html'],
      'vulcanize',
      'move-layouts',
      'strip',
      cb);
});

// Build production files, the default task
gulp.task('default', ['clean'], function(cb) {
  // Uncomment 'cache-config' if you are going to use service workers.
  runSequence(
      ['copy', 'styles'],
      'elements',
      ['lint', 'images', 'html', 'merge-message-files'],
      'vulcanize', // 'cache-config',
      cb);
});

// Watch files for changes & reload
gulp.task('serve', [
  'lint', 
  'styles', 
  'elements', 
  'images', 
  'merge-message-files',
  'merge-local-in-nuxeo-web-ui',
  'merge-message-files-nuxeo-web-ui'
], function() {
  // setup our local proxy
  var proxyOptions = require('url').parse('http://localhost:8080/nuxeo');
  proxyOptions.route = '/nuxeo';
  browserSync({
    port: 5000,
    notify: false,
    logPrefix: 'PSK',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function(snippet) {
          return snippet;
        }
      }
    },
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: {
      baseDir: ['.tmp', '.', '.nuxeo-web-ui'],
      middleware: [require('proxy-middleware')(proxyOptions)]
    }
  });

  gulp.watch(['**/*.html'], reload);
  gulp.watch(['styles/**/*.css'], ['styles', reload]);
  gulp.watch(['elements/**/*.css'], ['elements', reload]);
  gulp.watch(['{scripts,elements}/**/{*.js,*.html}'], ['lint']);
  gulp.watch(['images/**/*'], reload);
  gulp.watch(['i18n/**/*'], ['merge-message-files', reload]);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], function() {
  browserSync({
    port: 5001,
    notify: false,
    logPrefix: 'PSK',
    snippetOptions: {
      rule: {
        match: '<span id="browser-sync-binding"></span>',
        fn: function(snippet) {
          return snippet;
        }
      }
    },
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: dist(),
    middleware: [historyApiFallback()]
  });
});

// Load tasks for web-component-tester
// Adds tasks for `gulp test:local` and `gulp test:remote`
require('web-component-tester').gulp.init(gulp);

// Load custom tasks from the `tasks` directory
try {
  require('require-dir')('tasks');
} catch (err) {
  //
}
