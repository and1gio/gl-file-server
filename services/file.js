const Service = require('@and1gio/z-app-core').Service;

const gm = require('gm').subClass({ imageMagick: true });
const fs = require('fs');
const fse = require('fs-extra');

const diskusage = require('diskusage');
var createOutputStream = require('create-output-stream');

const path = require('path');

class FileService extends Service {

    constructor(app) {
        super(app);
    }

    async save(req, res, next) {
        try {

            const key = req.body.key;
            const file = req.files.file;

            console.log(req.files.file)

            // TODO - change with validate module
            if (!file) {
                return this.app.utils.handleErrorResponse(400, [{ keyword: 'FILE_REQUIRED' }], next);
            }

            const ext = path.extname(file.originalFilename);

            if (['.exe', '.EXE', '.bat', '.BAT'].indexOf(ext) !== -1) {
                return this.app.utils.handleErrorResponse(400, [{ keyword: 'FILE_EXTENSION_NOT_ALLOWED' }], next);
            }

            const StorageModel = this.app.mongodb.models.Storage;
            const FileModel = this.app.mongodb.models.File;

            const storages = await StorageModel.findWriteActive();
            const storage = await this._checkStorageWithFreeSpace(storages, file.size);

            const id = this.app.mongodb.mongoose.Types.ObjectId();
            const folder = this._generateFilePathById(id);
            const filePath = storage.path + folder;
            const fileNameInTheFileSystem = id.toString() + ext;

            const writeStream = createOutputStream(filePath + fileNameInTheFileSystem);

            fse.createReadStream(file.path).pipe(writeStream);

            writeStream.on('finish', async () => {
                fse.unlink(file.path);

                try {
                    const fileDB = new FileModel({
                        _id: id,
                        storageId: storage._id,
                        originalName: file.originalFilename,
                        name: fileNameInTheFileSystem,
                        mimeType: file.type,
                        encoding: file.encoding,
                        size: file.size,
                        path: folder,
                        key: key,
                        recordState: 0
                    });

                    const record = await fileDB.save();
                    return this.app.utils.handleSuccessResponse(record, res);
                } catch (ex) {
                    throw this.app.utils.createError(400, [{ keyword: 'ERROR_WHILE_SAVING_FILE_IN_DB' }]);
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async find(req, res, next) {
        try {
            const key = req.headers.key;
            const fileId = req.params.fileId;

            const filePath = await this._getFilePathById(fileId, key);
            console.log(filePath)

            res.json({
                filePath: filePath
            })
        } catch (error) {
            next(error);
        }
    }



    async test(req, res, next) {
        try {

            if (req.files.file) {
                console.log(req.files.file);
            } else {
                console.log("no file");
            }

            const StorageModel = this.app.mongodb.models.Storage;

            /*
            // passed
            const test1 = new StorageModel();
            test1.name = 'test 1';
            test1.path = '/Volumes/temp-file-storage1/';
            test1.readActive = true;
            test1.writeActive = true;
            test1.buffer = 100 * 1024 * 1024;
            test1.recordState = 1;

            await test1.save()
            console.log('test1 saved');


            const test2 = new StorageModel();
            test2.name = 'test 2';
            test2.path = '/Volumes/temp-file-storage2/';
            test2.readActive = true;
            test2.writeActive = true;
            test2.buffer = 100 * 1024 * 1024;
            test2.recordState = 1;

            await test2.save()
            console.log('test2 saved');
            */

            /*
            // passed
            const storage1 = await this.app.mongodb.models.Storage.findById("5b4dc223595e365201cc41bc");
            console.log("storage1", storage1);

            const storage2 = await this.app.mongodb.models.Storage.findById("5b4dc223595e365201cc41bd");
            console.log("storage2", storage2);
            */

            const storages = await StorageModel.findWriteActive();
            this._upgradeStoragesStore(storages);

            console.log(storages);


            const found = await this._checkStorageForFreeSpace(storages, 100000000000000);
            console.log("FOUND: ", found);

            res.status(200).send();

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

    async _getFilePathById(id, key) {
        const FileModel = this.app.mongodb.models.File;
        const StorageModel = this.app.mongodb.models.Storage;

        const metaData = await FileModel.findActive(id, key);

        const storageId = metaData.storageId.toString();
        const storage = await StorageModel.findById(storageId);

        if (!storage) {
            throw this.app.utils.createError(400, [{ keyword: 'STORAGE_NOT_FOUND' }]);
        }

        if (!storage.readActive) {
            throw this.app.utils.createError(400, [{ keyword: 'STORAGE_IS_NOT_READABLE' }]);
        }

        const filePath = this._generateFilePathById(id);

        return storage.path + filePath + metaData.name;
    }

    _generateFilePathById(objectId) {
        var id = objectId.toString();
        var path = "";
        for (var i = 0; i < id.length; i += 4) {
            path += id.slice(i, i + 4) + "/";
        }
        return path;
    };



}

module.exports = FileService;
