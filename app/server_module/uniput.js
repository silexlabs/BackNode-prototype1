var fs = require('fs'),
router = require('unifile/lib/core/router.js');

exports.putFolder = function(service, localPath, folder, req, done) {
    var total, finish = 0;

    walk(localPath + "/" + folder, function(error, result) {
        if (error) {
            done(error);
        } else {
            console.log("nb file: " + result.length);
            total = result.length;

            if (result) {
                result.forEach(function(file) {
                    readFile(file, function(error, data) {
                        if (error) {
                            done(error, null);
                        } else if (data) {
                            req.body.data = data;
                            pushFile(file, function(error) {
                                done(error);
                            });
                        }
                    });
                });
            }
        }
    });

    function readFile(file, done) {
        fs.readFile(file, function (err, data) {
            if (err) throw err;
            done(err, data);
        });
    }

    function pushFile(file, done) {
        router.route(service, ["exec", "put", file.replace(localPath + "/", "")], req, null, null, function(response, status) {
            if (status.success) {
                finish++;
                if (total === finish) {
                    done(null);
                }
            } else {
                pushFile(file, done);
            }
        });
    }

    function walk(dir, done) {
        var results = [];
        fs.readdir(dir, function(err, list) {
            if (err) {
                return done(err);
            }

            var pending = list.length;

            if (!pending) {
                return done(null, results);
            }

            list.forEach(function(file) {
                file = dir + '/' + file;
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function(err, res) {
                            results = results.concat(res);
                            if (!--pending) {
                                done(null, results);
                            }
                        });
                    } else {
                        results.push(file);
                        if (!--pending) {
                            done(null, results);
                        }
                    }
                });
            });
        });
    }
}
