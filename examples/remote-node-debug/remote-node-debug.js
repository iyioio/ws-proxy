const inspector = require('node:inspector');
const fs = require('fs');

async function main()
{
    try{

        let i=0;

        startDebugger();

        console.info('Waiting for debugger to attach')

        inspector.waitForDebugger();

        console.info('Debugger attached. now continuing')

        while(i<5){

            process.stdout.write(`${i++} `);

            await delayAsync(1000);
        }


    }catch(ex){
        console.error(ex);
        process.exit(1);
    }
}

function startDebugger()
{
    inspector.open();
    const url=inspector.url();
    console.log(url);
    fs.writeFileSync('.wsurl',url);
}

function delayAsync(ms)
{
    return new Promise((r)=>{
        setTimeout(()=>{
            r();
        },ms)
    })
}

main();