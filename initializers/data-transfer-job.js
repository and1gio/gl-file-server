'use strict';

const Initializer = require('@and1gio/z-app-core').Initializer;

const mongoose = require('mongoose');

const ObjectId = mongoose.Schema.Types.ObjectId;

class DataTransferJobInitializer extends Initializer {

    constructor(app) {
        super(app);
    }

    async init() {
        const connection = await this._openConnection();

        this.app.dataTransferJob = {
            mongoose: mongoose,
            connection: connection,
            models: {
                File: this._initFileModel(connection),
                Storage: this._initStorageModel(connection)
            }
        }

        setTimeout(async () => {
            console.log('Sarting sync');

            const OldFileModel = this.app.dataTransferJob.models.File;
            const NewFileModel = this.app.mongodb.models.File;

            const count = await OldFileModel.countSynced();
            console.log('Synced: ', count);

            setInterval(async () => {
                const count = await OldFileModel.countSynced();
                console.log('Synced: ', count);
            }, 100000)

            const files = await OldFileModel.findNonSynced(10);
            await this._sync(OldFileModel, NewFileModel, files, 10000);

            console.log('FINISHED!!!');

        }, 5000);




        // 5bf817c1910dc205021a5108 - not found
        //5bf826750354232936e78d98

        /*
        const file = await OldFileModel.get('5bf826750354232936e78d98');
        const newFile = new NewFileModel({
            _id: file._id,
            fsName: file.name,
            originalName: file.originalName,
            storageId: file.storageId,
            mimeType: file.mimeType,
            encoding: file.encoding,
            size: file.size,
            key: file.key,
            createdAt: file.createdAt,
            lastReadAt: null,
            recordState: 1
        });

        await newFile.save();

        file.isSynced = true;
        await file.save();
        */
    }

    async _sync(OldFileModel, NewFileModel, files, count) {
        for (let file of files) {
            // TODO do some work
            if (file.originalName || file.name) {
                const newFile = new NewFileModel({
                    _id: file._id,
                    fsName: file.name,
                    originalName: file.originalName == null || file.originalName == undefined || file.originalName == "" ? file.name : file.originalName,
                    storageId: file.storageId,
                    mimeType: file.mimeType,
                    encoding: file.encoding,
                    size: file.size,
                    key: file.key,
                    createdAt: file.createdAt,
                    lastReadAt: null,
                    recordState: 1
                });
                await newFile.save();

                file.isSynced = true;
                await file.save();
            } else {
                console.log("BAD RECORD, ", file._id);
            }
        }

        console.log(count, "part done!!");

        const nextFiles = await OldFileModel.findNonSynced(count);
        if (nextFiles && nextFiles.length > 0) {
            console.log("preparing for next part!!");
            await this._sync(OldFileModel, NewFileModel, nextFiles, count);
        }
    }

    async _openConnection() {
        return await mongoose.createConnection('mongodb://192.168.1.183:27017/fileServer', { useNewUrlParser: true });
    }

    /**
     * schemas
     */
    _initFileSchema() {
        return mongoose.Schema({
            name: { type: String, required: true, unique: true },
            originalName: { type: String, required: true },
            storageId: { type: ObjectId, required: true },
            path: { type: String, required: true },
            mimeType: { type: String, default: null },
            encoding: { type: String, default: null },
            filePath: { type: String, required: true },
            size: { type: Number, required: true },
            key: { type: String, default: null },
            isSynced: { type: Boolean, default: false, required: false },
            createdAt: {
                type: Date, default: function () {
                    return new Date();
                }
            },
            recordState: { type: Number, required: true, default: 1 }
        });
    }

    _initStorageSchema() {
        return mongoose.Schema({
            name: { type: String, allowNull: false, unique: true },
            path: { type: String, allowNull: false, unique: true },
            readActive: { type: Boolean, allowNull: false },
            writeActive: { type: Boolean, allowNull: false },
            buffer: { type: Number, default: (100 * 1024 * 1024) },
            recordState: { type: Number, required: true, default: 1 }
        });
    }

    /**
     * models
     */
    _initFileModel(connection) {
        const FileSchema = this._initFileSchema();
        const FileModel = connection.model('File', FileSchema);

        FileModel.get = async function (id) {
            return await this.findOne({ _id: id });
        };

        FileModel.setSynced = async function (id) {
            const file = await this.findOne({ _id: id });
            file.isSynced = true;
            return file.save();
        };

        FileModel.findNonSynced = async function (count) {
            return await this.find({
                $and: [
                    {
                        oldName: null
                    },
                    {
                        $or: [{ isSynced: null }, { isSynced: false }]
                    }
                ]
            }).skip(0).limit(count);
        };

        FileModel.countSynced = async function () {
            return await this.countDocuments({ isSynced: true });
        };


        return FileModel;
    }

    _initStorageModel(connection) {
        const StorageSchema = this._initStorageSchema();
        const StorageModel = connection.model('Storage', StorageSchema);

        StorageModel.getById = async function (id) {
            return await this.findOne({ _id: id, recordState: 1 }).populate("server").exec();
        };

        return StorageModel;
    }

}

module.exports = DataTransferJobInitializer;
