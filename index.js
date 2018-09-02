const webpack = require('webpack');
const argv = require('minimist')(process.argv.slice(2));
const path = require('path');
const fs = require('fs');
const MemoryFS = require('memory-fs');
const opn = require('opn');
const {
    Script,
} = require('vm');

const OUTPUT_FILE = argv.output || argv.o;
const TMP_DIR = '/tmp';
const TMP_FILE = `tmp-${Date.now()}.js`;

const {
    JSDOM,
    VirtualConsole,
} = require('jsdom');

const mfs = new MemoryFS();
const compiler = webpack({
    mode: 'production',
    entry: path.join(__dirname, argv._[0]),
    output: {
        path: TMP_DIR,
        filename: TMP_FILE,
    },
});
compiler.outputFileSystem = mfs;
compiler.run((err, stats) => {
    if (err) {
        console.log(err);
        process.statusCode = 1;
        return;
    }
    if (stats.hasErrors()) {
        console.log(stats.toString({
            colors: true,
        }));
        process.statusCode = 1;
        return;
    }
    const script = mfs.readFileSync(path.join(TMP_DIR, TMP_FILE));
    execute(script);
});

function execute(script) {
    const virtualConsole = new VirtualConsole();
    virtualConsole.sendTo(console);
    const dom = new JSDOM('<!DOCTYPE html><body><svg id="svg" xmlns="http://www.w3.org/2000/svg"  ></svg></body></html>', {
        virtualConsole,
        runScripts: 'outside-only',
    });
    const s = new Script(script);
    dom.runVMScript(s);
    const svg = dom.window.document.getElementById('svg').outerHTML;
    if (OUTPUT_FILE) {
        fs.writeFileSync(OUTPUT_FILE, svg);
        if (!argv['no-open']) opn(OUTPUT_FILE, {
            wait: false,
        });
    } else {
        console.log(svg);
    }
}
