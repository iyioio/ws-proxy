import WebSocket, { WebSocketServer } from 'ws';
import { MessageListener, PortService, WebSocketServerPortService, WsProxyCtx, WsProxyOptions } from "./types";

export async function wsProxyAsync({
    port,
    relay: relayPort,
    target,
    forward,
    echo,
    messages
}:WsProxyOptions):Promise<void>
{

    return new Promise((_resolve,_reject)=>{

        const services:PortService[]=[];

        const ctx:WsProxyCtx={
            services,
            dispose:()=>{
                console.info('Disposing ws-proxy server');
                const dl=[...services];
                for(const d of dl){
                    d.dispose?.();
                }
                _resolve();
            },
            sendClientMessage:(ws,data,isBinary)=>{
                for(const c of services){
                    c.onClientMessage?.(ws,data,isBinary);
                }
            },
            sendTargetMessage:(ws,data,isBinary)=>{
                for(const c of services){
                    c.onTargetMessage?.(ws,data,isBinary);
                }
            },
        }

        if(port){
            createPort(port,ctx);
        }

        if(relayPort){
            createRelay(relayPort,ctx);
        }

        if(target){
            createTarget(target,ctx);
        }

        if(forward){
            createForward(forward,ctx);
        }

        if(echo){
            createEcho(ctx);
        }

        if(messages){
            createMessageSender(messages,ctx);
        }

        if(!ctx.services.length){
            ctx.dispose();
        }

    });
}

export function createWsServer(port:number, name:string, ctx:WsProxyCtx, onMessage?:MessageListener):WebSocketServerPortService
{
    const wss=new WebSocketServer({
        port
    });

    let disposing=false;
    const ps:WebSocketServerPortService={
        dispose:()=>{
            if(disposing){
                return;
            }
            aryRemove(ps,ctx.services);
            try{
                disposing=true;
                wss.close();
            }catch{}
        },
        wss,
    }
    ctx.services.push(ps);

    wss.on('error',(err)=>{
        console.error(`${name} error`,err);
        ps.dispose?.();
    })

    wss.on('close',()=>{
        console.info(`${name} closed`);
        ps.dispose?.();
    })

    wss.on('connection',(ws)=>{
        console.info(`${name} new connection`);
        ws.on('message',(data,isBinary)=>{
            onMessage?.(ws,data,isBinary);
        });
    })

    wss.on('listening',()=>{
        console.info(`${name} listening on port ${port}. ws://localhost:${port}`);
    })

    return ps;
}


export function createPort(port:number,ctx:WsProxyCtx):PortService
{
    const ps=createWsServer(port,'Client Listener',ctx,ctx.sendClientMessage);

    ps.onTargetMessage=(ws,data,isBinary)=>{
        for(const c of ps.wss.clients){
            c.send(data,{binary:isBinary});
        }
    }

    return ps;
}

export function createRelay(relayPort:number,ctx:WsProxyCtx):PortService
{
    const ps=createWsServer(relayPort,'Relay Listener',ctx,ctx.sendTargetMessage);

    ps.onClientMessage=(ws,data,isBinary)=>{
        for(const c of ps.wss.clients){
            c.send(data,{binary:isBinary});
        }
    }

    return ps;
}

export function createForward(forward:string,ctx:WsProxyCtx):PortService
{
    const ws=new WebSocket(forward);
    const ps:PortService={
        onTargetMessage(_ws,data,isBinary)
        {
            ws.send(data,{binary:isBinary});
        },
        dispose()
        {
            aryRemove(ps,ctx.services);
            try{
                ws.close();
            }catch{}
        }
    }
    ctx.services.push(ps);

    ws.on('message',(data,isBinary)=>{
        ctx.sendClientMessage(ws,data,isBinary);
    })
    
    return ps;
}

export function createTarget(target:string,ctx:WsProxyCtx):PortService
{
    const ws=new WebSocket(target);
    const ps:PortService={
        onClientMessage(_ws,data,isBinary)
        {
            ws.send(data,{binary:isBinary});
        },
        dispose()
        {
            aryRemove(ps,ctx.services);
            try{
                ws.close();
            }catch{}
        }
    }
    ctx.services.push(ps);

    ws.on('message',(data,isBinary)=>{
        ctx.sendTargetMessage(ws,data,isBinary);
    })
    
    return ps;
}

export function createEcho(ctx:WsProxyCtx):PortService
{
    console.info('Echo service started');
    const ps:PortService={
        onClientMessage:(ws,data,isBinary)=>{
            console.info('echo',{type:'client',data:isBinary?data:data.toString()})
        },
        onTargetMessage:(ws,data,isBinary)=>{
            console.info('echo',{type:'target',data:isBinary?data:data.toString()})
        },
        dispose(){
            aryRemove(ps,ctx.services);
        }
    }
    ctx.services.push(ps);

    return ps;
}

export function createMessageSender(messages:string,ctx:WsProxyCtx):PortService
{
    let disposed=false;

    const list=messages.split(';').map(m=>{
        const parts=m.split(':');
        const f=parts[0].trim()
        return {
            client:f==='c',
            delay:Number(parts[1]?.trim()||'-1'),
            msg:parts[2]?.trim()||'',
            repeat:f==='repeat',
            close:f==='close',
        }
    }).filter(m=>m.repeat || m.close || (m.msg && m.delay>=0));

    let i=0;
    (async ()=>{

        while(!disposed){
            const m=list[i++];
            if(!m){
                break;
            }
            if(m.close){
                ctx.dispose();
                break;
            }
            if(m.repeat){
                i=0;
                await delayAsync(10);
                continue;
            }
            await delayAsync(m.delay);
            for(const l of ctx.services){
                if(m.client){
                    l.onClientMessage?.(null,m.msg,false);
                }else{
                    l.onTargetMessage?.(null,m.msg,false);
                }
            }
        }
    })();

    const ps:PortService={
        dispose(){
            if(!disposed){
                aryRemove(ps,ctx.services);
                disposed=true;
            }
        }
    }
    ctx.services.push(ps);

    return ps;
}

function delayAsync(ms:number)
{
    return new Promise<void>((r)=>{
        setTimeout(()=>{
            r();
        },ms)
    })
}

function aryRemove<T>(item:T, ary:T[]):boolean
{
    const i=ary.indexOf(item);
    if(i!==-1){
        ary.splice(i,1);
        return true;
    }else{
        return false;
    }
}