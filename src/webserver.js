const Koa = require('koa');
const Router = require('koa-router');
const views = require('koa-views');
const koaStatic = require('koa-static');
const logger = require('koa-logger');
const json = require('koa-json');

const Openstack = require('./openstack');

const PORT = process.env.PORT || 3000;

class WebServer {
    constructor() {
        this.app = new Koa();
        this.router = new Router();
        this.openstack = Openstack.Instance;
    }

    async registerRoutes() {
        this.router.get('/', async (ctx, next) => {
            await ctx.render('index');
        });

        this.router.get('/api/server', async ctx => ctx.body = await this.openstack.fetchServers())

        this.app
            .use(this.router.routes())
            .use(this.router.allowedMethods());
    }

    setupMiddleware() {
        this.app.use(views(__dirname + '/views', {
            map: {
                html: 'nunjucks'
            }
        }));
        this.app.use(koaStatic(__dirname + '/public'));
        this.app.use(json());
    }

    async bootstrap() {
        this.setupMiddleware();
        await this.registerRoutes();
        this.app.use(logger());
    }

    async listen() {
        this.app.listen(PORT);
        console.log(`Listening on port ${PORT}`)
    }
}

module.exports = WebServer;
