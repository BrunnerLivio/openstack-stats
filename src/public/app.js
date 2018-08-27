'use strict';

const { Component, h, render } = window.preact;

const openstackMap = [
    { y: 0, x: 0, },
    { y: 0, x: 6 },
    { y: 0, x: 12 },
    { y: 0, x: 18, },
    { y: 8, x: 0 },
    { y: 16, x: 0 },
    { y: 16, x: 6 },
    { y: 16, x: 12 },
    { y: 16, x: 18 },
    { y: 8, x: 18 }
];

class ServerItem extends Component {
    constructor() {
        super();
        this.dist = 'not-found'
    }
    updateDist(props) {
        // Has image name set
        if (props.server && props.server.server && props.server.server.image && props.server.server.image.name) {
            const imageName = props.server.server.image.name.toLowerCase();
            if (imageName.startsWith('ubuntu')) {
                this.dist = 'ubuntu';
            }
            if (imageName.startsWith('centos')) {
                this.dist = 'centos';
            }
        } else {
            this.dist = 'unoccupied';
        }
    }
    render(props, state) {
        this.updateDist(props);
        return (
            h('li', { class: `instance instance-dist-${this.dist}`, style: `left: ${props.server.x}vw; top: ${props.server.y}vw` })
        );
    }
}

class ServerList extends Component {
    getLocalServerById(id) {
        return openstackMap.find(map => map.server && map.server.id === id);
    }
    syncLocalList(newServers) {
        let hasChanged = false;
        newServers
            .filter(newServer => !this.getLocalServerById(newServer.id))
            .forEach(newServer => {
                hasChanged = true;
                openstackMap[Math.floor(Math.random() * openstackMap.length)].server = newServer;
            });
        this.servers
            .filter(localServer => !newServers.find(newServer => newServer.id === localServer.id))
            .forEach((_, index) => {
                hasChanged = true;
                openstackMap[Math.floor(Math.random() * openstackMap.length)].server = null;
            });
        return hasChanged;
    }

    updateServers() {
        return fetch('/api/server')
            .then(res => res.json())
            .then(servers => this.syncLocalList(servers))
            // only update if needed so no
            // uneeded rerendering
            .then(hasChanged => hasChanged ? this.setState({ servers: openstackMap }) : null);
    }
    componentDidMount() {
        this.servers = [];
        this.updateServers();
        setInterval(() => this.updateServers(), 3000);
    }

    render(props, state) {
        console.log(state.servers);
        const items = (state.servers || []).map(server => h(ServerItem, { server }));
        return (
            h('main', { class: 'openstack-main' },
                h('div', { class: 'server-list' },
                    h('ul', { class: 'server-list-container' }, items)
                )
            )
        );
    }
}

class App extends Component {
    render(props, state) {
        return (
            h('div', { id: 'app' },
                h(ServerList)
            )
        );
    }
}

render(h(App), document.getElementById('root'));
