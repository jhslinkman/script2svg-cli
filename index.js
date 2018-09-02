const webpack = require('webpack');
const argv = require('minimist')(process.argv.slice(2));
const path = require('path');
const fs = require('fs');
const opn = require('opn');
const {
    Script,
} = require('vm');

const OUTPUT_FILE = argv.output || argv.o;

const {
    JSDOM,
    VirtualConsole,
} = require('jsdom');

const outputFilename = `./tmp-${Date.now()}.js`;

const compiler = webpack({
    mode: 'production',
    entry: path.join(__dirname, argv._[0]),
    output: {
        path: __dirname,
        filename: outputFilename,
    },
});

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
    const script = fs.readFileSync(outputFilename, {
        encoding: 'utf-8',
    });
    fs.unlinkSync(outputFilename);
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
