let LWW = require('../src/lww-npm.js');

let panea = document.getElementById('panea');
let paneb = document.getElementById('paneb');

let drsa = LWW.makeLWW(panea, 'top', {
    minWidth: 200,
    minHeight: 40,
    width: 220,
    height: 400,
    maxWidth: 250,
    maxHeight: 600,
    fontSize: '14pt',
    textAlign: 'center',

    title: 'Columns',

    disableSnap: true,

    tripleClickToCenter: false,
 
    z: 1
});


let drsb = LWW.makeLWW(paneb, 'top', {
    minWidth: 200,
    minHeight: 400,
    width: 600,
    height: 500,
    maxWidth: 600,
    maxHeight: 600,
    fontSize: '14pt',
    textAlign: 'center',

    title: 'Columns',

    disableSnap: true,

    tripleClickToCenter: false,

    z: 0
}); 

let testDiv = document.getElementById('testDiv');

drsa.close();

drsa.on('maximize', () => console.log("Maximize!"));
drsa.on('collapse', () => console.log("collapse!"));
drsa.on('close', () => console.log("close!"));

/* let drsb = LWW.makeLWW(panea, 'top', {
    minWidth: 200,
    minHeight: 40,
    width: 400,
    height: 400,
    maxWidth: 250,
    maxHeight: 600,
    fontSize: '14pt',
    textAlign: 'center',

    title: 'Columns 2',

    disableSnap: true,

    tripleClickToCenter: false
}); */

//setTimeout(() => drsa.spawnRandom(), 2000);
setTimeout(() => drsa.maximize(), 0);
setTimeout(() => drsa.spawnNextTo(testDiv, 'horizontal'), 1);

setTimeout(() => drsb.maximize(), 0);
setTimeout(() => drsb.spawnNextTo(testDiv, 'vertical'), 1);
//setTimeout(() => drsa.collapse(), 4000);
//setTimeout(() => drsa.uncollapse(), 5000);
//setTimeout(() => drsa.close(), 6000);
//setTimeout(() => drsa.open(), 7000);