const OpenstackStats = require('./openstackstats');

const osStats = new OpenstackStats();

const start = async () => {
    await osStats.bootstrap();
    await osStats.listen();
};

start();
