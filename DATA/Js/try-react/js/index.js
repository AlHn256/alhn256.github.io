
class App extends React.Component {
    constructor (props) {
        super(props);
        this.state = { count: props.count };
        this.increment = () => {
            this.setState({ count: this.state.count + 1 });
        };
        this.decrement = () => {
            this.setState({ count: this.state.count - 1 });
        };
    }
    
    render() {
	    return (<div>
            <button onClick={this.decrement}>-</button>
            <span>{this.state.count}</span>
            <button onClick={this.increment}>+</button>
        </div>
       );
    }
}

window.onload = function() {
    ReactDOM.render((
        <App count={100} />
    ),  document.getElementById('app')
    );

}