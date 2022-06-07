#!/usr/bin/env node

import commandLineArgs from 'command-line-args';
import { WsProxyOptions } from './types';
import { wsProxyAsync } from './ws-proxy';

const options:WsProxyOptions=commandLineArgs([

    {name:'port',type:Number,alias:'p'},
    {name:'relay',type:Number,alias:'r'},
    {name:'target',type:String,alias:'t'},
    {name:'forward',type:String,alias:'f'},
    {name:'messages',type:String,alias:'m'},
    {name:'echo',type:Boolean,alias:'e'},
    
]) as any;


wsProxyAsync(options).then(()=>{

}).catch(r=>{
    console.error('ws-proxy failed',r);
    process.exitCode=1;
})