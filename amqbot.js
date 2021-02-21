let https = require('https');
let socketio = require('socket.io-client');
let onEnd = require('on-finished');
let Cookie = require('request-cookies').Cookie;
let stream = require('stream');


let roomBrowserHandler = require('./roombowserhandler.js');
let quizHandler = require('./quizhandler.js');

class AMQEvent {
    constructor( name ) {
        this.Callbacks = [];
    }

    trigger( ...args ) {
        // console.log( 'triggering ' + this.Callbacks.length );
        this.Callbacks.forEach( (a)=>{
            if(a)
                if( a.meta )
                    a.callback.call(a.meta,...args);
                else   
                    a.callback(...args);
        } );
    }

    add( callback, meta ) {
        return this.Callbacks.push( {callback:callback, meta:meta} );
    }

    remove( id ) {
        // for( let i = 0; i < this.Callbacks.length; i++ ) if( this.Callbacks[i] == callback ) this.Callbacks.splice( i-- );
        this.Callbacks[id] = null;
    }

    clear() {
        this.Callbacks = [];
    }
};

class AMQEventList {
    constructor() {
        this.list = {};
    }

    addEvent( name ) {
        let res = new AMQEvent;
        this.list[name] = res;
        return res;
    }

    removeEvent( name ) {
        let ev = this.find( name );
        if( ev ) {
            this.list[name] = null;
            ev.clear();
        }
    }

    find( name ) {
        return this.list[name];
    }

    addCallback( name, call, meta ) {
        let ev = this.find(name);
        if( ev )
            return ev.add( call, meta );
        else
            throw "No event called: " + name;
    }

    trigger( name, ...args ) {        
        // console.log( 'attempt trigger ' + name );
        let ev = this.find( name );
        // console.log( 'triggering ' + name, ev );
        if( ev )
            ev.trigger( ...args );
    }
};

let MainURL = "https://animemusicquiz.com/";

function doStart( bot ) {
    bot.start();
}

const DefaultEvents = {
    'online player count change': 'OnPlayerCountChange',
    'login complete': 'OnLogin'
};

class DefaultHandlers{
    constructor( bot, ue ){
        bot.addEventsFromObj( DefaultEvents, this );
        this.bot = bot;
        this.evPlayerCountChange = ue.addEvent( 'PlayerCountChange' );
        this.evLogin = ue.addEvent( 'Login' );
    }

    OnPlayerCountChange( data ) {
        this.evPlayerCountChange.trigger( data.count );
    }

    OnLogin( data ) {
        console.log( "hey" );
        this.evLogin.trigger( data );
        this.bot.username = data.self;
    }
};

class Socket {
    constructor( url, options ) {
        this.socket = socketio( url, options );
        this.connected = false;
        console.log("connecting");
        this.socket.on('sessionId', (sessionId) => {
                this.sessionId = sessionId;
                console.log("sessionId");
            });

        this.socket.on('command',(data)=>{
            console.log(0, data.command);    
            if( this.onCommand )
                this.onCommand( data.command, data.data );        
        });
        this.socket.on('connect',(a)=>{
            this.connected = true;
            console.log(1,a);                    
        });
        this.socket.on('disconnect',(a)=>{
            this.connected = false;
            console.log(2,a);            
        });
        this.socket.on('connect_error',(a)=>{
            console.log(3,a);
        });

        this.socket.on('reconnect',console.log);

        this.socket.on('reconnect_attempt',console.log);

        this.onCommand;
    }

    sendMessage( type, command, data ) {
        let obj = { type: type, command: command, data: data };
        console.log( obj );

        this.socket.emit( 'command', obj );
    }    

    stop() {
        throw 'woops';
    }
};

class CatDuplex extends stream.Duplex {
    constructor(options) {
        super(options);
        this.buffer = [];
        this.index = 0;
        this.finalLength = 0;
    }

    _write(c,e,cb){
        this.buffer.push(c);
        cb();
    }

    resetToStart() {
        this.index = 0;
    }

    _read(s){
        // return this.buffer.shift();
        this.push( this.buffer[this.index++] );
    }
}

class AMQBot {
    constructor() { 
        this.username;
        this.events = new AMQEventList;
        this.userEvents = new AMQEventList;
        this.loggedIn = false;
        this.socketToken;
        this.port;
        this.socket;
        this.sid;
        
        this.defaultHandlers = new DefaultHandlers(this,this.userEvents);
        this.roomBrowser = new roomBrowserHandler(this,this.userEvents);
        this.quiz = new quizHandler(this,this.userEvents);
    }      



    on( name, call, meta ) {
        this.userEvents.addCallback( name, call, meta );
    }

    get connected(){
        if( this.socket )
            return this.socket.connected;
        return false;
    }

    addEventsFromObj( o, t ) {
        Object.keys( o ).forEach( 
            (a)=>{ 
                //console.log( a, o[a], t[o[a]] );
                let ev = this.events.addEvent( a ); 
                ev.add( t[o[a]], t );
            } );
    }

    init( username, password ) {
        this.login(username, password )
            .then( doStart )
            .catch(console.log);
    }
    
    downloadCatbox( catLink, resolve, reject ) {
        let bufferStream = new CatDuplex;//stream.Readable();
        let u = new URL(catLink);
        
        let resolved = false;

        let req = https.request( { 
            hostname: 'files.catbox.moe',
            port: 443,
            path: u.pathname,
            method: 'GET',
            headers: {
                'range':'bytes=0-'
            }
        },
        res=>{
            // console.log( res.headers );
            res.pipe( bufferStream );
            let length = res.headers['content-length'];
            bufferStream.finalLength = parseInt(length);
            // console.log( length );
            /*res.on('data',d=>{
                if( !resolved && resolve ) {
                    resolve( bufferStream );
                    resolved = true;
                }
                bufferStream.write(d);
            });
            res.on('end',()=>{      
                bufferStream.end();             
                console.log('stream end');
            });*/
            if(resolve)
                resolve(bufferStream);
            res.on('end',()=>{                        
                console.log('stream end');
                // if( cb ) cb();
            });
        });
        req.on('error', ()=> {
            if( reject )
                reject();
            console.log('rejected request');
        });       
        req.on('close', () => {
            console.log('request close');
        }); 

        req.end();            

        return bufferStream;
    }

    downloadRedirect( catId ) {
        let prom = new Promise( ( resolve, reject ) => {
            let req = https.request( { 
                hostname: 'animemusicquiz.com',
                port: 443,
                path: '/moeVideo.webm?id='+catId,
                method: 'GET',
                jar: true,
                headers: { 
                    'Cookie': [ 'username='+this.username, 'connect.sid='+this.sid ],
                }            
                }, res => {
                    res.on('data', d => {    
                    
                    } );
                    res.on('end', ()=>{
                        if( res.statusCode > 300 && res.statusCode < 400 && res.headers.location ) {
                            this.downloadCatbox( res.headers.location, resolve, reject );
                        } else {
                            reject( 'was expecting redirect' );
                        }
                    });
                }
            );            
            req.on('error', reject );       
            req.on('close', () => {
                
            }); 

            req.end();
        });

        return prom;
    }

    login( username, password ) {
        let data = JSON.stringify({
            username: username,
            password: password
        });

        let req;
        let resdata = "";
        let tooMany = false;
        let cookies = false;
        let res = new Promise( ( resolve, reject ) => {

            req = https.request( { 
                hostname: 'animemusicquiz.com',
                port: 443,
                path: '/signIn',
                method: 'POST',
                json: true,
                jar: true,
                headers: { 
                    'Content-Type': 'application/json',
                    'Content-Length': data.length                    
                }
                }, res => {
                    res.on('data', d => {    
                        console.log(res.headers);    
                        console.log(res.headers['set-cookie']);    
                        if( !cookies )
                            cookies = res.headers['set-cookie'];

                        let n = d.toString();
                        if( n.substring( 0, 3 ) == "Too" ) {
                            tooMany = n;
                            return;
                        }
                        if( resdata.length == 0 && n.substring( 0,1 ) != '{' ) return;                                    
                        resdata += n;                    
                    } );
                }
            );            
            req.on('error', reject );       
            req.on('close', () => {
                try 
                    {
                        if( tooMany ) {
                            reject( tooMany );
                            return;
                        }
                        
                        if( cookies ) {
                            for( let i in cookies ) {
                                let cookie = new Cookie( cookies[i] );
                                if( cookie.key == "connect.sid" ) {
                                    this.sid = cookie.value;
                                }
                            }
                        }

                        // console.log( this.sid );
                        // console.log('logged in');
                        // console.log(resdata);
                        resdata = JSON.parse( resdata );
                        // console.log(resdata);
                        if( resdata.verified ) {
                            resolve( this );
                            this.username = username;
                            this.loggedIn = true;
                        } else {
                            reject( "unverified" );                        
                        }
                    }
                catch(e)
                    {
                    reject( e );
                    }
            }); 
            req.write(data);
        });
        req.end();
        return res;
    }

    start() {
        if( this.loggedIn == false || !this.socketToken ) {
            console.log( "getting token" );
            this.getToken().then( doStart ).catch( console.log );
            return;
        }

        let portString = "";
        // console.log( this.port );
        if( this.port )
            portString = ":" + this.port;

        console.log( "https://socket.animemusicquiz.com" + portString );
        // console.log( this.socketToken );

        this.socket = new Socket( "https://socket.animemusicquiz.com" + portString, { reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 2000,
            reconnectionAttempts: 5,
            query: {
                token: this.socketToken
            } } );        

        this.socket.onCommand = ( command, data ) => { 
            this.events.trigger( command, data );
        };
    }

    setPrivate( sid ) {
        this.sid = sid;
    }

    setToken( tokenObj ) {
        this.loggedIn = true;
        this.socketToken = tokenObj.token;
        this.port = tokenObj.port;
    }

    sendMessage( type, command, data ) {        
        this.socket.sendMessage( type, command, data );        
        console.log( type, command, data );
    }

    getToken( ) {

        let req;
        let resdata = "";
        let res = new Promise( ( resolve, reject ) => {

            req = https.request( { 
                hostname: 'animemusicquiz.com',
                port: 443,
                path: '/socketToken',
                method: 'GET',
                json: true,
                jar: true,
                headers: { 
                    'Cookie': [ 'username='+this.username, 'connect.sid='+this.sid ],
                }
                }, res => {
                    res.on('data', d => {                        
                        let n = d.toString();                        
                        if( resdata.length == 0 && n.substring( 0,1 ) != '{' ) return;                                    
                        resdata += n;                    
                    } );
                }
            );            
            req.on('error', reject );       
            req.on('close', () => {
                try 
                    {
                    let x = JSON.parse( resdata );
                    this.setToken( x );
                    resolve( this );
                    return;
                    }
                catch(e)
                    {
                    reject( e );
                    }
            }); 
        });
        req.end();
        return res;
    }
};

module.exports = AMQBot;