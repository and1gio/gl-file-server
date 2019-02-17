const fs = require("fs");
const path = require('path');
const Utils = require("./core/classes/Utils");

const app = {
    env: process.env.NODE_ENV,
    rootDir: __dirname,
    core: {
        configs: {},
        utils: new Utils()
    },
    configs: {},
    services: {},
    filters: {},
    validators: {},
    blClients: {}
};

class App {

    constructor() { }

    get instance() {
        return app;
    }

    /**
     * public
     */
    start() {
        /**
         * init app configs
         */
        this._initConfigs(app.configs, path.join(app.rootDir, 'configs'));

        /**
         * load & run initializers
         */
        this._loadInitializers();
    }

    /**
     * private
     */
    async _initConfigs(rootNamespace, dir) {
        this.instance.core.utils.buildModulesOfDirectory(rootNamespace, dir, (namespace, name, filePath) => {
            try {
                const pkg = require(filePath);

                namespace[name] = pkg[this.instance.env] || pkg['default'];

                if (!namespace[name]) {
                    throw '!!!!! "' + filePath + '" export not found: "' + this.instance.env + '" or "default" !!!!!';
                }
            } catch (error) {
                console.log(error);
                return process.exit(-1);
            }
        });
    }

    async _loadInitializers() {
        try {
            const initializers = app.configs.initOrders;
            const coreModulePath = './core/initializers';
            const appModulePath = './initializers';

            for (let item of initializers) {
                if (item.enabled) {
                    let Module = null;
                    switch (item.type) {
                        case 'core':
                            Module = require(coreModulePath + '/' + item.name);
                            break;
                        case 'app':
                            Module = require(appModulePath + '/' + item.name);
                            break;
                        default:
                    }

                    await new Module().init();
                }
            }
        } catch (e) {
            app.core.utils.logger.error(e);
            process.exit(-1);
        }
    }
}

const appInstance = new App();
module.exports = appInstance;
