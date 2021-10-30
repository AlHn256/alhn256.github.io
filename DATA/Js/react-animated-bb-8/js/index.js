'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// I've seen a few of these BB-8 animations about, so I thought I'd take a shot at building one using React as a bit of an exercise. My favorite thing to do is draw circles around him to make him do a little jig, but I'm easily amused.

var App = function (_React$Component) {
    _inherits(App, _React$Component);

    function App(props) {
        _classCallCheck(this, App);

        var _this = _possibleConstructorReturn(this, _React$Component.call(this, props));

        _this.state = {
            droidX: 0,
            mouseX: 0,
            toTheRight: true,
            speed: 2,
            accelMod: 1
        };
        return _this;
    }

    // Keep track of the mouse position.

    App.prototype.handleMouseMove = function handleMouseMove(event) {
        this.setState({
            mouseX: event.pageX
        });
    };

    // Speed Mod Bar

    App.prototype.handleSpeedChange = function handleSpeedChange(e) {
        if (parseFloat(e.target.value)) {
            this.setState({
                speed: e.target.value
            });
        }
    };

    // Acceleration Mod Bar

    App.prototype.handleAccelChange = function handleAccelChange(e) {
        if (parseFloat(e.target.value)) {
            this.setState({
                accelMod: e.target.value
            });
        }
    };

    // Get moving!

    App.prototype.movement = function movement() {
        var _state = this.state;
        var droidX = _state.droidX;
        var mouseX = _state.mouseX;
        var speed = _state.speed;
        var accelMod = _state.accelMod;

        // Need a pretty strict if statement to make sure React doesn't end up in a
        // render loop with all the state changes / re-rendering going on.

        if (Math.abs(Math.round(droidX) - mouseX) !== 1) {

            var distance = mouseX - droidX;
            var acceleration = Math.abs(distance * accelMod) / 100;

            // Move to the right
            if (droidX < mouseX) {
                this.setState({
                    droidX: droidX + speed * acceleration,
                    toTheRight: true
                });
            }

            // Move to the left
            else {
                    this.setState({
                        droidX: droidX - speed * acceleration,
                        toTheRight: false
                    });
                }
        }
    };

    // Get some initial movement on first mount.

    App.prototype.componentWillMount = function componentWillMount() {
        this.setState({
            mouseX: 300
        });
    };

    // Set up the mouse event listener and fire up the movement function.

    App.prototype.componentDidMount = function componentDidMount() {
        var _this2 = this;

        document.addEventListener('mousemove', function (e) {
            return _this2.handleMouseMove(e);
        });
        setInterval(this.movement.bind(this), 1);
    };

    // Clean up.

    App.prototype.componentWillUnmount = function componentWillUnmount() {
        var _this3 = this;

        document.removeEventListener('mousemove', function (e) {
            return _this3.handleMouseMove(e);
        });
    };

    // Away we go.

    App.prototype.render = function render() {
        var _state2 = this.state;
        var speed = _state2.speed;
        var accelMod = _state2.accelMod;
        var droidX = _state2.droidX;
        var mouseX = _state2.mouseX;
        var toTheRight = _state2.toTheRight;

        return React.createElement(
            'div',
            null,
            React.createElement(
                'div',
                { className: 'logo' },
                React.createElement('img', { src: 'http://i68.tinypic.com/iod6yh.png' })
            ),
            React.createElement(
                'div',
                { className: 'config' },
                React.createElement(
                    'div',
                    { className: 'control-wrap' },
                    React.createElement(
                        'p',
                        null,
                        'Speed: ',
                        speed
                    ),
                    React.createElement('input', {
                        type: 'range',
                        min: '0',
                        max: '11',
                        step: '0.1',
                        value: speed,
                        onChange: this.handleSpeedChange.bind(this) })
                ),
                React.createElement(
                    'div',
                    { className: 'control-wrap' },
                    React.createElement(
                        'p',
                        null,
                        'Acceleration: ',
                        accelMod
                    ),
                    React.createElement('input', {
                        type: 'range',
                        min: '0',
                        max: '3',
                        step: '0.1',
                        value: accelMod,
                        onChange: this.handleAccelChange.bind(this) })
                )
            ),
            React.createElement(
                'div',
                { className: 'bb8', style: { WebkitTransform: 'translateX(' + droidX + 'px)' } },
                React.createElement(
                    'div',
                    { className: 'antennas ' + (toTheRight ? 'right' : ''),
                        style: { WebkitTransform: 'translateX(' + (mouseX - droidX) / 25 + 'px) rotateZ(' + (mouseX - droidX) / 80 + 'deg)' } },
                    React.createElement('div', { className: 'antenna short' }),
                    React.createElement('div', { className: 'antenna long' })
                ),
                React.createElement(
                    'div',
                    { className: 'head',
                        style: { WebkitTransform: 'translateX(' + (mouseX - droidX) / 15 + 'px) rotateZ(' + (mouseX - droidX) / 25 + 'deg)' } },
                    React.createElement('div', { className: 'stripe one' }),
                    React.createElement('div', { className: 'stripe two' }),
                    React.createElement(
                        'div',
                        { className: 'eyes ' + (toTheRight ? 'right' : '') },
                        React.createElement('div', { className: 'eye one' }),
                        React.createElement('div', { className: 'eye two' })
                    ),
                    React.createElement(
                        'div',
                        { className: 'stripe detail ' + (toTheRight ? 'right' : '') },
                        React.createElement('div', { className: 'detail zero' }),
                        React.createElement('div', { className: 'detail zero' }),
                        React.createElement('div', { className: 'detail one' }),
                        React.createElement('div', { className: 'detail two' }),
                        React.createElement('div', { className: 'detail three' }),
                        React.createElement('div', { className: 'detail four' }),
                        React.createElement('div', { className: 'detail five' }),
                        React.createElement('div', { className: 'detail five' })
                    ),
                    React.createElement('div', { className: 'stripe three' })
                ),
                React.createElement(
                    'div',
                    { className: 'ball', style: { WebkitTransform: 'rotateZ(' + droidX / 2 + 'deg)' } },
                    React.createElement('div', { className: 'lines one' }),
                    React.createElement('div', { className: 'lines two' }),
                    React.createElement('div', { className: 'ring one' }),
                    React.createElement('div', { className: 'ring two' }),
                    React.createElement('div', { className: 'ring three' })
                ),
                React.createElement('div', { className: 'shadow' })
            ),
            React.createElement(
                'div',
                { className: 'instructions' },
                React.createElement(
                    'p',
                    null,
                    'move your mouse.'
                )
            )
        );
    };

    return App;
}(React.Component);

ReactDOM.render(React.createElement(App, null), document.getElementById('app'));