
'use strict';

const ZAppCore = require('@and1gio/z-app-core');

async function start() {
    const App = ZAppCore.App;

    /**
     * configure
     */
    await App.configure(__dirname);

    /**
     * load modules
     */
    await App.loadModules();

    /**
     * init modules
     */
    await App.initModules();
}

start();
