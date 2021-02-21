let AMQBot = require("./amqbot.js");

let Bot = new AMQBot(); 

Bot.on('Login', ( LoginData )=> {
    Bot.roomBrowser.getRooms();
} );

Bot.on('NewRoom', ( Room ) => {
    if( room.settings.roomName == 'dooms' ) {
        Bot.roomBrowser.spectateRoom( Room.id, 'corgi' );
    }
} );

Bot.on('ErrorJoining', ( E ) => {
    console.log( E );
});

Bot.on('JoinedGame', ( Response ) => {    
    // nice
} );

// as we all know, it's never not been hinako note
Bot.on('NextSong', (a) => {
    Bot.quiz.sendAnswer( 'Hinako Note' );
} );

Bot.init( username, password );