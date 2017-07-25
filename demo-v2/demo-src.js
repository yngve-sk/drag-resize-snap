let LWWManager = require('../src/lww-v2');

let BTN_HEIGHT = 40,
    BTN_LENGTH = 60,

    SIZE = [350, 250],
    LOC = [25, 25];


let DOCKS = {
    leftDown: {
        anchor: {
            x: 'left',
            y: 'top',
            offsetY: '10%',
            flow: 'vertical'
        },
        buttonHeight: BTN_HEIGHT,
        buttonLength: BTN_LENGTH
    },
    leftUp: {
        anchor: {
            x: 'left',
            y: 'bottom',
            offsetY: '10%',
            flow: 'vertical'
        },
        buttonHeight: BTN_HEIGHT,
        buttonLength: BTN_LENGTH
    },
    rightDown: {
        anchor: {
            x: 'right',
            y: 'top',
            offsetY: '10%',
            flow: 'vertical'
        },
        buttonHeight: BTN_HEIGHT,
        buttonLength: BTN_LENGTH
    },
    rightUp: {
        anchor: {
            x: 'right',
            y: 'bottom',
            offsetY: '10%',
            flow: 'vertical'
        },
        buttonHeight: BTN_HEIGHT,
        buttonLength: BTN_LENGTH
    },

    topRight: {
        anchor: {
            x: 'left',
            y: 'top',
            offsetX: '10%',
            flow: 'horizontal'
        },
        buttonHeight: BTN_HEIGHT,
        buttonLength: BTN_LENGTH
    },
    topLeft: {
        anchor: {
            x: 'right',
            y: 'top',
            offsetX: '10%',
            flow: 'horizontal'
        },
        buttonHeight: BTN_HEIGHT,
        buttonLength: BTN_LENGTH
    },
    bottomRight: {
        anchor: {
            x: 'left',
            y: 'bottom',
            offsetX: '10%',
            flow: 'horizontal'
        },
        buttonHeight: BTN_HEIGHT,
        buttonLength: BTN_LENGTH
    },
    bottomLeft: {
        anchor: {
            x: 'right',
            y: 'bottom',
            offsetX: '10%',
            flow: 'horizontal'
        },
        buttonHeight: BTN_HEIGHT,
        buttonLength: BTN_LENGTH
    },
};

let WINDOWS = [{
    options: {
        title: 'Win1',
        minimizable: true,
        maximizable: true,
        collapsible: true,

        buttons: ['collapse', 'minimize', 'maximize'],

        bounds: {
            min: [230, 100],
            max: [700, 700],
            headerHeight: 30,
        },

        resizeMargin: 8,
        icon: undefined,
        dock: {
            //            name: 'left' // DEMO/DEBUG - will be set in the dock loop
        }
    },
    state: {
        override: 'none',
        size: SIZE,
        location: LOC
    }
}, {
    options: {
        title: 'Win2',
        minimizable: true,
        maximizable: true,
        collapsible: true,

        buttons: ['collapse', 'minimize', 'maximize'],

        bounds: {
            min: [230, 100],
            max: [700, 700],
            headerHeight: 30,
        },

        resizeMargin: 8,
        icon: undefined,
        dock: {
            //            name: 'left' // DEMO/DEBUG - will be set in the dock loop
        }
    },
    state: {
        override: 'none',
        size: SIZE,
        location: LOC
    }
}, {
    options: {
        title: 'Win3',
        minimizable: true,
        maximizable: true,
        collapsible: true,

        buttons: ['collapse', 'minimize', 'maximize'],

        bounds: {
            min: [230, 100],
            max: [700, 700],
            headerHeight: 30,
        },

        resizeMargin: 8,
        icon: undefined,
        dock: {
            //            name: 'left' // DEMO/DEBUG - will be set in the dock loop
        }
    },
    state: {
        override: 'none',
        size: SIZE,
        location: LOC
    }
}];

let count = 0;

for (let DOCKNAME in DOCKS) {
    let CONFIG = DOCKS[DOCKNAME];
    LWWManager.createDock(DOCKNAME, CONFIG);

    for (let WINCONFIGTEMPLATE of WINDOWS) {
        let WINCONFIG = {
            options: Object.assign({}, WINCONFIGTEMPLATE.options),
            state: Object.assign({}, WINCONFIGTEMPLATE.state),
        };
        WINCONFIG.options.title += DOCKNAME;
        WINCONFIG.options.dock = {};
        WINCONFIG.options.dock.name = DOCKNAME;

        LWWManager.addWindow('window' + count++, WINCONFIG);
    }
}