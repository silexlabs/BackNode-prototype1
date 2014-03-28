module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        uglify: {
            app: {
                options: {
                    report: "gzip"
                },
                files: {
                    "dist/app.min.js": ["server.js"]
                }
            }
        },
        jshint: {
            app: {
                options: {
                  "curly": true,
                  "eqnull": true,
                  "eqeqeq": true,
                  "undef": true,
                  "node": true,
                  "globals": {
                    "backnode": true
                  }
                },
                src: ["Gruntfile.js", "app/**/*.js"]
            },
            test: {
                options: {
                  "curly": true,
                  "eqnull": true,
                  "eqeqeq": true,
                  "undef": true,
                  "globals": {
                    "backnode": true
                  }
                },
                src: ["test/**/*.js"]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-uglify");

    grunt.registerTask("default", ["uglify:app", "jshint"]);
};
