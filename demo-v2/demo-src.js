let LWWManager = require('../src/lww-v2');

LWWManager.createDock('left', {
    position: 'left',
    offset: '20%',
    width: '5%'
});

LWWManager.addWindow('window1', {
    options: {
        title: 'Title',

        minimizable: true,
        maximizable: true,
        collapsible: true,

        bounds: {
            min: [100, 100],
            max: [700, 700],
            headerHeight: 30
        },
        resizeMargin: 8,
        icon: undefined,
        dock: {
            name: 'left'
        }
    },


    // 'maximized' | 'docked' | [x, y, w, h]
    state: {
        override: false,
        size: [500, 500],
        location: [300, 50]
    },

});