(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

        this.windows = {};
    }

    // Creates a dock that windows can be minimized to / maximized from
    createDock(name, args) {

    }

    addWindow(name, args) {
        this.windows[name] = new LWW(name, args);
    }

    deleteWindow(name) {
        if (!this.windows.hasOwnProperty(name))
            throw new Error("Trying to delete window with name " + name + ", it doesn't exist.");

        delete this.windows[name];
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
                }
            },

            state: 'minimized' | 'maximized' | [x, y, w, h],

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
    constructor(name, args) {
        this.name = name;

        this.options = args;
        this._init();

        this.DOM = {};
    }

    _init() {
        let container = window.createElement('div');
        container.attr('class', 'lww-container');
        document.body.appendChild(container);
        this.DOM.container = container;
    }
}

module.exports = new LWWManager();
},{}]},{},[1]);
