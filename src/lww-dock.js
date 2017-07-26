class Dock {
    constructor(name, options, manager) {
        this.manager = manager;
        this.name = name;
        this.options = options;
        this.options.anchor = options.anchor;

        // Window objs
        this.windows = {};

        this.DOM = {
            container: null,
            windows: {} // Window DOM
        };

        this.size = {};

        this._init();
    }

    undockWindow(windowName) {
        let WinDOM = this.DOM.windows[windowName];
        //WinDOM.parent.removeChild(WinDOM);
        WinDOM.remove();
        delete this.DOM.windows[windowName];
        delete this.windows[windowName];
    }

    getWindowBounds(windowName) {
        let numDocked = 0;
        for (let win in this.windows) {
            if (win === windowName) {
                break;
            }
            if (this.windows[win].state.override !== 'minimize') {

            } else {
                numDocked = 0;
            }
        }

        let offset = this.options.buttonLength * numDocked,
            length = this.options.buttonLength;

        let bounds = {};
        if (this.options.anchor.flow === 'vertical') {
            bounds.left = this.bounds.left;
            bounds.right = this.bounds.right;
            bounds.width = this.bounds.width;

            if (this.options.anchor.y === 'top') {
                // Flowing downwards
                bounds.top = this.bounds.top + offset;
                bounds.bottom = this.bounds.top + offset + length;
            } else if (this.options.anchor.y === 'bottom') {
                // Flowing upwards
                bounds.bottom = this.bounds.bottom - offset;
                bounds.top = this.bounds.bottom - offset - length;
            } else throw new Error("Invalid anchor position for y");
        } else if (this.options.anchor.flow === 'horizontal') {
            bounds.top = this.bounds.top;
            bounds.bottom = this.bounds.bottom;
            bounds.height = this.bounds.height;

            if (this.options.anchor.x === 'left') {
                // Flowing right
                bounds.left = this.bounds.left + offset;
                bounds.right = this.bounds.left + offset + length;
            } else if (this.options.anchor.x === 'right') {
                // Flowing left
                bounds.left = this.bounds.right - offset;
                bounds.right = this.bounds.right - offset - length;

            } else throw new Error("Invalid anchor position for x");

        } else throw new Error("Invalid flow direction");

        return bounds;
    }

    _init() {
        this._setDefaults();
        this._initDOM();
    }

    _setDefaults() {
        if (!this.options.buttonLength) {
            this.options.buttonLength = 100;
        }

        let anchor = this.options.anchor;
        if (!anchor.hasOwnProperty('offset'))
            anchor['offset'] = 0;
    }

    get flexClass() {
        if (this.options.anchor.flow === 'vertical') {
            if (this.options.anchor.y === 'top')
                return 'downwards';
            else if (this.options.anchor.y === 'bottom')
                return 'upwards';
            else throw new Error("Invalid y-anchor");
        } else if (this.options.anchor.flow === 'horizontal') {
            if (this.options.anchor.x === 'left')
                return 'rightwards';
            else if (this.options.anchor.x === 'right')
                return 'leftwards';
            else throw new Error("Invalid y-anchor");
        } else throw new Error("Invalid flow");
    }

    _initDOM() {
        this.DOM.container = document.createElement('div');
        this.DOM.container.setAttribute('class', 'lww-dock-container ' + this.options.anchor.flow);

        this.DOM.container.classList.add(this.flexClass);

        document.body.appendChild(this.DOM.container);

        this.anchorContainer();
    }


    notifyWindowStateDidChange(windowName) {
        this.renderWindows();
    }

    anchorContainer() {
        let style;

        let anchor = this.options.anchor;
        let x = anchor.x,
            y = anchor.y;

        let buttonHeight = this.options.buttonHeight;


        if (this.options.anchor.flow === 'vertical') {
            if (x === 'left' && y === 'top') {
                style = `
                width: ${buttonHeight};
                top: ${anchor.offset};
                left: 0;
                `;
            } else if (x === 'left' && y === 'bottom') {
                style = `
                width: ${buttonHeight};
                bottom: ${anchor.offset};
                left: 0;
                `;
            } else if (x === 'right' && y === 'top') {
                style = `
                width: ${buttonHeight};
                top: ${anchor.offset};
                right: 0;
                `;
            } else if (x === 'right' && y === 'bottom') {
                style = `
                width: ${buttonHeight};
                bottom: ${anchor.offset};
                right: 0;
                `;
            }
        } else if (this.options.anchor.flow === 'horizontal') {
            if (x === 'left' && y === 'top') {
                style = `
                height: ${buttonHeight};
                top: 0;
                left: ${anchor.offset};
                `;
            } else if (x === 'left' && y === 'bottom') {
                style = `
                height: ${buttonHeight};
                bottom: 0;
                left: ${anchor.offset};
                `;
            } else if (x === 'right' && y === 'top') {
                style = `
                height: ${buttonHeight};
                top: 0;
                right: ${anchor.offset};
                `;
            } else if (x === 'right' && y === 'bottom') {
                style = `
                height: ${buttonHeight};
                bottom: 0;
                right: ${anchor.offset};
                `;
            }
        } else {
            throw new Error("Invalid anchor configuration");
        }

        this.DOM.container.style = style;

        getComputedStyle(this.DOM.container).width;



        setTimeout(() => {
            this.bounds = this.DOM.container.getBoundingClientRect();
        }, 200);
    }

    renderWindows() {
        let style;

        let lengthKey = this.options.anchor.flow === 'vertical' ? 'height' : 'width';
        for (let win in this.windows) {
            let theWindow = this.windows[win];
            if (theWindow.state.override === 'minimize') { // Render
                style = `
                    ${lengthKey}: ${this.options.buttonLength};
                    display: flex
                `;
            } else {
                style = 'display: none';
            }

            this.DOM.windows[win].style = style;

        }
    }

    addWindow(theWindow) {
        this.windows[theWindow.name] = theWindow;
        this._initWindowDOM(theWindow);
        this.renderWindows();
    }

    _initWindowDOM(theWindow) {
        // Render only if docked
        let div = document.createElement('div');
        this.DOM.windows[theWindow.name] = div;

        let icon = document.createElement('div');
        let label = document.createElement('div');

        icon.setAttribute('class', 'lww-dock-icon');
        label.setAttribute('class', 'lww-dock-label')

        label.innerHTML = theWindow.options.title;

        div.setAttribute('class', 'lww-docked-window ' + this.options.anchor.flow)

        div.appendChild(icon);
        div.appendChild(label);

        div.onclick = (e) => {
            this.windows[theWindow.name].toggleState('minimize');
        }
        this.DOM.container.appendChild(div);
    }
}

module.exports = Dock;