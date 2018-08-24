const { ServerRepository } = require('./server.repository');

const OSWrap = require('openstack-wrapper');

const DRY_RUN = process.env.DRY_RUN === 'true';

module.exports = class OpenstackService {
    constructor() {
        this.serverRepository = new ServerRepository();
    }

    setConfig(config) {
        this.config = config;
        this.keystone = new OSWrap.Keystone(this.config.servers.keystone);
    }

    getToken() {
        return new Promise((resolve, reject) => {
            const { username, password, domain } = this.config;
            this.keystone.getToken(username, password, domain,
                async (error, token) => {
                    if (error) {
                        if (this.tokenRetries > 2) {
                            return reject(error);
                        } else {
                            this.tokenRetries++;
                            const token = await this.getToken();
                            this.general_token = token;
                            resolve(token);
                        }
                    }
                    this.general_token = token;
                    resolve(token);
                });
        });
    }

    getProjectTokenById() {
        return new Promise((resolve, reject) => {
            this.keystone
                .getProjectTokenById(this.general_token.token,
                    this.config.projectId,
                    (error, token) => {
                        if (error) {
                            reject(error);
                        } else {
                            this.project_token = token;
                            this.nova = new OSWrap.Nova(this.config.servers.nova, token.token);
                            this.glance = new OSWrap.Glance(this.config.servers.glance, token.token);
                            resolve(token);
                        }
                    });
        });
    }

    getTokenDeathTime() {
        return new Date(this.general_token.expires_at).getTime() - new Date().getTime();
    }

    hasTokenExpired() {
        if (!this.general_token) return true;
        return new Date(this.general_token.expires_at) < new Date();
    }

    static get Instance() {
        return OpenstackService.instance || (OpenstackService.instance = new OpenstackService());
    }

    async updateToken() {
        await this.getToken();
        await this.getProjectTokenById();
        const timeout = this.getTokenDeathTime();
        clearTimeout(this.tokenTimeout);
        this.tokenTimeout = setTimeout(() => this.updateToken(), timeout);
    }

    async fetchServers() {
        if (this.hasTokenExpired()) {
            await this.updateToken();
        }
        return new Promise((resolve, reject) => {
            if (DRY_RUN) {
                return resolve([]);
            }
            this.nova.listServers((error, servers) => {
                if (error) {
                    reject(error);
                } else {
                    this.serverRepository.setServers(servers);
                    resolve(servers);
                }
            });
        });
    }

    async getImage(id) {
        if (this.hasTokenExpired()) {
            await this.updateToken();
        }
        return new Promise((resolve, reject) => {
            if (DRY_RUN) {
                return resolve();
            }
            this.glance.getImage(id, (error, image) => {
                if (error) {
                    return reject(error);
                } else {
                    return resolve(image);
                }
            });
        });
    }

    async createServer(settings) {
        if (this.hasTokenExpired()) {
            await this.updateToken();
        }
        return new Promise((resolve, reject) => {
            if (DRY_RUN) {
                return resolve();
            }
            this.nova.createServer({
                server: settings
            }, (error, server) => {
                if (error) {
                    const remoteCode = error.detail.remoteCode;
                    // eslint-disable-next-line
                    if (remoteCode >= 400 && remoteCode <= 404 || remoteCode === 409) {
                        return reject(error.detail.remoteMessage);
                    }
                } else {
                    resolve(server);
                }
            });
        });
    }

    async listFlavors() {
        if (this.hasTokenExpired()) {
            await this.updateToken();
        }
        return new Promise((resolve, reject) => {
            if (DRY_RUN) {
                return resolve();
            }
            this.nova.listFlavors((error, server) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(server);
                }
            });
        });
    }

    async listImages() {
        if (this.hasTokenExpired()) {
            await this.updateToken();
        }
        return new Promise((resolve, reject) => {
            if (DRY_RUN) {
                return resolve();
            }
            this.glance.listImages((error, images) => {
                if (error) {
                    return reject(error);
                }
                resolve(images);
            });
        });
    }
    async removeServer() {
        if (this.hasTokenExpired()) {
            await this.updateToken();
        }
        return new Promise((resolve, reject) => {
            if (DRY_RUN) {
                return resolve();
            }
            let serverToDelete = this.serverRepository.shiftServer();
            if (!serverToDelete) {
                reject('No Servers left!');
                return;
            }
            this.nova.removeServer(serverToDelete.id, (error, data) => {
                if (error) {
                    this.serverRepository.addServer(serverToDelete);
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}
