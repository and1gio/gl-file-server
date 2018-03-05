'use strict';

module.exports = function (app) {

    /**
     *
     */
    var gm = require('gm').subClass({imageMagick: true});
    var fs = require('fs');
    var fse = require('fs-extra');
    var createOutputStream = require('create-output-stream');
    var diskspace = require('diskspace');
    var path = require('path');
    var ReadableStreamClone = require('readable-stream-clone');
    var mime = require('mime-types');
    var utf8 = require('utf8');

    /**
     *
     */
    var bl = {};

    /**
     *
     */
    bl.save = function (req, cb) {
        app.logger.info('params', req.body);
        app.logger.info('file', req.file);

        var key = req.body.key;

        var file = req.file;

        var originalName = req.body.originalName || file.originalname;
        var mimeType = req.body.mimeType || file.mimetype;
        var size = req.body.size || file.size;
        var encoding = req.body.encoding || file.encoding;

        var errorsKeywords = [];

        if (!file) {
            errorsKeywords.push('FILES_REQUIRED');
        }

        if (errorsKeywords.length > 0) {
            return cb(errorsKeywords, null);
        }

        app.mongo.models.Storage.getWriteActive(function (retrieveError, data) {

            if (retrieveError || data.length === 0) {
                return cb(['NO_STORAGE_FOUND_WITH_WRITE_ACCESS'], null);
            }

            checkStorageForFreeSpace(data, file.size, 0, function (err, storage) {
                if (err) {
                    return cb(err, null)
                }

                var id = app.mongo.mongoose.Types.ObjectId();

                var folder = generateFilePathById(id, originalName);
                var filePath = storage.path + folder;

                var writeStream = createOutputStream(filePath);

                fse.createReadStream(file.path).pipe(writeStream);

                writeStream.on('finish', function () {
                    fse.unlink(file.path);

                    var fileDB = new app.mongo.models.File({
                        _id: id,
                        storageId: storage._id,
                        name: originalName,
                        mimeType: mimeType,
                        encoding: encoding,
                        filePath: storage._id.toString(),
                        size: size || file.size,
                        path: folder,
                        key: key
                    });

                    fileDB.save(function (err) {
                        if (err) {
                            return cb(['ERROR_WHILE_SAVING_FILE_IN_DATABASE'], null);
                        }

                        cb(null, fileDB);
                    });
                });
            });
        });
    };

    bl.get = function (req, cb) {
        app.logger.info('params', req.body);

        var key = req.body.key;
        var fileId = req.body.fileId;

        var errorsKeywords = [];

        if (!fileId) {
            errorsKeywords.push('FILES_ID_REQUIRED');
        }

        if (errorsKeywords.length > 0) {
            return cb(errorsKeywords, null);
        }

        getFilePathById(fileId, key, function (err, res) {
            if (err) {
                return cb(err, null);
            }

            var stream = fs.createReadStream(res.data.filePath);

            cb(null, stream);
        });
    };

    bl.getImage = function (req, cb) {
        app.logger.info('params', req.body);

        var fileId = req.body.fileId;
        var key = req.body.key || null;

        var imageTransformParams = {
            width: req.body.width || null,
            height: req.body.height || null,
            crop: req.body.crop || null
        };

        var errorsKeywords = [];

        if (!fileId) {
            errorsKeywords.push('FILE_ID_REQUIRED');
        }

        if (errorsKeywords.length > 0) {
            return cb(app.errorsClient.getError(errorsKeywords), null);
        }

        getFilePathById(fileId, key, function (err, res) {
            if (err) {
                return cb(err, null);
            }

            var metaData = res.data.metaData;
            var filePath = res.data.filePath;

            var transformedFilePath = filePath +
                "_" + imageTransformParams.width +
                "_" + imageTransformParams.height +
                "_" + imageTransformParams.crop;

            fs.exists(transformedFilePath, function (exists) {
                if (exists) {
                    var stream = fs.createReadStream(transformedFilePath);
                    return cb(null, {stream: stream, metaData: metaData});
                }

                transformImage(filePath, imageTransformParams, function (transformImageError, transformImageResponse) {
                    if (transformImageError) {
                        return cb(transformImageError, null);
                    }
                    transformImageResponse.metaData = metaData;

                    var readableStream = new ReadableStreamClone(transformImageResponse.stream);

                    var writeStream = fs.createWriteStream(transformedFilePath);
                    readableStream.pipe(writeStream);

                    cb(null, {stream: transformImageResponse.stream, metaData: transformImageResponse.metaData});
                });
            });
        });
    };

    bl.getMeta = function (req, cb) {
        app.logger.info('params', req.body);

        var fileId = req.body.fileId;
        var key = req.body.key || null;

        if (!fileId) {
            return cb(app.errorsClient.getError(["FILE_ID_REQUIRED"]), null);
        }


        getFileInfo(fileId, key, function (err, data) {
            return cb(err, data);
        });
    };

    /**
     * Local Private Methods
     */
    function checkStorageForFreeSpace(storages, fileSize, index, cb) {
        var currStorage = storages[index];
        if (!currStorage) {
            return cb([{ keyword: 'STORAGE_HAS_NOT_FREE_SPACE'}], null);
        }

        diskspace.check(currStorage.path, function (err, total, free, status) {
            if (err || free < fileSize + currStorage.buffer) {
                index += 1;
                return checkStorageForFreeSpace(storages, fileSize, index, cb);
            }
            cb(null, currStorage);
        });
    }

    function getFilePathById(fileId, key, cb) {
        getFileInfo(fileId, key, function (err, data) {
            if (err) {
                return cb(err, null);
            }

            var metaData = data;
            var storageId = metaData.storageId.toString();

            var storage = app.store.storage[storageId];
            if (!storage) {
                return cb(app.errorsClient.getError(['STORAGE_NOT_FOUND']), null);
            }

            if (!storage.readActive) {
                return cb(app.errorsClient.getError(['STORAGE_IS_NOT_READABLE']), null);
            }

            var filePath = generateFilePathById(fileId, data.name);
            cb(null, {
                data: {
                    filePath: storage.path + filePath,
                    metaData: metaData
                }
            });
        });
    }

    function getFileInfo(id, key, cb) {
        app.mongo.models.File.get(id, key, function (err, data) {
            cb(err, data);
        });
    }

    function generateFilePathById (objectId, name) {
        var id = objectId.toString();
        var path = "";
        for (var i = 0; i < id.length; i += 4) {
            path += id.slice(i, i + 4) + "/";
        }
        return path + name;
    }

    function getImageSize(imageSize, targetSize) {
        var coefX = targetSize.width / imageSize.width;
        var coefY = targetSize.height / imageSize.height;

        var mainCoef = Math.max(coefX, coefY);

        return {
            width: imageSize.width * mainCoef,
            height: imageSize.height * mainCoef
        };
    }

    function getCrop(imageSize, targetSize, crop) {
        var offsetX = imageSize.width - targetSize.width;
        var offsetY = imageSize.height - targetSize.height;

        var cropObj = {
            "TL": {x: 0, y: 0},
            "TC": {x: offsetX / 2, y: 0},
            "TR": {x: offsetX, y: 0},
            "ML": {x: 0, y: offsetY / 2},
            "MC": {x: offsetX / 2, y: offsetY / 2},
            "MR": {x: offsetX, y: offsetY / 2},
            "BL": {x: 0, y: offsetY},
            "BC": {x: offsetX / 2, y: offsetY},
            "BR": {x: offsetX, y: offsetY}
        };

        return cropObj[crop];
    }

    function transformImage(imageFilePath, params, cb) {
        var height = params.height;
        var width = params.width;
        var crop = params.crop;

        gm(imageFilePath).size(function (err, res) {
            if (err) {
                return cb([{ keyword: 'ERROR_WHILE_TRANSFORM_IMAGE'}], null);
            }

            var image = gm(imageFilePath);

            if (height && !width) {
                image.resize(null, height);
            } else if (!height && width) {
                image.resize(width, null);
            } else if (height && width && !crop) {
                image.resize(width, height, "!");
            } else if (height && width && crop) {
                var targetSize = {
                    width: width,
                    height: height
                };

                var sizes = getImageSize(res, targetSize);
                image.resize(sizes.width, sizes.height, "!");

                var cropSizes = getCrop(sizes, targetSize, crop);
                image.crop(width, height, cropSizes.x, cropSizes.y);
            }

            image.stream(function (err, stdout, stderr) {
                if (err) {
                    return cb([{ keyword: 'ERROR_WHILE_STREAM_IMAGE_BACK'}], null);
                }
                cb(null, {stream: stdout});
            });
        });
    }

    /**
     *
     */
    return bl;
};