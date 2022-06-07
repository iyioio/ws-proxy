const inspector = require('node:inspector');
const fs = require('fs');

async function main()
{
    try{

        let _continue=true;
        let i=0;

        startDebugger();

        while(_continue){

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