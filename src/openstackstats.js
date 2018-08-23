const WebServer = require('./webserver');
const Openstack = require('./openstack');
const { join } = require('path');

const CWD = process.cwd();
const CONFIG_FILE = process.env.CONFIG_FILE ? join(CWD, (process.env.CONFIG_FILE || '')) : '../config.json';

class OpenstackStats {
    constructor() {
        this.webServer = new WebServer();
        this.openstack = Openstack.Instance;
        this.openstack.setConfig(require(CONFIG_FILE));
    }
    async bootstrap() {
        await this.openstack.updateToken();
        await this.webServer.bootstrap();
    }

    async listen() {
        await this.webServer.listen();
    }

}


module.exports = OpenstackStats;
