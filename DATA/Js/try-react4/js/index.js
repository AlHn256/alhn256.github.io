"use strict";

var MarkdownEditor = React.createClass({
  displayName: "MarkdownEditor",

  getInitialState: function getInitialState() {
    return { value: '#### Type some *markdown* here!' };
  },
  handleChange: function handleChange() {
    this.setState({ value: this.refs.textarea.value });
  },
  rawMarkup: function rawMarkup() {
    var md = new Remarkable();
    return { __html: md.render(this.state.value) };
  },
  render: function render() {
    return React.createElement(
      "div",
      { className: "MarkdownEditor" },
      React.createElement(
        "h3",
        null,
        "Input"
      ),
      React.createElement("textarea", {
        onChange: this.handleChange,
        ref: "textarea",
        defaultValue: this.state.value }),
      React.createElement(
        "h3",
        null,
        "Output"
      ),
      React.createElement("div", {
        className: "content",
        dangerouslySetInnerHTML: this.rawMarkup()
      })
    );
  }
});

ReactDOM.render(React.createElement(MarkdownEditor, null), document.getElementById('mrkUp'));

/* var TodoList = React.createClass({
  render: function() {
    var createItem = function(item) {
      return <li key={item.id}>{item.text}</li>;
    };
    return <ul>{this.props.items.map(createItem)}</ul>;
  }
});

var TodoApp = React.createClass({
  getInitialState: function() {
    return {items: [], text: ''};
  },
  onChange: function(e) {
    this.setState({text: e.target.value});
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var nextItems = this.state.items.concat([{text: this.state.text, id: Date.now()}]);
    var nextText = '';
    this.setState({items: nextItems, text: nextText});
  },
  render: function() {
    return (
      <div>
        <h3>TODO</h3>
        <TodoList items={this.state.items} />
        <form onSubmit={this.handleSubmit}>
          <input onChange={this.onChange} value={this.state.text} />
          <button>{'Add #' + (this.state.items.length + 1)}</button>
        </form>
      </div>
    );
  }
});

ReactDOM.render(<TodoApp />, document.getElementById('example'));




var HelloWorld = React.createClass({
  render: function() {
    return (
    <div>
      <h1>Hello, world!</h1>
      <h3>
        Hello, <input type='text' placeholder='Your name here' /> !
        <br />
        It is {this.props.date.toTimeString()}
      </h3>
    </div>
    );
  }
});

setInterval(function() {
  ReactDOM.render(
    <HelloWorld name="Dav" date={new Date()} />,
    document.getElementById('example2')
  );
}, 500);





var Timer = React.createClass({
  getInitialState: function() {
    return {secondsElapsed: 0};
  },
  tick: function() {
    this.setState({secondsElapsed: this.state.secondsElapsed + 1});
  },
  componentDidMount: function() {
    this.interval = setInterval(this.tick, 1000);
  },
  componentWillUnmount: function() {
    clearInterval(this.interval);
  },
  render: function() {
    return (
      <div>Seconds Elapsed: {this.state.secondsElapsed}</div>
    );
  }
});

ReactDOM.render(<Timer />, document.getElementById('content2')); */