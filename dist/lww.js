(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
let LOC_TO_MOUSE_STYLE = {
    'bottom-left': 'nesw-resize',
    'bottom-right': 'nwse-resize',
    'top-right': 'nesw-resize',
    'top-left': 'nwse-resize',
    'left': 'ew-resize',
    'right': 'ew-resize',
    'bottom': 'ns-resize',
    'header': 'move',
    'top': 'ns-resize',
    'content': 'default',
    'button': 'default'
};

/**
 *
 * @version 0.1
 * @author Yngve S. Kristiansen
 * @author original source 1: Simplex Studio, LTD &
 * @author original source (actual original source): http://codepen.io/zz85/post/resizing-moving-snapping-windows-with-js-css, https://github.com/zz85
 *
 * @licence The MIT License (MIT)
 * @Copyright Copyright © 2015 Simplex Studio, LTD
 * @Copyright Copyright © 2015 https://github.com/zz85
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the “Software”), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions
 * of the Software.
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

/*
    Manages...
    * the dock 
    * Z-indexing
    * spawning / despawning
    * positioning of the windows (Powered by popper.js)
*/
class LWWManager {
    constructor() {
        this.cache = {

        };

        this.docks = {};
        this.windows = {};
        this.ghost = undefined; // To transition animations etc
    }

    // Creates a dock that windows can be minimized to / maximized from
    createDock(name, args) {
        this.docks[name] = new Dock(name, args, this);
    }

    addWindow(name, args) {
        this.windows[name] = new LWW(name, args, this);
        if (args.options.dock.name) {
            this.connectWindowToDock(name, args.options.dock.name);
        }
    }

    connectWindowToDock(windowName, dockName) {
        this.docks[dockName].addWindow(this.windows[windowName]);
    }

    deleteWindow(name) {
        if (!this.windows.hasOwnProperty(name))
            throw new Error("Trying to delete window with name " + name + ", it doesn't exist.");

        delete this.windows[name];
    }
}

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
        for (let maybeset0 of ['offsetY', 'offsetX'])
            if (!anchor.hasOwnProperty(maybeset0))
                anchor[maybeset0] = 0;
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
                top: ${anchor.offsetY};
                left: ${anchor.offsetX};
                `;
            } else if (x === 'left' && y === 'bottom') {
                style = `
                width: ${buttonHeight};
                bottom: ${anchor.offsetY};
                left: ${anchor.offsetX};
                `;
            } else if (x === 'right' && y === 'top') {
                style = `
                width: ${buttonHeight};
                top: ${anchor.offsetY};
                right: ${anchor.offsetX};
                `;
            } else if (x === 'right' && y === 'bottom') {
                style = `
                width: ${buttonHeight};
                bottom: ${anchor.offsetY};
                right: ${anchor.offsetX};
                `;
            }
        } else if (this.options.anchor.flow === 'horizontal') {
            if (x === 'left' && y === 'top') {
                style = `
                height: ${buttonHeight};
                top: ${anchor.offsetY};
                left: ${anchor.offsetX};
                `;
            } else if (x === 'left' && y === 'bottom') {
                style = `
                height: ${buttonHeight};
                bottom: ${anchor.offsetY};
                left: ${anchor.offsetX};
                `;
            } else if (x === 'right' && y === 'top') {
                style = `
                height: ${buttonHeight};
                top: ${anchor.offsetY};
                right: ${anchor.offsetX};
                `;
            } else if (x === 'right' && y === 'bottom') {
                style = `
                height: ${buttonHeight};
                bottom: ${anchor.offsetY};
                right: ${anchor.offsetX};
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

class LWW {
    /*
        Full args:
        {
            minimizable: true | false,
            maximizable: true | false,
            collapsible: true | false,

            bounds: {
                min: {
                    width: num,
                    height: num
                },
                max: {
                    width: num,
                    height: num
                },
            },

            state: {
                size: 'minimized' | 'maximized' | [w, h],
                location: [x, y]
            }

            resize_margin: num,

            icon: {
                    fa: 'fa-icon-classes',
                    img: 'img-icon-path'
                },

            dock: {
                icon: {
                    fa: 'fa-icon-classes',
                    img: 'img-icon-path'
                } || 'inherit'(default),
                name: dock-name
            }
        }
     */
    constructor(name, args, manager) {
        this.name = name;
        this.manager = manager;

        this.options = args.options;
        this.state = args.state;
        this.state.containerHandles = {};

        this.DOM = {};

        this.mouse = {
            isDragging: false,
            isResizing: false,
            isDown: false,
            loc: 'none',
            offset: [] // used when moving/resizing
        };

        this._init();
    }

    get dock() {
        if (!this.options.dock)
            return undefined;

        return this.manager.docks[this.options.dock.name];
    }

    relocate(x, y) {
        this.state.location = [x, y];
        this.resizeRelocateDOMContainer();
    }

    resize(w, h) {
        this.state.size = [w, h];
        this.resizeRelocateDOMContainer();
    }

    get width() {
        return this.state.size[0];
    }

    get height() {
        return this.state.size[1];
    }

    set width(width) {
        this.state.size[0] = width;
    }

    set height(height) {
        this.state.size[1] = height;
    }

    get x0() {
        return this.state.location[0];
    }

    get y0() {
        return this.state.location[1];
    }

    get x1() {
        return this.state.location[0] + this.state.size[0];
    }

    get y1() {
        return this.state.location[1] + this.state.size[1];
    }

    set x0y0(x0y0) {
        this.x0 = x0y0[0];
        this.y0 = x0y0[1];
    }

    set x1y0(x1y0) {
        this.x1 = x1y0[0];
        this.y0 = x1y0[1];
    }

    set x0y1(x0y1) {
        this.x0 = x0y1[0];
        this.y1 = x0y1[1];
    }

    set x1y1(x1y1) {
        this.x1 = x1y1[0];
        this.y1 = x1y1[1];
    }

    // These setters do not trigger reflows
    set x0(x0) {
        let newWidth = this.x1 - x0;
        this.state.location[0] = x0;
        this.width = newWidth;
    }

    set y0(y0) {
        let newHeight = this.y1 - y0;
        this.state.location[1] = y0;
        this.height = newHeight;
    }

    set x1(x1) {
        let newWidth = x1 - this.x0;
        this.state.size[0] = newWidth;
    }

    set y1(y1) {
        let newHeight = y1 - this.y0;
        this.state.size[1] = newHeight;
    }
    // -----------

    // These ones do trigger reflows
    set left(left) {
        this.x0 = left;
        this.resizeRelocateDOMContainer();
    }

    set right(right) {
        this.x1 = right;
        this.resizeRelocateDOMContainer();
    }

    set lowerLeft(lowerLeft) {
        this.x0y1 = lowerLeft;
        this.resizeRelocateDOMContainer();
    }

    set lowerRight(lowerRight) {
        this.x1y1 = lowerRight;
        this.resizeRelocateDOMContainer();
    }

    set bottom(bottom) {
        this.y1 = bottom;
        this.resizeRelocateDOMContainer();
    }

    set top(top) {
        this.y0 = top;
        this.resizeRelocateDOMContainer();
    }

    set upperLeft(upperLeft) {
        this.x0y0 = upperLeft;
        this.resizeRelocateDOMContainer();
    }

    set upperRight(upperRight) {
        this.x1y0 = upperRight;
        this.resizeRelocateDOMContainer();
    }
    // -----------

    _init() {
        this._initDOM();
        this.renderHeader();
    }

    _initDOM() {
        let container = document.createElement('div');
        let header = document.createElement('div'),
            headerLabel = document.createElement('div'),
            headerButtonsContainer = document.createElement('div'),
            buttons = {
                /* close: document.createElement('div'),
                maximize: document.createElement('div'),
                minimize: document.createElement('div'),
                collapse: document.createElement('div'), */
            };

        header.appendChild(headerLabel);
        header.appendChild(headerButtonsContainer);

        for (let button of this.options.buttons) {
            let div = document.createElement('div');
            div.setAttribute('class', `lww-header-button lww-header-${button}`);
            headerButtonsContainer.appendChild(div);
            buttons[button] = div;
        }
        /* 
                headerButtonsContainer.appendChild(buttons.minimize);
                headerButtonsContainer.appendChild(buttons.collapse);
                headerButtonsContainer.appendChild(buttons.maximize);
                headerButtonsContainer.appendChild(buttons.close); */

        let content = document.createElement('div');

        container.setAttribute('class', 'lww-container');
        header.setAttribute('class', 'lww-header');
        headerLabel.setAttribute('class', 'lww-header-label');
        headerButtonsContainer.setAttribute('class', 'lww-header-buttons-container');
        content.setAttribute('class', 'lww-content');

        /*         for (let btn in buttons) {
                    buttons[btn].setAttribute('class', `lww-header-button lww-header-${btn}`);
                }
         */
        container.appendChild(header);
        container.appendChild(content);

        document.body.appendChild(container);

        this.DOM.container = container;
        this.DOM.content = content;
        this.DOM.header = header;

        this.DOM.headerLabel = headerLabel;
        this.DOM.buttons = buttons;
        this.DOM.headerButtonsContainer = headerButtonsContainer;

        this.resizeRelocateDOMContainer();
        this._resizeDOMContent();
        this._attachEventListeners();
    }

    renderHeader() {
        this.DOM.headerLabel.innerHTML = this.options.title;
    }

    enableAnimate() {
        this.DOM.container.classList.add('lww-animated');
    }

    disableAnimate() {
        this.DOM.container.classList.remove('lww-animated');
    }

    // Apply current sizing state to DOM
    resizeRelocateDOMContainer(forceAnimate) {
        window.requestAnimationFrame(() => {

            let newStyle;

            this.enableAnimate();
            if (this.state.override)
                switch (this.state.override) {
                    case 'maximize':
                        if (!this.options.bounds.max) {
                            throw new Error("Maximizing requires max bounds, specify them in options");
                        }

                        newStyle = `
                        left: ${this.state.location[0]};
                        top: ${this.state.location[1]};
                        width: ${this.options.bounds.max[0]};
                        height: ${this.options.bounds.max[1]};
                    `;
                        break;
                    case 'minsized':
                        if (!this.options.bounds.min) {
                            throw new Error("Minsizing requires min bounds, specify them in options");
                        }

                        newStyle = `
                        left: ${this.state.location[0]};
                        top: ${this.state.location[1]};
                        width: ${this.options.bounds.min[0]};
                        height: ${this.options.bounds.min[1]};
                    `;
                        break;
                    case 'minimize':
                        if (!this.options.dock) {
                            throw new Error("Docking a window requires it to be connected to a dock");
                        }

                        let dock = this.dock;
                        let btnBounds = dock.getWindowBounds(this.name);

                        // TODO move it to the dock and minimize it
                        newStyle = `
                        left: ${btnBounds.left};
                        top: ${btnBounds.top};
                        width: ${btnBounds.width};
                        height: ${btnBounds.height};
                        z-index: -1;
                        opacity: 0;
                    `;

                        /* setTimeout(() => {
                            this.toggleState('minimize');
                        }, 2000); */
                        break;
                    case 'collapse':
                        newStyle = `
                        left: ${this.x0};
                        top: ${this.y0};
                        width: ${this.options.bounds.min[0]};
                        height: ${this.options.bounds.headerHeight};
                        `;
                        break;
                    default:

                        if (!forceAnimate)
                            this.disableAnimate();

                        newStyle = `
                        left: ${this.x0};
                        top: ${this.y0};
                        width: ${this.width};
                        height: ${this.height};
                        opacity: 1;
                        z-index: 500
                        `;
                        break;
                }

            this.DOM.container.style = newStyle;
            setTimeout(() => this.disableAnimate(), 200);
        });
    }

    toggleState(state, forceAnimate) {
        if (this.state.override === state) {
            this.state.override = 'none';
            forceAnimate = true;
        } else
            this.state.override = state;

        if (state === 'minimize') {
            this.dock.notifyWindowStateDidChange(this.name);
        }


        this.resizeRelocateDOMContainer(forceAnimate);
        this._updateContainerHandles();
    }

    _resizeDOMContent() {
        if (this.options.bounds.headerHeight) {
            this.DOM.header.style.height = this.options.bounds.headerHeight;
        } else {
            // Use default as defined in the CSS classes
            this.options.bounds.headerHeight = this.DOM.header.clientHeight;
        }

        this._applyDOMContentMargins();
    }

    _applyDOMContentMargins() {
        let newStyle = `
                width: calc(100% - ${2 * this.options.resizeMargin}px);
                height: calc(100% - ${this.options.bounds.headerHeight + this.options.resizeMargin}px);
                left: ${this.options.resizeMargin}px;
                `;

        this.DOM.content.style = newStyle;

        // Forces style to be applied NOW
        getComputedStyle(this.DOM.content).width;

        setTimeout(() => {
            this._updateContainerHandles();
        }, 300);
    }

    _attachEventListeners() {

        let inferOffset = (x, y) => {
            let handles = this.state.containerHandles;

            switch (this.mouse.loc) {
                case 'left':
                    return [handles.left[0] - x, 0];
                case 'right':
                    return [handles.right[1] - x, 0];
                case 'bottom':
                    return [0, handles.bottom[1] - y]
                case 'bottom-left':
                    return [handles.left[0] - x, handles.bottom[1] - y]
                case 'bottom-right':
                    return [handles.right[1] - x, handles.bottom[1] - y]
                case 'header':
                    return [handles.left[0] - x, handles.top[0] - y];
                case 'top':
                    return [0, handles.top[0] - y];
                case 'top-left':
                    return [handles.left[0] - x, handles.top[0] - y];
                case 'top-right':
                    return [handles.right[1] - x, handles.top[0] - y];
                default:
                    return (I) => I;
            }
        }


        let startDrag = (x, y) => {
            this.mouse.offset = inferOffset(x, y);

            this.mouse.isDragging = true;
            this.mouse.moveCallback = this.inferMousedownAction();
        }

        let endDrag = (x, y) => {
            this.mouse.isDragging = false;
            this.mouse.moveCallback = (I) => I;
            this._updateContainerHandles();
        }


        this.DOM.content.addEventListener('mousemove', (e) => {
            console.log("mm content");

            if (!this.mouse.isDragging) {
                e.stopImmediatePropagation();
                e.preventDefault();
                return false;
            }
        });

        this.DOM.content.addEventListener('mouseenter', (e) => {
            console.log("mm content");

            this.mouse.loc = 'content';
            this._updateCursor();

            if (!this.mouse.isDragging) {
                e.stopImmediatePropagation();
                e.preventDefault();
                return false;
            }
        });

        this.DOM.content.addEventListener('mouseleave', (e) => {
            console.log("mm content");

            if (!this.mouse.isDragging) {
                e.stopImmediatePropagation();
                e.preventDefault();
                return false;
            }
        });

        this.DOM.header.addEventListener('mousemove', (e) => {
            console.log("mm header");


            if (!this.mouse.isDragging) {
                this.mouse.loc = this.inferMouseLocation(e.x, e.y);
                this._updateCursor();

                e.stopImmediatePropagation();
                e.preventDefault();
                return false;
            }
        });


        this.DOM.header.addEventListener('mouseenter', (e) => {
            console.log("mm header");

            if (!this.mouse.isDragging) {
                this.mouse.loc = this.inferMouseLocation(e.x, e.y);
                this._updateCursor();
                e.stopImmediatePropagation();
                e.preventDefault();
                return false;
            }
        });


        this.DOM.header.addEventListener('mouseleave', (e) => {
            console.log("mm header");
            this.mouse.loc = null;

            if (!this.mouse.isDragging) {
                this._updateCursor();
                e.stopImmediatePropagation();
                e.preventDefault();
                return false;
            }
        });


        this.DOM.header.addEventListener('mousedown', (e) => {
            this.mouse.isDragging = true;
            this._updateCursor();
            startDrag(e.x, e.y);
        });


        this.DOM.container.addEventListener('mousemove', (e) => {
            if (this.mouse.isDragging) {
                return false;
            }

            this.mouse.loc = this.inferMouseLocation(e.x, e.y);
            this._updateCursor();
        });


        this.DOM.container.addEventListener('mousedown', (e) => {
            startDrag(e.x, e.y);
        });


        this.DOM.container.addEventListener('mouseup', (e) => {
            this.mouse.isDragging = false;
            this.mouse.isResizing = false;
            endDrag();
            console.log("mm container");
        });

        this.DOM.container.addEventListener('mouseleave', (e) => {
            if (!this.mouse.isDragging) {
                this.DOM.container.style.cursor = 'default';
            }
            console.log("mm container");
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.mouse.isDragging)
                return;

            // Drag or resize
            console.log("drag(" + e.x + ", " + e.y + ")");
            this.mouse.moveCallback([e.x, e.y]);
        });

        document.addEventListener('mouseup', (e) => {
            if (!this.mouse.isDragging)
                return;

            // End drag or resize
            endDrag();
        });

        for (let btn in this.DOM.buttons) {
            let button = this.DOM.buttons[btn];

            button.addEventListener('mouseenter', (e) => {
                this.mouse.loc = 'button';
                this._updateCursor();
            });
            button.addEventListener('mouseleave', (e) => {
                this.mouse.loc = 'button';
                this._updateCursor();

            });
            button.addEventListener('mousemove', (e) => {
                if (!this.mouse.isDragging) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return false;
                }
            })
            button.addEventListener('click', (e) => {
                this.click(btn);
            });
        }
    }

    click(button) {
        switch (button) {
            case 'maximize':
                this.toggleState('maximize');
                break;
            case 'minimize':
                this.toggleState('minimize');
                break;
            case 'collapse':
                this.toggleState('collapse');
                break;
            case 'close':
                this.close();
                break;
        }
    }

    close() {

    }

    _updateCursor() {
        this.DOM.container.style.cursor = LOC_TO_MOUSE_STYLE[this.mouse.loc];
    }

    _updateContainerHandles() {
        let resizeMargin = this.options.resizeMargin;

        let C = this.DOM.container.getBoundingClientRect(),
            H = this.DOM.header.getBoundingClientRect();

        this.state.containerHandles = {
            top: [H.top, H.top + resizeMargin],
            header: [H.top + resizeMargin, H.bottom],

            left: [C.left, C.left + resizeMargin], // x coords
            right: [C.right - resizeMargin, C.right], // x coords

            bottom: [C.bottom - resizeMargin, C.bottom], // y coords
        };
    }

    __isWithinHandle(v, dir) {
        let handle = this.state.containerHandles[dir];
        let contains = handle[0] <= v && v <= handle[1];
        console.log(contains + " --- Checking if " + v + " is on " + dir + " handle = [" + handle[0] + ', ' + handle[1] + ']');
        return contains;
    }

    _isOnRightContainerHandle(x) {
        return this.__isWithinHandle(x, 'right');
    }

    _isOnLeftContainerHandle(x) {
        return this.__isWithinHandle(x, 'left');
    }

    _isOnBottomContainerHandle(y) {
        return this.__isWithinHandle(y, 'bottom');
    }

    _isOnTopHeaderHandle(y) {
        return this.__isWithinHandle(y, 'top');
    }

    _isOnHeader(y) {
        return this.__isWithinHandle(y, 'header');
    }


    // Only to be called from mouse events on the actual container,
    // thus the hit-testing is simplified to 1D x / y permutations
    inferMouseLocation(x, y) {
        let top = this._isOnTopHeaderHandle(y),
            header = this._isOnHeader(y),
            left = this._isOnLeftContainerHandle(x),
            right = this._isOnRightContainerHandle(x),
            bottom = this._isOnBottomContainerHandle(y);

        if (top && left)
            return 'top-left';
        if (top && right)
            return 'top-right';

        // Swap top & header to set precedence
        if (top)
            return 'top';

        if (header)
            return 'header';

        if (left && bottom)
            return 'bottom-left';
        if (right && bottom)
            return 'bottom-right';

        if (left)
            return 'left';
        if (right)
            return 'right';

        if (bottom) {
            return 'bottom';
        }

        //console.error("Trying to infer container mouse location when mouse is not on container");
        return false;
    }

    inferMousedownAction() {
        //loc = this.inferMouseLocation(x, y);
        let addArr = (dest, src) => {
            dest[0] += src[0];
            dest[1] += src[1];
            return dest;
        }

        switch (this.mouse.loc) {
            case 'left':
                return ([newX]) => this.left = newX + this.mouse.offset[0];
            case 'right':
                return ([newX]) => this.right = newX + this.mouse.offset[0];
            case 'bottom':
                return ([newX, newY]) => this.bottom = newY + this.mouse.offset[1];
            case 'bottom-left':
                return (xyArr) => this.lowerLeft = addArr(xyArr, this.mouse.offset);
            case 'bottom-right':
                return (xyArr) => this.lowerRight = addArr(xyArr, this.mouse.offset);
            case 'header':
                return ([newX, newY]) => this.relocate(newX + this.mouse.offset[0], newY + this.mouse.offset[1]);
            case 'top':
                return ([newX, newY]) => this.top = newY + this.mouse.offset[1];
            case 'top-left':
                return (xyArr) => this.upperLeft = addArr(xyArr, this.mouse.offset);
            case 'top-right':
                return (xyArr) => this.upperRight = addArr(xyArr, this.mouse.offset);
            default:
                return (I) => I;
        }
    }

    mousemove(e) {

    }

    mousedown(e) {

    }

    mouseup(e) {

    }

}

module.exports = new LWWManager();
},{}]},{},[1]);
