const serilizer = new require('./settingSerilizer.js');

const RoomBrowserEvents = {
    "New Rooms": "OnNewRooms",
    "Room Change": "OnRoomChange",
    "Host Game": "OnHostGame",
};

class RoomBrowser {
    constructor(bot,ue,) {
        bot.addEventsFromObj( RoomBrowserEvents, this );

        this.bot = bot;
        this.userEvents = ue;
        this.roomList = [];

        this.evNewRoom = ue.addEvent( 'NewRoom' );
        this.evRoomChange = ue.addEvent( 'RoomChange' );
        this.evRoomClosed = ue.addEvent( 'RoomClosed' );

    };

    sendMessage( command, data ) {
        this.bot.sendMessage( 'roombrowser', command, data );
    }

    OnHostGame( payload ) {
        this.bot.sendMessage( "lobby", "change player to spectator", { playerName: this.bot.username } );
    };

    OnNewRooms( rooms ) {
        console.log('new rooms');
        // console.log( rooms.length );
        rooms.forEach( room => {
            this.roomList[room.id] = { 
                name: room.settings.roomName, 
                host: room.host, 
                data: room };
            this.evNewRoom.trigger( room );
        } );        
    }

    OnRoomChange( payload ) {
        let room = this.roomList[payload.id];
        if( !room ) return;
        if( payload.changeType == "settings" ) {
            if( payload.change.roomName )
                room.name = roomName;

            for (let key in payload.change) {
                if (payload.change.hasOwnProperty(key)) {
                    room.data.settings[key] = payload.change[key];
                }

            this.evRoomChange.trigger( room.data );
            }   
        } else if( payload.changeType == "Room Closed" ) { 
            this.roomList[payload.id] = null;
            this.evRoomClosed.trigger( payload.id );
        }        
    }

    settingsDecode( code ) {
        return serilizer.decode( code );
    }

    settingsEncode( obj ) {
        return serilizer.encode( obj );
    }

    hostRoom( name, password, code ) { // takes code or obj, apparently it'll edit ur obj too so get fucked
        if( typeof code === 'string' )
            code = this.settingsDecode( code );

        code.roomName = name;
        if( password && password.length > 0 ) {        
            code.private = true;
            code.password = password;
        }
        this.sendMessage( 'host room', code );
    }

    findRooms( name ) {
        name = name.toLowerCase();
        // console.log(name);
        let found = [];
        let k = Object.keys(this.roomList);
        // console.log(k);
        // console.log(this.roomList);
        for( let i of k ) {
            // console.log( this.roomList[i].name );
            if( this.roomList[i].name.toLowerCase() == name ) {                
                found.push( i );
                // console.log( i );
            }
        }
        return found;
    }

    joinRoom( id, password, spec ) {
        if( typeof id === 'string' ) {
            let room = this.roomList[id];
            if( room.data.settings.private && !password ) return;
        } else if( typeof id !== 'number' ) {
            return;
        }

        this.sendMessage( spec ? 'spectate game' : 'join game', { gameId: parseInt(id), password: password } );
    }

    spectateRoom( id, password ) {
        this.joinRoom( id, password, true );
    }

    stopListening() {
        this.sendMessage( 'remove roombrowser listners' );
    }

    getRooms() {
        this.sendMessage('get rooms');
        // console.log( 'get rooms' );
    }

    startGame() {
        this.sendMessage( 'start game' );
    }
};

module.exports = RoomBrowser;