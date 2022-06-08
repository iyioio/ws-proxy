import WebSocket, { WebSocketServer } from 'ws';

export interface WsProxyOptions
{
    /**
     * Port that accepts incoming connections. This port is used by normal clients
     * @alias p
     */
    port?:number;

    /**
     * This port is used by other ws-proxy instances to relay ports
     * @alas r
     */
    relay?:number;

    /**
     * This is the full address to the target websocket. If target starts with the file:// protocol
     * the contents of the file will be read just before the target connection is created and used
     * is as the address of the target, and can be updated through of the lifecycle of the proxy.
     * @alias t
     */
    target?:string;

    /**
     * Address to another ws-proxy instance to forward the target port to
     * @alias f
     */
    forward?:string;

    /**
     * If true the server will echo incoming messages
     * @alias e
     */
    echo?:boolean;
    
    /**
     * A series of messages to be sent. Messages defined as a set of delays and message strings. 
     * The repeat keyword can be used to repeat all messages and the keyword close can be used 
     * to close the server after sending messages
     * Format = {c|t}:{delayMs}:{messageTest}; {delayMs}:{messageTest}; ...
     * @example c:100:hi ricky; t:1000:go t:fast; 2000:turn t:left; 1000:go t:fast; t:2000:turn left; repeat
     * @alias m
     */
    messages?:string;
}

export interface WsProxyCtx
{
    services:PortService[];
    dispose():void;
    isDisposed:()=>boolean;
    sendClientMessage:MessageListener;
    sendTargetMessage:MessageListener;
}

export interface PortService
{
    onClientMessage?:MessageListener;
    onTargetMessage?:MessageListener;
    dispose?():void;
}

export interface WebSocketServerPortService extends PortService
{
    wss:WebSocketServer;
}

export const SocketClosed=Symbol();

export type MessageListener=(ws:WebSocket|null,data:WebSocket.Data|symbol,isBinary:boolean)=>void;