module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        uglify: {
            app: {
                options: {
                    report: "gzip"
                },
                files: {
                    "app/backnode.min.js": ["app/backnode.js"]
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
                    "backNode": true,
                    "$": true,
                    "window": true,
                    "cloudExplorer": true,
                    "XMLSerializer": true
                  }
                },
                src: ["Gruntfile.js", "app/server.js", "app/backnode.js"]
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
                src: ["test/*.js"]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-uglify");

    grunt.registerTask("default", ["jshint", "uglify:app"]);
};
