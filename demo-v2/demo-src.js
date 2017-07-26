let LWWManager;
if (typeof require === 'function')
    LWWManager = require('../src/lww');
else
    LWWManager = window.LWWManager;

let BTN_HEIGHT = 40,
    BTN_LENGTH = 60,

    SIZE = [350, 250],
    LOC = [25, 25],

    BUTTONS = ['collapse', 'minimize', 'minsize', 'maximize'],
    NUM_WINDOWS = 5,

    DOCK_OFFSET = '5%';

let DOCKS = {};

for (let flow of ['vertical', 'horizontal'])
    for (let xAnchor of ['left', 'right'])
        for (let yAnchor of ['top', 'bottom']) {
            let name = flow.substr(0, 1) + '-' + xAnchor.substr(0, 1) + '-' + yAnchor.substr(0, 1);
            name = name.toUpperCase();
            DOCKS[name] = {
                anchor: {
                    x: xAnchor,
                    y: yAnchor,
                    offset: DOCK_OFFSET,
                    flow: flow
                },
                buttonHeight: BTN_HEIGHT,
                buttonLength: BTN_LENGTH,
                hideLabels: true,
                showIcons: true
            };
        }

let WINDOWS = [];

for (let i = 0; i < NUM_WINDOWS; i++) {
    WINDOWS.push({
        options: {
            title: 'Win' + i + '..',
            minimizable: true,
            maximizable: true,
            collapsible: true,

            buttons: BUTTONS.slice(0),

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
            size: SIZE.slice(0),
            location: LOC.slice(0).slice(0)
        }
    })
}

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