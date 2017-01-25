var express = require('express');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

module.exports = {
    runPriority: 3,
    runFn: function (app, next) {
        app.express = express();
        app.router = express.Router();

        app.cookieParser = cookieParser();

        app.express.use(logger('dev'));
        app.express.use(bodyParser.json({limit: '2048mb'}));
        app.express.use(bodyParser.urlencoded({extended: false, limit: '2048mb'}));
        app.express.use(app.cookieParser);
        app.express.use(express.static(app.rootFolder + 'public'));

        next();
    }
};
