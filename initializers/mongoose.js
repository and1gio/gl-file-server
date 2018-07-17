'use strict';

const Initializer = require('@and1gio/z-app-core').Initializer;

const mongoose = require('mongoose');

const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;


class MongooseInitializer extends Initializer {

    constructor(app) {
        super(app);
    }

    async init() {
        const connection = await this._openConnection();

        this.app.mongodb = {
            mongoose: mongoose,
            connection: connection,
            models: {
                File: this._initFileModel(connection),
                Storage: this._initStorageModel(connection)
            }
        }


    }

    async _openConnection() {
        return await mongoose.createConnection(this.app.configs.mongoose.store.url, { useNewUrlParser: true });
    }

    /**
     * schemas
     */
    _initFileSchema() {
        /**
         * recordState
         * 0: draft / uncommited
         * 1: active / commited
         * 2: marked to delete
         * 3: file was deleted by job
         * after some period record will be also deleted
         */
        return mongoose.Schema({
            name: { type: String, required: true, unique: true },
            originalName: { type: String, required: true },
            storageId: { type: ObjectId, required: true },
            mimeType: { type: String, default: null },
            encoding: { type: String, default: null },
            size: { type: Number, required: true },
            key: { type: String, default: null },
            isCropped: { type: Boolean, default: false },
            cropedPictures: { type: Mixed },
            createdAt: {
                type: Date, default: function () {
                    return new Date();
                }
            },
            lastReadAt: { type: Date, default: null },
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

        FileModel.findActive = async function (id, key) {
            return await this.findOne({ _id: id, recordState: { $in: [0, 1] }, $or: [{ key: key }, { key: null }] });
        };

        return FileModel;
    }

    _initStorageModel(connection) {
        const StorageSchema = this._initStorageSchema();
        const StorageModel = connection.model('Storage', StorageSchema);

        StorageModel.findById = async function (id) {
            return await this.findOne({ _id: id, recordState: 1 }).populate("server").exec();
        };

        StorageModel.findWriteActive = async function () {
            return await this.find({ writeActive: true, recordState: 1 });
        };

        return StorageModel;
    }

}

module.exports = MongooseInitializer;
