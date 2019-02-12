const Service = require('@and1gio/z-app-core').Service;
const Handle = requestAnimationFrame('@and1gio/z-app-core').Handle;

const gm = require('gm').subClass({ imageMagick: true });
const fs = require('fs');
const fse = require('fs-extra');
const fileType = require('file-type');
const readChunk = require('read-chunk');

const diskusage = require('diskusage');
const createOutputStream = require('create-output-stream');

const path = require('path');


class FileService extends Service {

    constructor(app) {
        super(app);
    }

    async save(req, res, next) {
        try {
            const key = req.body.key;
            const file = req.files.file;

            // TODO - change with validate module
            if (!file) {
                return this.app.utils.handleErrorResponse(400, [{ keyword: 'FILE_REQUIRED' }], next);
            }

            const record = await this._saveFile(file, key);

            // TEMPORARY - Remove after we completly move to new FS Storage Server
            await this._saveFileIntoOldStorage(record);

            return this.app.utils.handleSuccessResponse(record, res);
        } catch (error) {
            next(error);
        }
    }

    async saveAndCommit(req, res, next) {
        try {
            const key = req.body.key;
            const file = req.files.file;

            // TODO - change with validate module
            if (!file) {
                return this.app.utils.handleErrorResponse(400, [{ keyword: 'FILE_REQUIRED' }], next);
            }

            const record = await this._saveFile(file, key, true);

            // TEMPORARY - Remove after we completly move to new FS Storage Server
            await this._saveFileIntoOldStorage(record);

            return this.app.utils.handleSuccessResponse(record, res);
        } catch (error) {
            next(error);
        }
    }

    async commit(req, res, next) {
        try {
            const key = req.headers.key || 'Joni'; // TODO .. test remove
            const fileId = req.params.fileId;

            const FileModel = this.app.mongodb.models.File;
            const fileMetaData = await FileModel.findActive(fileId, key);

            if (!fileMetaData) {
                return Handle.response(res).fail('file_not_found', 404);
            }

            fileMetaData.recordState = 1;
            await fileMetaData.save();

            return Handle.response(res).success(fileMetaData);
        } catch (ex) {
            Handle.catch(ex).respond(res, next);
        }
    }

    async downloadFile(req, res, next) {
        try {
            const key = req.headers.key || 'Joni'; // TODO .. test remove
            const fileId = req.params.fileId;

            const FileModel = this.app.mongodb.models.File;

            console.log(fileId, key);
            const fileMetaData = await FileModel.findActive(fileId, key);

            console.log(fileMetaData)

            if (!fileMetaData) {
                return this.app.utils.handleErrorResponse(404, [{ keyword: 'file_not_found' }], next);
            }

            const filePath = await this._getFilePath(fileMetaData._id, fileMetaData.storageId, fileMetaData.fsName);
            res.download(filePath, fileMetaData.originalName);
        } catch (error) {
            next(error);
        }
    }

    async getMeta(req, res, next) {
        try {
            const key = req.headers.key || 'Joni'; // TODO .. test remove
            const fileId = req.params.fileId;

            const FileModel = this.app.mongodb.models.File;
            const fileMetaData = await FileModel.findActive(fileId, key);

            if (!fileMetaData) {
                return Handle.response(res).fail('file_not_found', 404);
            }

            return Handle.response(res).success(fileMetaData);
        } catch (ex) {
            Handle.catch(ex).respond(res, next);
        }
    }

    async downloadPicture(req, res, next) {
        try {

            /**
             * Phase 1 - check file existance
             */
            console.log('Phase 1');
            const key = req.headers.key || 'Joni'; // TODO .. test remove
            const fileId = req.params.fileId;

            const FileModel = this.app.mongodb.models.File;
            const fileMetaData = await FileModel.findActive(fileId, key);

            if (!fileMetaData) {
                return this.app.utils.handleErrorResponse(404, [{ keyword: 'file_not_found' }], next);
            }

            /**
             * Phase 2 - analyse incoming data
             */
            console.log('Phase 2');
            let isThumbnailRequest = false;

            if (req.query.width || req.query.height) {
                isThumbnailRequest = true;
            }

            /**
             * Phase 3
             */
            console.log('Phase 3');
            const filePath = await this._getFilePath(fileMetaData._id, fileMetaData.storageId, fileMetaData.fsName);

            if (!isThumbnailRequest) {
                console.log('Phase 3 - Standard');
                /**
                 * Standard Request
                 */
                return res.download(filePath, fileMetaData.originalName);
            } else {
                /**
                 * Thumbnail Request
                 */
                console.log('Phase 3 - Thumbnail');
                const ThumbnailModel = this.app.mongodb.models.Thumbnail;

                // check allowed types
                if (['image/png', 'image/jpg', 'image/jpeg'].indexOf(fileMetaData.mimeType) === -1) {
                    return this.app.utils.handleErrorResponse(400, [{ keyword: 'file_is_not_picture' }], next);
                }

                const imageTransformParams = {
                    width: req.query.width || null,
                    height: req.query.height || null,
                    crop: req.query.crop || null
                };

                // check thumbnail existance in db
                let thumbnailName = fileMetaData._id;
                thumbnailName += '_' + imageTransformParams.width;
                thumbnailName += '_' + imageTransformParams.height;
                thumbnailName += '_' + imageTransformParams.crop;
                thumbnailName += this._getExtension(fileMetaData.originalName);

                // we need here .. originID, name
                // {id}_{width}_{height}_{crop}
                console.log(fileMetaData._id, thumbnailName, '????')
                //const thumbnail = await ThumbnailModel.findByIdAndName(fileMetaData._id, thumbnailName);

                const thumbnail = await ThumbnailModel.findByIdAndCrop(fileMetaData._id, imageTransformParams);


                console.log(thumbnail)

                if (thumbnail) {
                    // get existing thumbnail
                    console.log('existing thumbnail >>>>', thumbnail)
                    const thumbnailFilePath = await this._getFilePath(thumbnail.originId, thumbnail.storageId, thumbnail.fsName);
                    const stream = fs.createReadStream(thumbnailFilePath);
                    res.set('Content-disposition', 'attachment; filename=' + fileMetaData.originalName);
                    res.set('Content-type', fileMetaData.mimeType);
                    return stream.pipe(res);
                } else {
                    // we have stearm & meta
                    const result = await this._transformImage(fileMetaData._id, filePath, imageTransformParams);
                    console.log('result', result.fileStorageInfo);


                    // 1. read file to get size
                    //const pictureMeta = this._getFileMetasFromPath(result.fileStorageInfo.fileFullPath);

                    // we have to save meta now
                    const thumb = new ThumbnailModel({
                        originId: fileMetaData._id,
                        fsName: result.fileStorageInfo.fileNameOnTheFileSystem,
                        storageId: result.fileStorageInfo.storage._id,
                        size: 100,//pictureMeta.size,
                        crop: {
                            width: imageTransformParams.width,
                            height: imageTransformParams.height,
                            position: imageTransformParams.crop
                        }
                    });

                    // TODO save thumbnail on disk
                    await thumb.save(thumb);

                    res.set('Content-disposition', 'attachment; filename=' + fileMetaData.originalName);
                    res.set('Content-type', fileMetaData.mimeType);

                    result.stream.pipe(res);
                }
            }
        } catch (error) {
            next(error);
        }
    }

    async _checkStorageWithFreeSpace(storages, fileSize) {
        if (!storages || !storages.length) {
            throw this.app.utils.createError(400, [{ keyword: 'NO_STORAGE_FOUND' }]);
        }

        for (let storage of storages) {
            try {
                let info = diskusage.checkSync(storage.path);
                console.log(info.available);
                console.log(info.free);
                console.log(info.total);

                if (info.free > fileSize + storage.buffer) {
                    return storage;
                }
            } catch (err) {
                console.log(err);
                throw this.app.utils.createError(400, [{ keyword: 'ERROR_WHILE_CHECKING_STORAGE_WITH_FREE_SPACE' }]);
            }
        }

        throw this.app.utils.createError(400, [{ keyword: 'NO_STORAGE_FOUND_WITH_FREE_SPACE' }]);
    }

    async _getStorage(storageId) {
        const StorageModel = this.app.mongodb.models.Storage;
        const storage = await StorageModel.findById(storageId);
        if (!storage) {
            throw this.app.utils.createError(400, [{ keyword: 'STORAGE_NOT_FOUND' }]);
        }
        if (!storage.readActive) {
            throw this.app.utils.createError(400, [{ keyword: 'STORAGE_IS_NOT_READABLE' }]);
        }
        return storage;
    }

    async _getFilePath(fileId, storageId, fileName) {
        const storage = await this._getStorage(storageId);
        const filePath = this._generateFolderPathById(fileId);
        return storage.path + filePath + fileName;
    }

    _generateFolderPathById(objectId) {
        var id = objectId.toString();
        var path = "";
        for (var i = 0; i < id.length; i += 4) {
            path += id.slice(i, i + 4) + "/";
        }
        return path;
    };

    _getPictureOriginalSize(filePath) {
        return new Promise((resolve, reject) => {
            gm(filePath).size((err, res) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(res);
                }

            });
        })
    }

    _cropAndSave(gmChain, filePath, width, height, x, y) {
        console.log('_cropAndSave filePath', filePath)
        return new Promise((resolve, reject) => {
            gmChain.crop(width, height, x, y).write(filePath, (err) => {
                if (err) {
                    console.log('????????????????????')
                    reject(err);
                } else {
                    resolve(fs.createReadStream(filePath));
                }
            });
        })
    }

    async _transformImage(fileId, filePath, params) {
        const height = params.height;
        const width = params.width;
        const crop = params.crop;

        console.log('_transformImage - filePath', filePath)
        const gmChain = gm(filePath);

        let stream = null;

        const originalSize = await this._getPictureOriginalSize(filePath);
        const targetSize = {
            width: width || originalSize.width,
            height: height || originalSize.height
        };

        const mb = 1000 * 1000;
        const fileStorageInfo = await this._prepareStorage(filePath, 8 * mb, {
            fileId: fileId,
            width: width,
            height: height,
            crop: params.crop || null
        });
        const fileFullPath = fileStorageInfo.fileFullPath;
        console.log('_transformImage - fileFullPath', fileFullPath)

        if (!crop) {
            if (width && height) {
                stream = gmChain.resize(width, height, '!').stream();
            } else {
                stream = gmChain.resize(width, height).stream();
            }
        } else {
            console.log('$$$$$$$ cropping ????')
            const cropPosition = this._getCropPosition(originalSize, targetSize, crop);
            stream = await this._cropAndSave(gmChain, fileFullPath, targetSize.width, targetSize.height, cropPosition.x, cropPosition.y);
        }

        return {
            stream: stream,
            fileStorageInfo: fileStorageInfo
        };
    }

    _getPictureSize(imageSize, targetSize) {
        const coefX = targetSize.width / imageSize.width;
        const coefY = targetSize.height / imageSize.height;
        const mainCoef = Math.max(coefX, coefY);
        return {
            width: imageSize.width * mainCoef,
            height: imageSize.height * mainCoef
        };
    }

    _getCropPosition(imageSize, targetSize, crop) {
        const offsetX = imageSize.width - targetSize.width;
        const offsetY = imageSize.height - targetSize.height;

        const cropObj = {
            "TL": { x: 0, y: 0 },
            "TC": { x: offsetX / 2, y: 0 },
            "TR": { x: offsetX, y: 0 },
            "ML": { x: 0, y: offsetY / 2 },
            "MC": { x: offsetX / 2, y: offsetY / 2 },
            "MR": { x: offsetX, y: offsetY / 2 },
            "BL": { x: 0, y: offsetY },
            "BC": { x: offsetX / 2, y: offsetY },
            "BR": { x: offsetX, y: offsetY }
        };

        return cropObj[crop];
    }

    async _saveFile(file, key, commit) {
        const FileModel = this.app.mongodb.models.File;
        const fileStorageInfo = await this._prepareStorage(file.originalFilename, file.size);

        const fileId = fileStorageInfo.fileId;
        const storageId = fileStorageInfo.storage._id;
        const folderPath = fileStorageInfo.folderPath;
        const fileNameOnTheFileSystem = fileStorageInfo.fileNameOnTheFileSystem;
        const fileFullPath = fileStorageInfo.fileFullPath;

        await this._saveFileOnDisk(file, fileFullPath);

        try {
            const fileDB = new FileModel({
                _id: fileId,
                storageId: storageId,
                originalName: file.originalFilename,
                fsName: fileNameOnTheFileSystem,
                mimeType: file.type,
                encoding: file.encoding,
                size: file.size,
                path: folderPath,
                key: key,
                recordState: commit ? 1 : 0
            });

            return await fileDB.save();
        } catch (ex) {
            throw this.app.utils.createError(400, [{ keyword: 'ERROR_WHILE_SAVING_FILE_IN_DB' }]);
        }
    }

    async _prepareStorage(originalFilename, fileSize, thumbnail) {
        const ext = this._getExtension(originalFilename);
        const StorageModel = this.app.mongodb.models.Storage;
        const storages = await StorageModel.findWriteActive();
        const storage = await this._checkStorageWithFreeSpace(storages, fileSize);

        const fileId = thumbnail && thumbnail.fileId ? thumbnail.fileId : this.app.mongodb.mongoose.Types.ObjectId();
        const folderPath = this._generateFolderPathById(fileId);
        const folderFullPath = storage.path + folderPath;

        let fileNameOnTheFileSystem = fileId.toString();
        if (thumbnail) {
            fileNameOnTheFileSystem += '_' + thumbnail.width;
            fileNameOnTheFileSystem += '_' + thumbnail.height;
            fileNameOnTheFileSystem += '_' + thumbnail.crop;

            fse.ensureDirSync(folderFullPath);
        }

        fileNameOnTheFileSystem += ext;

        const fileFullPath = folderFullPath + fileNameOnTheFileSystem;

        return {
            fileId: fileId,
            storage: storage,
            folderPath: folderPath,
            fileNameOnTheFileSystem: fileNameOnTheFileSystem,
            fileFullPath: fileFullPath
        }
    }

    _saveFileOnDisk(file, fileFullPath) {
        return new Promise(async (resolve, reject) => {
            const writeStream = createOutputStream(fileFullPath);
            fse.createReadStream(file.path).pipe(writeStream);
            writeStream
                .on('error', async () => {
                    fse.unlink(file.path);
                    reject(this.app.utils.createError(400, [{ keyword: 'ERROR_WHILE_SAVING_FILE_ON_STORAGE' }]));
                })
                .on('finish', async () => {
                    fse.unlink(file.path);
                    resolve();
                });
        });
    }

    _getExtension(originalFilename) {
        return path.extname(originalFilename);
    }

    /**
     * get file metas from path
     */
    _getFileMetasFromPath(filePath) {
        console.log('_getFileMetasFromPath - filePath', filePath);
        try {
            const basename = path.basename(filePath);
            const buffer = readChunk.sync(filePath, 0, 4100);
            const stats = fs.statSync(filePath);
            const fileSizeInBytes = stats.size;
            const result = fileType(buffer);

            result.name = basename;
            result.size = fileSizeInBytes;

            return result;
        } catch (error) {
            return null;
        }
    }

    /**
     * TEMP
     */
    async _saveFileIntoOldStorage(fileMetaData) {
        const FileModel = this.app.dataTransferJob.models.File;

        const file = new FileModel({
            _id: fileMetaData._id,
            storageId: fileMetaData.storageId,
            originalName: fileMetaData.originalName,
            name: fileMetaData.fsName,
            filePath: fileMetaData.storageId + fileMetaData._id,
            size: fileMetaData.size,
            path: this.__splitObjectId(fileMetaData._id),
            recordState: 1,
            createdAt: fileMetaData.createdAt,
            key: fileMetaData.key,
            encoding: fileMetaData.encoding,
            mimeType: fileMetaData.mimeType,
            isSynced: true
        });

        console.log(file);

        return await file.save();
    }

    __splitObjectId (objectId) {
        var id = objectId.toString();
        var path = "";
        for (var i = 0; i < id.length; i += 4) {
            path += id.slice(i, i + 4) + "/";
        }
        return path;
    };
}

module.exports = FileService;
