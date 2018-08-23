'use strict';

const { Component, h, render } = window.preact;

class ServerList extends Component {

    updateServers() {
        return fetch('/api/server')
            .then(res => res.json())
            .then(servers => this.setState({ servers }));
    }
    componentDidMount() {
        this.updateServers();
        setInterval(() => this.updateServers(), 1000);
    }

    render(props, state) {
        const items = (state.servers || []).map((server, index) => (
            h('li', { id: `server-${index}` }, 'Item ' + server.name)
        ));
        return (
            h('main', null,
                h('ul', null, items)
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
