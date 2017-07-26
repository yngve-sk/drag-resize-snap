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

class LWW {
    /*
        Full args:
        {

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

        this.callbacks = {
            resizeStart: (I) => I,
            resizeEnd: (I) => I,
            resize: (I) => I,
            moveStart: (I) => I,
            move: (I) => I,
            moveEnd: (I) => I,
        }

        this._init();
    }

    on(key, callback) {
        this.callbacks[key] = callback;
    }

    get dock() {
        if (!this.options.dock)
            return undefined;

        return this.manager.docks[this.options.dock.name];
    }

    relocate(x, y) {
        this.state.location = [x, y];
        this.resizeRelocateDOMContainer();
        this.callbacks.move(this.state.location);
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
        this.callbacks.resize(this.state.location, this.state.size);
    }

    set right(right) {
        this.x1 = right;
        this.resizeRelocateDOMContainer();
        this.callbacks.resize(this.state.location, this.state.size);
    }

    set lowerLeft(lowerLeft) {
        this.x0y1 = lowerLeft;
        this.resizeRelocateDOMContainer();
        this.callbacks.resize(this.state.location, this.state.size);
    }

    set lowerRight(lowerRight) {
        this.x1y1 = lowerRight;
        this.resizeRelocateDOMContainer();
        this.callbacks.resize(this.state.location, this.state.size);
    }

    set bottom(bottom) {
        this.y1 = bottom;
        this.resizeRelocateDOMContainer();
        this.callbacks.resize(this.state.location, this.state.size);
    }

    set top(top) {
        this.y0 = top;
        this.resizeRelocateDOMContainer();
        this.callbacks.resize(this.state.location, this.state.size);
    }

    set upperLeft(upperLeft) {
        this.x0y0 = upperLeft;
        this.resizeRelocateDOMContainer();
        this.callbacks.resize(this.state.location, this.state.size);
    }

    set upperRight(upperRight) {
        this.x1y0 = upperRight;
        this.resizeRelocateDOMContainer();
        this.callbacks.resize(this.state.location, this.state.size);
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
            buttons = {};

        header.appendChild(headerLabel);
        header.appendChild(headerButtonsContainer);

        for (let button of this.options.buttons) {
            let div = document.createElement('div');
            div.setAttribute('class', `lww-header-button lww-header-${button}`);
            headerButtonsContainer.appendChild(div);
            buttons[button] = div;
        }

        let content = document.createElement('div');

        container.setAttribute('class', 'lww-container');
        header.setAttribute('class', 'lww-header');
        headerLabel.setAttribute('class', 'lww-header-label');
        headerButtonsContainer.setAttribute('class', 'lww-header-buttons-container');
        content.setAttribute('class', 'lww-content');

        container.appendChild(header);
        container.appendChild(content);

        document.body.appendChild(container);

        this.DOM.container = container;
        this.DOM.content = content;
        this.DOM.header = header;

        this.DOM.headerLabel = headerLabel;
        this.DOM.buttons = buttons;
        this.DOM.headerButtonsContainer = headerButtonsContainer;

        //this.resizeRelocateDOMContainer();
        this._resizeDOMContent();
        this._attachEventListeners();

        setTimeout(() => {
            this.resizeRelocateDOMContainer();
        }, 250);
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
    resizeRelocateDOMContainer(animate) {
        window.requestAnimationFrame(() => {

            let newStyle;

            if (animate !== false)
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
                    case 'minsize':
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

                        /* if (animate === false)
                            this.disableAnimate(); */

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

    toggleState(state, animate) {
        if (this.state.override === state) {
            this.state.override = 'none';
            animate = true;
        } else {
            this.state.override = state;
        }

        if (state === 'minimize') {
            this.dock.notifyWindowStateDidChange(this.name);
        }


        this.resizeRelocateDOMContainer(animate);
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
            if (this.mouse.loc === 'header')
                this.callbacks.moveStart(this.state.location);
            else
                this.callbacks.resizeStart(this.state.location, this.state.size);

            this.mouse.offset = inferOffset(x, y);

            if (this.mouse.loc !== 'header' && this.mouse.loc !== 'none') { // Assume resize
                if (this.state.override === 'minsized') {
                    this.state.size = this.options.bounds.min.slice(0);
                } else if (this.state.override === 'maximized') {
                    this.state.size = this.options.bounds.max.slice(0);
                }

                this.state.override = 'none';
            }

            this.mouse.isDragging = true;
            this.mouse.moveCallback = this.inferMousemoveAction();
        }

        let endDrag = (x, y) => {
            if (this.mouse.loc === 'header')
                this.callbacks.moveEnd(this.state.location);
            else
                this.callbacks.resizeEnd(this.state.location, this.state.size);

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
            startDrag(e.x, e.y);
            e.stopImmediatePropagation();
            e.preventDefault();
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
                document.body.style.cursor = 'default';
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
                if (!this.mouse.isDragging) {
                    this.mouse.loc = 'button';
                    this._updateCursor();
                }
            });
            button.addEventListener('mouseleave', (e) => {
                if (!this.mouse.isDragging) {
                    this.mouse.loc = 'button';
                    this._updateCursor();
                }

            });
            button.addEventListener('mousemove', (e) => {
                if (!this.mouse.isDragging) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return false;
                }
            });
            button.addEventListener('click', (e) => {
                this.click(btn);
                e.stopImmediatePropagation();
                e.preventDefault();
            });
            button.addEventListener('mousedown', (e) => {
                e.stopImmediatePropagation();
                e.preventDefault();
            });
        }
    }

    click(button) {

        let inheritOverrideSizing = () => {
            if (this.state.override === 'maximize')
                this.state.size = this.options.bounds.max.slice();

            if (this.state.override === 'minsize')
                this.state.size = this.options.bounds.min.slice();
        }

        switch (button) {
            case 'maximize':
                this.toggleState('maximize', true);
                break;
            case 'minsize':
                this.toggleState('minsize', true);
                break;
            case 'minimize':
                inheritOverrideSizing();
                this.toggleState('minimize', true);
                break;
            case 'collapse':
                inheritOverrideSizing();
                this.toggleState('collapse', true);
                break;
            case 'close':
                this.close();
                break;
        }
    }

    close() {
        // Clean up DOM
        let WinDOM = this.DOM.container;
        WinDOM.remove();

        // Destroy window and its contents
        this.manager.destroyWindow(this.name);
    }

    _updateCursor() {
        //this.DOM.container.style.cursor = LOC_TO_MOUSE_STYLE[this.mouse.loc];
        document.body.style.cursor = LOC_TO_MOUSE_STYLE[this.mouse.loc];
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

    inferMousemoveAction() {
        //loc = this.inferMouseLocation(x, y); // Already cached in this.mouse.loc
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

    injectHTML(innerHTML) {
        this.DOM.content.innerHTML = innerHTML;
    }

    injectHTMLElement(element) {
        this.DOM.content.appendChild(element);
    }

    // TODO
    injectAngularDirective(tag, Injector, attributes) {
        // Injector will return the controller  scope
        return Injector(tag, this.DOM.content, attributes);
    }
}

module.exports = LWW;