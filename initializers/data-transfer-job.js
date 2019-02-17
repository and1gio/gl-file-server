const Initializer = require('@and1gio/z-app-core').Initializer;
const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;
const schedule = require('node-schedule')

class DataTransferJobInitializer extends Initializer {

    constructor(app) {
        super(app);
    }

    async init() {
        const connection = await this._openConnection();

        this.isProcessing = false;

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

            schedule.scheduleJob('*/10 * * * * *', async () => {
                if(this.isProcessing) return;

                this.isProcessing = true;

                let count = await OldFileModel.countNonSynced();
                console.log('Items to sync: ', count);

                let files = await OldFileModel.findNonSynced(1000);
                await this._sync(NewFileModel, files);

                this.isProcessing = false;
            });

        }, 1000);
    }

    async _sync(NewFileModel, files) {
        console.log("Gonna sync next: ", files.length);

        let startTime = new Date().getTime();
        for (let file of files) {
            // TODO do some work
            if (file.originalName || file.name) {
                let newFile = new NewFileModel({
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

        const diff = new Date().getTime() - startTime;
        console.log(files.length, "done!! in millis: ", diff / 1000);
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

        FileModel.countNonSynced = async function () {
            return await this.countDocuments({
                $and: [
                    {
                        oldName: null
                    },
                    {
                        $or: [{ isSynced: null }, { isSynced: false }]
                    }
                ]
             });
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
