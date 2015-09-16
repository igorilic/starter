module.exports = function () {
    var client = './src/client/';
    var clientApp = client + 'app/';
    var nodeModules = './node_modules/';
    var report = './report';
    var root = './';
    var server = './src/server/';
    var specRunnerFile = 'specs.html';
    var temp = './.tmp/';
    var typings = './typings/';
    var tests = client + 'tests/';
    var wiredep = require('wiredep');
    var bowerFiles = wiredep({devDependencies: true})['js'];

    var config = {


        /**
         * TS 
         */
        allts:[
            clientApp + '**/*.ts'
        ],
        tsOutputPath: clientApp + 'js/',
        typings: typings,
        libraryTypeScriptDefinitions: typings + '**/*.ts',
        // all js files
        alljs: [
            './src/**/*.js',
            './*.js'
        ],
        // paths
        stylesless: client + 'styles/**/*.less',
        stylescss: client + 'styles/',
        temp: './.tmp/',
        client: client,
        html: clientApp + '**/*.html',
        htmlfiles: clientApp + '**/*.html',
        index: client + 'index.html',
        images: client + 'images/**/*.*',
        build: './build/',
        fonts: './bower_components/font-awesome/fonts/**/*.*',
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + clientApp + '**/*.spec.js'
        ],
        css: temp + 'styles.css',
        less: client + 'styles/styles.less',
        packages: [
            './package.json',
            './bower.json'
        ],
        report:report,
        root: root,
        server: server,
        /**
         *  specs.html
         */
        specRunner: client + specRunnerFile,
        specRunnerFile: specRunnerFile,
        testlibraries: [
            'node_modules/mocha/mocha.js',
            'node_modules/chai/chai.js',
            'node_modules/mocha-clean/index.js',
            'node_modules/sinon-chai/lib/sinon-chai.js'
        ],
        specs: [clientApp + '**/*.spec.js'],
        /**
         * Karma settings
         */
        specHelpers: [
            client + 'test-helpers/*.js'
        ],
        serverIntegrationSpecs: [
            tests + 'server-integration/**/*.spec.js'
        ],
        /**
         *  browser-sync
         */
        browserReloadDelay: 1000,
        /**
         *  Bower and NPM locations
         */
        bower: {
            json: require('./bower.json'),
            directory: './bower_components/',
            ignorePath: '../..'
        },
        /**
         * Node settings
         */
        defaultPort: 7203,
        nodeServer: './src/server/app.js',
        /**
         * templateCache
         */
        templateCache: {
            file: 'templates.js',
            options: {
                module: 'app.core',
                standAlone: false,
                root: 'app/'
            }
        },

        /**
         * optimized files
         */
        optimized: {
            app: 'app.js',
            lib: 'lib.js'
        }
    };

    config.getWiredepDefaultOptions = function () {
        var options = {
            bowerJson: config.bower.json,
            directory: config.bower.directory,
            ignorePath: config.bower.ignorePath
        };
        return options;
    };

    config.karma = getKarmaOptions();

    return config;

    ///// functions

    function getKarmaOptions() {
        var options = {
            files: [].concat(
                bowerFiles,
                config.specHelpers,
                client + '/**/*.module.js',
                client + '/**/*.js',
                temp + config.templateCache.file,
                config.serverIntegrationSpecs
            ),
            exclude: [],
            coverage: {
                dir: report + 'coverage/',
                reporters: [
                    {type: 'html', subdir: 'report-html'},
                    {type: 'lcov', subdir: 'report-lcov'},
                    {type: 'text-summary'}
                ]
            },
            preprocessors: {}
        };
        options.preprocessors[clientApp + '**/!(*.spec)+(.js)'] = ['coverage'];
        return options;
    }
};
