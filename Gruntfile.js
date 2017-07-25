module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');



    grunt.initConfig({
        jsdoc: {
            dist: {
                //src: ['src/*.js'],
                options: {
                    destination: 'docs',
                    configure: 'conf.json',
                    recurse: true,
                }
            }
        },
        watch: {
            options: {
                interval: 100
            },
            js: {
                //files: ['src/**/*.js', 'demo/**/*.js', '!demo/demo-compiled.js'],
                files: ['src/**/*.js', 'demo-v2/**/*.js', '!demo-v2/demo.js'],
                tasks: [
                    //'dist',
                    'demo2'
                ]
            }
        },
        browserify: {
            dist: {
                files: {
                    'dist/lww.js': ['src/lww-npm.js'],
                    'demo/demo-compiled.js': ['demo/demo.js']
                }
            },
            demo2: {
                files: {
                    'demo-v2/demo.js': ['demo-v2/demo-src.js']
                }
            }
        },
        uglify: {
            externals: {
                options: {
                    mangle: false,
                    compress: true

                },
                files: {


                }
            },
            console_unlog: {
                options: {
                    mangle: false,
                    compress: {
                        drop_console: true
                    }
                },
                files: {}
            },
            mainBundle: {
                options: {
                    mangle: false,
                    compress: true
                },
                files: {}
            }
        },
        cssmin: {
            options: {
                mergeIntoShorthands: false,
                roundingPrecision: -1
            },
            target: {
                files: {}
            }
        }
    });

    grunt.registerTask('dist', ['browserify:dist']);
    grunt.registerTask('demo2', ['browserify:demo2']);
};