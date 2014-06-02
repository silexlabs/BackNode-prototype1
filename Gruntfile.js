module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        uglify: {
            app: {
                options: {
                    report: "gzip",
                    sourceMap: true
                },
                files: {
                    "app/backnode.min.js": ["app/backnode.js"],
                    "admin/js/script.min.js": ["admin/js/script.js"]
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
                    "BackNode": true,
                    "$": true,
                    "window": true,
                    "cloudExplorer": true,
                    "XMLSerializer": true,
                    "io": true
                  }
                },
                src: ["Gruntfile.js", "app/server.js", "app/backnode.js", "admin/js/script.js"]
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
