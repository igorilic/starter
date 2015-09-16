/**
 * Created by i.ilic on 7/16/2015.
 */

// require
var gulp = require('gulp');
var args = require('yargs').argv;
var del = require('del');
var browserSync = require('browser-sync');
var path = require('path');
var _ = require('lodash');
// config
var config = require('./gulp.config')();
var port = process.env.PORT || config.defaultPort;
// plugins
var $ = require('gulp-load-plugins')({lazy: true});
// tasks
gulp.task('ts-lint', function () {
    return gulp.src(config.allts)
        .pipe($.tslint())
        .pipe($.tslint.report('prose'));
});
gulp.task('vet', function () {
    log('Analysing...');
    return gulp
        .src(config.alljs)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {verbose:true}))
        .pipe($.jshint.reporter('fail'));
});

gulp.task('help', $.taskListing);
gulp.task('default', ['help']);
gulp.task('styles', ['clean-styles'], function () {
    log('Compiling styles...');
    return gulp
        .src(config.stylesless)
        .pipe($.plumber())
        .pipe($.less())
//        .on('error', errorLogger())
        .pipe($.autoprefixer({browsers: ['last 2 versions', '> 5%']}))
        .pipe(gulp.dest(config.temp));
});

gulp.task('templatecache', ['clean-code'], function () {
    log('Creating Angular cache');

    return gulp
        .src(config.htmlfiles)
        .pipe($.minifyHtml({empty:true}))
        .pipe($.angularTemplatecache(
            config.templateCache.file,
            config.templateCache.options))
        .pipe(gulp.dest(config.temp));
});
/*
** clean tasks
*/
gulp.task('clean', function (done) {
    var delconfig = [].concat(config.build, config.temp);
    log('Cleaning: ' + $.util.colors.blue(delconfig));
    del(delconfig, done);
});

gulp.task('clean-styles', function (done) {
    clean(config.temp + '**/*.css', done);
});

gulp.task('clean-fonts', function (done) {
    clean(config.build + 'fonts/**/*.*', done);
});

gulp.task('clean-images', function (done) {
    clean(config.build + 'images/**/*.*', done);
});

gulp.task('clean-code', function (done) {
    var files = [].concat(
        config.temp + '**/*.js',
        config.build + '**/*.html',
        config.build + 'js/**/*.js'

    );
    clean(files, done);
});
/*
** watchers
*/
gulp.task('less-watcher', function () {
    gulp.watch([config.stylesless], ['styles']);
});

gulp.task('wiredep', function () {
    log('wire up the bower css js in index.html');
    var options = config.getWiredepDefaultOptions();
    var wiredep = require('wiredep').stream;

    return gulp
        .src(config.index)
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.js)))
        .pipe(gulp.dest(config.client));
});

gulp.task('fonts', ['clean-fonts'], function () {
    log('copying fonts...');
    return gulp
        .src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('images', ['clean-images'], function () {
    log('copying and commpresing images...');

    return gulp
        .src(config.images)
        .pipe($.imagemin({optimizationLevel:4}))
        .pipe(gulp.dest(config.build + 'images'));
});

gulp.task('inject', ['wiredep', 'styles', 'templatecache'], function () {
    log('wire up the app css  in index.html and call wiredep');
    var options = config.getWiredepDefaultOptions();
    var wiredep = require('wiredep').stream;

    return gulp
        .src(config.index)
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.css)))
        .pipe(gulp.dest(config.client));
});

gulp.task('build', ['optimize', 'images', 'fonts'], function() {
    log('Building everything...');

    var msg = {
        title: 'gulp build',
        subtitle: 'Deployed to the build folder',
        message: 'Running `gulp serve-build`'
    };
    del(config.temp);
    log(msg);
    notify(msg);
});

gulp.task('optimize', ['inject', 'test'], function () {
    log('Optimizing css, html and js files');

    var assets = $.useref.assets({searchPath: '/.'});
    var templateCache = config.temp + config.templateCache.file;
    var cssFilter = $.filter('**/*.css');
    var jsLibFilter = $.filter('**/' + config.optimized.lib);
    var jsAppFilter = $.filter('**/' + config.optimized.app);

    return gulp
        .src(config.index)
        .pipe($.plumber())
        .pipe($.inject(gulp.src(templateCache, {read:false}), {
            starttag: '<!-- inject:templates:js -->'
        }))
        .pipe(assets)
        // filter down to css
        .pipe(cssFilter)
        // csso
        .pipe($.csso())
        // filter restore
        .pipe(cssFilter.restore())
        // filter down to lib js
        .pipe(jsLibFilter)
        // uglify lib
        .pipe($.uglify())
        // restore lib
        .pipe(jsLibFilter.restore())
        // filter to app js
        .pipe(jsAppFilter)
        // ngAnnotate
        .pipe($.ngAnnotate())
        // uglify
        .pipe($.uglify())
        // filter restore
        .pipe(jsAppFilter.restore())
        // revisions
        .pipe($.rev())
        // assets restore
        .pipe(assets.restore())
        .pipe($.useref())
        // rev replace
        .pipe($.revReplace())
        .pipe(gulp.dest(config.build));
});

/**
 * Bump the version
 * --type=pre will bump the prerelease version *.*.*-x
 * --type=patch or no flag will bump the patch *.*.x
 * --type=minor will bump minor version *.x.*
 * --type=major will bump major version x.*.*
 * --version=1.2.3 will bump to a specific version and ignore other flags
 */
gulp.task('bump', function () {
    var msg = 'bumping versions';
    var type = args.type;
    var version = args.version;
    var options = {};
    if (version) {
        options.version = version;
        msg += ' to ' + version;
    } else {
        options.type = type;
        msg += ' for a ' + type;
    }
    log(msg);
    return gulp
        .src(config.packages)
        .pipe($.print())
        .pipe($.bump(options))
        .pipe(gulp.dest(config.root));
});

gulp.task('serve-build', ['build'], function () {
    serve(false /* isDev */);
});

gulp.task('serve-dev', ['inject'], function () {
    serve(true /* isDev */);
});

// testing task
gulp.task('test', ['vet', 'templatecache'], function (done) {
    startTests(true /* singleRun */, done);
});

gulp.task('autotest', ['vet', 'templatecache'], function (done) {
    startTests(false /* singleRun */, done);
});

gulp.task('serve-specs', ['build-spec'], function (done) {
    log('run the spec runner');
    serve(true /* isDev */, true /* specRunner */);
    done();
});

gulp.task('build-spec', ['templatecache'], function () {
    log('building the spec runner');

    var wiredep = require('wiredep').stream;
    var options = config.getWiredepDefaultOptions();
    var specs = config.specs;

    options.devDependencies = true;

    if (args.startServers) {
        specs = [].concat(specs, config.serverIntegrationSpecs);
    }

    return gulp
        .src(config.specRunner)
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.testlibraries),
            {name: 'inject:testlibraries', read: false}))
        .pipe($.inject(gulp.src(config.js)))
        .pipe($.inject(gulp.src(config.specHelpers),
            {name: 'inject:spechelpers', read: false}))
        .pipe($.inject(gulp.src(specs),
            {name: 'inject:specs', read: false}))
        .pipe($.inject(gulp.src(config.temp + config.templateCache.file),
            {name: 'inject:templates', read: false}))
        .pipe(gulp.dest(config.client));

});
// functions

function serve(isDev, specRunner) {
    var nodeoptions = {
        script: config.nodeServer,
        delayTime: 1,
        env: {
            'PORT': port,
            'NODE_ENV': isDev ? 'dev' : 'build'
        },
        watch: [config.server]
    };

    return $.nodemon(nodeoptions)
        .on('restart', ['vet'], function (ev) {
            log('*** nodemon restarted ***');
            log('files changed on restar:\n' + ev);
            setTimeout(function () {

                browserSync.notify('reloading...');
                browserSync.reload({stream: false});

            }, config.browserReloadDelay);
        })
        .on('start', function () {
            log('*** nodemon started ***');
            startBrowserSync(isDev, specRunner);
        })
        .on('crash', function () {
            log('*** nodemon crashed: script crashed for some reason');
        })
        .on('exit', function () {
            log('*** nodemon exited ***');
        });
}

function changeEvent(event) {
    var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
    log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

function notify(options) {
    var notifier = require('node-notifier');
    var notifyOptions = {
        sound: 'Bottle',
        contentImage: path.join(__dirname, 'gulp.png'),
        icon: path.join(__dirname, 'gulp.png')
    };
    _.assign(notifyOptions, options);
    notifier.notify(notifyOptions);
}

function startBrowserSync(isDev, specRunner) {
    if (args.nosync || browserSync.active) {
        return;
    }

    log('Starting browser-sync on port ' + port);

    if (isDev) {
        gulp.watch([config.less], ['styles'])
            .on('change', function (event) {
                changeEvent(event);
            });
    } else {
        gulp.watch([config.less, config.js, config.html], ['optimize', browserSync.reload])
            .on('change', function (event) {
                changeEvent(event);
            });
    }
    var options = {
        proxy: 'localhost:' + port,
        port: 3000,
        files: isDev ? [
            config.client + '**/*.*',
            '!' + config.less,
            config.temp + '**/*.css'
        ] : [],
        ghostMode: {
            clicks: true,
            location: false,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'gulp-patterns',
        notify: true,
        reloadDelay: 1000

    };

    if (specRunner) {
        options.startPath = config.specRunnerFile;
    }
    browserSync(options);
}

function startTests(singleRun, done) {
    var child;
    var fork = require('child_process').fork;
    var karma = require('karma').server;
    var excludeFiles = [];
    var serverSpecs = config.serverIntegrationSpecs;

    if (args.startServers) {
        log('starting server...');
        var savedEnv = process.env;
        savedEnv.NODE_ENV = 'dev';
        savedEnv.PORT = 8888;
        child = fork(config.nodeServer);

    } else {
        if (serverSpecs && serverSpecs.length) {
            excludeFiles = serverSpecs;
        }

    }

    karma.start({
        configFile: __dirname + '/karma.conf.js',
        exclude: excludeFiles,
        singleRun: !!singleRun
    }, karmaCompleted);

    function karmaCompleted(karmaResult) {
        log('Karma completed');
        if (child) {
            log('shut down the child process');
            child.kill();
        }
        if (karmaResult === 1) {
            done('karma: tests failed with code ' + karmaResult);
        } else {
            done();
        }
    }
}

function clean(path, done) {
    log('cleaning: ' + $.util.colors.blue(path));
    del(path, done);
}

function log (msg) {
    if (typeof(msg) === 'object') {
        for (var item in msg) {
            if (msg.hasOwnProperty(item)) {
                $.util.log($.util.colors.blue(msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.blue(msg));
    }
}
