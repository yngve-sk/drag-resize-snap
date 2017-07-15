(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @memberof core.util
 * @namespace core.util.DRS
 * @description All DRS methods are available under this namespace.
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

let Z_COUNT = 0;

let ACTIVE_Z = -1;

let MOUSE_Z_BUF = {

};

let Z_BUF = {
    cursor: {}
}

let registerNewZ = (Z) => {
    Z_BUF.cursor[Z] = 'default';
}

updateSuggestedCursor = (Z, suggestion) => {
    Z_BUF.cursor[Z] = suggestion;

    let allZ = Object.keys(Z_BUF.cursor).sort((a, b) => a < b);

    let allCursors = allZ.map((Z) => Z_BUF.cursor[Z]);

    let allEqual = true;
    let prev = allCursors[0];
    for (let i = 1; i < allCursors.length; i++) {
        let next = allCursors[i];
        if (prev !== next) {
            allEqual = false;
            break;
        }

        prev = next;
    }

    let db = document.documentElement || document.body;

    if (allEqual)
        db.style.cursor = allCursors[0];
    else {
        for (let cursor of allCursors)
            if (cursor !== 'default') {
                db.style.cursor = cursor
                return;
            }
    }
}

let makeLWW = function (paneContainer, handle, options) {
    "use strict";

    options = options || {}

    // Minimum resizable area
    let minWidth = options.minWidth || 60;
    let minHeight = options.minHeight || 40;
    let maxWidth = options.maxWidth || 1000;
    let maxHeight = options.maxHeight || 1000;

    let defaultWidth = options.width || 300;
    let defaultHeight = options.height || 300;

    let collapsedMinHeight = options.collapsedMinHeight || 40,
        collapsedMinWidth = options.collapsedMinWidth || 60;

    let collapseWidth = options.collapseWidth || false;

    // snap on/off, will also hide ghost
    let disableSnap = options.disableSnap || false;

    // Thresholds
    let SNAP_MARGINS = -(options.snapEdge || 5);
    let SNAP_FS_MARGINS = -(options.snapFull || 100);
    let RESIZE_MARGIN_INNER = options.resizeOuterM || 5;
    let RESIZE_MARGIN_OUTER = options.resizeOuterM || 8;

    // TODO:
    // Hide/show button, minimize button (showing only the handle)
    // Maximize button too
    // + add handles to:
    //  * Show/Hide
    //  * Spawn next to div (left | right)
    //  * Minimize/Maximize
    //  * Relocate to (x,y)

    let tripleClickToCenter = options.tripleClickToCenter || true;

    let Z;

    if (options.Z) {
        Z = options.Z;
        Z_COUNT = Z + 1;
    } else {
        Z = Z_COUNT++;
    }

    registerNewZ(Z);

    let title = options.title || "Window";
    let fontSize = options.fontSize || '12pt';
    let textAlign = options.textAlign || 'left';

    paneContainer.classList = "lww-pane ";

    paneContainer.innerHTML = `
    <div class="lww-header drag-area">
            <div class="lww-status" style="font-size:${fontSize}; text-align:${textAlign}">${title}</div>
            <div class="lww-buttons">
                <div class="lww-button lww-collapse"></div>
                <div class="lww-button lww-maximize"></div>
                <div class="lww-button lww-close"></div>
            </div>
        </div>
    <div class="lww-content">

    </div>
    `;


    // End of what's configurable.
    paneContainer.style['min-width'] = minWidth;
    paneContainer.style['min-height'] = minHeight;
    paneContainer.style['max-width'] = maxWidth;
    paneContainer.style['max-height'] = maxHeight;

    paneContainer.style.width = defaultWidth;
    paneContainer.style.height = defaultHeight;

    let buttons = document.querySelector(`#${paneContainer.id}>.lww-header>.lww-buttons`),
        collapseBtn = document.querySelector(`#${paneContainer.id}>.lww-header>.lww-buttons>.lww-collapse`),
        maximizeBtn = document.querySelector(`#${paneContainer.id}>.lww-header>.lww-buttons>.lww-maximize`),
        closeBtn = document.querySelector(`#${paneContainer.id}>.lww-header>.lww-buttons>.lww-close`);

    var buttonsSpec = {
        collapse: {
            call: toggleCollapse,
            state: {
                isCollapsed: false
            }
        },
        maximize: {
            call: toggleMaximize,
            state: {
                isMaximized: false
            }
        },
        close: {
            call: close,
            state: {
                isClosed: false
            }
        }
    };

    /* bindEvents(document.querySelector(`#${paneContainer.id}>.lww-header`), 'mouseenter mousedown touchstart', handleDown)
    bindEvents(document.querySelector(`#${paneContainer.id}>.lww-header`), 'mouseleave mouseup touchend', handleUp)
     */

    bindEvents(document.querySelector(`#${paneContainer.id}>.lww-header`), 'mouseenter touchstart', handleDown)
    bindEvents(document.querySelector(`#${paneContainer.id}>.lww-header`), 'mouseleave touchend', handleUp)


    let isMouseOnButtons = false;

    let mouseEnterBtn = (e) => {
        if (isResizing)
            return;

        handleDown = false;
        console.log("Enter!");

        //let db = document.documentElement || document.body
        updateSuggestedCursor(Z, 'default');
        //db.style.cursor = 'default';
        isMouseOnButtons = true;
    };

    let mouseLeaveBtn = (e) => {
        if (isResizing)
            return;

        console.log("Leave!");

        isMouseOnButtons = false;
        onMove(e);
    }

    let attachButtonListeners = () => {
        for (let btnName in buttonsSpec) {
            let btn = buttonsSpec[btnName]

            let div = document.querySelector(`#${paneContainer.id}>.lww-header>.lww-buttons>.lww-${btnName}`);

            div.onclick = () => {
                console.log("Onclick " + btn);

                if (!isMouseOnButtons)
                    return;

                btn.call(btn.state);

                if (btn.callback)
                    btn.callback(btn.state);
            };

            div.onmouseenter = (e) => {
                mouseEnterBtn(e);
                div.style.filter = 'invert(.8)';
            };
            div.onmouseleave = (e) => {
                mouseLeaveBtn(e);
                div.style.filter = '';
            };
        }
    }

    attachButtonListeners();



    buttons.onmouseenter = mouseEnterBtn;
    buttons.onmouseleave = mouseLeaveBtn;

    let sizeCache = null; // Stores prev bounds when collapsing
    updateSizeCache();

    let onRightEdge, onBottomEdge, onLeftEdge, onTopEdge, isResizing;
    let rightScreenEdge, bottomScreenEdge, topScreenEdge, leftScreenEdge;
    let e, b = paneContainer.getBoundingClientRect(),
        x, y, inLR, inTB, preSnap;

    let ACTIVE = true;

    let clicked = null;

    let redraw = false;
    let _usePercent = false // Sets the init state of paneContainer bounds type "%" of screen or fixed "px"

    // make sure paneContainer has some required styles
    paneContainer.style.boxSizing = "border-box" // make sure that bounds take border into account

    // create ghostpaneContainer
    var ghostpaneContainer = document.createElement('div')
    ghostpaneContainer.id = "DRSghost"
    ghostpaneContainer.style.opacity = "0"
    if (!disableSnap) {
        document.body.appendChild(ghostpaneContainer)
    }

    // Setup drag handles
    let handles = handle instanceof Array ? handle : [handle]
    let onHTMLhandle // Holds result of event listeners for HTML handles

    function createHandleObjects() {
        b = b || paneContainer.getBoundingClientRect();

        // Grab handles from dom if none are supplied
        if (!hasHTMLElement(handles))
            handles = handles.concat(
                [].slice.call(
                    paneContainer.getElementsByClassName('drag-area')))

        // precess handles
        for (let i in handles) {
            // html
            if (handles[i] instanceof HTMLElement) {
                bindEvents(handles[i], 'mousedown touchstart', handleDown)
                bindEvents(handles[i], 'mouseup touchend', handleUp)
                handles[i] = {
                    ele: handles[i],
                    type: 'html'
                }

                // bounds object
            } else if (handles[i] instanceof Object) {
                handles[i] = {
                    type: 'custom',
                    coords: handles[i]
                }
                drawDragHandle(handles[i])

                // preset strings
            } else {
                handles[i] = {
                    type: handles[i]
                }
                drawDragHandle(handles[i])
            }
        }
    }

    window.addEventListener('load', createHandleObjects())

    function handleDown() {
        onHTMLhandle = true
    }

    function handleUp() {
        onHTMLhandle = false
    }

    // core functions

    function setBounds(element, x, y, w, h) {
        console.log("Set Bounds for Z = " + Z);
        if (x === undefined) {
            b = b || paneContainer.getBoundingClientRect();
            x = b.left
            y = b.top
            w = b.width
            h = b.height
        }

        // Clamp so it doesn't go outside bounds
        if (x < 0) {
            w += x;
            x = 0;
        }

        if (y < 0) {
            h += y;
            y = 0;
        }

        if (x > (window.innerWidth - w)) {
            x = window.innerWidth - w;
        }


        if (y > (window.innerHeight - h)) {
            y = window.innerHeight - h;
        }

        let wh = convertUnits(w, h)

        element.style.left = x + 'px';
        element.style.top = y + 'px';
        element.style.width = wh[0];
        element.style.height = wh[1];
    }

    function getBounds() {
        let winW = window.innerWidth
        let winH = window.innerHeight
        let bounds = []
        if (b.top < SNAP_FS_MARGINS || b.left < SNAP_FS_MARGINS ||
            b.right > winW - SNAP_FS_MARGINS || b.bottom > winH - SNAP_FS_MARGINS) {
            bounds = [0, 0, winW, winH]
        } else if (leftScreenEdge) {
            bounds = [0, 0, winW / 2, winH]
        } else if (rightScreenEdge) {
            bounds = [winW / 2, 0, winW / 2, winH]
        } else if (topScreenEdge) {
            bounds = [0, 0, winW, winH / 2]
        } else if (bottomScreenEdge) {
            bounds = [0, winH / 2, winW, winH / 2]
        }
        return bounds
    }

    function convertUnits(w, h) {
        if (!_usePercent)
            return [w + 'px', h + 'px']
        let pH, pW
        // use docWidth to take scroll bars into account!
        let docWidth = document.documentElement.clientWidth || document.body.clientWidth;
        pH = h / window.innerHeight * 100
        pW = w / docWidth * 100

        let r = [pW + '\%', pH + '\%']
        return r
    }

    /**
     * Toggle paneContainer size as percent of window or fixed size
     * @param state {boolean} true/false
     */
    function togglePercent(state) {
        _usePercent = state !== undefined ? state : !_usePercent
        setBounds(paneContainer)
    }

    /**
     * Toggle full screen mode
     */
    function snapFullScreen() {
        preSnap = {
            width: b.width,
            height: b.height,
            top: b.top,
            left: b.left
        };
        preSnap.to = [paneContainer, 0, 0, window.innerWidth, window.innerHeight]
        setBounds.apply(this, preSnap.to);
    }

    /**
     * Restore pre-snap size and position
     */
    function restorePreSnap() {
        if (!preSnap) return
        let p = preSnap
        setBounds(paneContainer, p.left, p.top, p.width, p.height);
    }

    function hintHide() {
        if (disableSnap)
            return;

        setBounds(ghostpaneContainer, b.left, b.top, b.width, b.height);
        ghostpaneContainer.style.opacity = 0;
    }

    // Mouse events
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    // Touch events
    document.addEventListener('touchstart', onTouchDown);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);

    function onTouchDown(e) {
        onDown(e.touches[0]);
        //e.preventDefault();
    }

    function onTouchMove(e) {
        onMove(e.touches[0]);
        if (clicked && (clicked.isMoving || clicked.isResizing)) {
            e.preventDefault()
            e.stopPropagation()
        }
    }

    function onTouchEnd(e) {
        if (e.touches.length == 0) onUp(e.changedTouches[0]);
    }

    function onMouseDown(e) {
        onDown(e);
    }

    function onDown(e) {
        Z_BUF['mouse'] = Z;

        calc(e);
        //isResizing = onRightEdge || onBottomEdge || onTopEdge || onLeftEdge;

        clicked = {
            x: x,
            y: y,
            cx: e.clientX,
            cy: e.clientY,
            w: b.width,
            h: b.height,
            isResizing: isResizing,
            isMoving: !isResizing && canMove(),
            onTopEdge: onTopEdge,
            onLeftEdge: onLeftEdge,
            onRightEdge: onRightEdge,
            onBottomEdge: onBottomEdge
        };
    }

    function canMove() {
        if (!onHTMLhandle) {
            console.log("Not on handle!");
            return false;
        } else {
            return true;
        }
        /*
                console.log("On handle!");
                for (let i in handles) {

                    let h = drawDragHandle(handles[i])
                    let c = h.coords
                    let r = {}
                    let yb = b.height - y
                    let xr = b.width - x

                    // determine bounds of click area coordinates
                    if (c.bottom !== null && c.bottom !== undefined)
                        r.bottom = yb < c.height || (!c.height && y > c.top) && yb > c.bottom && inLR
                    if (c.top !== null && c.top !== undefined)
                        r.top = y < c.height || (!c.height && yb > c.bottom) && y > c.top && inLR
                    if (c.right !== null && c.right !== undefined)
                        r.right = xr < c.width || (!c.width && x > c.left) && xr > c.right && inTB
                    if (c.left !== null && c.left !== undefined)
                        r.left = x < c.width || (!c.width && xr > c.right) && x > c.left && inTB

                    let result = ((r.bottom || r.top) && r.left && r.right) ||
                        ((r.left || r.right) && r.bottom && r.top)

                    if (c.invert && !result || onHTMLhandle) return true
                    else if (result || onHTMLhandle) return true
                }
                return false */
    }

    function drawDragHandle(h) {
        let c = getHandleCoords(h)
        if (h.type == 'html') return h
        if (h.coords.hide) return h
        if (!h.drawn) {
            let e = document.querySelector(`#${paneContainer.id}>.drag-area`) //document.createElement('div')
            //e.className = 'drag-area'
            e.style.position = "absolute"
            e.style.pointerEvents = "all"
            e.style.overflow = "hidden"
            //paneContainer.appendChild(e)
            h.drawn = true
            h.ele = e
        }

        if (c.bottom !== null) h.ele.style.bottom = c.bottom + "px"
        if (c.right !== null) h.ele.style.right = c.right + "px"
        if (c.top !== null) h.ele.style.top = c.top + "px"
        if (c.left !== null) h.ele.style.left = c.left + "px"
        if (c.height !== null) h.ele.style.height = c.height + "px"
        if (c.width !== null) h.ele.style.width = c.width + "px"
        return h
    }

    function getHandleCoords(h) {
        let DO = 30
        let types = {
            top: {
                top: 0,
                bottom: null,
                left: 0,
                right: 0,
                width: null,
                height: DO,
                invert: false
            },
            bottom: {
                top: null,
                bottom: 0,
                left: 0,
                right: 0,
                width: null,
                height: DO,
                invert: false
            },
            left: {
                top: 0,
                bottom: 0,
                left: 0,
                right: null,
                width: DO,
                height: null,
                invert: false
            },
            right: {
                top: 0,
                bottom: 0,
                left: null,
                right: 0,
                width: DO,
                height: null,
                invert: false
            },
            full: {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                width: null,
                height: null,
                invert: false
            },
            20: {
                top: 20,
                bottom: 20,
                left: 20,
                right: 20,
                width: null,
                height: null,
                invert: false
            },
            none: {
                top: null,
                bottom: null,
                left: null,
                right: null,
                width: null,
                height: null,
                invert: false
            }
        }
        if (h.type instanceof Array)
            h.coords = h.type
        else if (h.type == 'html')
            h.coords = h.ele.getBoundingClientRect()
        else if (!h.type)
            h.type = 'full'

        if (!h.coords) {
            h.coords = types[h.type.split(' ')[0]]
            h.coords.invert = h.type.indexOf('invert') + 1
            h.coords.hide = h.type.indexOf('hide') + 1
        }
        return h.coords
    }

    function calc(e) {
        b = paneContainer.getBoundingClientRect();
        x = e.clientX - b.left;
        y = e.clientY - b.top;

        // define inner and outer margins
        let dMi = RESIZE_MARGIN_INNER
        let dMo = -RESIZE_MARGIN_OUTER
        let rMi = b.width - RESIZE_MARGIN_INNER
        let rMo = b.width + RESIZE_MARGIN_OUTER
        let bMi = b.height - RESIZE_MARGIN_INNER
        let bMo = b.height + RESIZE_MARGIN_OUTER
        inLR = x > dMo && x < rMo
        inTB = y > dMo && y < bMo

        onTopEdge = y <= dMi && y > dMo && inLR;
        onLeftEdge = x <= dMi && x > dMo && inTB;
        onBottomEdge = y >= bMi && y < bMo && inLR;
        onRightEdge = x >= rMi && x < rMo && inTB;

        isResizing = onRightEdge || onBottomEdge || onTopEdge || onLeftEdge;

        rightScreenEdge = b.right > window.innerWidth - SNAP_MARGINS;
        bottomScreenEdge = b.bottom > window.innerHeight - SNAP_MARGINS;
        topScreenEdge = b.top < SNAP_MARGINS;
        leftScreenEdge = b.left < SNAP_MARGINS;
    }

    function onMove(ee) {
        calc(ee);
        e = ee;
        redraw = true;
    }

    function animate() {

        if (ACTIVE)
            requestAnimationFrame(animate);

        if (isMouseOnButtons)
            return;

        if (!redraw) return;

        redraw = false;

        // handle resizeing
        if (clicked && clicked.isResizing) {
            if (clicked.onRightEdge)
                paneContainer.style.width = Math.max(x, minWidth) + "px";
            if (clicked.onBottomEdge)
                paneContainer.style.height = Math.max(y, minHeight) + "px";
            if (clicked.onLeftEdge) {
                let currentWidth = Math.max(clicked.cx - e.clientX + clicked.w, minWidth);
                if (currentWidth > minWidth) {
                    paneContainer.style.width = currentWidth + "px";
                    paneContainer.style.left = e.clientX + "px";
                }
            }
            if (clicked.onTopEdge) {
                let currentHeight = Math.max(clicked.cy - e.clientY + clicked.h, minHeight);
                if (currentHeight > minHeight) {
                    paneContainer.style.height = currentHeight + "px";
                    paneContainer.style.top = e.clientY + "px";
                }
            }

            hintHide();
            return;
        }

        if (clicked && clicked.isMoving) {

            let bounds = getBounds()

            // Set bounds of ghost paneContainer
            if (!disableSnap && bounds.length) {
                bounds.unshift(ghostpaneContainer)
                setBounds.apply(this, bounds);
                ghostpaneContainer.style.opacity = 0.2;
            } else {
                hintHide();
            }

            // Unsnap with drag, set bounds to preSnap bounds
            if (preSnap) {
                preSnap.dragged = true
                setBounds(paneContainer,
                    e.clientX - preSnap.width / 2,
                    e.clientY - Math.min(clicked.y, preSnap.height),
                    preSnap.width,
                    preSnap.height
                );
                return;
            }

            // moving
            paneContainer.style.top = (e.clientY - clicked.y) + 'px';
            paneContainer.style.left = (e.clientX - clicked.x) + 'px';

            return;
        }

        // This code executes when mouse moves without clicking

        // style cursor
        let suggestedCursor = '';

        let db = document.documentElement || document.body
        if (onRightEdge && onBottomEdge || onLeftEdge && onTopEdge) {
            suggestedCursor = 'nwse-resize';
        } else if (onRightEdge && onTopEdge || onBottomEdge && onLeftEdge) {
            suggestedCursor = 'nesw-resize';
        } else if (onRightEdge || onLeftEdge) {
            suggestedCursor = 'ew-resize';
        } else if (onBottomEdge || onTopEdge) {
            suggestedCursor = 'ns-resize';
        } else if (canMove()) {
            suggestedCursor = 'move';
        } else {
            suggestedCursor = 'default';
        }

        updateSuggestedCursor(Z, suggestedCursor);
    }

    animate();

    function onUp(e) {
        calc(e);

        if (clicked && clicked.isMoving) {
            // Check for Snap
            let bounds = getBounds()
            // Snap to bounds
            if (!disableSnap && bounds.length) {
                // new snap: save preSnap size & bounds then set bounds
                preSnap = {
                    width: b.width,
                    height: b.height
                };
                bounds.unshift(paneContainer)
                preSnap.to = bounds
                setBounds.apply(this, preSnap.to);

                // Clicked: reduce size and destroy the preSnap state
            } else if (preSnap && !preSnap.dragged) {

                let o = RESIZE_MARGIN_INNER
                preSnap.to[1] += o
                preSnap.to[2] += o
                preSnap.to[3] -= o * 2
                preSnap.to[4] -= o * 2
                setBounds.apply(this, preSnap.to);
                preSnap = null;

                // Was dragged: just destroy the preSnap state
            } else {
                preSnap = null;
            }
            hintHide();
        } else if (clicked && clicked.isResizing) {
            // set bounds after resize to make sure they are % as required
            setBounds(paneContainer)
        }



        clicked = null;
    }

    // Tripple click to center (comes in handy!)
    let clicks = [0, 0, 0]

    if (tripleClickToCenter)
        paneContainer.addEventListener('click', trippleClick)

    function trippleClick(e) {
        clicks[2] = clicks[0] && clicks[1] && !clicks[2] ? e.timeStamp : clicks[2]
        clicks[1] = clicks[0] && !clicks[1] ? e.timeStamp : clicks[1]
        clicks[0] = !clicks[0] ? e.timeStamp : clicks[0]

        let dif = clicks[2] - clicks[0]
        if (clicks[2] && dif < 400)
            center()
        if (!clicks[2] && !clicks[3])
            setTimeout(function () {
                clicks = [0, 0, 0]
            }, 500)
        e.preventDefault()
        e.stopPropagation()
        return false
    }

    /**
     * Center the paneContainer in the browser window
     */
    function center() {
        let w = window
        let pw = w.innerWidth * .75
        let ph = w.innerHeight * .75
        setBounds(paneContainer, (w.innerWidth / 2) - (pw / 2), (w.innerHeight / 2) - (ph / 2), pw, ph);
    }

    // utility functions
    function hasHTMLElement(a) {
        for (let i in a)
            if (i instanceof HTMLElement) return true
    }

    function bindEvents(ele, events, callback) {
        events = events.split(' ')
        for (let e in events) ele.addEventListener(events[e], callback)
    }

    function relocate(x, y) {
        setBounds(paneContainer,
            Math.min(window.innerWidth - b.width, Math.max(x, 0)),
            Math.min(window.innerHeight - b.height, Math.max(y, 0)),
            b.width, b.height);
    }

    function spawnNextTo(htmlElement, direction) {
        console.log("spawnNextTo()");

        let bounds = htmlElement.getBoundingClientRect();

        let left = bounds.left,
            top = bounds.top;

        let right = bounds.left + bounds.width,
            bottom = bounds.top + bounds.height;

        let marginTop = bounds.top,
            marginBottom = window.innerHeight - (bottom);

        let marginLeft = left,
            marginRight = window.innerWidth - (right);

        let goUp = marginBottom < marginTop,
            goLeft = marginLeft > marginRight;

        let x, y;

        if (goLeft)
            x = left - b.width;
        else
            x = right;

        if (goUp)
            y = top - b.height;
        else
            y = bottom;

        if (direction === 'vertical') {
            x = Math.max(0, Math.min(window.innerWidth - b.width, left + (bounds.width - b.width) / 2));
        } else if (direction === 'horizontal') {
            y = Math.max(0, Math.min(window.innerHeight - b.height, top + (bounds.height - b.height) / 2));
        }

        relocate(x, y);

        open();
    }

    function spawnRandom() {
        console.log("spawnRandom()");

        let x01 = Math.random(),
            y01 = Math.random();

        let x = Math.min(window.innerWidth * x01, window.innerWidth - b.width),
            y = Math.min(window.innerHeight * y01, window.innerHeight - b.height);

        relocate(x, y);

        open();
    }

    function updateSizeCache() {
        let bounds = paneContainer.getBoundingClientRect();
        sizeCache = {
            w: bounds.width,
            h: bounds.height
        };

    }

    function collapse() {
        console.log("collapse()");
        updateSizeCache();

        paneContainer.style.minHeight = collapsedMinHeight;
        paneContainer.style.height = collapsedMinHeight;

        if (collapseWidth) {
            paneContainer.style.minWidth = collapsedMinWidth;
            paneContainer.style.width = collapsedMinWidth;
        }

    }

    function uncollapse() {
        console.log("uncollapse()");

        // Copy bounds from p to paneContainer
        paneContainer.style.minWidth = minWidth;
        paneContainer.style.minHeight = minHeight;

        paneContainer.style.width = sizeCache.w;
        paneContainer.style.height = sizeCache.h;
    }

    function close() {
        console.log("close()");
        ACTIVE = false;
        paneContainer.style.display = 'none';
    }

    function open() {
        console.log("open()");
        ACTIVE = true;
        animate();
        paneContainer.style.display = 'block';
    }

    function maximize() {
        console.log("maximize()");

        paneContainer.style.width = maxWidth;
        paneContainer.style.height = maxHeight;
    }

    function unmaximize() {
        paneContainer.style.width = defaultWidth;
        paneContainer.style.height = defaultHeight;
    }

    function setContent(template, injector) {
        console.log("setContent()");
    }

    function toggleCollapse(state) {
        console.log("toggleCollapse(" + state + ")");
        if (!state.isCollapsed)
            collapse();
        else
            uncollapse();

        state.isCollapsed = !state.isCollapsed;
    }

    function toggleMaximize(state) {
        console.log("toggleMaximize(" + state + ")");
        if (!state.isMaximized)
            maximize();
        else
            unmaximize();

        state.isMaximized = !state.isMaximized;
    }

    function on(action, callback) {
        buttonsSpec[action].callback = callback;
    }

    return {
        togglePercent: togglePercent,
        snapFullScreen: snapFullScreen,
        restorePreSnap: restorePreSnap,
        center: center,

        // Newly added functionality
        spawnRandom: spawnRandom,
        spawnNextTo: spawnNextTo,
        collapse: collapse,
        uncollapse: uncollapse,
        close: close,
        open: open,
        maximize: maximize,
        setContent: setContent,

        // Add event listeners
        on: on
    }
}

module.exports = {
    makeLWW: makeLWW
};
},{}]},{},[1]);
