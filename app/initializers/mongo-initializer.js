'use strict';

module.exports = {
    run: function (app, next) {
        app.mongo = {
            mongoose: null,
            models: {}
        };

        app.mongo.mongoose = require('mongoose');

        app.mongo.mongoose.connect(app.config.mongo.uri);

        var connection = app.mongo.mongoose.connection;

        connection.on('error', function name(params) {
            app.logger.error('mongoose connection error', params);
            process.exit(1);
        });

        connection.once('open', function () {
            app.logger.info('... mongoose connection opened successfully');

            app.mongo.models.Storage = require(app.folderPath.app.root + 'schemas/Storage.js')(app);
            app.mongo.models.File = require(app.folderPath.app.root + 'schemas/File.js')(app);

            app.store = {
                storage: {}
            };

            app.mongo.models.Storage.find({}, function(err, res) {
                if (err) {
                    app.logger.error('mongoose failed to load storage', err);
                    process.exit(1);
                }

                for(var i in res){
                    app.store.storage[res[i]._id] = res[i];
                }
            });

            next();
        });
    }
};




