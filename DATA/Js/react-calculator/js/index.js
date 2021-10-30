"use strict";

var ee = new EventEmitter();
var App = React.createClass({
  displayName: "App",
  render: function render() {
    return React.createElement(
      "main",
      { className: "react-calculator" },
      React.createElement(InputField, null),
      React.createElement(TotalRecall, null),
      React.createElement(ButtonSetNumbers, null),
      React.createElement(ButtonSetFunctions, null),
      React.createElement(ButtonSetEquations, null)
    );
  }
});
var Button = React.createClass({
  displayName: "Button",
  _handleClick: function _handleClick() {
    var text = this.props.text,
        cb = this.props.clickHandler;

    if (cb) {
      cb.call(null, text);
    }
  },
  render: function render() {
    return React.createElement(
      "button",
      { className: this.props.klass, onClick: this._handleClick },
      React.createElement(
        "span",
        { className: "title" },
        this.props.text
      )
    );
  }
});
var ContentEditable = React.createClass({
  displayName: "ContentEditable",
  _handleClick: function _handleClick() {
    var cb = this.props.clickHandler;

    if (cb) {
      cb.call(this);
    }
  },
  render: function render() {
    return React.createElement(
      "div",
      { className: "editable-field", contentEditable: this.props.initEdit, spellcheck: this.props.spellCheck, onClick: this._handleClick },
      this.props.text
    );
  }
});

var InputField = React.createClass({
  displayName: "InputField",
  _updateField: function _updateField(newStr) {
    newStr = newStr.split ? newStr.split(' ').reverse().join(' ') : newStr;
    return this.setState({ text: newStr });
  },
  getInitialState: function getInitialState() {
    this.props.text = this.props.text || '0';

    return { text: this.props.text };
  },
  componentWillMount: function componentWillMount() {
    ee.addListener('numberCruncher', this._updateField);
  },
  render: function render() {
    return React.createElement(ContentEditable, { text: this.state.text, initEdit: "false", spellcheck: "false", clickHandler: this._clickBait });
  }
});
var TotalRecall = React.createClass({
  displayName: "TotalRecall",
  _toggleMemories: function _toggleMemories() {
    this.setState({ show: !this.state.show });
  },
  _recallMemory: function _recallMemory(memory) {
    store.newInput = memory;
    ee.emitEvent('toggle-memories');
  },
  getInitialState: function getInitialState() {
    return { show: false };
  },
  componentWillMount: function componentWillMount() {
    ee.addListener('toggle-memories', this._toggleMemories);
  },
  render: function render() {
    var _this = this;

    var classNames = "memory-bank " + (this.state.show ? 'visible' : '');

    return React.createElement(
      "section",
      { className: classNames },
      React.createElement(Button, { text: "+", clickHandler: this._toggleMemories, klass: "toggle-close" }),
      store.curMemories.map(function (mem) {
        return React.createElement(Button, { klass: "block memory transparent", text: mem, clickHandler: _this._recallMemory });
      })
    );
  }
});
var ButtonSetFunctions = React.createClass({
  displayName: "ButtonSetFunctions",
  _showMemoryBank: function _showMemoryBank() {
    ee.emitEvent('toggle-memories');
  },
  _clear: function _clear() {
    store.newInput = 0;
  },
  _contentClear: function _contentClear() {
    var curInput = String(store.curInput),
        lessOne = curInput.substring(0, curInput.length - 1);

    return store.newInput = lessOne === '' ? 0 : lessOne;
  },
  render: function render() {
    return React.createElement(
      "section",
      { className: "button-set--functions" },
      React.createElement(Button, { text: "recall", clickHandler: this._showMemoryBank }),
      React.createElement(Button, { text: "clear", clickHandler: this._clear }),
      React.createElement(Button, { text: "←", clickHandler: this._contentClear })
    );
  }
});
var ButtonSetEquations = React.createClass({
  displayName: "ButtonSetEquations",
  _eq: function _eq(type) {
    store.newInput = store.curInput + " " + type + " ";
  },
  _equate: function _equate() {
    store.newInput = eval(store.curInput);
  },
  render: function render() {
    return React.createElement(
      "section",
      { className: "button-set--equations" },
      React.createElement(Button, { text: "+", clickHandler: this._eq }),
      React.createElement(Button, { text: "-", clickHandler: this._eq }),
      React.createElement(Button, { text: "*", clickHandler: this._eq }),
      React.createElement(Button, { text: "/", clickHandler: this._eq }),
      React.createElement(Button, { text: "=", clickHandler: this._equate })
    );
  }
});
var ButtonSetNumbers = React.createClass({
  displayName: "ButtonSetNumbers",
  _number: function _number(num) {
    if (!store.curInput) {
      return store.newInput = num;
    }

    return store.newInput = "" + store.curInput + num;
  },
  render: function render() {
    return React.createElement(
      "section",
      { className: "button-set--numbers" },
      React.createElement(Button, { text: "1", clickHandler: this._number }),
      React.createElement(Button, { text: "2", clickHandler: this._number }),
      React.createElement(Button, { text: "3", clickHandler: this._number }),
      React.createElement(Button, { text: "4", clickHandler: this._number }),
      React.createElement(Button, { text: "5", clickHandler: this._number }),
      React.createElement(Button, { text: "6", clickHandler: this._number }),
      React.createElement(Button, { text: "7", clickHandler: this._number }),
      React.createElement(Button, { text: "8", clickHandler: this._number }),
      React.createElement(Button, { text: "9", clickHandler: this._number }),
      React.createElement(Button, { text: "0", clickHandler: this._number })
    );
  }
});

var store = {
  input: 0,
  memory: [],
  get curInput() {
    return this.input;
  },

  get curMemories() {
    return this.memory.filter(function (m) {
      return m !== undefined;
    });
  },

  set commitMemory(input) {
    this.memory.push(input);
  },

  set newInput(str) {
    var curInput = str,
        oldInput = this.curInput;

    if (this.curMemories.indexOf(oldInput) === -1) {
      this.commitMemory = oldInput;
    }

    this.input = curInput;
    ee.emitEvent('numberCruncher', [this.curInput]);
  }
};

React.render(React.createElement(App, null), document.querySelector('body'));