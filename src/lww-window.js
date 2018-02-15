let EXT = require('./helper-bundle'),
    _ = EXT._;

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

        this.icon = args.options.icon || 'lww-default';

        this.options = args.options;
        this.state = args.state;
        this.state.containerHandles = {};

        this.DOM = {};

        this.mouse = {
            isDragging: false,
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

            mouseLocChanged: (I) => I,

            close: (I) => I,

            /*             collapse: (I) => I,
                        uncollapse: (I) => I,

                        minimize: (I) => I,
                        unminimize: (I) => I, */
        };

        this.W = window.document.body.clientWidth;
        this.H = window.document.body.clientHeight;

        window.addEventListener('resize', () => {
            this.W = window.document.body.clientWidth;
            this.H = window.document.body.clientHeight;
        });

        this._popupWait = false;
        this._popupTimer = false;

        this._init();
    }

    on(key, callback) {
        if (_.isObject(key)) {
            /*
                Example input:
                window.on({
                    'resize': () => {...},
                    'resizeStart': () => {...},
                    'resizeEnd: () => {...},
                    'move': () => {...}
                })
            */

            for (let theKey in key) {
                this.on(theKey, key[theKey]);
            }
        } else {
            this.callbacks[key] = callback;
        }

    }

    get dock() {
        if (!this.options.dock)
            return undefined;

        return this.manager.docks[this.options.dock.name];
    }

    hide() { this.DOM.container.style.display = 'none'; }
    show() { this.DOM.container.style.display = 'block'; }

    _startPopupWait(time) {
        this._popupWait = true;
        this._popupTimer = setTimeout(() => (this._popupWait = false, this.hide()), time);
    }

    _clearPopupWait() {
        this._popupWait = false;
        clearTimeout(this._popupTimer);
    }

    popupBy(mouse, time) {
        if (this._popupWait)
            return;

        // this.relocate(
        //     (bounds.left + bounds.right) / 2,
        //     (bounds.top + bounds.bottom) / 2
        // );
        this.relocate(mouse[0], mouse[1]);

        if (time != null)
            this._startPopupWait(time);
    }

    relocate(x, y) {
        let x0 = this.x0,
            y0 = this.y0,
            x1 = this.x1,
            y1 = this.y1;

        let dx = x - x0,
            dy = y - y0;

        let newX1 = x1 + dx,
            newX0 = x0 + dx,
            newY1 = y1 + dy,
            newY0 = y0 + dy;

        if (newX0 < 0) {
            dx = -newX0;
            newX0 += dx;
            newX1 += dx;
        }

        if (newX1 > this.W) {
            dx = (this.W - x1);
            newX0 = x0 + dx;
            newX1 = x1 + dx;
        }

        if (newY0 < 0) {
            dy = -newY0;
            newY0 += dy;
            newY1 += dy;
        }

        if (newY1 > this.H) {
            dy = (this.H - y1);
            newY0 = y0 + dy;
            newY1 = y1 + dy;
        }

        // i.e update x0 / y0 WITHOUT implicitly updating x1 / y1
        this._x0 = newX0;
        this._y0 = newY0;
        this.x1 = newX1;
        this.y1 = newY1;

        this.resizeRelocateDOMContainer();
        this.callbacks.move(this.state.location);
    }

    resize(w, h) {
        this.state.size = [w, h];
        this.resizeRelocateDOMContainer();
    }

    // ------------------------
    // Boilerplate getters
    get contentHeight() {
        return this.DOM.content.scrollHeight;
    }

    get contentWidth() {
        return this.DOM.content.scrollWidth;
    }

    get width() {
        return this.state.size[0];
    }

    get height() {
        return this.state.size[1];
    }

    get maxWidth() {
        return this.options.bounds.max[0];
    }

    get maxHeight() {
        return this.options.bounds.max[1];
    }

    get minWidth() {
        return this.options.bounds.min[0];
    }

    get minHeight() {
        return this.options.bounds.min[1];
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

    // ------------------------
    // Clamping
    _clampWidth(w) {
        return Math.min(this.W - this.x0, Math.max(this.minWidth, Math.min(this.maxWidth, w)));
    }

    _clampHeight(h) {
        return Math.min(this.H - this.y0, Math.max(this.minHeight, Math.min(this.maxHeight, h)));
    }

    _clampX0(x0, x1) {
        let minX0 = Math.max(0, x1 - this.maxWidth),
            maxX0 = x1 - this.minWidth;

        return Math.min(maxX0, Math.max(minX0, x0));
    }

    _clampY0(y0, y1) {
        let minY0 = Math.max(0, y1 - this.maxHeight),
            maxY0 = y1 - this.minHeight;

        return Math.min(maxY0, Math.max(minY0, y0));
    }

    // ------------------------
    // Boilerplate setters

    set maxWidth(maxWidth) {
        this.options.bounds.max[0] = maxWidth;
    }

    set maxHeight(maxHeight) {
        this.options.bounds.max[1] = maxHeight;
    }

    set minWidth(minWidth) {
        this.options.bounds.min[0] = minWidth;
    }

    set minHeight(minHeight) {
        this.options.bounds.min[1] = minHeight;
    }

    set width(width) {
        this.state.size[0] = this._clampWidth(width);
    }

    // set contentHeight(contentHeight) {
    //     this.fitToContent(this.contentWidth, contentHeight);
    // }

    // set contentWidth(contentWidth) {
    //     this.fitToContent(contentWidth, this.contentHeight);
    // }

    set height(height) {
        this.state.size[1] = this._clampHeight(height);
    }

    __fixToAspectRatio(x, y, xnyn, flipdx, flipdy) {
        flipdx = flipdy = false;

        let dx = (xnyn[0] - x) * (flipdx ? -1 : 1),
            dy = (xnyn[1] - y) * (flipdy ? -1 : 1);

        let tx = xnyn[0],
            ty = xnyn[1];

        if (Math.abs(dx) > Math.abs(dy)) {
            xnyn[0] = x + dx;
            xnyn[1] = y + dx;
        } else {
            xnyn[0] = x + dy;
            xnyn[1] = y + dy;
        }

        console.log(`
            before: (${tx},${ty})
            d: (${dx}, ${dy}),
            after: (${xnyn[0]},${xnyn[1]})
        `);
    }

    set x0y0([x, y]) {
        if (this.isFixedToAspectRatio) {
            let ar = this._fixAspectRatio;
            let x0 = this.x0,
                y0 = this.y0;


            let dx = x - x0,
                dy = y - y0;

            console.log(`
                (x0,y0): (${x0},${y0}),
                (dx, dy): (${dx},${dy})
            `);
            if (Math.abs(dx) > Math.abs(dy)) {
                this.x0 += dx;
                this.y0 += (dx / ar);
            } else {
                this.x0 += dy * ar;
                this.y0 += dy;
            }
        } else {
            this.x0 = x;
            this.y0 = y;
        }
    }

    set x1y0(x1y0) {
        if (this.isFixedToAspectRatio)
            this.__fixToAspectRatio(this.x1, this.y0, x1y0);

        this.x1 = x1y0[0];
        this.y0 = x1y0[1];
    }

    set x0y1(x0y1) {
        if (this.isFixedToAspectRatio)
            this.__fixToAspectRatio(this.x0, this.y1, x0y1);

        this.x0 = x0y1[0];
        this.y1 = x0y1[1];
    }

    set x1y1(x1y1) {
        if (this.isFixedToAspectRatio)
            this.__fixToAspectRatio(this.x1, this.y1, x1y1);

        this.x1 = x1y1[0];
        this.y1 = x1y1[1];
    }

    set x0(x0) {
        let x1 = this.x1;
        x0 = this._clampX0(x0, x1);

        this.state.location[0] = x0;
        this.width = x1 - x0;
    }

    set _x0(x0) {
        this.state.location[0] = x0;
    }

    set _y0(y0) {
        this.state.location[1] = y0;
    }

    set y0(y0) {
        let y1 = this.y1;
        y0 = this._clampY0(y0, y1);

        this.state.location[1] = y0;
        this.height = y1 - y0;
    }

    set x1(x1) {
        let newWidth = x1 - this.x0;
        this.width = newWidth;
    }

    set y1(y1) {
        let newHeight = y1 - this.y0;
        this.height = newHeight;
    }

    set Z(Z) {
        this.DOM.container.style['z-index'] = Z;
        this._z = Z;
    }
    // -----------

    // alias
    reflow() {
        this.resizeRelocateDOMContainer();
    }

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
            headerIcon = document.createElement('div'),
            headerLabel = document.createElement('div'),
            headerButtonsContainer = document.createElement('div'),
            buttons = {};

        header.appendChild(headerIcon);
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
        container.style['z-index'] = 21;
        header.setAttribute('class', 'lww-header');
        headerIcon.setAttribute('class', 'lww-header-icon ' + this.icon);
        headerLabel.setAttribute('class', 'lww-header-label');
        headerButtonsContainer.setAttribute('class', 'lww-header-buttons-container');

        let contentClassList = 'lww-content';
        if (this.options.fitContent)
            contentClassList += ' lww-fit-content';
        if (this.options.fitContentWidth)
            contentClassList += ' lww-fit-content-width';
        if (this.options.fitContentHeight)
            contentClassList += ' lww-fit-content-height';

        content.setAttribute('class', contentClassList);

        container.appendChild(header);
        container.appendChild(content);

        this.manager.parent.appendChild(container);

        this.DOM.container = container;
        this.DOM.content = content;
        this.DOM.header = header;

        this.DOM.headerLabel = headerLabel;
        this.DOM.buttons = buttons;
        this.DOM.headerButtonsContainer = headerButtonsContainer;

        //this.resizeRelocateDOMContainer();
        this._attachEventListeners();

        setTimeout(() => {
            this.resizeRelocateDOMContainer();
            this._resizeDOMContent();
        }, 250);
    }

    prefixHeaderTitle(prefix) {
        this.DOM.headerLabel.innerHTML = prefix + this.options.title;
    }

    overrideHeaderTitle(titleOverride) {
        this.DOM.headerLabel.innerHTML = titleOverride;
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

    toFront() {
        this.manager.moveToFront(this);
        // this.__zCache = this.DOM.container.style['z-index'];
        // this.DOM.container.style['z-index'] = 50;
        // this.DOM.container.classList.add('lww-front');
    }

    toBack() {
        // this.DOM.container.style['z-index'] = 21;
        // this.DOM.container.classList.remove('lww-front');
    }

    get isFixedToAspectRatio() {
        return this._fixAspectRatio != null;
    }

    lockAspectRatio(ar) {
        this._fixAspectRatio = ar;
    }

    unlockAspectRatio(ar) {
        this._fixAspectRatio = undefined;
    }

    // fitToContent(Cw, Ch, wpad, hpad, lockWidth, lockHeight) {
    //     let H = this.DOM.header.getBoundingClientRect();

    //     Cw = Cw != null ? Cw : this.DOM.content.scrollWidth;
    //     Ch = Ch != null ? Ch : this.DOM.content.scrollHeight;
    //     let Hh = H.height;

    //     this.unlockSize();

    //     this.width = Cw + (wpad == null ? (2 * this.options.resizeMargin) : wpad);
    //     this.height = Ch + Hh + (hpad == null ? (-1 * this.options.resizeMargin) : hpad);
    //     this.reflow();

    //     if (lockHeight)
    //         this.lockHeight();

    //     if (lockWidth)
    //         this.lockWidth();
    // }

    fitToContent() {
        if (this._popupWait)
            return;

        let H = this.DOM.header.getBoundingClientRect(),
            Hh = H.height;

        let Cw = this.DOM.content.scrollWidth,
            Ch = this.DOM.content.scrollHeight;

        // for SOME REASON the -2 keeps it from getting bigger every time this is called,
        // TODO fix it
        this.width = Cw + (2 * this.options.resizeMargin) - 2;
        this.height = Ch + Hh + this.options.resizeMargin;

        // console.log(`
        //     fit2c...
        //     Hh: ${Hh}
        //     Cw: ${Cw}
        //     Ch: ${Ch}
        //     width: ${this.width}
        //     height: ${this.height}
        // `)
        this.reflow();
    }

    lockSize() {
        this.lockWidth();
        this.lockHeight();
    }

    unlockSize() {
        this.unlockWidth();
        this.unlockHeight();
    }

    lockWidth() {
        this.__wBounds = [this.minWidth, this.maxWidth];

        this.minWidth = this.maxWidth = this.width;
    }

    unlockWidth() {
        if (this.__wBounds == null)
            return;

        this.minWidth = this.__wBounds[0];
        this.maxWidth = this.__wBounds[1];
    }

    unlockHeight() {
        if (this.__hBounds == null)
            return;

        this.minHeight = this.__hBounds[0];
        this.maxHeight = this.__hBounds[1];
    }

    lockHeight() {
        this.__hBounds = [this.minHeight, this.maxHeight];
        this.minHeight = this.maxHeight = this.Height;
    }

    // Apply current sizing state to DOM
    resizeRelocateDOMContainer(animate) {
        // window.requestAnimationFrame(() => {

        let newStyle;

        // if (animate !== false)
        //     this.enableAnimate();


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
                    z-index: ${this._z}
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
                    z-index: ${this._z};
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
                    width: ${this.width};
                    height: ${this.height};
                    z-index: ${this._z};
                    opacity: 0;
                    display: none;
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
                    z-index: ${this._z};
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
                    z-index: ${this._z};
                    display: block;
                    `;
                    break;
            }

        this.DOM.container.style = newStyle;
        // setTimeout(() => this.disableAnimate(), 200);
        // });
    }

    toggleState(state, animate) {
        let undo = this.state.override === state;

        if (undo) {
            this.state.override = 'none';
            animate = true;

            setTimeout(() => {
                this.callbacks.resizeEnd(this.x0y0, [this.width, this.height])
            }, 250);
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
        // let newStyle = `
        //     width: calc(100% - ${2 * this.options.resizeMargin}px);
        //     height: calc(100% - ${this.options.bounds.headerHeight + this.options.resizeMargin}px);
        //     left: ${this.options.resizeMargin}px;
        //     `;

        // this.DOM.content.style = newStyle;

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
            else if (!this.options.disableManualResize)
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

            this.toFront();

            this.mouse.isDragging = true;
            this.mouse.moveCallback = this.inferMousemoveAction();
        }

        let endDrag = (x, y) => {
            if (this.mouse.loc === 'header')
                this.callbacks.moveEnd(this.state.location);
            else
                this.callbacks.resizeEnd(this.state.location, this.state.size);

            this.toBack();
            this.mouse.isDragging = false;
            this.mouse.moveCallback = (I) => I;
            this._updateContainerHandles();
        }

        /*         this.DOM.content.addEventListener('mousemove', (e) => {
                    //console.log("mm content");

                    if (!this.mouse.isDragging) {
                        e.stopImmediatePropagation();
                        //e.preventDefault();
                        return false;
                    }
                }); */

        this.DOM.content.addEventListener('mouseenter', (e) => {
            //console.log("mm content");

            this._clearPopupWait();
            this.setMouseLoc('content');
            this._updateCursor();

            if (!this.mouse.isDragging) {
                e.stopImmediatePropagation();
                //e.preventDefault();
                return false;
            }
        });

        this.DOM.content.addEventListener('mouseleave', (e) => {
            //console.log("mm content");
            this.setMouseLoc('none');

            if (!this.mouse.isDragging) {
                e.stopImmediatePropagation();
                //e.preventDefault();
                return false;
            }
        });

        this.DOM.header.addEventListener('mousemove', (e) => {
            if (!this.mouse.isDragging) {
                this.setMouseLoc(this.inferMouseLocation(e.x, e.y));
                this._updateCursor();

                e.stopImmediatePropagation();
                //e.preventDefault();
                return false;
            }
        });


        this.DOM.header.addEventListener('mouseenter', (e) => {
            if (!this.mouse.isDragging) {
                this.setMouseLoc(this.inferMouseLocation(e.x, e.y));
                this._updateCursor();
                e.stopImmediatePropagation();
                //e.preventDefault();
                return false;
            }
        });


        this.DOM.header.addEventListener('mouseleave', (e) => {
            this.setMouseLoc(null);

            if (!this.mouse.isDragging) {
                this._updateCursor();
                e.stopImmediatePropagation();
                //e.preventDefault();
                return false;
            }
        });


        this.DOM.header.addEventListener('mousedown', (e) => {
            this.mouse.isDragging = true;

            startDrag(e.x, e.y);
            e.stopImmediatePropagation();
            //e.preventDefault();
        });


        this.DOM.container.addEventListener('mousemove', (e) => {
            if (this.mouse.isDragging) {
                return false;
            }

            if (this.mouse.loc !== 'content') {
                this.setMouseLoc(this.inferMouseLocation(e.x, e.y));
                this._updateCursor();
            }
        });


        this.DOM.container.addEventListener('mousedown', (e) => {
            if (this.mouse.loc !== 'content')
                startDrag(e.x, e.y);
        });


        this.DOM.container.addEventListener('mouseup', (e) => {
            if (this.mouse.isDragging) {
                endDrag();
            }
            this.mouse.isDragging = false;
        });

        this.DOM.container.addEventListener('mouseleave', (e) => {
            if (!this.mouse.isDragging) {
                this.DOM.container.style.cursor = 'default';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.mouse.isDragging)
                return;

            // Drag or resize
            //console.log("drag(" + e.x + ", " + e.y + ")");
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
                    this.setMouseLoc('button');
                    this._updateCursor();
                }
            });
            button.addEventListener('mouseleave', (e) => {
                if (!this.mouse.isDragging) {
                    this.setMouseLoc('button');
                    this._updateCursor();
                }

            });
            button.addEventListener('mousemove', (e) => {
                if (!this.mouse.isDragging) {
                    e.stopImmediatePropagation();
                    //e.preventDefault();
                    return false;
                }
            });
            button.addEventListener('click', (e) => {
                this.click(btn);
                e.stopImmediatePropagation();
                //e.preventDefault();
            });
            button.addEventListener('mousedown', (e) => {
                e.stopImmediatePropagation();
                //e.preventDefault();
            });
        }
    }

    setMouseLoc(loc) {
        this.mouse.loc = loc;
        //console.log("setMouseLoc: " + loc);
        this.callbacks.mouseLocChanged(this.mouse.loc);
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
        this.callbacks['close']();
        let WinDOM = this.DOM.container;
        WinDOM.remove();

        // Destroy window and its contents
        this.manager.destroyWindow(this.name);
    }

    _updateCursor() {
        //this.DOM.container.style.cursor = LOC_TO_MOUSE_STYLE[this.mouse.loc];
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
        let contains = handle != null && handle[0] <= v && v <= handle[1];
        //console.log(contains + " --- Checking if " + v + " is on " + dir + " handle = [" + handle[0] + ', ' + handle[1] + ']');
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

        if (header)
            return 'header';

        if (!this.options.disableManualResize) {
            if (top && left)
                return 'top-left';
            if (top && right)
                return 'top-right';

            // Swap top & header to set precedence
            if (top)
                return 'top';
            if (bottom)
                return 'bottom';

            if (left && bottom)
                return 'bottom-left';
            if (right && bottom)
                return 'bottom-right';

            if (left)
                return 'left';
            if (right)
                return 'right';

        }


        //console.error("Trying to infer container mouse location when mouse is not on container");
        return 'none';
    }

    inferMousemoveAction() {
        //loc = this.inferMouseLocation(x, y); // Already cached in this.mouse.loc
        let addArr = (dest, src) => {
            dest[0] += src[0];
            dest[1] += src[1];
            return dest;
        }

        let disableResize = this.options.disableManualResize;

        switch (this.mouse.loc) {
            case 'left':
                return disableResize ? () => {} : ([newX]) => this.left = newX + this.mouse.offset[0];
            case 'right':
                return disableResize ? () => {} : ([newX]) => this.right = newX + this.mouse.offset[0];
            case 'bottom':
                return disableResize ? () => {} : ([newX, newY]) => this.bottom = newY + this.mouse.offset[1];
            case 'bottom-left':
                return disableResize ? () => {} : (xyArr) => this.lowerLeft = addArr(xyArr, this.mouse.offset);
            case 'bottom-right':
                return disableResize ? () => {} : (xyArr) => this.lowerRight = addArr(xyArr, this.mouse.offset);
            case 'top':
                return disableResize ? () => {} : ([newX, newY]) => this.top = newY + this.mouse.offset[1];
            case 'top-left':
                return disableResize ? () => {} : (xyArr) => this.upperLeft = addArr(xyArr, this.mouse.offset);
            case 'top-right':
                return disableResize ? () => {} : (xyArr) => this.upperRight = addArr(xyArr, this.mouse.offset);
            case 'header':
                return ([newX, newY]) => this.relocate(newX + this.mouse.offset[0], newY + this.mouse.offset[1]);
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
